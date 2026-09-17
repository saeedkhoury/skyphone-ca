import { harvest } from './harvest.mjs'

const url = process.argv[2]
const host = process.argv[3] || undefined
const wait = Number(process.argv[4] || 5000)
const urls = await harvest(url, { host, wait })
console.log(urls.length, 'urls')
for (const u of urls) console.log(u)
