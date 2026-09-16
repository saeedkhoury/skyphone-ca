import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

/**
 * Rebuilds the catalogue's image paths deterministically.
 *
 * An earlier regex-based pass was not scoped per product, so shared colour
 * names ("Cosmic Orange" on both Pro and Pro Max, "Silver" on several models)
 * cross-assigned images. This parses the catalogue into objects, assigns each
 * image by exact product+colour, and re-serialises — no positional matching.
 */
const FILE = 'src/lib/catalog/products.ts'
const OFFICIAL = 'public/img/official'
const available = new Set(readdirSync(OFFICIAL).map((f) => f.replace(/\.png$/, '')))

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

/** Original naming convention, used when no official render exists. */
function legacyColourImage(product, colourName) {
  const stem = product.slug.replace(/-/g, '')
  const c = colourName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const guesses = [
    `/img/${stem}-${c}-1.png`,
    `/img/${product.slug}-${c}-1.png`,
  ]
  return guesses.find((g) => existsSync('public' + g))
}

let fixed = 0
for (const p of catalog) {
  for (const colour of p.colors ?? []) {
    const key = `${p.slug}-${slug(colour.name)}`
    if (available.has(key)) {
      const next = [`/img/official/${key}.png`]
      if (JSON.stringify(colour.images) !== JSON.stringify(next)) fixed += 1
      colour.images = next
      continue
    }
    // No official render: keep a real image for this exact colour, never
    // another product's.
    const current = colour.images?.[0]
    const isForeign = current?.includes('/official/') && !current.includes(`/${p.slug}-`)
    if (!current || isForeign) {
      const legacy = legacyColourImage(p, colour.name)
      if (legacy) {
        colour.images = [legacy]
        fixed += 1
      } else if (isForeign) {
        delete colour.images
        fixed += 1
      }
    }
  }

  const mainCandidates = [
    `${p.slug}-main`,
    `${p.slug}-default`,
    ...(p.colors ?? []).map((c) => `${p.slug}-${slug(c.name)}`),
  ]
  const main = mainCandidates.find((k) => available.has(k))
  if (main) p.image = `/img/official/${main}.png`

  // The gallery leads with the main image, then keeps the shop's other angles.
  const others = p.images.filter((i) => !i.includes('/official/') && i !== p.image)
  p.images = [...new Set([p.image, ...others])]
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
        .map(
          (c) =>
            `{ name: ${j(c.name)}, hex: ${j(c.hex)}${c.images?.length ? `, images: ${j(c.images)}` : ''} }`,
        )
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
console.log(`rewired ${fixed} image assignments across ${catalog.length} products`)
