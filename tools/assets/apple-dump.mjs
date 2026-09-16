import { harvest } from './harvest.mjs'
import { writeFile } from 'node:fs/promises'

const PAGES = [
  ['ipad-air', 'https://www.apple.com/shop/buy-ipad/ipad-air'],
  ['macbook-air', 'https://www.apple.com/shop/buy-mac/macbook-air'],
  ['watch-ultra', 'https://www.apple.com/shop/buy-watch/apple-watch-ultra'],
  ['airpods-pro', 'https://www.apple.com/shop/buy-airpods/airpods-pro-3'],
]
const out = {}
for (const [name, url] of PAGES) {
  try {
    const urls = await harvest(url, { host: 'store.storeimages.cdn-apple.com' })
    // Keep the image "key" (the /is/<key> segment) which is what the CDN
    // resizes; query strings vary per call site.
    const keys = [...new Set(urls.map((u) => (u.match(/\/is\/([^?]+)/) || [])[1]).filter(Boolean))]
    out[name] = keys
    console.log(`\n=== ${name}: ${keys.length} keys ===`)
    keys.slice(0, 18).forEach((k) => console.log('  ' + k))
  } catch (e) {
    console.log(`${name} FAILED ${e.message.slice(0,60)}`)
  }
}
await writeFile('tools/assets/apple-all-keys.json', JSON.stringify(out, null, 2))
