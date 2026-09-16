import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

export async function grab(url, dest, { referer } = {}) {
  const headers = { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,*/*' }
  if (referer) headers.Referer = referer
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok) return { ok: false, status: res.status }
  const buf = Buffer.from(await res.arrayBuffer())
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return { ok: false, status: `not-image:${type}` }
  if (buf.length < 3000) return { ok: false, status: `too-small:${buf.length}` }
  await mkdir(dest.split('/').slice(0, -1).join('/'), { recursive: true })
  await writeFile(dest, buf)
  return { ok: true, bytes: buf.length, type }
}
