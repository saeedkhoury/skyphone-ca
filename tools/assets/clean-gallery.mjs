import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Where a product has official manufacturer renders, the gallery should be
 * those renders and nothing else.
 *
 * Previously the official image was prepended to the existing list, so the old
 * synthetic mockups stayed in the thumbnail strip — including blank-screen
 * placeholders like iphone17promax-1.png. Selecting a colour then showed a
 * clean render while the thumbnails beside it showed cropped, low-quality
 * stand-ins for the same phone.
 */
const FILE = 'src/lib/catalog/products.ts'

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

let cleaned = 0
for (const p of catalog) {
  const officialColours = (p.colors ?? [])
    .flatMap((c) => c.images ?? [])
    .filter((i) => i.includes('/official/'))
  const officialMain = p.image.includes('/official/') ? [p.image] : []
  const official = [...new Set([...officialMain, ...officialColours])]

  if (official.length === 0) continue

  const before = JSON.stringify(p.images)
  p.images = official
  if (before !== JSON.stringify(p.images)) cleaned += 1
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
console.log(`cleaned galleries for ${cleaned} products`)
