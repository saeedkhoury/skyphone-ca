import { readFileSync, writeFileSync } from 'node:fs'

/**
 * The store lists only real, branded products. "Gaming Headset Pro" and
 * "Fast Charger 65W" were invented placeholder SKUs with no manufacturer, so
 * they go; Steam Deck is a real product and moves to its actual brand, Valve.
 */
const FILE = 'src/lib/catalog/products.ts'
const DROP = new Set(['gaming-headset-pro', 'fast-charger-65w'])
const REBRAND = { 'steam-deck': 'valve' }

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

const kept = catalog.filter((p) => !DROP.has(p.slug))
for (const p of kept) if (REBRAND[p.slug]) p.brand = REBRAND[p.slug]

// displayOrder is unique per category+brand; moving Steam Deck to its own brand
// cannot collide, but renumber defensively so the invariant always holds.
const seen = new Map()
for (const p of kept) {
  const key = `${p.categoryId}/${p.brand}`
  const next = (seen.get(key) ?? 0) + 1
  seen.set(key, next)
  p.displayOrder = next
}

const j = (v) => JSON.stringify(v)
const body = kept
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
console.log(`removed ${catalog.length - kept.length} unbranded products, kept ${kept.length}`)
console.log('brands now:', [...new Set(kept.map((p) => p.brand))].join(', '))
