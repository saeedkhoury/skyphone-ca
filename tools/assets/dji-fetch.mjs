import { harvest } from './harvest.mjs'
import { grab } from './fetch.mjs'
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * DJI serves hash-named assets, so the product shot cannot be identified from
 * the URL. This downloads the plausible candidates and ranks them the way a
 * person would skim them: a clean render is a large, roughly square PNG with
 * transparency and a lot of empty space around the subject.
 */
const PAGES = [
  ['osmo-pocket-3', 'https://www.dji.com/osmo-pocket-3'],
  ['mini-4-pro', 'https://www.dji.com/mini-4-pro'],
  ['osmo-action-5-pro', 'https://www.dji.com/osmo-action-5-pro'],
]

for (const [name, url] of PAGES) {
  let urls = []
  try {
    urls = await harvest(url, { wait: 5000 })
  } catch (e) {
    console.log(name, 'harvest failed:', e.message.slice(0, 60))
    continue
  }

  const candidates = urls
    .filter((u) => u.includes('djiits.com') || u.includes('djicdn.com'))
    .filter((u) => /\.png(\?|$)/i.test(u))
    .slice(0, 16)

  await mkdir(`tools/assets/.dji/${name}`, { recursive: true })
  const scored = []

  for (const [i, u] of candidates.entries()) {
    const dest = `tools/assets/.dji/${name}/${i}.png`
    const r = await grab(u, dest, { referer: 'https://www.dji.com/' })
    if (!r.ok) continue
    try {
      const meta = await sharp(dest).metadata()
      const stats = await sharp(dest).stats()
      const area = (meta.width ?? 0) * (meta.height ?? 0)
      const ratio = (meta.width ?? 1) / (meta.height ?? 1)
      const squarish = ratio > 0.55 && ratio < 1.9
      if (!meta.hasAlpha || area < 200_000 || !squarish) continue
      scored.push({ i, u, w: meta.width, h: meta.height, entropy: stats.entropy ?? 0 })
    } catch {}
  }

  scored.sort((a, b) => b.w * b.h - a.w * a.h)
  console.log(`\n=== ${name}: ${scored.length} viable renders ===`)
  scored.slice(0, 6).forEach((s) => console.log(`  [${s.i}] ${s.w}x${s.h} entropy=${s.entropy.toFixed(2)}`))
}
