
import { promises as fs } from 'fs'
import path from 'path'
import convert from 'heic-convert'
import sharp from 'sharp'
import { CollectionBeforeValidateHook } from 'payload'

export const convertHEICBeforeValidate: CollectionBeforeValidateHook = async ({ data, req }) => {
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

        const inputBuffer = await fs.readFile(originalPath)

        const jpegBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.9,
        })

        const webpBuffer = await sharp(Buffer.from(jpegBuffer))
          .webp({ quality: 85 })
          .toBuffer()

        await fs.writeFile(newPath, webpBuffer)

        const metadata = await sharp(webpBuffer).metadata()

        data.filename = newFilename
        data.mimeType = 'image/webp'
        data.filesize = webpBuffer.length
        data.width = metadata.width
        data.height = metadata.height


        req.payload.logger.info(`[HEIC Hook] Successfully converted to ${newFilename} (${(webpBuffer.length / 1024).toFixed(2)} KB)`)
      } catch (error: unknown) {
        req.payload.logger.error({ err: error, msg: `[HEIC Hook] Conversion failed for ${filename}` })
      }
    }
  }

  return data
}
