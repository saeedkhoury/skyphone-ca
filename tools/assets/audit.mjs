import sharp from 'sharp'
import { readFileSync } from 'node:fs'

/**
 * Flags catalogue images that look synthetic rather than photographic: a
 * blank-screen mockup has very few distinct colours and low saturation
 * compared with a real product render.
 */
const src = readFileSync('src/lib/catalog/products.ts', 'utf8')
const s = src.indexOf('const catalog')
const a = src.indexOf('[', s)
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

const rows = []
for (const p of catalog) {
  const seen = new Set()
  const imgs = [p.image, ...p.images, ...(p.colors ?? []).flatMap((c) => c.images ?? [])]
  for (const rel of imgs) {
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    try {
      const img = sharp('public' + rel)
      const meta = await img.metadata()
      const stats = await img.stats()
      // Mean channel spread across R/G/B: a flat grey mockup sits near zero.
      const means = stats.channels.slice(0, 3).map((c) => c.mean)
      const spread = Math.max(...means) - Math.min(...means)
      const entropy = stats.entropy ?? 0
      rows.push({
        product: p.name,
        file: rel.replace('/img/', ''),
        dim: `${meta.width}x${meta.height}`,
        entropy: +entropy.toFixed(2),
        spread: +spread.toFixed(1),
      })
    } catch {
      rows.push({ product: p.name, file: rel, dim: 'MISSING', entropy: 0, spread: 0 })
    }
  }
}

rows.sort((x, y) => x.entropy - y.entropy)
console.log('LOWEST-DETAIL IMAGES (likely synthetic / blank mockups)\n')
console.log('entropy  spread  dim          product / file')
for (const r of rows.slice(0, 18)) {
  console.log(
    String(r.entropy).padStart(6),
    String(r.spread).padStart(7),
    r.dim.padEnd(12),
    r.product + '  —  ' + r.file,
  )
}
console.log(`\ntotal images checked: ${rows.length}`)
