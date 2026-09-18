import { describe, it, expect } from 'vitest'
import { respond } from './respond'
import en from '@/lib/i18n/messages/en.json'
import he from '@/lib/i18n/messages/he.json'
import ar from '@/lib/i18n/messages/ar.json'

describe('respond — shop facts', () => {
  it('answers an opening-hours question', () => {
    expect(respond('what are your opening hours?').intent).toBe('hours')
  })

  it('answers a location question', () => {
    expect(respond('where are you?').intent).toBe('where')
  })

  it('answers a phone question', () => {
    expect(respond('what is your phone number').intent).toBe('phone')
  })

  it('answers a delivery question', () => {
    expect(respond('do you do delivery?').intent).toBe('delivery')
  })

  it('answers a warranty question', () => {
    expect(respond('is there a warranty?').intent).toBe('warranty')
  })

  it('answers a trade-in question', () => {
    expect(respond('can I trade in my old device').intent).toBe('tradein')
  })

  it('offers a human when asked for one', () => {
    expect(respond('I want to talk to a person').intent).toBe('human')
  })
})

describe('respond — repairs never quote a price', () => {
  it('asks which repair rather than naming a figure', () => {
    expect(respond('I need a repair').intent).toBe('repair')
  })

  it('answers turnaround time for "how long"', () => {
    expect(respond('how long does a repair take?').intent).toBe('repair_time')
  })

  it('never returns an answer containing a shekel amount for a repair intent', () => {
    const repairIntents = [
      respond('screen repair'),
      respond('battery replacement'),
      respond('how long will the repair take'),
      respond('תיקון מסך'),
      respond('إصلاح شاشة'),
    ]

    const decks = { en, he, ar } as Record<string, Record<string, string>>
    for (const reply of repairIntents) {
      for (const deck of Object.values(decks)) {
        const text = deck[reply.messageKey] ?? ''
        expect(text).not.toMatch(/₪|\bILS\b/)
      }
    }
  })

  it('returns no product cards for a bare repair question', () => {
    expect(respond('my screen is cracked').products).toEqual([])
  })
})

describe('respond — products', () => {
  it('finds a product named in the question', () => {
    const reply = respond('how much is the Steam Deck')
    expect(reply.intent).toBe('product')
    expect(reply.products[0].name).toBe('Steam Deck')
  })

  it('caps the number of product cards', () => {
    expect(respond('iphone').products.length).toBeLessThanOrEqual(3)
  })

  it('suggests the newest iPhones first for a general product question', () => {
    expect(respond('iphone').products.map((product) => product.name)).toEqual([
      'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17',
    ])
    expect(respond('how much is iPhone 18 Pro').products[0].name).toBe('iPhone 18 Pro')
  })

  it('asks which product for a bare price question', () => {
    expect(respond('what are your prices?').intent).toBe('price')
  })

  it('does not treat a generic word as naming every product', () => {
    // A query matching the whole catalogue is not a product lookup.
    const reply = respond('price')
    expect(reply.intent).not.toBe('product')
  })
})

describe('respond — languages', () => {
  it('understands a Hebrew hours question', () => {
    expect(respond('מה שעות הפתיחה?').intent).toBe('hours')
  })

  it('understands an Arabic location question', () => {
    expect(respond('أين تقع المحلات؟').intent).toBe('where')
  })

  it('understands a Hebrew repair question', () => {
    expect(respond('צריך תיקון מסך').intent).toBe('repair')
  })

  it('greets in Arabic', () => {
    expect(respond('مرحبا').intent).toBe('greet')
  })
})

describe('respond — fallbacks', () => {
  it('falls back on an empty question', () => {
    expect(respond('   ').intent).toBe('fallback')
  })

  it('falls back on something it cannot parse', () => {
    expect(respond('zzzzqqqq').intent).toBe('fallback')
  })

  it('always returns a key that exists in every language', () => {
    const questions = ['hello', 'price', 'repair', 'hours', 'where', 'zzz', '']
    for (const question of questions) {
      const { messageKey } = respond(question)
      expect(en[messageKey as keyof typeof en]).toBeDefined()
      expect(he[messageKey as keyof typeof he]).toBeDefined()
      expect(ar[messageKey as keyof typeof ar]).toBeDefined()
    }
  })
})
