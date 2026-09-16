import { harvest } from './harvest.mjs'
import { writeFile } from 'node:fs/promises'

/**
 * Apple builds its colour pickers in JavaScript, so the finish keys only exist
 * in the rendered page. This records what each product page actually offers
 * instead of guessing key names.
 */
const PAGES = [
  ['iphone-17', 'https://www.apple.com/shop/buy-iphone/iphone-17'],
  ['iphone-17-pro', 'https://www.apple.com/shop/buy-iphone/iphone-17-pro'],
  ['iphone-16', 'https://www.apple.com/shop/buy-iphone/iphone-16'],
  ['ipad-air', 'https://www.apple.com/shop/buy-ipad/ipad-air'],
  ['ipad-pro', 'https://www.apple.com/shop/buy-ipad/ipad-pro'],
  ['ipad', 'https://www.apple.com/shop/buy-ipad/ipad'],
  ['macbook-air', 'https://www.apple.com/shop/buy-mac/macbook-air'],
  ['macbook-pro', 'https://www.apple.com/shop/buy-mac/macbook-pro'],
  ['watch-ultra', 'https://www.apple.com/shop/buy-watch/apple-watch-ultra'],
  ['watch-series', 'https://www.apple.com/shop/buy-watch/apple-watch'],
  ['airpods-pro', 'https://www.apple.com/shop/buy-airpods/airpods-pro-3'],
  ['airpods-4', 'https://www.apple.com/shop/buy-airpods/airpods-4'],
]

const HOST = 'store.storeimages.cdn-apple.com'
const out = {}

for (const [name, url] of PAGES) {
  try {
    const urls = await harvest(url, { host: HOST })
    // The "finish-select" family is the full-device shot per colour.
    const keys = new Set()
    for (const u of urls) {
      const m = u.match(/\/is\/([a-z0-9_-]*finish-select[a-z0-9_-]*)/i)
      if (m) keys.add(m[1])
    }
    out[name] = [...keys]
    console.log(`${name.padEnd(16)} ${urls.length} images, ${keys.size} finish keys`)
    ;[...keys].slice(0, 8).forEach((k) => console.log('    ' + k))
  } catch (e) {
    out[name] = []
    console.log(`${name.padEnd(16)} FAILED: ${e.message.slice(0, 70)}`)
  }
}

await writeFile('tools/assets/apple-keys.json', JSON.stringify(out, null, 2))
console.log('\nwrote tools/assets/apple-keys.json')
