import { readFileSync, writeFileSync } from 'node:fs'

/**
 * displayOrder is a curated merchandising position (10, 20, 30 ...), newest
 * first within a category and brand — not an array index. The image-rewiring
 * scripts renumbered it sequentially and destroyed that intent, which is what
 * broke the ordering tests. This restores each product's original value by
 * slug and assigns positions to the newly added ones.
 */
const FILE = 'src/lib/catalog/products.ts'

function parse(src) {
  const a = src.indexOf('[', src.indexOf('const catalog'))
  const b = src.lastIndexOf(']', src.indexOf('export const products'))
  return eval(src.slice(a, b + 1))
}

const original = parse(readFileSync('/tmp/products-orig.ts', 'utf8'))
const originalOrder = new Map(original.map((p) => [p.slug, p.displayOrder]))

// Products added after that commit, positioned within their category+brand.
const ADDED = { 'dji-osmo-pocket-3': 10, 'dji-osmo-action-5-pro': 20 }

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const catalog = parse(src)

let restored = 0
for (const p of catalog) {
  const want = originalOrder.get(p.slug) ?? ADDED[p.slug]
  if (want === undefined) {
    console.warn('no known position for', p.slug)
    continue
  }
  if (p.displayOrder !== want) restored += 1
  p.displayOrder = want
}

const j = (v) => JSON.stringify(v)
const body = catalog
  .map((p) => {
    const lines = [
      `    id: ${j(p.id)},`,
      `    slug: ${j(p.slug)},`,
      `    name: ${j(p.name)},`,
      `    categoryId: ${j(p.categoryId)},`,
      `    brand: ${j(p.brand)},`,
      `    icon: ${j(p.icon)},`,
    ]
    if (p.badge) lines.push(`    badge: ${j(p.badge)},`)
    lines.push(`    displayOrder: ${p.displayOrder},`)
    lines.push(`    price: ${p.price},`)
    lines.push(`    image: ${j(p.image)},`)
    lines.push(`    images: ${j(p.images)},`)
    if (p.colors?.length) {
      lines.push(
        `    colors: [${p.colors
          .map((c) => `{ name: ${j(c.name)}, hex: ${j(c.hex)}${c.images?.length ? `, images: ${j(c.images)}` : ''} }`)
          .join(', ')}],`,
      )
    }
    if (p.storage?.length) {
      lines.push(`    storage: [${p.storage.map((s) => `{ label: ${j(s.label)}, delta: ${s.delta} }`).join(', ')}],`)
    }
    if (p.variant2Label) lines.push(`    variant2Label: ${j(p.variant2Label)},`)
    lines.push('    description: {')
    lines.push(`      he: ${j(p.description.he)},`)
    lines.push(`      ar: ${j(p.description.ar)},`)
    lines.push(`      en: ${j(p.description.en)},`)
    lines.push('    },')
    return `  {\n${lines.join('\n')}\n  },`
  })
  .join('\n')

writeFileSync(FILE, `${head}const catalog: readonly Product[] = [\n${body}\n]\n\n${tail}`)
console.log(`restored ${restored} display positions`)
