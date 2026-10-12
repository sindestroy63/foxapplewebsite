import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, readFileSync } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import path from 'path'
import sharp from 'sharp'
import convert from 'heic-convert'

// Content-Type mapping by file extension
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.heic': 'image/heic',
  '.HEIC': 'image/heic',
}

/**
 * Safely normalize filename to prevent path traversal attacks
 * Returns null if the filename is invalid or attempts to escape media folder
 */
function safeNormalizeFilename(filename: string): string | null {
  // Decode URI components
  const decoded = decodeURIComponent(filename)

  // Reject any path traversal attempts
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null
  }

  // Get only the basename (extra safety)
  const basename = path.basename(decoded)

  // Reject empty or hidden files
  if (!basename || basename.startsWith('.')) {
    return null
  }

  return basename
}

/**
 * Get Content-Type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

/**
 * Check if file is HEIC format that needs conversion
 */
function isHEIC(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ext === '.heic'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params

  // Safely normalize filename
  const safeFilename = safeNormalizeFilename(filename)
  if (!safeFilename) {
    return new NextResponse('Invalid filename', { status: 400 })
  }

  // Build absolute path to file
  const filePath = path.resolve(process.cwd(), 'media', safeFilename)

  // Verify the resolved path is still within media folder (extra safety)
  const mediaDir = path.resolve(process.cwd(), 'media')
  if (!filePath.startsWith(mediaDir)) {
    return new NextResponse('Invalid filename', { status: 400 })
  }

  try {
    const fileStats = await stat(filePath)

    // Convert HEIC to WebP for browser compatibility
    if (isHEIC(safeFilename)) {
      try {
        // Read HEIC file and convert using heic-convert
        const inputBuffer = readFileSync(filePath)
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.9,
        })

        // Optionally optimize with Sharp
        const webpBuffer = await sharp(Buffer.from(outputBuffer))
          .webp({ quality: 85 })
          .toBuffer()

        return new NextResponse(webpBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Length': webpBuffer.length.toString(),
            'X-Converted-From': 'heic',
          },
        })
      } catch (conversionError) {
        console.error(`[MediaRoute] HEIC conversion failed for ${safeFilename}:`, conversionError)
        // Fall through to return original file
      }
    }

    // Determine Content-Type
    const contentType = getContentType(safeFilename)

    // Stream the generated thumbnail instead of buffering and copying the whole file per request.
    return new NextResponse(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileStats.size.toString(),
      },
    })
  } catch (error) {
    // File not found locally - try production fallback
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // In development, try to fetch from production
      if (process.env.NODE_ENV === 'development') {
        const productionUrl = process.env.PRODUCTION_MEDIA_URL || 'https://foxapple.ru'
        const mediaUrl = `${productionUrl}/api/media/file/${encodeURIComponent(safeFilename)}`

        try {
          const response = await fetch(mediaUrl, {
            cache: 'force-cache',
            next: { revalidate: 86400 } // 24 hours
          })

          if (response.ok) {
            // Clone response before consuming it for HEIC conversion attempt
            const clonedResponse = response.clone()

            // Convert HEIC from production to WebP
            if (isHEIC(safeFilename)) {
              try {
                const buffer = await clonedResponse.arrayBuffer()

                // Use heic-convert for HEIC decoding
                const jpegBuffer = await convert({
                  buffer: Buffer.from(buffer),
                  format: 'JPEG',
                  quality: 0.9,
                })

                // Optimize to WebP with Sharp
                const webpBuffer = await sharp(Buffer.from(jpegBuffer))
                  .webp({ quality: 85 })
                  .toBuffer()

                return new NextResponse(webpBuffer as unknown as BodyInit, {
                  status: 200,
                  headers: {
                    'Content-Type': 'image/webp',
                    'Cache-Control': 'public, max-age=86400',
                    'X-Media-Source': 'production-proxy',
                    'X-Converted-From': 'heic',
                  },
                })
              } catch (conversionError) {
                console.warn(`[MediaRoute] HEIC conversion not supported, returning original: ${safeFilename}`)
                // Return original response (not cloned, as conversion failed)
              }
            }

            const contentType = response.headers.get('content-type') || getContentType(safeFilename)

            return new NextResponse(response.body, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // 24 hours for proxied images
                'X-Media-Source': 'production-proxy',
              },
            })
          }
        } catch (fetchError) {
          console.error(`[MediaRoute] Production fallback failed for ${safeFilename}:`, fetchError)
        }
      }

      return new NextResponse('File not found', { status: 404 })
    }

    console.error(`[MediaRoute] Error reading file ${safeFilename}:`, error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}