import { expect, test } from '@playwright/test'
import { SCHEMA_VERSION, STORAGE_KEY } from '../src/state/schema.js'

const SELECTED_DATE = '2026-08-07'
const CARD_TITLE = 'E2E smoke test card'
const UPDATED_CARD_TITLE = 'E2E smoke test card updated'

test('local workflow persists a planned card across reloads', async ({ page }) => {
  await test.step('start with an isolated local workspace', async () => {
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

    await expect(page.getByRole('button', { name: 'Open Local Mode' })).toBeVisible()
    await page.getByRole('button', { name: 'Open Local Mode' }).click()
    await expect(page.getByRole('heading', { name: /see not just what is scheduled/i })).toBeVisible()
  })

  await test.step('create and edit a card', async () => {
    await page.getByRole('button', { name: 'New Work Item' }).click()
    await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible()
    await page.getByLabel('Title').fill(CARD_TITLE)
    await page.getByLabel('Description').fill('Created by the Playwright smoke suite.')
    await page.getByLabel('Required window points').fill('3')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    await page.getByRole('button', { name: 'Cards' }).click()
    await expect(page.getByRole('heading', { name: /plan with clarity/i })).toBeVisible()
    await page.getByRole('button', { name: `Expand ${CARD_TITLE}` }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Edit Work Item' })).toBeVisible()
    await page.getByLabel('Title').fill(UPDATED_CARD_TITLE)
    await page.getByLabel('Description').fill('Edited, moved, planned, and persisted by Playwright.')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('button', { name: `Collapse ${UPDATED_CARD_TITLE}` })).toBeVisible()
  })

  await test.step('move and schedule the card', async () => {
    await page.getByLabel(`Move ${UPDATED_CARD_TITLE}`).selectOption('In Progress')
    const inProgressColumn = page
      .getByRole('heading', { name: 'In Progress', exact: true })
      .locator('xpath=ancestor::section')
    await expect(inProgressColumn.getByText(UPDATED_CARD_TITLE)).toBeVisible()
    await page.getByRole('button', { name: `Add window ${SELECTED_DATE}` }).click()

    await page.getByRole('button', { name: 'Calendar' }).click()
    await expect(page.getByTitle(new RegExp(`Work window: ${UPDATED_CARD_TITLE}`)).first()).toBeVisible()
  })

  await test.step('reload and verify local persistence', async () => {
    await page.reload()
    await expect(page.getByRole('heading', { name: /see not just what is scheduled/i })).toBeVisible()
    await expect(page.getByTitle(new RegExp(`Work window: ${UPDATED_CARD_TITLE}`)).first()).toBeVisible()

    await page.getByRole('button', { name: 'Cards' }).click()
    await page.getByRole('button', { name: `Expand ${UPDATED_CARD_TITLE}` }).click()
    await expect(page.getByLabel(`Move ${UPDATED_CARD_TITLE}`)).toHaveValue('In Progress')
    await expect(page.getByText('Edited, moved, planned, and persisted by Playwright.')).toBeVisible()
  })
})
