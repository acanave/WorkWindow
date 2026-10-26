const minutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const clock = (time) => {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h % 24 < 12 ? 'AM' : 'PM'}`
}
class WorkWindowDay extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.items = []
  }
  set events(value) {
    this.items = value || []
    this.draw()
  }
  connectedCallback() {
    this.draw()
  }
  draw() {
    const shadow = this.shadowRoot
    const previousScroll = shadow.querySelector('.scroll')?.scrollTop ?? 480
    shadow.replaceChildren()
    const style = document.createElement('style')
    style.textContent = `:host{display:block;color:var(--wd-text);font:inherit} .day{border-radius:10px;background:var(--wd-panel);padding:14px}.date{font-size:15px;margin-bottom:12px}.scroll{max-height:520px;overflow:auto}.axis{position:relative;height:1440px}.hour{position:absolute;left:0;right:0;border-top:1px solid var(--wd-line);margin-left:64px}.hour span{position:absolute;left:-64px;top:-8px;font-size:12px;color:var(--wd-muted)}.event{position:absolute;left:70px;right:6px;border:0;border-radius:7px;background:var(--wd-soft);color:var(--wd-text);padding:8px 10px;text-align:left;overflow:hidden;font:inherit;font-size:14px;cursor:pointer;min-height:24px}.event strong{display:block}.event small{display:block;font-size:12px}.event:focus-visible{outline:2px solid var(--wd-blue);z-index:5}.empty{position:absolute;top:550px;left:70px;color:var(--wd-muted);font-size:14px}`
    const day = document.createElement('section')
    day.className = 'day'
    const header = document.createElement('div')
    header.className = 'date'
    header.textContent = new Date(this.getAttribute('date') + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const scroll = document.createElement('div')
    scroll.className = 'scroll'
    scroll.tabIndex = 0
    scroll.setAttribute('role', 'region')
    scroll.setAttribute('aria-label', 'Daily schedule, all hours')
    const axis = document.createElement('div')
    axis.className = 'axis'
    for (let h = 0; h < 24; h++) {
      const row = document.createElement('div')
      row.className = 'hour'
      row.style.top = `${h * 60}px`
      const label = document.createElement('span')
      label.textContent = clock(`${h}:00`)
      row.append(label)
      axis.append(row)
    }
    this.items.forEach((event) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'event'
      b.style.top = `${minutes(event.start)}px`
      b.style.height = `${Math.max(24, minutes(event.end) - minutes(event.start) - 3)}px`
      b.setAttribute('aria-label', `${event.title}, ${clock(event.start)}–${clock(event.end)}`)
      const title = document.createElement('strong')
      title.textContent = event.title
      b.append(title)
      if (minutes(event.end) - minutes(event.start) >= 55) {
        const detail = document.createElement('small')
        detail.textContent = event.detail || ''
        b.append(detail)
      }
      b.addEventListener('click', () =>
        this.dispatchEvent(new CustomEvent('eventselect', { detail: { event }, bubbles: true })),
      )
      axis.append(b)
    })
    if (!this.items.length) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = 'No time blocks yet'
      axis.append(empty)
    }
    scroll.append(axis)
    day.append(header, scroll)
    shadow.append(style, day)
    scroll.scrollTop = previousScroll
  }
}
if (!customElements.get('workwindow-day')) customElements.define('workwindow-day', WorkWindowDay)
