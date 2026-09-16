import { readFileSync, writeFileSync, existsSync } from 'node:fs'

/**
 * Adds the DJI camera line. Only products with a verified official render are
 * included — the Mini 4 Pro is deliberately left out until its product shot is
 * sourced, rather than shipped with a lifestyle photo.
 *
 * Prices are indicative Israeli retail and, like every price in this catalogue,
 * need the owner's confirmation before launch.
 */
const FILE = 'src/lib/catalog/products.ts'

const NEW = [
  {
    id: '28',
    slug: 'dji-osmo-pocket-3',
    name: 'DJI Osmo Pocket 3',
    categoryId: 'cameras',
    brand: 'dji',
    icon: 'camera',
    badge: 'new',
    price: 2090,
    image: '/img/official/dji-osmo-pocket-3-main.png',
    images: ['/img/official/dji-osmo-pocket-3-main.png'],
    description: {
      he: 'DJI Osmo Pocket 3 — מצלמת כיס עם מייצב גימבל, חיישן 1 אינץ׳ ומסך מסתובב. וידאו יציב בלי ציוד נוסף.',
      ar: 'DJI Osmo Pocket 3 — كاميرا جيب بمثبّت جيمبال وحساس بحجم 1 إنش وشاشة دوّارة. فيديو ثابت دون معدات إضافية.',
      en: 'DJI Osmo Pocket 3 — a pocket camera with a gimbal stabiliser, a 1-inch sensor and a rotating screen. Steady video with no extra kit.',
    },
  },
  {
    id: '29',
    slug: 'dji-osmo-action-5-pro',
    name: 'DJI Osmo Action 5 Pro',
    categoryId: 'cameras',
    brand: 'dji',
    icon: 'camera',
    price: 1690,
    image: '/img/official/dji-osmo-action-5-pro-main.png',
    images: ['/img/official/dji-osmo-action-5-pro-main.png'],
    description: {
      he: 'DJI Osmo Action 5 Pro — מצלmat אקסטרים עמידה למים עם שני מסכי OLED וייצוב תמונה מתקדם.',
      ar: 'DJI Osmo Action 5 Pro — كاميرا أكشن مقاومة للماء بشاشتي OLED وتثبيت متقدم للصورة.',
      en: 'DJI Osmo Action 5 Pro — a waterproof action camera with two OLED screens and advanced image stabilisation.',
    },
  },
]

const src = readFileSync(FILE, 'utf8')
const head = src.slice(0, src.indexOf('const catalog'))
const tail = src.slice(src.indexOf('export const products'))
const a = src.indexOf('[', src.indexOf('const catalog'))
const b = src.lastIndexOf(']', src.indexOf('export const products'))
const catalog = eval(src.slice(a, b + 1))

const missing = NEW.filter((p) => !existsSync('public' + p.image))
if (missing.length) {
  console.error('missing images for:', missing.map((p) => p.slug).join(', '))
  process.exit(1)
}

const bySlug = new Set(catalog.map((p) => p.slug))
const added = NEW.filter((p) => !bySlug.has(p.slug))
const all = [...catalog, ...added]

// displayOrder is unique per category+brand.
const seen = new Map()
for (const p of all) {
  const key = `${p.categoryId}/${p.brand}`
  const next = (seen.get(key) ?? 0) + 1
  seen.set(key, next)
  p.displayOrder = next
}

const j = (v) => JSON.stringify(v)
const body = all
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
console.log(`added ${added.length} DJI products; catalogue now ${all.length}`)
