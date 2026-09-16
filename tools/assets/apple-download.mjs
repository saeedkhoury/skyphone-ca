import { grab } from './fetch.mjs'
import { normalise } from './trim.mjs'
import { APPLE } from './apple-map.mjs'
import { rm } from 'node:fs/promises'

const BASE = 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/'
const RAW = 'tools/assets/.raw'
const OUT = 'public/img/official'

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const report = []
for (const [product, spec] of Object.entries(APPLE)) {
  const jobs = spec.colours
    ? Object.entries(spec.colours).map(([c, keys]) => [slugify(c), keys])
    : [['default', spec.main]]

  for (const [colour, keys] of jobs) {
    let done = false
    for (const key of keys) {
      const url = `${BASE}${key}?wid=1400&hei=1400&fmt=png-alpha`
      const raw = `${RAW}/${product}-${colour}.png`
      const r = await grab(url, raw)
      if (!r.ok) continue
      try {
        await normalise(raw, `${OUT}/${product}-${colour}.png`, 1000)
        report.push({ product, colour, key, bytes: r.bytes, ok: true })
        done = true
        break
      } catch (e) {
        report.push({ product, colour, key, ok: false, why: e.message.slice(0, 50) })
      }
    }
    if (!done && !report.some((x) => x.product === product && x.colour === colour && x.ok)) {
      report.push({ product, colour, ok: false, why: 'no candidate resolved' })
    }
  }
}

await rm(RAW, { recursive: true, force: true })

const ok = report.filter((r) => r.ok)
const bad = report.filter((r) => !r.ok)
console.log(`downloaded ${ok.length}, failed ${bad.length}\n`)
for (const r of bad) console.log('  FAIL', r.product, '/', r.colour, '—', r.why)
