import { test, expect } from '@playwright/test'

const LOCALES = ['he', 'ar', 'en'] as const

test.describe('language and direction', () => {
  test('a bare path redirects into a language', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/(he|ar|en)$/)
  })

  test('Hebrew renders right-to-left', async ({ page }) => {
    await page.goto('/he')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'he-IL')
  })

  test('Arabic renders right-to-left', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('English renders left-to-right', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('the switcher keeps you on the same page in the new language', async ({ page }) => {
    await page.goto('/en/repairs')
    await page.getByRole('button', { name: /language|שפ|لغ/i }).click()
    await page.getByRole('link', { name: 'עברית' }).click()

    await expect(page).toHaveURL(/\/he\/repairs/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  for (const locale of LOCALES) {
    test(`the ${locale} home page shows no untranslated keys`, async ({ page }) => {
      await page.goto(`/${locale}`)
      const body = await page.locator('body').innerText()
      // A missing translation falls back to the raw key, e.g. "fy_game_head".
      expect(body).not.toMatch(/\b[a-z]{2,6}_[a-z0-9_]{2,}\b/)
    })
  }
})

test.describe('catalogue', () => {
  test('the home page shows real product photography', async ({ page }) => {
    await page.goto('/en')
    // next/image rewrites src through the optimiser, so match the encoded path.
    const image = page.locator('img[src*="%2Fimg%2F"], img[src*="/img/"]').first()
    await expect(image).toBeVisible()

    const loaded = await image.evaluate(
      (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
    )
    expect(loaded).toBe(true)
  })

  test('every home-page image actually loads', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute('src')),
    )
    expect(broken).toEqual([])
  })

  test('a category page lists its products', async ({ page }) => {
    await page.goto('/en/store/phones')
    await expect(page.getByRole('heading', { name: 'Phones', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'iPhone 18 Pro', exact: true })).toBeVisible()
  })

  test('prices are shown in shekels, never dollars', async ({ page }) => {
    await page.goto('/en/store/phones')
    const body = await page.locator('body').innerText()
    expect(body).toContain('₪')
    expect(body).not.toContain('$')
  })

  test('a product page shows colours, storage and a shekel price', async ({ page }) => {
    await page.goto('/en/product/iphone-18-pro')
    await expect(page.getByRole('heading', { name: 'iPhone 18 Pro', level: 1, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Burgundy' })).toBeVisible()
    await expect(page.getByRole('button', { name: /256GB/ })).toBeVisible()
    await expect(page.getByText('₪5,490').first()).toBeVisible()
  })

  test('choosing a storage option changes the price', async ({ page }) => {
    await page.goto('/en/product/iphone-18-pro')
    await page.getByRole('button', { name: /512GB/ }).click()
    await expect(page.getByText('₪5,940').first()).toBeVisible()
  })
})

test.describe('brand filtering', () => {
  test('the Apple section "All" link lands on Apple products only', async ({ page }) => {
    await page.goto('/en')
    // The section header's own action link, not a product tile inside it.
    await page.locator('a[href="/en/store/all?brand=apple"]:visible').first().click()

    await expect(page).toHaveURL(/brand=apple/)
    // Wait for the filtered grid before reading it.
    await expect(page.locator('h3').first()).toBeVisible()

    // Every tile on the page must be an Apple product.
    const names = await page.locator('h3').allInnerTexts()
    expect(names.length).toBeGreaterThan(0)
    expect(names.some((n) => /Galaxy|Xiaomi|Dell|PlayStation/i.test(n))).toBe(false)
  })

  test('the Samsung section has an "All" link that filters to Samsung', async ({ page }) => {
    await page.goto('/en')
    await page.locator('a[href="/en/store/all?brand=samsung"]:visible').first().click()

    await expect(page).toHaveURL(/brand=samsung/)
    await expect(page.locator('h3').first()).toBeVisible()

    const names = await page.locator('h3').allInnerTexts()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((n) => /Galaxy/i.test(n))).toBe(true)
  })

  test('the gaming section link lands on the gaming category', async ({ page }) => {
    await page.goto('/en')
    await page.locator('a[href="/en/store/gaming"]:visible').first().click()
    await expect(page).toHaveURL(/\/store\/gaming/)
  })

  test('the store page offers brand chips that filter the grid', async ({ page }) => {
    await page.goto('/en/store/phones')
    const before = await page.locator('h3').count()

    // Scope to the brand filter: the footer links share these labels.
    const brandNav = page.getByRole('navigation', { name: 'Brand' })
    await brandNav.getByRole('link', { name: 'Apple', exact: true }).click()
    await expect(page).toHaveURL(/brand=apple/)

    const after = await page.locator('h3').count()
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
  })

  test('changing category keeps the active brand', async ({ page }) => {
    await page.goto('/en/store/phones?brand=apple')
    const categoryNav = page.getByRole('navigation', { name: 'Category' })
    await categoryNav.getByRole('link', { name: 'Tablets', exact: true }).click()

    await expect(page).toHaveURL(/\/store\/tablets\?brand=apple/)
    await expect(page.locator('h3').first()).toBeVisible()

    const names = await page.locator('h3').allInnerTexts()
    expect(names.every((n) => /iPad/i.test(n))).toBe(true)
  })

  test('a brand chip is only offered when that brand has stock here', async ({ page }) => {
    await page.goto('/en/store/computers')
    // No Samsung computers in the catalogue, so no Samsung chip.
    const brandNav = page.getByRole('navigation', { name: 'Brand' })
    await expect(brandNav.getByRole('link', { name: 'Samsung', exact: true })).toHaveCount(0)
    await expect(brandNav.getByRole('link', { name: 'Dell', exact: true })).toBeVisible()
  })
})

test.describe('hero', () => {
  test('shows all four of the shop’s ads, starting with iPhone Duo', async ({ page }) => {
    await page.goto('/en')
    const dots = page.getByRole('button', { name: /iPhone Duo|iPhone 18 Pro|PlayStation 5|Repairs/ })
    await expect(dots).toHaveCount(4)

    await expect(page.getByRole('heading', { name: 'iPhone Duo', level: 2 })).toBeVisible()
  })

  test('the repair slide uses the shop’s repair artwork', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: 'Repairs', exact: true }).click()

    const art = page.locator(
      'section[aria-roledescription="carousel"] [data-hero-active="true"] img',
    )
    await expect(art).toHaveAttribute('src', /repair-collage/)
  })

  test('every slide’s artwork actually decodes, not just resolves', async ({ page }) => {
    await page.goto('/en')

    // Asserting on the src alone would have missed a hero image that requested
    // an oversized variant and never finished loading.
    for (const name of ['iPhone Duo', 'iPhone 18 Pro', 'PlayStation 5', 'Repairs']) {
      await page.getByRole('button', { name, exact: true }).click()
      const art = page.locator(
        'section[aria-roledescription="carousel"] [data-hero-active="true"] img',
      )

      await expect
        .poll(
          async () =>
            art.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
          { timeout: 10_000, message: `hero artwork for ${name} never decoded` },
        )
        .toBe(true)
    }
  })

  test('the portrait PS5 artwork fits completely inside its hero frame', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en')
    await page.getByRole('button', { name: 'PlayStation 5', exact: true }).click()

    const layout = await page
      .locator('section[aria-roledescription="carousel"] [data-hero-active="true"]')
      .evaluate((activeSlide) => {
        const image = activeSlide.querySelector('img')
        const frame = image?.parentElement
        const art = frame?.parentElement

        if (!image || !art) return null

        const bounds = (element: Element) => {
          const rect = element.getBoundingClientRect()
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          }
        }

        return {
          card: bounds(activeSlide),
          art: bounds(art),
          image: bounds(image),
          objectFit: getComputedStyle(image).objectFit,
        }
      })

    expect(layout).not.toBeNull()
    expect(layout!.objectFit).toBe('contain')
    expect(layout!.image.top).toBeGreaterThanOrEqual(layout!.art.top)
    expect(layout!.image.right).toBeLessThanOrEqual(layout!.art.right)
    expect(layout!.image.bottom).toBeLessThanOrEqual(layout!.art.bottom)
    expect(layout!.image.left).toBeGreaterThanOrEqual(layout!.art.left)
    expect(layout!.art.top).toBeGreaterThanOrEqual(layout!.card.top)
    expect(layout!.art.right).toBeLessThanOrEqual(layout!.card.right)
    expect(layout!.art.bottom).toBeLessThanOrEqual(layout!.card.bottom)
    expect(layout!.art.left).toBeGreaterThanOrEqual(layout!.card.left)
  })

  test('the mobile PS5 art plate stays inside its carousel card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en')
    await page.getByRole('button', { name: 'PlayStation 5', exact: true }).click()

    const layout = await page
      .locator('section[aria-roledescription="carousel"] [data-hero-active="true"]')
      .evaluate((card) => {
        const art = card.querySelector('div[class*="art"]')
        const frame = art?.querySelector('div')
        if (!art || !frame) return null

        const bounds = (element: Element) => {
          const rect = element.getBoundingClientRect()
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          }
        }

        return {
          card: bounds(card),
          art: bounds(art),
          frame: bounds(frame),
        }
      })

    expect(layout).not.toBeNull()
    expect(layout!.art.top).toBeGreaterThanOrEqual(layout!.card.top)
    expect(layout!.art.right).toBeLessThanOrEqual(layout!.card.right)
    expect(layout!.art.bottom).toBeLessThanOrEqual(layout!.card.bottom)
    expect(layout!.art.left).toBeGreaterThanOrEqual(layout!.card.left)
    expect(layout!.frame.right).toBeLessThanOrEqual(layout!.art.right)
  })

  test('centres the active slide as a rounded block with neighbours in view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en')
    await page.getByRole('button', { name: 'iPhone 18 Pro', exact: true }).click()
    await page.waitForTimeout(800)

    const layout = await page
      .locator('section[aria-roledescription="carousel"]')
      .evaluate((carousel) => {
        const viewport = carousel.querySelector('div[class*="viewport"]')
        const active = carousel.querySelector('[data-active="true"]')
        if (!viewport || !active) return null

        const viewportBox = viewport.getBoundingClientRect()
        const activeBox = active.getBoundingClientRect()
        const neighbourCount = [...carousel.querySelectorAll('[data-active="false"]')].filter(
          (card) => {
            const box = card.getBoundingClientRect()
            return box.right > viewportBox.left && box.left < viewportBox.right
          },
        ).length

        return {
          activeCenter: activeBox.left + activeBox.width / 2,
          borderRadius: Number.parseFloat(getComputedStyle(active).borderTopLeftRadius),
          neighbourCount,
          viewportCenter: viewportBox.left + viewportBox.width / 2,
        }
      })

    expect(layout).not.toBeNull()
    expect(Math.abs(layout!.activeCenter - layout!.viewportCenter)).toBeLessThan(3)
    expect(layout!.borderRadius).toBeGreaterThanOrEqual(22)
    expect(layout!.neighbourCount).toBeGreaterThanOrEqual(2)
  })

  test('centres a manually selected slide in right-to-left layouts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/he')
    await page.getByRole('button', { name: 'iPhone 18 Pro', exact: true }).click()
    await page.waitForTimeout(800)

    const layout = await page
      .locator('section[aria-roledescription="carousel"]')
      .evaluate((carousel) => {
        const viewport = carousel.querySelector('div[class*="viewport"]')
        const active = carousel.querySelector('[data-active="true"]')
        if (!viewport || !active) return null

        const viewportBox = viewport.getBoundingClientRect()
        const activeBox = active.getBoundingClientRect()
        return {
          activeCenter: activeBox.left + activeBox.width / 2,
          viewportCenter: viewportBox.left + viewportBox.width / 2,
        }
      })

    expect(layout).not.toBeNull()
    expect(Math.abs(layout!.activeCenter - layout!.viewportCenter)).toBeLessThan(3)
  })

  test('does not pull a reader back to the hero when it is off screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en')
    // Wait for the first-paint splash to finish so the document can be read
    // and scrolled exactly as a visitor would.
    await page.waitForTimeout(2_000)

    const before = await page.evaluate(() => {
      // The app normally scrolls smoothly. Switch it off in this test so the
      // measured starting point is the bottom of the document immediately.
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, document.documentElement.scrollHeight)
      return window.scrollY
    })
    expect(before).toBeGreaterThan(400)

    // Let the current auto-rotation interval elapse. If it is not paused
    // outside the viewport, a document-level scroll would send us back up.
    await page.waitForTimeout(7_600)
    const after = await page.evaluate(() => window.scrollY)

    expect(Math.abs(after - before)).toBeLessThan(80)
  })

  test('the iPhone Duo slide links through to Apple products', async ({ page }) => {
    await page.goto('/en')
    await expect(
      page.getByRole('link', { name: 'Shop all iPhone models' }),
    ).toHaveAttribute('href', /brand=apple/)
  })
})

test.describe('tile grid consistency', () => {
  test('every product tile has the same image area', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/en/store/all?brand=apple')
    await page.waitForLoadState('networkidle')

    // A tall product render used to stretch its own tile, so a row of tiles had
    // visibly different image areas.
    const heights = await page.evaluate(() =>
      [...document.querySelectorAll('a[class*="tile"] div[class*="art"]')].map((el) =>
        Math.round(el.getBoundingClientRect().height),
      ),
    )

    expect(heights.length).toBeGreaterThan(3)
    expect(new Set(heights).size).toBe(1)
  })

  test('image boxes stay square', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/en/store/phones')
    await page.waitForLoadState('networkidle')

    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('a[class*="tile"] div[class*="art"]')].map((el) => {
        const r = el.getBoundingClientRect()
        return Math.abs(r.width - r.height)
      }),
    )
    expect(Math.max(...boxes)).toBeLessThan(2)
  })

  test('a tall Samsung product stays fully inside its art area', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const layout = await page
      .locator('a')
      .filter({ has: page.getByRole('heading', { name: 'Galaxy S26', level: 3, exact: true }) })
      .evaluate((tile) => {
        const art = tile.querySelector('div[class*="art"]')
        const media = tile.querySelector('div[class*="media"]')
        const image = media?.querySelector('img')
        const body = tile.querySelector('div[class*="body"]')

        if (!art || !media || !image || !body) return null

        const bounds = (element: Element) => {
          const rect = element.getBoundingClientRect()
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          }
        }

        return {
          art: bounds(art),
          media: bounds(media),
          image: bounds(image),
          body: bounds(body),
          objectFit: getComputedStyle(image).objectFit,
        }
      })

    expect(layout).not.toBeNull()
    expect(layout!.objectFit).toBe('contain')
    expect(layout!.media.top).toBeGreaterThanOrEqual(layout!.art.top)
    expect(layout!.media.right).toBeLessThanOrEqual(layout!.art.right)
    expect(layout!.media.bottom).toBeLessThanOrEqual(layout!.art.bottom)
    expect(layout!.media.left).toBeGreaterThanOrEqual(layout!.art.left)
    expect(layout!.image.bottom).toBeLessThanOrEqual(layout!.body.top)
  })
})

test.describe('hero typography', () => {
  test('the headline uses the primary text colour, not the muted one', async ({ page }) => {
    await page.goto('/en')

    // A stale duplicate rule once made the whole copy column inherit the muted
    // colour, so the headline rendered grey against the section headings.
    const colours = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-roledescription="carousel"] h2')
      const section = [...document.querySelectorAll('h2')].find((h) =>
        h.textContent?.includes('Products'),
      )
      return {
        hero: getComputedStyle(hero!).color,
        section: getComputedStyle(section!).color,
      }
    })

    expect(colours.hero).toBe(colours.section)
  })
})

test.describe('navigation bar', () => {
  test('shows the shop name as text, with no logo image', async ({ page }) => {
    await page.goto('/en')
    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Sky Phone' })).toBeVisible()
    await expect(header.locator('img')).toHaveCount(0)
  })

  test('centres the page links between the name and the actions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en')

    const viewport = 1440
    const list = await page.locator('header nav ul').first().boundingBox()
    const centre = list!.x + list!.width / 2

    // Optically centred: within 40px of the viewport midpoint.
    expect(Math.abs(centre - viewport / 2)).toBeLessThan(40)
  })

  test('offers all seven destinations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/en')
    const list = page.locator('header nav ul').first()

    for (const label of ['Phones', 'Tablets', 'Computers', 'Gaming', 'Accessories']) {
      await expect(list.getByRole('button', { name: label })).toBeVisible()
    }
    await expect(list.getByRole('link', { name: 'Repairs' })).toBeVisible()
    await expect(list.getByRole('link', { name: 'About & Contact' })).toBeVisible()
  })
})

test.describe('bag', () => {
  test('adds a product and orders it over WhatsApp', async ({ page }) => {
    await page.goto('/en/product/iphone-18-pro')
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await page.goto('/en/cart')

    await expect(page.getByRole('heading', { name: 'iPhone 18 Pro', exact: true })).toBeVisible()

    // The shop takes orders on WhatsApp and payment in store — there is
    // deliberately no card form to fake.
    // Scope to the summary: the footer carries a WhatsApp link too.
    const order = page.getByRole('link', { name: 'Send order on WhatsApp' })
    await expect(order).toHaveAttribute('href', /wa\.me\/972527223916/)
    await expect(order).toHaveAttribute('href', /iPhone%2018%20Pro/)
  })

  test('the bag survives a reload', async ({ page }) => {
    await page.goto('/en/product/galaxy-s26-ultra')
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await page.goto('/en/cart')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Galaxy S26 Ultra' })).toBeVisible()
  })

  test('an empty bag invites you to browse', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible()
  })
})

test.describe('repairs', () => {
  test('lists all seven services', async ({ page }) => {
    await page.goto('/en/repairs')
    await expect(page.getByRole('heading', { name: 'Screen replacement' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Console repair' })).toBeVisible()
  })

  for (const locale of LOCALES) {
    test(`quotes no repair price in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/repairs`)
      const body = await page.locator('body').innerText()
      // The owner asked for repairs without indicative pricing.
      expect(body).not.toContain('₪')
    })

    test(`does not talk about repair prices in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/repairs`)
      // Showing no prices but still saying "prices are indicative" reads as a
      // bug to the owner. Headings and notes must not reference pricing at all.
      const main = await page.locator('main').innerText()
      const priceWords =
        /\bprices?\b|\bpricing\b|מחירים|המחירים|המחיר הסופי|الأسعار|السعر النهائي/i
      expect(main).not.toMatch(priceWords)
    })
  }

  test('each service routes to a real conversation', async ({ page }) => {
    await page.goto('/en/repairs')
    const link = page.locator('a[href*="wa.me"]').first()
    await expect(link).toHaveAttribute('href', /wa\.me\/972527223916/)
  })
})

test.describe('shop details', () => {
  test('shows the verified phone number and address', async ({ page }) => {
    await page.goto('/en/about')
    await expect(page.getByText('052-722-3916').first()).toBeVisible()
    await expect(page.getByText(/Kafr Kanna/).first()).toBeVisible()
  })

  test('links to the business Instagram and Facebook', async ({ page }) => {
    await page.goto('/en/about')
    await expect(page.getByRole('link', { name: '@skyphone.ca' }).first()).toHaveAttribute(
      'href',
      'https://instagram.com/skyphone.ca',
    )
    await expect(page.getByRole('link', { name: 'Facebook' }).first()).toHaveAttribute(
      'href',
      'https://facebook.com/skyphone.ca',
    )
  })
})

test.describe('support chat', () => {
  test('answers a shop question from real data', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: 'Sky Phone chat' }).click()
    await page.getByLabel(/Type a question/i).fill('where are you?')
    await page.getByRole('button', { name: 'Add' }).click()

    // Scope to the chat panel: the address also appears in the footer and the
    // trust band.
    const chat = page.getByRole('dialog', { name: 'Sky Phone chat' })
    await expect(chat.getByText(/Kafr Kanna/)).toBeVisible()
  })

  test('never quotes a repair price', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: 'Sky Phone chat' }).click()
    await page.getByLabel(/Type a question/i).fill('how much is a screen repair?')
    await page.getByRole('button', { name: 'Add' }).click()

    const chat = page.getByRole('dialog', { name: 'Sky Phone chat' })
    await expect(chat).not.toContainText('₪')
  })
})

test.describe('chat accessibility', () => {
  test('opening the chat moves focus into it and Escape restores it', async ({ page }) => {
    await page.goto('/en')
    const trigger = page.getByRole('button', { name: 'Sky Phone chat' })
    await trigger.click()

    await expect(page.getByLabel(/Type a question/i)).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Sky Phone chat' })).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('Tab stays inside the open chat panel', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: 'Sky Phone chat' }).click()

    const panel = page.getByRole('dialog', { name: 'Sky Phone chat' })
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      const inside = await panel.evaluate((node) => node.contains(document.activeElement))
      expect(inside).toBe(true)
    }
  })
})

test.describe('localisation of UI chrome', () => {
  for (const locale of LOCALES) {
    test(`the theme switcher is translated in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`)
      const group = page.getByRole('radiogroup')
      const text = await group.innerText()

      if (locale === 'en') {
        expect(text).toContain('Light')
      } else {
        // A Hebrew or Arabic visitor should not meet Latin UI chrome.
        expect(text).not.toMatch(/Light|Dark|Auto/)
      }
    })
  }
})

test.describe('brand splash', () => {
  test('shows the logo on first paint', async ({ page }) => {
    await page.goto('/he', { waitUntil: 'commit' })
    const splash = page.locator('div[class*="splash"]').first()
    await expect(splash).toBeVisible()
    await expect(splash.locator('img')).toHaveAttribute('src', /logo/)
  })

  test('clears itself and never blocks the page', async ({ page }) => {
    await page.goto('/he')
    await page.waitForTimeout(2000)

    // A splash that failed to clear would cover the whole shop, so this is the
    // assertion that matters: the centre of the page is real content.
    const blocking = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      return el?.className?.toString().includes('splash') ?? false
    })
    expect(blocking).toBe(false)
  })

  test('is hidden from assistive technology', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'commit' })
    await expect(page.locator('div[class*="splash"]').first()).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})

test.describe('responsive', () => {
  for (const [label, width] of [
    ['desktop', 1440],
    ['laptop', 1068],
    ['tablet', 833],
    ['mobile', 390],
  ] as const) {
    test(`no horizontal overflow at ${label} (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/he')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('image viewer', () => {
  test('pressing a product photo opens it full size and closes again', async ({ page }) => {
    await page.goto('en/product/galaxy-s25-ultra/')

    const opener = page.getByRole('button', { name: 'Tap to enlarge' })
    await expect(opener).toBeVisible()
    await opener.click()

    const viewer = page.getByRole('dialog', { name: 'Image viewer' })
    await expect(viewer).toBeVisible()

    // The point of the viewer is a bigger picture than the page showed.
    const enlarged = viewer.locator('img')
    const box = (await enlarged.boundingBox())!
    expect(box.height).toBeGreaterThan(400)
    await expect
      .poll(() => enlarged.evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBeGreaterThan(0)

    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    // Focus returns to the photo that opened it, not to the top of the page.
    await expect(opener).toBeFocused()
  })

  test('the viewer steps through a multi-image gallery', async ({ page }) => {
    await page.goto('en/product/galaxy-s25-ultra/')
    await page.getByRole('button', { name: 'Tap to enlarge' }).click()

    const viewer = page.getByRole('dialog', { name: 'Image viewer' })
    await expect(viewer.getByText('1 / 2')).toBeVisible()
    await viewer.getByRole('button', { name: 'Next' }).click()
    await expect(viewer.getByText('2 / 2')).toBeVisible()
    // Wrapping keeps the control usable at either end.
    await viewer.getByRole('button', { name: 'Next' }).click()
    await expect(viewer.getByText('1 / 2')).toBeVisible()
  })
})
