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
  { slug: 'galaxy-s26-ultra', code: 'sm-s948', page: 'https://www.samsung.com/il/smartphones/galaxy-s26-ultra/buy/' },
  { slug: 'galaxy-s26',       code: 'sm-s942', page: 'https://www.samsung.com/il/smartphones/galaxy-s26/buy/' },
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
