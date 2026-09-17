import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Assigns the harvested Samsung renders by exact product and colour.
 *
 * Parses the catalogue into objects and re-serialises, the same way rewire.mjs
 * does: an earlier regex pass was not scoped per product and cross-assigned
 * images between models that share a colour name.
 *
 * Where a product gains official renders its gallery becomes only those, and
 * per-colour overrides that still point at legacy mockups are dropped so every
 * swatch falls back to the official gallery rather than a bad image.
 */
const FILE = 'src/lib/catalog/products.ts'

const ASSIGN = {
  'galaxy-s25': {
    images: ['/img/official/galaxy-s25-mint.png'],
    colour: 'Mint',
  },
  'galaxy-s25-ultra': {
    images: [
      '/img/official/galaxy-s25-ultra-titanium-silverblue.png',
      '/img/official/galaxy-s25-ultra-titanium-silverblue-back.png',
    ],
    colour: 'Titanium Silverblue',
  },
}

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

let changed = 0
for (const p of catalog) {
  const spec = ASSIGN[p.slug]
  if (!spec) continue
  p.image = spec.images[0]
  p.images = [...spec.images]
  for (const colour of p.colors ?? []) {
    if (colour.name === spec.colour) colour.images = [spec.images[0]]
    else delete colour.images
  }
  changed += 1
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
    if (p.displayOrder !== undefined) lines.push(`    displayOrder: ${p.displayOrder},`)
    lines.push(`    price: ${p.price},`)
    lines.push(`    image: ${j(p.image)},`)
    lines.push(`    images: ${j(p.images)},`)
    if (p.colors?.length) {
      const cols = p.colors
        .map((c) => `{ name: ${j(c.name)}, hex: ${j(c.hex)}${c.images?.length ? `, images: ${j(c.images)}` : ''} }`)
        .join(', ')
      lines.push(`    colors: [${cols}],`)
    }
    if (p.storage?.length) {
      const st = p.storage.map((s) => `{ label: ${j(s.label)}, delta: ${s.delta} }`).join(', ')
      lines.push(`    storage: [${st}],`)
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
console.log(`wired official renders into ${changed} products`)
