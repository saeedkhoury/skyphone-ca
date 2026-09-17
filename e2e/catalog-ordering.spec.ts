import { test, expect } from '@playwright/test'

const iphones = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17', 'iPhone 15 Pro', 'iPhone 14']
const samsungPhones = ['Galaxy S25 Ultra', 'Galaxy S25', 'Galaxy S24 Ultra']
const allProducts = [
  ...iphones, ...samsungPhones, 'Xiaomi 14',
  'iPad Pro', 'iPad Air', 'iPad', 'Galaxy Tab S9',
  'MacBook Pro 14"', 'MacBook Air', 'Dell XPS 13',
  'PlayStation 5', 'PS5 DualSense', 'Steam Deck',
  'DJI Osmo Pocket 3', 'DJI Osmo Action 5 Pro',
  'AirPods 4', 'Apple Watch Ultra 2', 'Apple Watch S9', 'AirPods Pro 2',
  'Galaxy Watch7', 'Galaxy Buds3',
]

for (const locale of ['en', 'he', 'ar']) {
  test(`category groups and newest models stay ordered in ${locale}`, async ({ page }) => {
    await page.goto(`${locale}/store/all/`)
    await expect(page.locator('main h3')).toHaveText(allProducts)
    await page.reload()
    await expect(page.locator('main h3')).toHaveText(allProducts)

    await page.goto(`${locale}/store/all/?brand=apple`)
    await expect(page.locator('main h3')).toHaveText([
      ...iphones, 'iPad Pro', 'iPad Air', 'iPad', 'MacBook Pro 14"', 'MacBook Air',
      'AirPods 4', 'Apple Watch Ultra 2', 'Apple Watch S9', 'AirPods Pro 2',
    ])
    await page.goto(`${locale}/store/phones/?brand=samsung`)
    await expect(page.locator('main h3')).toHaveText(samsungPhones)
    await page.goto(`${locale}/store/gaming/?brand=sony`)
    await expect(page.locator('main h3')).toHaveText(['PlayStation 5', 'PS5 DualSense'])
  })

  test(`homepage highlights and category artwork use the leading models in ${locale}`, async ({ page }) => {
    await page.goto(`${locale}/`)
    await expect(page.locator('main a[href*="/product/"] h3')).toHaveText([
      ...iphones.slice(0, 3), ...samsungPhones, 'PlayStation 5', 'PS5 DualSense',
    ])
    const phoneCategory = page.locator('main a[href$="/store/phones"], main a[href$="/store/phones/"]')
    await expect(phoneCategory.locator('img')).toHaveAttribute('src', /official\/iphone-17-pro-max-deep-blue/)
  })
}

test('desktop menus and full-page search share the same product order', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('en/')
  await page.getByRole('button', { name: 'Phones', exact: true }).click()
  await expect(page.locator('#flyout-phones a[href*="/product/"]')).toHaveText([
    ...iphones, ...samsungPhones,
  ])
  await page.goto('en/search/?q=iphone')
  await expect(page.locator('main h3')).toHaveText(iphones)
  await page.goto('en/search/?q=apple')
  await expect(page.locator('main h3').first()).toHaveText(iphones[0])
  await page.goto('en/search/?q=iPhone%2014')
  await expect(page.locator('main h3').first()).toHaveText('iPhone 14')
})

for (const width of [390, 1440]) {
  test(`search suggestions show newer phones first at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('en/')
    await page.getByRole('button', { name: 'Search products...', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const resultNames = dialog.locator('a[href*="/product/"] span[class*="resultName"]')
    await expect(resultNames).toHaveText([...iphones, ...samsungPhones])
    await dialog.getByRole('searchbox').fill('iphone')
    await expect(resultNames).toHaveText(iphones)
    await dialog.getByRole('searchbox').fill('samsung')
    await expect(resultNames).toHaveText([...samsungPhones, 'Galaxy Tab S9', 'Galaxy Watch7', 'Galaxy Buds3'])
  })
}
