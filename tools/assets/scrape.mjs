const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

export async function page(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

/** Pulls image URLs off a page, de-duped, optionally filtered. */
export function imageUrls(html, { host, include = [], exclude = [] } = {}) {
  const re = /https?:\/\/[^"'\\\s)]+?\.(?:png|jpe?g|webp|avif)(?:\?[^"'\\\s)]*)?/gi
  const all = [...html.matchAll(re)].map((m) => m[0])
  return [...new Set(all)].filter((u) => {
    if (host && !u.includes(host)) return false
    if (include.length && !include.some((k) => u.toLowerCase().includes(k))) return false
    if (exclude.some((k) => u.toLowerCase().includes(k))) return false
    return true
  })
}
