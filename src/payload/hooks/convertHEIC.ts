/**
 * Payload Media Collection Hook
 *
 * Automatically converts HEIC uploads to WebP format for browser compatibility.
 *
 * Runs before media validation to ensure browsers can display uploaded images.
 */

import { promises as fs } from 'fs'
import path from 'path'
import convert from 'heic-convert'
import sharp from 'sharp'
import { CollectionBeforeValidateHook } from 'payload'

export const convertHEICBeforeValidate: CollectionBeforeValidateHook = async ({ data, req }) => {
  // Only process on create with file upload
  if (req.file && data?.filename) {
    const filename = data.filename as string
    const isHEIC = /\.heic$/i.test(filename)

    if (isHEIC) {
      try {
        const mediaDir = path.join(process.cwd(), 'media')
        const originalPath = path.join(mediaDir, filename)
        const newFilename = filename.replace(/\.heic$/i, '.webp')
        const newPath = path.join(mediaDir, newFilename)

        req.payload.logger.info(`[HEIC Hook] Converting ${filename} to ${newFilename}`)

        // Read original HEIC
        const inputBuffer = await fs.readFile(originalPath)

        // Convert HEIC → JPEG → WebP
        const jpegBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.9,
        })

        const webpBuffer = await sharp(Buffer.from(jpegBuffer))
          .webp({ quality: 85 })
          .toBuffer()

        // Write WebP file
        await fs.writeFile(newPath, webpBuffer)

        // Get image dimensions
        const metadata = await sharp(webpBuffer).metadata()

        // Update data to point to WebP instead of HEIC
        data.filename = newFilename
        data.mimeType = 'image/webp'
        data.filesize = webpBuffer.length
        data.width = metadata.width
        data.height = metadata.height

        // Optionally keep original HEIC or delete it
        // await fs.unlink(originalPath) // Uncomment to delete HEIC after conversion

        req.payload.logger.info(`[HEIC Hook] Successfully converted to ${newFilename} (${(webpBuffer.length / 1024).toFixed(2)} KB)`)
      } catch (error: unknown) {
        req.payload.logger.error({ err: error, msg: `[HEIC Hook] Conversion failed for ${filename}` })
        // Let the original upload proceed if conversion fails
      }
    }
  }

  return data
}
