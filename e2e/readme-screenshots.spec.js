import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import demoState from '../src/test/fixtures/readme-demo-state.json' with { type: 'json' }
import { STORAGE_KEY } from '../src/state/schema.js'

const LAUNCH_MODE_KEY = 'workwindow:launch-mode'
const THEME_KEY = 'workwindow:theme'
const screenshotsDir = path.resolve('docs/screenshots')

function ensureScreenshotsDir() {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
  })
}

async function seedLocalMode(page) {
  await page.addInitScript(
    ({ storageKey, launchModeKey, themeKey, state }) => {
      window.localStorage.clear()
      window.localStorage.setItem(storageKey, JSON.stringify(state))
      window.localStorage.setItem(launchModeKey, 'local')
      window.localStorage.setItem(themeKey, 'light')
    },
    {
      storageKey: STORAGE_KEY,
      launchModeKey: LAUNCH_MODE_KEY,
      themeKey: THEME_KEY,
      state: demoState,
    },
  )
}

async function resetToModeChooser(page) {
  await page.addInitScript(
    ({ themeKey }) => {
      window.localStorage.clear()
      window.localStorage.setItem(themeKey, 'light')
    },
    { themeKey: THEME_KEY },
  )
}

test.beforeAll(() => {
  ensureScreenshotsDir()
})

test('capture launch mode screen', async ({ page }) => {
  await resetToModeChooser(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Open Local Mode' })).toBeVisible()
  await waitForFonts(page)
  await page.screenshot({ path: path.join(screenshotsDir, 'mode-chooser.png') })
})

test('capture calendar overview', async ({ page }) => {
  await seedLocalMode(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /see not just what is scheduled/i })).toBeVisible()
  await waitForFonts(page)
  await page.screenshot({ path: path.join(screenshotsDir, 'calendar-overview.png') })
})

test('capture board overview', async ({ page }) => {
  await seedLocalMode(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Cards' }).click()
  await expect(page.getByRole('heading', { name: /plan with clarity/i })).toBeVisible()
  await page.getByRole('button', { name: /expand cloud sync landing copy/i }).click()
  await waitForFonts(page)
  await page.screenshot({ path: path.join(screenshotsDir, 'board-overview.png') })
})
