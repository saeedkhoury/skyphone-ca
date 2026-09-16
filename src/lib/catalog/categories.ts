import type { Brand, Category } from './types'

/** Shared browsing priority: phones, tablets, laptops, gaming, cameras, accessories. */
export const categories: readonly Category[] = [
  { id: 'phones', labelKey: 'cat_phones' },
  { id: 'tablets', labelKey: 'cat_tablets' },
  { id: 'computers', labelKey: 'cat_computers' },
  { id: 'gaming', labelKey: 'cat_gaming' },
  { id: 'cameras', labelKey: 'cat_cameras' },
  { id: 'accessories', labelKey: 'cat_accessories' },
]

export const brands: readonly Brand[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'samsung', name: 'Samsung' },
  { id: 'xiaomi', name: 'Xiaomi' },
  { id: 'dell', name: 'Dell' },
  { id: 'sony', name: 'Sony' },
  { id: 'dji', name: 'DJI' },
  { id: 'valve', name: 'Valve' },
]
