import { describe, it, expect } from 'vitest'
import {
  searchProducts,
  filterByCategory,
  filterByBrand,
  sortProducts,
  getProductBySlug,
  getHighlights,
  getProductsByCategory,
  getBadgedProducts,
  priceForVariant,
} from './query'
import { products } from './products'
import { categories, brands } from './categories'
import { LOCALES } from '@/lib/i18n/config'

describe('catalogue integrity', () => {
  it('carries the shop’s full catalogue', () => {
    expect(products).toHaveLength(27)
  })

  it('gives every product a unique slug', () => {
    const slugs = products.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every product a unique id', () => {
    const ids = products.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('assigns every product to a known category', () => {
    const known = new Set(categories.map((c) => c.id))
    expect(products.every((p) => known.has(p.categoryId as never))).toBe(true)
  })

  it('assigns every product to a known brand', () => {
    const known = new Set<string>(brands.map((b) => b.id))
    const unknown = products.filter((p) => !known.has(p.brand)).map((p) => p.name)
    expect(unknown).toEqual([])
  })

  it('prices every product as a positive whole number of shekels', () => {
    const bad = products.filter((p) => !Number.isInteger(p.price) || p.price <= 0)
    expect(bad).toEqual([])
  })

  it('gives every product at least one image', () => {
    expect(products.every((p) => p.images.length > 0)).toBe(true)
  })

  it('points every product at a local image path, never a remote URL', () => {
    const remote = products.flatMap((p) => p.images).filter((src) => !src.startsWith('/img/'))
    expect(remote).toEqual([])
  })

  it('describes every product in all three languages', () => {
    const gaps = products.flatMap((p) =>
      LOCALES.filter((locale) => !p.description[locale]?.trim()).map(
        (locale) => `${p.name}/${locale}`,
      ),
    )
    expect(gaps).toEqual([])
  })

  it('never offers a storage option that lowers the price below zero', () => {
    const bad = products.filter((p) =>
      (p.storage ?? []).some((s) => p.price + s.delta <= 0),
    )
    expect(bad).toEqual([])
  })
})

describe('priceForVariant', () => {
  it('returns the base price when no storage option is chosen', () => {
    const product = products[0]
    expect(priceForVariant(product)).toBe(product.price)
  })

  it('adds the storage delta', () => {
    const product = products.find((p) => (p.storage?.length ?? 0) > 1)!
    const upgrade = product.storage![1]
    expect(priceForVariant(product, upgrade.label)).toBe(product.price + upgrade.delta)
  })

  it('falls back to the base price for an unknown storage label', () => {
    const product = products[0]
    expect(priceForVariant(product, 'no-such-option')).toBe(product.price)
  })
})

describe('searchProducts', () => {
  it('returns everything for an empty query', () => {
    expect(searchProducts(products, '', 'en')).toHaveLength(products.length)
  })

  it('returns everything for a whitespace query', () => {
    expect(searchProducts(products, '   ', 'en')).toHaveLength(products.length)
  })

  it('matches a product name case-insensitively', () => {
    const results = searchProducts(products, 'IPHONE', 'en')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => /iphone/i.test(p.name))).toBe(true)
  })

  it('matches a partial name', () => {
    expect(searchProducts(products, 'galax', 'en').length).toBeGreaterThan(0)
  })

  it('matches on the brand', () => {
    const results = searchProducts(products, 'samsung', 'en')
    expect(results.some((p) => p.brand === 'samsung')).toBe(true)
  })

  it('searches the Hebrew description when the locale is Hebrew', () => {
    const target = products[0]
    const word = target.description.he.split(' ')[0]
    expect(searchProducts(products, word, 'he').length).toBeGreaterThan(0)
  })

  it('searches the Arabic description when the locale is Arabic', () => {
    const target = products[0]
    const word = target.description.ar.split(' ')[0]
    expect(searchProducts(products, word, 'ar').length).toBeGreaterThan(0)
  })

  it('returns nothing when there is no match', () => {
    expect(searchProducts(products, 'zzzzqqqq', 'en')).toEqual([])
  })

  it('ranks an exact name match first', () => {
    const results = searchProducts(products, 'Steam Deck', 'en')
    expect(results[0].name).toBe('Steam Deck')
  })

  it('does not mutate the source array', () => {
    const before = [...products]
    searchProducts(products, 'pro', 'en')
    expect(products).toEqual(before)
  })
})

describe('filterByCategory', () => {
  it('returns only products in that category', () => {
    const results = filterByCategory(products, 'phones')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.categoryId === 'phones')).toBe(true)
  })

  it('returns everything for "all"', () => {
    expect(filterByCategory(products, 'all')).toHaveLength(products.length)
  })

  it('returns nothing for an unknown category', () => {
    expect(filterByCategory(products, 'nope')).toEqual([])
  })
})

describe('filterByBrand', () => {
  it('returns only that brand', () => {
    const results = filterByBrand(products, 'apple')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.brand === 'apple')).toBe(true)
  })

  it('returns everything for "all"', () => {
    expect(filterByBrand(products, 'all')).toHaveLength(products.length)
  })
})

describe('sortProducts', () => {
  it('sorts by price ascending', () => {
    const prices = sortProducts(products, 'price-asc').map((p) => p.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('sorts by price descending', () => {
    const prices = sortProducts(products, 'price-desc').map((p) => p.price)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })

  it('sorts by name', () => {
    const names = sortProducts(products, 'name').map((p) => p.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('uses the shared newest-first order for default, newest, and legacy featured sorting', () => {
    const shuffled = [...products].reverse()
    expect(sortProducts(shuffled)).toEqual(products)
    expect(sortProducts(shuffled, 'newest')).toEqual(products)
    expect(sortProducts(shuffled, 'featured')).toEqual(products)
  })

  it('returns a new array rather than sorting in place', () => {
    const before = [...products]
    sortProducts(products, 'price-desc')
    expect(products).toEqual(before)
  })
})

describe('consistent merchandising', () => {
  const names = (items: readonly { name: string }[]) => items.map((product) => product.name)
  const iphones = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17', 'iPhone 15 Pro', 'iPhone 14']

  it('requires a unique positive display position within each category and brand', () => {
    expect(products.every((product) => Number.isInteger(product.displayOrder) && product.displayOrder > 0)).toBe(true)
    const positions = products.map((product) => `${product.categoryId}/${product.brand}/${product.displayOrder}`)
    expect(new Set(positions).size).toBe(products.length)
  })

  it('groups categories in browsing order, one contiguous block each', () => {
    const groups = products.map((product) => product.categoryId).filter((category, index, all) => index === 0 || all[index - 1] !== category)
    expect(groups).toEqual(['phones', 'tablets', 'computers', 'gaming', 'cameras', 'accessories'])
  })

  it('keeps Apple generations newest first and Pro Max ahead of Pro and base', () => {
    expect(names(filterByBrand(getProductsByCategory('phones'), 'apple'))).toEqual(iphones)
    expect(names(getHighlights('apple', 3))).toEqual(iphones.slice(0, 3))
    expect(names(getBadgedProducts(3))).toEqual(iphones.slice(0, 3))
  })

  it('orders Samsung generations and premium variants consistently', () => {
    expect(names(getHighlights('samsung', 3))).toEqual(['Galaxy S25 Ultra', 'Galaxy S25', 'Galaxy S24 Ultra'])
  })

  it('orders tablets, laptops, Sony products, and accessories independently of badges', () => {
    expect(names(filterByBrand(getProductsByCategory('tablets'), 'apple'))).toEqual(['iPad Pro', 'iPad Air', 'iPad'])
    expect(names(filterByBrand(getProductsByCategory('computers'), 'apple'))).toEqual(['MacBook Pro 14"', 'MacBook Air'])
    expect(names(getHighlights('sony', 2))).toEqual(['PlayStation 5', 'PS5 DualSense'])
    expect(names(filterByBrand(getProductsByCategory('accessories'), 'apple'))).toEqual(['AirPods 4', 'Apple Watch Ultra 2', 'Apple Watch S9', 'AirPods Pro 2'])
  })

  it('does not let an older model’s badge override a newer model', () => {
    const older = { ...getProductBySlug('iphone-15-pro')!, badge: 'new' }
    const newer = { ...getProductBySlug('iphone-17-pro-max')!, badge: undefined }
    expect(names(sortProducts([older, newer]))).toEqual([newer.name, older.name])
  })

  it('places a future iPhone 16 catalog entry between generations 17 and 15', () => {
    // A test fixture only; no model, price, or availability is added to the store.
    const fixture = { ...getProductBySlug('iphone-17-pro-max')!, slug: 'test-iphone-16-pro-max', name: 'iPhone 16 Pro Max', displayOrder: 40 }
    const source = [...filterByBrand(getProductsByCategory('phones'), 'apple'), fixture].reverse()
    expect(names(sortProducts(source))).toEqual([...iphones.slice(0, 3), fixture.name, ...iphones.slice(3)])
    expect(source[0]).toEqual(fixture)
  })

  it('orders equally relevant search results consistently in every language', () => {
    for (const locale of LOCALES) {
      expect(names(searchProducts([...products].reverse(), 'iphone', locale))).toEqual(iphones)
      expect(names(searchProducts([...products].reverse(), 'apple', locale)).slice(0, 5)).toEqual(iphones)
      expect(searchProducts([...products].reverse(), '', locale)).toEqual(products)
      // A specifically requested older product should still be the first hit.
      expect(searchProducts(products, 'iPhone 14', locale)[0].slug).toBe('iphone-14')
    }
  })
})

describe('lookups', () => {
  it('finds a product by slug', () => {
    expect(getProductBySlug('iphone-15-pro')?.name).toBe('iPhone 15 Pro')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getProductBySlug('nope')).toBeUndefined()
  })

  it('returns highlights for a brand', () => {
    const highlights = getHighlights('apple', 4)
    expect(highlights.length).toBeGreaterThan(0)
    expect(highlights.every((p) => p.brand === 'apple')).toBe(true)
  })

  it('caps highlights at the requested count', () => {
    expect(getHighlights('apple', 2)).toHaveLength(2)
  })

  it('looks up a category from the full catalogue', () => {
    expect(getProductsByCategory('gaming').every((p) => p.categoryId === 'gaming')).toBe(true)
  })
})
