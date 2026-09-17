/**
 * Samsung official renders.
 *
 * Samsung serves product imagery from Scene7 under a `p6pim` path keyed by SKU.
 * The gallery preset (`$PD_GALLERY_PNG$`) only returns 802x615; swapping it for
 * `$product-details-png$` on the same base returns 1920x1280 with alpha, which
 * is what we want.
 *
 * Every product page also carries cross-sell imagery for other devices, so each
 * product here declares the model code that must appear in the URL. Matching on
 * anything looser is how an earlier pass put one product's render on another.
 */
import { harvest } from './harvest.mjs'
import { writeFile, mkdir } from 'node:fs/promises'

const PRODUCTS = [
  { slug: 'galaxy-s25-ultra', code: 'sm-s938', page: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/buy/' },
  { slug: 'galaxy-s25',       code: 'sm-s931', page: 'https://www.samsung.com/il/smartphones/galaxy-s25/buy/' },
  { slug: 'galaxy-tab-s9',    code: 'sm-x71',  page: 'https://www.samsung.com/il/tablets/galaxy-tab-s9/buy/' },
  { slug: 'galaxy-watch7',    code: 'sm-l30',  page: 'https://www.samsung.com/il/watches/galaxy-watch7/buy/' },
  { slug: 'galaxy-buds3',     code: 'sm-r530', page: 'https://www.samsung.com/il/audio-sound/galaxy-buds/galaxy-buds3/buy/' },
  // Galaxy S24 Ultra is deliberately absent: Samsung has delisted it on both
  // samsung.com/us and samsung.com/il, and those pages now serve current-
  // generation SKUs (s938/s942/s948) instead. There is no official render to
  // harvest for it.
]

await mkdir('tools/assets/.raw', { recursive: true })

for (const product of PRODUCTS) {
  let urls = []
  try {
    urls = await harvest(product.page, { host: 'images.samsung.com', wait: 8000 })
  } catch (error) {
    console.log(`${product.slug}: page failed - ${error.message}`)
    continue
  }

  // Keep only this product's own gallery renders, then reduce each to its
  // Scene7 base so the high-resolution preset can be requested instead.
  const bases = [...new Set(
    urls
      .filter((u) => u.includes('/p6pim/') && u.includes('/gallery/') && u.toLowerCase().includes(product.code))
      .map((u) => u.split('?')[0]),
  )]

  console.log(`${product.slug}: ${bases.length} gallery renders (code ${product.code})`)
  const manifest = bases.map((base, i) => ({ base, file: `tools/assets/.raw/${product.slug}-${i}.png` }))
  for (const entry of manifest) {
    const res = await fetch(`${entry.base}?$product-details-png$`)
    if (!res.ok) { console.log(`  ${res.status} ${entry.base.slice(-40)}`); continue }
    await writeFile(entry.file, Buffer.from(await res.arrayBuffer()))
    console.log(`  saved ${entry.file}`)
  }
}
