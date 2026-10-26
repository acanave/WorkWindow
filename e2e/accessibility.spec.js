import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
for (const theme of ['light', 'dark'])
  test(`primary views accessible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/')
    for (const name of ['Dashboard', 'Calendar', 'Boards', 'Projects']) {
      await page.getByRole('button', { name, exact: true }).click()
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(result.violations).toEqual([])
    }
  })
test('basic narrow-screen navigation stays in viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const name of ['Dashboard', 'Calendar', 'Boards', 'Projects']) {
    await page.getByRole('button', { name, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
