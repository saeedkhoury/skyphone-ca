/**
 * A plain-Node stand-in for the catalogue-integrity half of query.test.ts.
 *
 * Vitest cannot run on the development machine - this checkout sits inside
 * iCloud Drive and every worker times out reading node_modules - so these
 * assertions were only ever being checked in CI. A duplicate product id
 * reached main that way. Run this before pushing a catalogue change.
 */
import { readFileSync, existsSync } from 'node:fs'

const src = readFileSync('src/lib/catalog/products.ts', 'utf8')
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

const CATEGORIES = ['phones', 'tablets', 'computers', 'gaming', 'cameras', 'accessories']
const BRANDS = ['apple', 'samsung', 'xiaomi', 'dell', 'sony', 'dji', 'valve']
const LAST = 999
const rank = (m, k) => m.get(k) ?? LAST
const cmp = (x, y) =>
  rank(new Map(CATEGORIES.map((c, i) => [c, i])), x.categoryId) - rank(new Map(CATEGORIES.map((c, i) => [c, i])), y.categoryId) ||
  rank(new Map(BRANDS.map((c, i) => [c, i])), x.brand) - rank(new Map(BRANDS.map((c, i) => [c, i])), y.brand) ||
  x.displayOrder - y.displayOrder ||
  x.slug.localeCompare(y.slug, 'en', { numeric: true })
const sorted = [...catalog].sort(cmp)

let failed = 0
const check = (label, ok, detail = '') => {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      ${detail}`}`)
}
const dupes = (xs) => [...new Set(xs.filter((v, i) => xs.indexOf(v) !== i))]

check('every product has a unique id', new Set(catalog.map((p) => p.id)).size === catalog.length,
  `duplicates: ${dupes(catalog.map((p) => p.id)).join(', ')}`)
check('every product has a unique slug', new Set(catalog.map((p) => p.slug)).size === catalog.length,
  `duplicates: ${dupes(catalog.map((p) => p.slug)).join(', ')}`)
check('every product is in a known category',
  catalog.every((p) => CATEGORIES.includes(p.categoryId)),
  catalog.filter((p) => !CATEGORIES.includes(p.categoryId)).map((p) => p.name).join(', '))
check('every product is a known brand', catalog.every((p) => BRANDS.includes(p.brand)),
  catalog.filter((p) => !BRANDS.includes(p.brand)).map((p) => p.name).join(', '))
check('every price is a positive whole number of shekels',
  catalog.every((p) => Number.isInteger(p.price) && p.price > 0))
check('no storage option drops the price to zero',
  catalog.every((p) => (p.storage ?? []).every((s) => p.price + s.delta > 0)))
check('every product has at least one image', catalog.every((p) => p.images.length > 0))
check('every image path is local', catalog.flatMap((p) => p.images).every((i) => i.startsWith('/img/')))
check('every referenced image file exists on disk', (() => {
  const missing = catalog.flatMap((p) => [p.image, ...p.images, ...(p.colors ?? []).flatMap((c) => c.images ?? [])])
    .filter((i) => !existsSync(`public${i}`))
  return missing.length === 0
})())
check('no official render is assigned to a product it does not name', (() => {
  const bad = catalog.flatMap((p) =>
    [p.image, ...p.images, ...(p.colors ?? []).flatMap((c) => c.images ?? [])]
      .filter((i) => i.includes('/official/') && !i.split('/').pop().replace('.png', '').startsWith(p.slug))
      .map((i) => `${p.slug} <- ${i}`))
  if (bad.length) console.log('      ' + bad.join('\n      '))
  return bad.length === 0
})())
check('every product is described in all three languages',
  catalog.every((p) => ['he', 'ar', 'en'].every((l) => p.description?.[l]?.trim())))
check('display position is unique within each category and brand',
  new Set(catalog.map((p) => `${p.categoryId}/${p.brand}/${p.displayOrder}`)).size === catalog.length)
check('display positions are positive integers',
  catalog.every((p) => Number.isInteger(p.displayOrder) && p.displayOrder > 0))
check('categories form one contiguous block each', (() => {
  const groups = sorted.map((p) => p.categoryId).filter((c, i, all) => i === 0 || all[i - 1] !== c)
  return new Set(groups).size === groups.length
})())

console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`} — ${catalog.length} products`)
process.exit(failed ? 1 : 0)
