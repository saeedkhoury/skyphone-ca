import { harvest } from './harvest.mjs'
const urls = await harvest('https://www.apple.com/shop/buy-ipad/ipad', {
  host: 'store.storeimages.cdn-apple.com',
})
const keys = [...new Set(urls.map((u) => (u.match(/\/is\/([^?]+)/) || [])[1]).filter(Boolean))]
console.log('iPad keys mentioning colour/finish/select:')
keys.filter((k) => /finish|select|blue|pink|silver|yellow|ipad-11|ipad-a16/i.test(k)).forEach((k) => console.log('  ' + k))
