import { harvest } from './harvest.mjs'
import { grab } from './fetch.mjs'
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

// Widen the net for the Mini 4 Pro: the first pass only surfaced batteries and
// propeller guards, not the aircraft itself.
const urls = await harvest('https://www.dji.com/mini-4-pro', { wait: 6000 })
const cands = urls
  .filter((u) => u.includes('djiits.com') || u.includes('djicdn.com'))
  .filter((u) => /\.(png|jpe?g)(\?|$)/i.test(u))
  .slice(0, 40)

await mkdir('tools/assets/.dji/mini-wide', { recursive: true })
const good = []
for (const [i, u] of cands.entries()) {
  const dest = `tools/assets/.dji/mini-wide/${i}.png`
  const r = await grab(u, dest, { referer: 'https://www.dji.com/' })
  if (!r.ok) continue
  try {
    const m = await sharp(dest).metadata()
    const area = (m.width ?? 0) * (m.height ?? 0)
    if (area < 300_000) continue
    good.push({ i, w: m.width, h: m.height, alpha: m.hasAlpha })
  } catch {}
}
good.sort((a, b) => b.w * b.h - a.w * a.h)
console.log('candidates:', good.slice(0, 12).map((g) => `[${g.i}]${g.w}x${g.h}${g.alpha ? 'a' : ''}`).join(' '))
