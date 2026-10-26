import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/dom'
import { mountWorkspace } from './controller'
import template from './template.html?raw'
import { emptyWorkspace } from './model'
let host, stop, saved
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  Element.prototype.scrollIntoView = vi.fn()
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  host = document.createElement('div')
  host.innerHTML = template
  document.body.append(host)
  saved = vi.fn()
  stop = mountWorkspace(host, emptyWorkspace(), saved)
})
afterEach(() => {
  stop()
  host.remove()
  vi.unstubAllGlobals()
})
const ui = () => within(host)
function capture(text, type) {
  fireEvent.click(ui().getByRole('button', { name: type, exact: true }))
  const field = ui().getByRole('textbox', { name: 'Quick capture' })
  fireEvent.input(field, { target: { value: text } })
  fireEvent.click(host.querySelector('.wd-capturebutton'))
}
describe('approved workflow in release controller', () => {
  it('starts empty and creates a project without fixture fallback', () => {
    expect(host.textContent).not.toMatch(/Home office|Website refresh|Renew license/)
    capture('My real project', 'Project')
    expect(saved.mock.lastCall[0].projects[0].title).toBe('My real project')
    fireEvent.click(ui().getByRole('button', { name: 'Projects', exact: true }))
    expect(ui().getByRole('heading', { name: 'My real project' })).toBeTruthy()
  })
  it('captures a task, selects today, completes and undoes without duplicate tasks', () => {
    capture('Send the report', 'Task')
    fireEvent.click(ui().getByRole('button', { name: 'Add to today', exact: true }))
    expect(saved.mock.lastCall[0].todos).toHaveLength(1)
    fireEvent.click(ui().getByRole('checkbox', { name: 'Complete Send the report' }))
    expect(saved.mock.lastCall[0].done).toHaveLength(1)
    expect(saved.mock.lastCall[0].todos).toHaveLength(0)
    fireEvent.click(ui().getAllByRole('button', { name: 'Undo', exact: true })[0])
    expect(saved.mock.lastCall[0].done).toHaveLength(0)
    expect(saved.mock.lastCall[0].todos).toHaveLength(1)
  })
  it('all four tabs render without projects', () => {
    for (const name of ['Projects', 'Boards', 'Calendar', 'Dashboard'])
      fireEvent.click(ui().getByRole('button', { name, exact: true }))
    expect(host.querySelector('.wd-projectcount').textContent).toBe('0 projects')
  })
})
