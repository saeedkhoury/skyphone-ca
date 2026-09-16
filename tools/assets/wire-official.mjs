import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

/**
 * Points the catalogue at the official renders in /img/official where one
 * exists for that product and colour, leaving everything else untouched.
 * Rerunnable: it matches on the official path, not on what it replaced.
 */
const FILE = 'src/lib/catalog/products.ts'
const DIR = 'public/img/official'
const available = new Set(readdirSync(DIR).map((f) => f.replace(/\.png$/, '')))

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const src = readFileSync(FILE, 'utf8')
const start = src.indexOf('const catalog')
const a = src.indexOf('[', start)
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

let text = src
let mainCount = 0
let colourCount = 0

for (const p of catalog) {
  // Per-colour renders.
  for (const colour of p.colors ?? []) {
    const key = `${p.slug}-${slug(colour.name)}`
    if (!available.has(key)) continue
    const path = `/img/official/${key}.png`
    // Replace this colour's images array in place.
    const re = new RegExp(
      `(\\{ name: ${JSON.stringify(colour.name).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}, hex: "[^"]*")(?:, images: \\[[^\\]]*\\])?( \\})`,
    )
    const next = text.replace(re, `$1, images: ["${path}"]$2`)
    if (next !== text) {
      text = next
      colourCount += 1
    }
  }

  // Main product image.
  const mainKey = available.has(`${p.slug}-main`)
    ? `${p.slug}-main`
    : available.has(`${p.slug}-default`)
      ? `${p.slug}-default`
      : null

  const firstColourKey = (p.colors ?? [])
    .map((c) => `${p.slug}-${slug(c.name)}`)
    .find((k) => available.has(k))

  const chosen = mainKey ?? firstColourKey
  if (!chosen) continue

  const path = `/img/official/${chosen}.png`
  const block = text.slice(text.indexOf(`slug: "${p.slug}"`))
  const imageRe = /image: "([^"]+)"/
  const m = block.match(imageRe)
  if (m && m[1] !== path) {
    const idx = text.indexOf(`slug: "${p.slug}"`)
    const rel = block.replace(imageRe, `image: "${path}"`)
    text = text.slice(0, idx) + rel
    mainCount += 1
  }
}

writeFileSync(FILE, text)
console.log(`main images repointed: ${mainCount}`)
console.log(`colour images repointed: ${colourCount}`)
