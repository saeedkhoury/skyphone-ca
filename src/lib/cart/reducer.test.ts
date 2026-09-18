import { describe, it, expect } from 'vitest'
import {
  cartReducer,
  emptyCart,
  MAX_LINE_QUANTITY,
  MAX_UNIT_PRICE,
  MAX_CART_LINES,
} from './reducer'
import {
  selectSubtotal,
  selectLineCount,
  selectLine,
  selectIsEmpty,
} from './selectors'
import type { CartState } from './types'

const item = {
  productId: '1',
  variantId: 'natural-titanium-128gb',
  name: 'iPhone 18 Pro',
  variantName: 'Natural Titanium · 128GB',
  unitPrice: 4290,
  slug: 'iphone-18-pro',
}

const otherVariant = {
  ...item,
  variantId: 'blue-titanium-256gb',
  variantName: 'Blue Titanium · 256GB',
}
const otherProduct = {
  ...item,
  productId: '2',
  variantId: 'titanium-black-256gb',
  slug: 'galaxy-s26-ultra',
}

function addOnce(state: CartState = emptyCart, payload = item, quantity = 1): CartState {
  return cartReducer(state, { type: 'ADD_ITEM', item: payload, quantity })
}

describe('cartReducer — ADD_ITEM', () => {
  it('adds a new line to an empty cart', () => {
    const next = addOnce()
    expect(next.lines).toHaveLength(1)
    expect(next.lines[0].quantity).toBe(1)
    expect(next.lines[0].unitPrice).toBe(4290)
  })

  it('increments quantity when the same product and variant is added again', () => {
    const next = addOnce(addOnce())
    expect(next.lines).toHaveLength(1)
    expect(next.lines[0].quantity).toBe(2)
  })

  it('keeps different variants of the same product as separate lines', () => {
    const next = cartReducer(addOnce(), {
      type: 'ADD_ITEM',
      item: otherVariant,
      quantity: 1,
    })
    expect(next.lines).toHaveLength(2)
  })

  it('keeps different products as separate lines', () => {
    const next = cartReducer(addOnce(), {
      type: 'ADD_ITEM',
      item: otherProduct,
      quantity: 1,
    })
    expect(next.lines).toHaveLength(2)
  })

  it('clamps quantity to the per-line maximum', () => {
    const next = addOnce(emptyCart, item, MAX_LINE_QUANTITY + 50)
    expect(next.lines[0].quantity).toBe(MAX_LINE_QUANTITY)
  })

  it('clamps to the maximum when repeated adds would exceed it', () => {
    const next = addOnce(addOnce(emptyCart, item, MAX_LINE_QUANTITY), item, 5)
    expect(next.lines[0].quantity).toBe(MAX_LINE_QUANTITY)
  })

  it('ignores an add with a quantity below one', () => {
    const next = addOnce(emptyCart, item, 0)
    expect(next.lines).toHaveLength(0)
  })

  it('does not mutate the previous state', () => {
    const before = addOnce()
    const snapshot = JSON.stringify(before)
    addOnce(before)
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('returns a new state object rather than the same reference', () => {
    const before = emptyCart
    expect(addOnce(before)).not.toBe(before)
  })
})

describe('cartReducer — SET_QUANTITY', () => {
  it('changes the quantity of an existing line', () => {
    const next = cartReducer(addOnce(), {
      type: 'SET_QUANTITY',
      productId: item.productId,
      variantId: item.variantId,
      quantity: 4,
    })
    expect(next.lines[0].quantity).toBe(4)
  })

  it('removes the line when quantity is set to zero', () => {
    const next = cartReducer(addOnce(), {
      type: 'SET_QUANTITY',
      productId: item.productId,
      variantId: item.variantId,
      quantity: 0,
    })
    expect(next.lines).toHaveLength(0)
  })

  it('clamps an over-large quantity to the maximum', () => {
    const next = cartReducer(addOnce(), {
      type: 'SET_QUANTITY',
      productId: item.productId,
      variantId: item.variantId,
      quantity: 9999,
    })
    expect(next.lines[0].quantity).toBe(MAX_LINE_QUANTITY)
  })

  it('leaves the cart untouched when the line does not exist', () => {
    const before = addOnce()
    const next = cartReducer(before, {
      type: 'SET_QUANTITY',
      productId: 'ghost',
      variantId: 'ghost',
      quantity: 3,
    })
    expect(next.lines).toEqual(before.lines)
  })
})

describe('cartReducer — REMOVE_ITEM', () => {
  it('removes the matching line', () => {
    const next = cartReducer(addOnce(), {
      type: 'REMOVE_ITEM',
      productId: item.productId,
      variantId: item.variantId,
    })
    expect(next.lines).toHaveLength(0)
  })

  it('removes only the matching variant', () => {
    const two = cartReducer(addOnce(), { type: 'ADD_ITEM', item: otherVariant, quantity: 1 })
    const next = cartReducer(two, {
      type: 'REMOVE_ITEM',
      productId: item.productId,
      variantId: item.variantId,
    })
    expect(next.lines).toHaveLength(1)
    expect(next.lines[0].variantId).toBe(otherVariant.variantId)
  })

  it('is a no-op for a line that is not present', () => {
    const before = addOnce()
    const next = cartReducer(before, {
      type: 'REMOVE_ITEM',
      productId: 'ghost',
      variantId: 'ghost',
    })
    expect(next.lines).toEqual(before.lines)
  })
})

describe('cartReducer — CLEAR and HYDRATE', () => {
  it('empties the cart on CLEAR', () => {
    expect(cartReducer(addOnce(), { type: 'CLEAR' }).lines).toHaveLength(0)
  })

  it('replaces state on HYDRATE', () => {
    const stored = addOnce()
    expect(cartReducer(emptyCart, { type: 'HYDRATE', state: stored }).lines).toHaveLength(1)
  })

  it('falls back to an empty cart when hydrating malformed state', () => {
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: { lines: 'not-an-array' } as unknown as CartState,
    })
    expect(next.lines).toEqual([])
  })

  it('drops malformed lines when hydrating', () => {
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: { lines: [{ productId: 'x' }] } as unknown as CartState,
    })
    expect(next.lines).toEqual([])
  })
})

describe('cart selectors', () => {
  it('sums line totals into a subtotal', () => {
    const state = addOnce(addOnce(emptyCart, item, 2), otherProduct, 1)
    expect(selectSubtotal(state)).toBe(4290 * 2 + 4290)
  })

  it('returns a zero subtotal for an empty cart', () => {
    expect(selectSubtotal(emptyCart)).toBe(0)
  })

  it('counts total units rather than distinct lines', () => {
    const state = addOnce(emptyCart, item, 3)
    expect(selectLineCount(state)).toBe(3)
  })

  it('finds a line by product and variant', () => {
    const state = addOnce()
    expect(selectLine(state, item.productId, item.variantId)?.quantity).toBe(1)
  })

  it('returns undefined for a missing line', () => {
    expect(selectLine(emptyCart, 'nope', 'nope')).toBeUndefined()
  })
})

describe('selectIsEmpty', () => {
  it('reports an empty cart as empty', () => {
    expect(selectIsEmpty(emptyCart)).toBe(true)
  })

  it('reports a cart with lines as not empty', () => {
    expect(selectIsEmpty(addOnce())).toBe(false)
  })
})

describe('cartReducer — HYDRATE hardening against edited localStorage', () => {
  function storedLine(overrides: Record<string, unknown>) {
    return { ...item, quantity: 1, ...overrides }
  }

  it('drops a line whose price exceeds the sane maximum', () => {
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: {
        lines: [storedLine({ unitPrice: Number.MAX_SAFE_INTEGER })],
      } as unknown as CartState,
    })
    expect(next.lines).toEqual([])
  })

  it('keeps a line priced at exactly the maximum', () => {
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: { lines: [storedLine({ unitPrice: MAX_UNIT_PRICE })] } as unknown as CartState,
    })
    expect(next.lines).toHaveLength(1)
  })

  it('caps the number of restored lines', () => {
    const many = Array.from({ length: MAX_CART_LINES + 25 }, (_, i) =>
      storedLine({ variantId: `variant-${i}` }),
    )
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: { lines: many } as unknown as CartState,
    })
    expect(next.lines).toHaveLength(MAX_CART_LINES)
  })

  it('rejects a line carrying a __proto__ key without polluting Object.prototype', () => {
    const next = cartReducer(emptyCart, {
      type: 'HYDRATE',
      state: JSON.parse(
        '{"lines":[{"productId":"a","variantId":"b","name":"n","variantName":"v","slug":"s","unitPrice":100,"quantity":1,"__proto__":{"polluted":true}}]}',
      ) as CartState,
    })
    expect(next.lines).toHaveLength(1)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
