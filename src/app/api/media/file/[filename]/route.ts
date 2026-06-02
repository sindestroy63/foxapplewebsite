import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// Content-Type mapping by file extension
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
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
    // Read file
    const fileBuffer = await readFile(filePath)

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const fileData = new Uint8Array(fileBuffer)

    // Determine Content-Type
    const contentType = getContentType(safeFilename)

    // Return file with proper headers
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileData.length.toString(),
      },
    })
  } catch (error) {
    // File not found or other read error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 })
    }

    console.error(`[MediaRoute] Error reading file ${safeFilename}:`, error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}