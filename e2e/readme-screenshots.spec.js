import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { emptyWorkspace } from '../src/redesign/model.js'

const screenshotsDir = path.resolve('docs/screenshots')
// Fictional documentation content only. Never load production accounts for screenshots.
const state = emptyWorkspace()
state.appearance = 'light'
state.projects = [{ id: 'demo-project', title: 'Studio refresh' }]
state.notes = [{ id: 'demo-note', text: 'Try a softer desk light', when: 'Captured' }]
state.todos = [
  { id: 'demo-today', title: 'Choose the desk layout', project: 'Studio refresh', plannedFor: '2026-10-25' },
]
state.events = [
  {
    id: 'demo-block',
    title: 'Review studio ideas',
    project: 'Studio refresh',
    date: '2026-10-25',
    start: '09:00',
    end: '10:00',
    detail: 'Compare layouts and choose a direction.',
  },
]
state.workItems = [
  { id: 'demo-backlog', title: 'Explore wall colors', project: 'Studio refresh', status: 'Backlog' },
  { id: 'demo-active', title: 'Measure the room', project: 'Studio refresh', status: 'In progress' },
]
state.workWindows = [
  {
    id: 'demo-window',
    itemId: 'demo-project',
    title: 'Studio refresh',
    type: 'project',
    start: '2026-10-25',
    end: '2026-10-30',
    due: '2026-10-30',
    effort: 240,
    parts: [['Focus', 240]],
  },
]

test.beforeEach(async ({ page }) => {
  fs.mkdirSync(screenshotsDir, { recursive: true })
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00'))
  await page.addInitScript((workspace) => {
    localStorage.setItem('workwindow:redesigned:local', JSON.stringify({ state: workspace, revision: 0, dirty: false }))
  }, state)
  await page.goto('/')
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
})

for (const [view, filename] of [
  ['Dashboard', 'dashboard-overview.png'],
  ['Boards', 'board-overview.png'],
  ['Calendar', 'calendar-overview.png'],
  ['Projects', 'projects-overview.png'],
]) {
  test(`capture redesigned ${view}`, async ({ page }) => {
    await page.getByRole('button', { name: view, exact: true }).click()
    await expect(
      page.getByRole('heading', { name: view === 'Dashboard' ? 'Today' : view, exact: true }).first(),
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (view === 'Dashboard')
      await page
        .locator('workwindow-day')
        .locator('.scroll')
        .evaluate((node) => {
          node.scrollTop = 480
        })
    await page.screenshot({ path: path.join(screenshotsDir, filename) })
  })
}
