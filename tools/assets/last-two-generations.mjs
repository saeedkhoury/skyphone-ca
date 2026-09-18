import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Narrows each brand to the two generations it currently ships, and adds the
 * new flagships with official renders.
 *
 * Prices are KSP's list price plus the ~9% this shop already charges over KSP
 * on the iPhone 17 line (4999->5490, 4599->4990, 3399->3690). They are market-
 * derived, not owner-approved, and must be confirmed before launch.
 *
 * Storage deltas follow the shop's own existing ladder (+450 / +950 / +1900),
 * not KSP's, so a shopper sees one consistent structure across the catalogue.
 */
const FILE = 'src/lib/catalog/products.ts'
const DROP = new Set(['iphone-15-pro', 'iphone-14', 'galaxy-s24-ultra'])

const img = (n) => `/img/official/${n}.png`
const APPLE_18_COLOURS = [
  ['Black', '#2b2b2e', 'black'],
  ['Burgundy', '#5c1f2b', 'burgundy'],
  ['Glacier', '#cfe0ef', 'glacier'],
  ['Silver', '#e8e8ea', 'silver'],
]
const appleColours = (slug) =>
  APPLE_18_COLOURS.map(([name, hex, key]) => ({ name, hex, images: [img(`${slug}-${key}`)] }))
const appleImages = (slug) => APPLE_18_COLOURS.map(([, , key]) => img(`${slug}-${key}`))

const ADD = [
  {
    id: '28', slug: 'iphone-18-pro-max', name: 'iPhone 18 Pro Max',
    categoryId: 'phones', brand: 'apple', icon: 'phone', badge: 'new',
    displayOrder: 10, price: 5990,
    image: img('iphone-18-pro-max-burgundy'),
    images: appleImages('iphone-18-pro-max'),
    colors: appleColours('iphone-18-pro-max'),
    storage: [
      { label: '256GB', delta: 0 }, { label: '512GB', delta: 450 },
      { label: '1TB', delta: 950 }, { label: '2TB', delta: 1900 },
    ],
    description: {
      he: 'iPhone 18 Pro Max — המסך הגדול ביותר, סוללה ליום שלם ושבב A20 Pro.',
      ar: 'iPhone 18 Pro Max — أكبر شاشة وبطارية ليوم كامل مع شريحة A20 Pro.',
      en: 'iPhone 18 Pro Max — the largest display, all-day battery, A20 Pro chip.',
    },
  },
  {
    id: '29', slug: 'iphone-18-pro', name: 'iPhone 18 Pro',
    categoryId: 'phones', brand: 'apple', icon: 'phone', badge: 'new',
    displayOrder: 20, price: 5490,
    image: img('iphone-18-pro-burgundy'),
    images: appleImages('iphone-18-pro'),
    colors: appleColours('iphone-18-pro'),
    storage: [
      { label: '256GB', delta: 0 }, { label: '512GB', delta: 450 }, { label: '1TB', delta: 950 },
    ],
    description: {
      he: 'iPhone 18 Pro — שבב A20 Pro, מערכת מצלמות מקצועית וגוף טיטניום.',
      ar: 'iPhone 18 Pro — شريحة A20 Pro ونظام كاميرات احترافي بهيكل تيتانيوم.',
      en: 'iPhone 18 Pro — A20 Pro chip, pro camera system, titanium body.',
    },
  },
  {
    id: '30', slug: 'galaxy-s26-ultra', name: 'Galaxy S26 Ultra',
    categoryId: 'phones', brand: 'samsung', icon: 'phone', badge: 'new',
    displayOrder: 10, price: 4290,
    image: img('galaxy-s26-ultra-violet'),
    images: [img('galaxy-s26-ultra-violet')],
    colors: [{ name: 'Violet', hex: '#6b5b9a', images: [img('galaxy-s26-ultra-violet')] }],
    storage: [{ label: '256GB', delta: 0 }, { label: '512GB', delta: 450 }],
    description: {
      he: 'Galaxy S26 Ultra — עט S Pen, מצלמת זום מתקדמת ובינה מלאכותית על המכשיר.',
      ar: 'Galaxy S26 Ultra — قلم S Pen وكاميرا تقريب متقدمة وذكاء اصطناعي على الجهاز.',
      en: 'Galaxy S26 Ultra — S Pen, advanced zoom camera, on-device AI.',
    },
  },
  {
    id: '31', slug: 'galaxy-s26', name: 'Galaxy S26',
    categoryId: 'phones', brand: 'samsung', icon: 'phone', badge: 'new',
    displayOrder: 20, price: 2990,
    image: img('galaxy-s26-violet'),
    images: [img('galaxy-s26-violet'), img('galaxy-s26-cream'), img('galaxy-s26-silver')],
    colors: [
      { name: 'Violet', hex: '#7a6bb0', images: [img('galaxy-s26-violet')] },
      { name: 'Cream', hex: '#e8d9c0', images: [img('galaxy-s26-cream')] },
      { name: 'Silver', hex: '#dcdde0', images: [img('galaxy-s26-silver')] },
    ],
    storage: [{ label: '256GB', delta: 0 }, { label: '512GB', delta: 350 }],
    description: {
      he: 'Galaxy S26 — מסך AMOLED חלק, מצלמה משודרגת וסוללה שמחזיקה יום שלם.',
      ar: 'Galaxy S26 — شاشة AMOLED سلسة وكاميرا مطوّرة وبطارية ليوم كامل.',
      en: 'Galaxy S26 — smooth AMOLED display, upgraded camera, all-day battery.',
    },
  },
]

/** The generation that just moved down a slot keeps its rank, one tier lower. */
const RENUMBER = {
  'iphone-17-pro-max': 30, 'iphone-17-pro': 40, 'iphone-17': 50,
  'galaxy-s25-ultra': 30, 'galaxy-s25': 40,
}

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
let catalog = eval(src.slice(a, b + 1))

const before = catalog.length
catalog = catalog.filter((p) => !DROP.has(p.slug))
for (const p of catalog) {
  if (RENUMBER[p.slug] !== undefined) p.displayOrder = RENUMBER[p.slug]
  // "New" belongs to the generation that actually just launched.
  if (p.categoryId === 'phones' && ['apple', 'samsung'].includes(p.brand)) delete p.badge
}
catalog = [...catalog, ...ADD]

const j = (v) => JSON.stringify(v)
const body = catalog
  .map((p) => {
    const lines = [
      `    id: ${j(p.id)},`, `    slug: ${j(p.slug)},`, `    name: ${j(p.name)},`,
      `    categoryId: ${j(p.categoryId)},`, `    brand: ${j(p.brand)},`, `    icon: ${j(p.icon)},`,
    ]
    if (p.badge) lines.push(`    badge: ${j(p.badge)},`)
    if (p.displayOrder !== undefined) lines.push(`    displayOrder: ${p.displayOrder},`)
    lines.push(`    price: ${p.price},`)
    lines.push(`    image: ${j(p.image)},`)
    lines.push(`    images: ${j(p.images)},`)
    if (p.colors?.length) {
      lines.push(`    colors: [${p.colors.map((c) => `{ name: ${j(c.name)}, hex: ${j(c.hex)}${c.images?.length ? `, images: ${j(c.images)}` : ''} }`).join(', ')}],`)
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
console.log(`${before} -> ${catalog.length} products (dropped ${DROP.size}, added ${ADD.length})`)
