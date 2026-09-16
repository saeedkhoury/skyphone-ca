import { harvest } from './harvest.mjs'

const PAGES = [
  ['osmo-pocket-3', 'https://www.dji.com/osmo-pocket-3'],
  ['mini-4-pro', 'https://www.dji.com/mini-4-pro'],
]
for (const [name, url] of PAGES) {
  try {
    const urls = await harvest(url, { wait: 5000 })
    const prod = urls.filter((u) => /dji|cms|product/i.test(u))
    console.log(`\n=== ${name}: ${urls.length} images (${prod.length} plausible) ===`)
    prod.slice(0, 10).forEach((u) => console.log('  ' + u.slice(0, 130)))
  } catch (e) {
    console.log(`\n=== ${name} FAILED: ${e.message.slice(0, 80)}`)
  }
}
