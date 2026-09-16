import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * Manufacturer renders arrive letterboxed: a flat outer band, then a white
 * content area, then the product. A single trim only removes the outer band,
 * which is why a phone ends up as a postage stamp in the middle of the tile.
 * This trims repeatedly until the frame stops shrinking, then squares the
 * result so every product fills its tile the same way.
 */
async function trimRepeatedly(buffer, rounds = 4) {
  let current = buffer
  let last = null

  for (let i = 0; i < rounds; i += 1) {
    const before = await sharp(current).metadata()

    // Alternate the reference: the corner colour (whatever band is outermost)
    // and explicit white, so both the grey letterbox and the white plate go.
    const attempt = i % 2 === 0
      ? sharp(current).trim({ threshold: 18 })
      : sharp(current).trim({ background: '#ffffff', threshold: 18 })

    let next
    try {
      next = await attempt.toBuffer()
    } catch {
      break
    }

    const after = await sharp(next).metadata()
    if (!after.width || !after.height) break
    // Stop if a pass would cut away almost everything — that means the trim
    // reference was the product itself, not a background.
    if (after.width < before.width * 0.1 || after.height < before.height * 0.1) break
    if (after.width === before.width && after.height === before.height) {
      current = next
      break
    }
    current = next
    last = after
  }

  return { buffer: current, meta: last }
}

export async function normalise(src, dest, size = 1000, pad = 0.05) {
  await mkdir(dest.split('/').slice(0, -1).join('/'), { recursive: true })

  const meta = await sharp(src).metadata()
  const start = meta.hasAlpha
    ? await sharp(src).toBuffer()
    : await sharp(src).flatten({ background: '#ffffff' }).toBuffer()

  const { buffer } = await trimRepeatedly(start)

  const inner = Math.round(size * (1 - pad * 2))
  return sharp(buffer)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(dest)
}
