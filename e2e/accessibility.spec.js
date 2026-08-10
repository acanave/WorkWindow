import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { SCHEMA_VERSION, STORAGE_KEY } from '../src/state/schema.js'

const SELECTED_DATE = '2026-08-07'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function resetWorkspace(page) {
  await page.goto('/')
  await page.evaluate(
    ({ schemaVersion, selectedDate, storageKey }) => {
      window.localStorage.clear()
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: schemaVersion,
          ui: { selectedDate },
          cards: [],
        }),
      )
    },
    { schemaVersion: SCHEMA_VERSION, selectedDate: SELECTED_DATE, storageKey: STORAGE_KEY },
  )
  await page.reload()
}

async function expectNoAccessibilityViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = results.violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.map((node) => node.target),
  }))

  expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
}

async function expectNoHorizontalPageOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('primary local-mode views meet the WCAG A and AA baseline', async ({ page }) => {
  await resetWorkspace(page)

  await expect(page.getByRole('button', { name: 'Open Local Mode' })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('button', { name: 'Open Local Mode' }).click()
  await expect(page.getByRole('heading', { name: /see not just what is scheduled/i })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('button', { name: 'Cards' }).click()
  await expect(page.getByRole('heading', { name: /plan with clarity/i })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('button', { name: 'New Work Item' }).click()
  await expect(page.getByRole('dialog', { name: 'Create Work Item' })).toBeVisible()
  await expect(page.getByLabel('Title')).toBeFocused()
  await expectNoAccessibilityViolations(page)
})

test('primary views remain accessible and contained at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await resetWorkspace(page)

  await expect(page.getByRole('button', { name: 'Open Local Mode' })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('button', { name: 'Open Local Mode' }).click()
  await expect(page.getByRole('heading', { name: /see not just what is scheduled/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible()
  await expectNoAccessibilityViolations(page)
  await expectNoHorizontalPageOverflow(page)

  const calendarGrid = page.getByRole('region', { name: 'Month calendar grid' })
  await expect(calendarGrid).toBeVisible()
  await expect.poll(() => calendarGrid.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)

  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await expect(page.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Cards' }).click()
  await expect(page.getByRole('heading', { name: /plan with clarity/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false')
  await expectNoAccessibilityViolations(page)
  await expectNoHorizontalPageOverflow(page)

  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.getByRole('button', { name: 'New Work Item' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create Work Item' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('Title')).toBeFocused()
  await expectNoAccessibilityViolations(page)
  await expectNoHorizontalPageOverflow(page)

  const dialogBounds = await dialog.boundingBox()
  expect(dialogBounds).not.toBeNull()
  expect(dialogBounds.x).toBeGreaterThanOrEqual(0)
  expect(dialogBounds.y).toBeGreaterThanOrEqual(0)
  expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(390)
  expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(844)
})
