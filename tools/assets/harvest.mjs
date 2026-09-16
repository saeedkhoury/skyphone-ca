import { chromium } from '@playwright/test'

/**
 * Collects product-image URLs from a rendered page: manufacturer sites build
 * their galleries in JavaScript, so the raw HTML carries none of them.
 */
export async function harvest(url, { include = [], exclude = [], host, wait = 3500 } = {}) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    locale: 'en-US',
  })
  const page = await ctx.newPage()
  const seen = new Set()

  page.on('response', (res) => {
    const u = res.url()
    if (/\.(png|jpe?g|webp|avif)(\?|$)/i.test(u)) seen.add(u)
  })

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(wait)
    // Scroll so lazy galleries mount.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
      }
    })
    await page.waitForTimeout(1500)

    const dom = await page.evaluate(() => {
      const out = []
      for (const img of document.querySelectorAll('img')) {
        if (img.currentSrc) out.push(img.currentSrc)
        if (img.src) out.push(img.src)
        const ss = img.getAttribute('srcset')
        if (ss) ss.split(',').forEach((p) => out.push(p.trim().split(/\s+/)[0]))
      }
      for (const src of document.querySelectorAll('source[srcset]')) {
        src.getAttribute('srcset').split(',').forEach((p) => out.push(p.trim().split(/\s+/)[0]))
      }
      return out
    })
    dom.forEach((u) => { if (/^https?:/.test(u)) seen.add(u) })
  } catch (e) {
    await browser.close()
    throw e
  }
  await browser.close()

  return [...seen].filter((u) => {
    if (host && !u.includes(host)) return false
    const l = u.toLowerCase()
    if (include.length && !include.some((k) => l.includes(k))) return false
    if (exclude.some((k) => l.includes(k))) return false
    return true
  })
}
