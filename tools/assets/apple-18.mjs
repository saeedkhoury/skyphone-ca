import { writeFile, mkdir } from 'node:fs/promises'
import { normalise } from './trim.mjs'

/**
 * iPhone 18 Pro and Pro Max official renders.
 *
 * Apple's key naming differs per family. The `-finish-<colour>-` keys on the
 * buy page are the colour SWATCHES - flat coloured circles - not renders. The
 * product renders use `finish-select` with the screen size in the key, which is
 * the same shape the iPhone 17 entries in apple-map.mjs already use:
 *
 *   iphone-18-pro-finish-select-202609-6-3inch-<colour>   Pro
 *   iphone-18-pro-finish-select-202609-6-9inch-<colour>   Pro Max
 */
const CDN = 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is'
const COLOURS = { black: 'Black', burgundy: 'Burgundy', glacier: 'Glacier', silver: 'Silver' }
const SIZES = { 'iphone-18-pro': '6-3inch', 'iphone-18-pro-max': '6-9inch' }

await mkdir('tools/assets/.raw', { recursive: true })

for (const [slug, inch] of Object.entries(SIZES)) {
  for (const [key, label] of Object.entries(COLOURS)) {
    const url = `${CDN}/iphone-18-pro-finish-select-202609-${inch}-${key}?wid=1400&hei=1400&fmt=png-alpha`
    const res = await fetch(url)
    if (!res.ok) { console.log(`  ${res.status} ${slug} ${label}`); continue }
    const raw = `tools/assets/.raw/${slug}-${key}.png`
    await writeFile(raw, Buffer.from(await res.arrayBuffer()))
    const out = `public/img/official/${slug}-${key}.png`
    await normalise(raw, out)
    console.log(`  ${slug} ${label} -> ${out}`)
  }
}
