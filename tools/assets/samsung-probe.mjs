import { harvest } from './harvest.mjs'

const PAGES = [
  ['s25', 'https://www.samsung.com/us/smartphones/galaxy-s25/buy/'],
  ['s25-global', 'https://www.samsung.com/levant/smartphones/galaxy-s25/'],
]
for (const [name, url] of PAGES) {
  try {
    const urls = await harvest(url, { host: 'images.samsung.com' })
    console.log(`\n=== ${name}: ${urls.length} samsung-cdn images ===`)
    urls.slice(0, 14).forEach((u) => console.log('  ' + u.slice(0, 145)))
  } catch (e) {
    console.log(`\n=== ${name} FAILED: ${e.message.slice(0, 90)}`)
  }
}
