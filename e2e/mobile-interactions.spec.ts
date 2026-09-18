import { test, expect, type Page } from '@playwright/test'
import { translate } from '../src/lib/i18n/config'
import { whatsappLink } from '../src/lib/shop'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, actionTimeout: 10_000 })

const heroSelector = '[data-carousel-ready="true"]'

async function openStore(page: Page, locale: string) {
  await page.goto(`${locale}/`)
  await expect(page.locator(heroSelector)).toHaveCount(1)
}

for (const locale of ['en', 'he', 'ar'] as const) {
  test(`mobile taps reach navigation and products in ${locale}`, async ({ page }) => {
    await openStore(page, locale)
    // Regression: WebKit finished the splash at opacity:0 but visibility:visible,
    // leaving a full-screen, invisible element intercepting every touch.
    const splash = page.locator('div[class*="splash"]').first()
    await expect(splash).toHaveCSS('pointer-events', 'none')
    await expect(splash).toBeHidden()

    const menu = page.locator('button[aria-controls="mobile-menu"]')
    await menu.tap()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await page.locator('#mobile-menu a').first().tap()
    await expect(page).toHaveURL(new RegExp(`/${locale}/store/phones/?$`))
    await page.locator('main a[href*="/product/"]').first().tap()
    await expect(page).toHaveURL(new RegExp(`/${locale}/product/iphone-18-pro-max/?$`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('iPhone 18 Pro Max')
    await page.getByRole('button', { name: translate(locale, 'pdp_add'), exact: true }).tap()
    await expect(page.getByRole('status')).toContainText(translate(locale, 'added'))
    await page.locator('nav a[href*="/cart"]').tap()
    await expect(page.getByRole('heading', { name: 'iPhone 18 Pro Max', exact: true })).toBeVisible()
  })

  test(`mobile hero controls and product CTA respond in ${locale}`, async ({ page }) => {
    await openStore(page, locale)
    const hero = page.locator(heroSelector)
    // Pause to isolate taps from the separately verified seven-second timer.
    await hero.locator('button[aria-pressed]').tap()
    for (const index of [3, 0, 1, 2]) {
      const dot = hero.locator('button[aria-current]').nth(index)
      const box = (await dot.boundingBox())!
      // 24x56, matching the source design's own dot rhythm: past WCAG 2.2 AA's
      // 24x24 minimum (2.5.8) on both axes, and generous on the vertical.
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(box.height).toBeGreaterThanOrEqual(44)
      await dot.tap()
      await expect(hero.locator('[data-hero-active="true"]')).toHaveAttribute('aria-label', `${index + 1} / 4`)
    }
    await hero.locator('[data-hero-active="true"] a[href*="/product/"]').first().tap()
    await expect(page).toHaveURL(new RegExp(`/${locale}/product/playstation-5/?$`))
  })

  test(`mobile search, chat and WhatsApp remain usable in ${locale}`, async ({ page, context }) => {
    await openStore(page, locale)
    await page.locator('nav').getByRole('button', { name: translate(locale, 'search_ph') }).tap()
    const search = page.getByRole('dialog', { name: translate(locale, 'search_ph') })
    await search.getByRole('searchbox').fill('galaxy s25 ultra')
    await search.getByRole('link').first().tap()
    await expect(page).toHaveURL(new RegExp(`/${locale}/product/galaxy-s25-ultra/?$`))
    await expect(search).toHaveCount(0)
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')

    const chatButton = page.locator('button[aria-controls="support-chat"]')
    const whatsapp = page.locator('[data-contact="whatsapp"]')
    await expect(chatButton.locator('svg circle')).toHaveCount(3)
    const chatBox = (await chatButton.boundingBox())!
    const waBox = (await whatsapp.boundingBox())!
    expect(Math.abs(chatBox.x - waBox.x)).toBeGreaterThan(48)
    expect(waBox.y + waBox.height).toBeLessThan(844)
    await chatButton.tap()
    const chat = page.locator('#support-chat')
    await expect(chat).toBeVisible()
    await chat.getByRole('textbox').fill('where are you?')
    await chat.getByRole('button', { name: translate(locale, 'add'), exact: true }).tap()
    await expect(chat).toContainText(translate(locale, 'chat_a_where'))
    await chat.getByRole('button', { name: translate(locale, 'modal_close') }).tap()
    await expect(chat).toHaveCount(0)
    await expect(whatsapp).toHaveAttribute('href', whatsappLink(translate(locale, 'wa_contact_head')))
    await expect(whatsapp).toHaveAttribute('target', '_blank')
    // Exercise the actual tap/new-tab handoff without contacting WhatsApp or
    // sending a real enquiry to the shop.
    await context.route('https://wa.me/**', route => route.fulfill({ body: 'WhatsApp handoff verified' }))
    const popupPromise = page.waitForEvent('popup')
    await whatsapp.tap()
    const popup = await popupPromise
    await expect(popup).toHaveURL(whatsappLink(translate(locale, 'wa_contact_head')))
    await popup.close()
  })
}

test('disabling splash animations cannot block mobile taps', async ({ page }) => {
  await openStore(page, 'en')
  await page.addStyleTag({ content: '[class*="splash"] { animation: none !important; }' })
  await expect(page.locator('div[class*="splash"]').first()).toBeHidden()
  await page.locator('button[aria-controls="mobile-menu"]').tap()
  await expect(page.locator('#mobile-menu')).toBeVisible()
})

test('compact phone controls fit without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openStore(page, 'he')
  for (const selector of ['nav button[aria-controls="mobile-menu"]', 'nav button[aria-controls="lang-menu"]']) {
    const box = (await page.locator(selector).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
