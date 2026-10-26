import './day-calendar.js'

export function mountWorkspace(container, initialState, onChange) {
  const root = container.querySelector('#ww-day-concept')
  const lifecycle = new AbortController()
  const documentEvents = {
    addEventListener: (name, fn) => document.addEventListener(name, fn, { signal: lifecycle.signal }),
  }
  const lucide = {
    createIcons: () =>
      root.querySelectorAll('[data-lucide]').forEach((icon) => {
        const glyphs = {
          'chevron-down': '⌄',
          'chevron-up': '⌃',
          'chevrons-down': '⌄',
          'chevron-left': '‹',
          'chevron-right': '›',
          plus: '+',
          'clock-3': '◷',
          bell: '♧',
          'layout-dashboard': '▦',
          'calendar-days': '▦',
          'columns-3': '▥',
          folder: '▱',
        }
        icon.textContent = glyphs[icon.dataset.lucide] || ''
        icon.setAttribute('aria-hidden', 'true')
      }),
  }
  const localDate = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  let TODAY = localDate(new Date())
  const tomorrowDate = new Date(TODAY + 'T12:00:00')
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  let TOMORROW = localDate(tomorrowDate)
  const _initial = {
    version: 4,
    notes: [],
    todos: [],
    done: [],
    events: [],
    reminders: [],
    projects: [],
    workItems: [],
    taskMeta: {},
    workWindows: [],
    selected: null,
    showBacklog: false,
  }
  const copy = (o) => JSON.parse(JSON.stringify(o))
  let state = structuredClone(initialState)
  state.todos.forEach((t) => {
    if (!t.plannedFor) t.plannedFor = TODAY
  })
  state.events.forEach((e) => {
    if (!e.date) e.date = TODAY
  })
  const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
  }
  const button = (text, fn, cls = 'wd-link') => {
    const b = el('button', cls + ' cursor-interaction', text)
    b.type = 'button'
    b.addEventListener('click', fn)
    return b
  }
  const uid = () => String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6)
  const clock = (t) => {
    const [h, m] = t.split(':').map(Number)
    return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h % 24 < 12 ? ' AM' : ' PM')
  }
  const minutes = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  function detectDate(text) {
    if (/\btomorrow\b/i.test(text)) return TOMORROW
    if (/\btoday\b/i.test(text)) return TODAY
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const index = days.findIndex((d) => new RegExp('\\b' + d + '\\b', 'i').test(text))
    if (index < 0) return ''
    const d = new Date(TODAY + 'T12:00:00')
    let offset = (index - d.getDay() + 7) % 7
    if (!offset) offset = 7
    d.setDate(d.getDate() + offset)
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    )
  }
  function dateLabel(date) {
    if (date === TODAY) return 'Today'
    if (date === TOMORROW) return 'Tomorrow'
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const feedback = (text) => (root.querySelector('.wd-feedback').textContent = text)
  function save() {
    onChange(structuredClone(state))
  }
  function commit(message) {
    render()
    save()
    if (message) feedback(message)
  }
  const calendar = document.createElement('workwindow-day')
  calendar.setAttribute('date', TODAY)
  calendar.setAttribute('start', '00:00')
  calendar.setAttribute('end', '24:00')
  calendar.setAttribute('interactive', '')
  calendar.events = state.events
  root.querySelector('.wd-calendarhost').append(calendar)
  calendar.addEventListener('eventselect', (e) => {
    state.selected = e.detail.event.id
    drawDetail()
    save()
  })
  let formatTimelineTimes = function () {}
  const activeTodos = () => state.todos.filter((t) => (t.plannedFor || TODAY) === TODAY)
  const activeEvents = () => state.events.filter((e) => (e.date || TODAY) === TODAY)
  const inToday = (id) => activeTodos().some((t) => t.id === id) || activeEvents().some((t) => t.id === id)
  const isDone = (id) => state.done.some((t) => t.id === id)
  function addToday(item) {
    if (inToday(item.id) || isDone(item.id)) return
    const future = state.todos.find((t) => t.id === item.id)
    if (future) future.plannedFor = TODAY
    else state.todos.push({ ...item, plannedFor: TODAY })
    state.notes = state.notes.filter((n) => n.id !== item.id)
    commit('Added to Today, anytime.')
  }
  let complete = function (item, from) {
    for (const source of ['todos', 'events', 'notes', 'workItems'])
      state[source] = state[source].filter((t) => t.id !== item.id)
    state.done.push({ ...item, from, completedOn: TODAY })
    commit('Completed.')
  }
  function planForm(item, host, from) {
    if (host.querySelector('.wd-planform')) return
    const form = el('form', 'wd-planform')
    const startLabel = el('label', '', 'Start today')
    const start = el('input')
    start.type = 'time'
    start.value = '14:00'
    start.required = true
    start.min = '00:00'
    start.max = '23:30'
    startLabel.append(start)
    const durationLabel = el('label', '', 'Duration')
    const duration = el('select')
    ;[30, 60, 90, 120].forEach((m) => {
      const o = el('option', '', m < 60 ? m + ' min' : m / 60 + 'h')
      o.value = m
      duration.append(o)
    })
    durationLabel.append(duration)
    const submit = el('button', 'cursor-interaction', 'Save time block')
    submit.type = 'button'
    const cancel = button('Cancel', () => form.remove())
    const error = el('span', 'wd-formerror')
    error.setAttribute('role', 'alert')
    form.append(startLabel, durationLabel, submit, cancel, error)
    submit.addEventListener('click', (e) => {
      e.preventDefault()
      if (!form.reportValidity()) return
      const a = minutes(start.value),
        b = a + Number(duration.value)
      if (b > 1440) {
        error.textContent = 'Choose a time block that ends by midnight.'
        return
      }
      if (activeEvents().some((x) => a < minutes(x.end) && b > minutes(x.start))) {
        error.textContent = 'That overlaps another time block. Try another time.'
        return
      }
      const end = String(Math.floor(b / 60)).padStart(2, '0') + ':' + String(b % 60).padStart(2, '0')
      state.events.push({
        ...item,
        date: TODAY,
        start: start.value,
        end,
        detail: duration.value + 'm planned effort' + (item.date ? '. Due ' + dateLabel(item.date) + '.' : '.'),
      })
      state[from] = state[from].filter((n) => n.id !== item.id)
      state.selected = item.id
      commit('Time block added to your day.')
    })
    host.append(form)
  }
  function reminderForm(note, host) {
    if (host.querySelector('.wd-planform')) return
    const form = el('form', 'wd-planform')
    const label = el('label', '', 'Remind me')
    const input = el('input')
    input.type = 'datetime-local'
    input.value = note.reminderAt || (note.date || TODAY) + 'T14:30'
    input.required = true
    label.append(input)
    const submit = el('button', 'cursor-interaction', 'Save reminder')
    submit.type = 'button'
    form.append(
      label,
      submit,
      button('Cancel', () => form.remove()),
    )
    submit.addEventListener('click', (e) => {
      e.preventDefault()
      if (!form.reportValidity()) return
      state.reminders = state.reminders.filter((r) => r.id !== note.id)
      state.reminders.push({ id: note.id, title: note.text, project: note.project, at: input.value })
      note.reminderAt = input.value
      note.type = 'Reminder'
      commit('Reminder saved for ' + dateLabel(input.value.slice(0, 10)) + ' at ' + clock(input.value.slice(11)) + '.')
    })
    host.append(form)
  }
  let drawNotes = function () {
    const host = root.querySelector('.wd-notes')
    host.replaceChildren()
    const visible = state.showBacklog ? state.notes : state.notes.slice(0, 3)
    visible.forEach((note) => {
      const article = el('article', 'wd-note')
      if (note.type) article.append(el('span', 'wd-note-tag', note.type))
      article.append(el('p', '', note.text))
      if (note.date && !note.reminderAt) {
        const suggestion = el('div', 'wd-suggest')
        suggestion.append(el('span', '', dateLabel(note.date)))
        const date = el('input')
        date.type = 'date'
        date.value = note.date
        date.setAttribute('aria-label', 'Suggested date for ' + note.text)
        date.addEventListener('change', () => {
          note.date = date.value
          commit('Date updated. Original wording kept.')
        })
        suggestion.append(date)
        article.append(suggestion)
      }
      const foot = el('div', 'wd-notefooter')
      foot.append(el('span', '', note.when || 'Captured'))
      if (!note.type) {
        const choices = el('div', 'wd-types')
        choices.hidden = true
        const shape = button(
          'Make it a…',
          () => {
            choices.hidden = !choices.hidden
            shape.setAttribute('aria-expanded', String(!choices.hidden))
          },
          'wd-shape',
        )
        shape.setAttribute('aria-expanded', 'false')
        ;['Task', 'Reminder', 'Project'].forEach((type) =>
          choices.append(
            button(
              type,
              () => {
                note.type = type
                if (type === 'Project') {
                  state.projects.push({ id: note.id, title: note.text })
                  state.notes = state.notes.filter((n) => n.id !== note.id)
                }
                commit(
                  type === 'Project'
                    ? 'Project created. Start with its first next step.'
                    : 'Saved as a ' + type.toLowerCase() + '. Details can wait.',
                )
              },
              '',
            ),
          ),
        )
        foot.append(shape)
        article.append(foot, choices)
      } else {
        article.append(foot)
        const actions = el('div', 'wd-noteactions')
        if (note.type === 'Task') {
          const item = { id: note.id, title: note.text, date: note.date, project: note.project }
          actions.append(
            button('Add to today', () => addToday(item), ''),
            button('Plan time', () => planForm(item, article, 'notes'), 'wd-secondary'),
          )
        } else if (note.type === 'Reminder') {
          if (note.reminderAt)
            actions.append(
              el('span', '', dateLabel(note.reminderAt.slice(0, 10)) + ' · ' + clock(note.reminderAt.slice(11))),
            )
          actions.append(
            button(
              note.reminderAt ? 'Edit time' : 'Set time',
              () => reminderForm(note, article),
              note.reminderAt ? 'wd-secondary' : '',
            ),
          )
        }
        article.append(actions)
      }
      host.append(article)
    })
    if (!state.notes.length) host.append(el('p', 'wd-empty', 'All clear. Capture the next thought here.'))
    root.querySelector('.wd-note-count').textContent = state.notes.length
    const toggle = root.querySelector('.wd-backlogtoggle')
    toggle.textContent = state.showBacklog ? 'Show recent stickies' : 'View sticky inbox (' + state.notes.length + ')'
    toggle.hidden = state.notes.length <= 3
    toggle.setAttribute('aria-expanded', String(state.showBacklog))
  }
  let drawTodos = function () {
    const host = root.querySelector('.wd-todos')
    host.replaceChildren()
    activeTodos().forEach((item) => {
      const row = el('div', 'wd-todo')
      const label = el('label'),
        check = el('input')
      check.type = 'checkbox'
      check.setAttribute('aria-label', 'Complete ' + item.title)
      check.addEventListener('change', () => complete(allTasks().find((t) => t.id === item.id) || item, 'todos'))
      const text = el('span', '', item.title)
      if (item.project) text.append(el('small', '', item.project))
      label.append(check, text)
      const actions = el('div', 'ww-todoactions')
      actions.append(
        button('Plan time', () => planForm(item, row, 'todos')),
        button('Defer', () => openDefer(allTasks().find((t) => t.id === item.id) || item)),
      )
      row.append(label, actions)
      host.append(row)
    })
    if (!activeTodos().length) host.append(el('p', 'wd-empty', 'Nothing on your anytime list today.'))
    const completed = doneTodayItems()
    root.querySelector('.wd-donecount').textContent = completed.length
    const doneHost = root.querySelector('.wd-donelist')
    doneHost.replaceChildren()
    completed.forEach((item) => {
      const row = el('div', 'wd-donerow')
      row.append(
        el('span', '', item.title),
        button('Undo', () => {
          state.done = state.done.filter((t) => t.id !== item.id)
          const source = ['events', 'notes', 'workItems', 'todos'].includes(item.from) ? item.from : 'todos'
          const restored = { ...item }
          delete restored.completedOn
          delete restored.from
          const status = item.status && item.status !== 'Done' ? item.status : 'Ready'
          state.taskMeta[item.id] = { ...state.taskMeta[item.id], status }
          if (!state[source].some((t) => t.id === item.id)) state[source].push({ ...restored, status })
          commit('Completion undone.')
        }),
      )
      doneHost.append(row)
    })
  }
  let drawReminders = function () {
    const host = root.querySelector('.wd-reminders')
    host.replaceChildren()
    state.reminders
      .filter((r) => r.at.slice(0, 10) === TODAY)
      .sort((a, b) => a.at.localeCompare(b.at))
      .forEach((r) => {
        const row = el('div', 'wd-reminderrow')
        row.append(el('span', '', clock(r.at.slice(11))), el('strong', '', r.title), el('span', '', 'Reminder'))
        host.append(row)
      })
  }
  let drawDetail = function () {
    const item = activeEvents().find((e) => e.id === state.selected) || activeEvents()[0]
    const box = root.querySelector('.wd-selection')
    box.hidden = !item
    if (!item) return
    state.selected = item.id
    box.querySelector('strong').textContent = item.title
    box.querySelector('span').textContent = clock(item.start) + '–' + clock(item.end) + ' · Time block'
    const parts = (item.detail || '').split('. ')
    box.querySelector('p').textContent = parts[0]
    box.querySelector('small').textContent = parts.slice(1).join('. ')
  }
  let drawProjects = function () {}
  function render() {
    drawNotes()
    drawTodos()
    drawProjects()
    drawReminders()
    calendar.events = activeEvents()
    formatTimelineTimes()
    drawDetail()
    const total = activeEvents().reduce((sum, e) => sum + minutes(e.end) - minutes(e.start), 0)
    const duration = Math.floor(total / 60) + 'h' + (total % 60 ? ' ' + (total % 60) + 'm' : '')
    root.querySelector('.wd-todaysummary').textContent = duration + ' planned · ' + activeTodos().length + ' anytime'
    drawCalendar()
  }
  let captureType = 'Sticky'
  function updateCapture() {
    root
      .querySelectorAll('[data-capture-type]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.captureType === captureType)))
    root.querySelector('.wd-taskoptions').hidden = captureType !== 'Task'
    root.querySelector('.wd-projectpick').hidden = captureType === 'Project'
    root.querySelector('.wd-reminderoption').hidden = captureType !== 'Reminder'
    const hints = {
      Sticky: 'Keep it in your sticky inbox. Develop it later.',
      Task: 'Create a task now. Time planning can wait.',
      Reminder: 'Create a reminder now, with or without a time.',
      Project: 'Start a project now. Build out the steps later.',
    }
    root.querySelector('.wd-capturehint').textContent = hints[captureType]
    root.querySelector('.wd-capturebutton').textContent =
      captureType === 'Sticky' ? 'Save sticky' : 'Create ' + captureType.toLowerCase()
    const select = root.querySelector('.wd-projectpick select')
    const previous = select.value
    select.replaceChildren()
    ;['', ...state.projects.map((p) => p.title)].forEach((name) => {
      const option = el('option', '', name || 'No project')
      option.value = name
      select.append(option)
    })
    select.value = [...select.options].some((o) => o.value === previous) ? previous : ''
  }
  root.querySelectorAll('[data-capture-type]').forEach((b) =>
    b.addEventListener('click', () => {
      captureType = b.dataset.captureType
      updateCapture()
    }),
  )
  root.querySelector('.wd-capturebutton').addEventListener('click', (e) => {
    e.preventDefault()
    const field = root.querySelector('.wd-capture textarea')
    const text = field.value.trim()
    if (!text) {
      field.focus()
      return
    }
    if (!field.reportValidity()) return
    const id = uid(),
      date = detectDate(text),
      project = root.querySelector('.wd-projectpick select').value
    let message = 'Sticky saved to your inbox.'
    if (captureType === 'Project') {
      state.projects.push({ id, title: text })
      message = 'Project created. Its first step is ready to develop.'
    } else if (captureType === 'Task') {
      const project = root.querySelector('.wd-projectpick select').value
      if (root.querySelector('.wd-todaycheck input').checked) {
        state.todos.push({ id, title: text, date, project, plannedFor: TODAY })
        message = 'Task created in Today, anytime.'
      } else {
        state.notes.unshift({ id, text, type: 'Task', date, project, when: 'Just created' })
        message = 'Task created in your backlog.'
      }
    } else if (captureType === 'Reminder') {
      const time = root.querySelector('.wd-reminderoption input')
      if (!time.reportValidity()) return
      const note = { id, text, type: 'Reminder', date, project, when: 'Just created' }
      if (time.value) {
        note.reminderAt = time.value
        state.reminders.push({ id, title: text, project, at: time.value })
        message =
          'Reminder created for ' + dateLabel(time.value.slice(0, 10)) + ' at ' + clock(time.value.slice(11)) + '.'
      } else message = 'Reminder created. Set its time whenever you’re ready.'
      state.notes.unshift(note)
    } else state.notes.unshift({ id, text, project, when: 'Just captured', date })
    field.value = ''
    root.querySelector('.wd-reminderoption input').value = ''
    commit(message)
    updateCapture()
  })
  root.querySelector('.wd-backlogtoggle').addEventListener('click', () => {
    state.showBacklog = !state.showBacklog
    drawNotes()
    save()
  })
  root.querySelector('.wd-completeblock').addEventListener('click', () => {
    const item = state.events.find((e) => e.id === state.selected)
    if (item) complete(item, 'events')
  })
  const defaultWindows = []
  const dayObject = (s) => new Date(s + 'T12:00:00')
  const dayISO = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const plusDays = (s, n) => {
    const d = dayObject(s)
    d.setDate(d.getDate() + n)
    return dayISO(d)
  }
  const shortDate = (s) => dayObject(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fullDate = (s) => dayObject(s).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const durationLabel = (n) =>
    (Math.floor(n / 60) ? Math.floor(n / 60) + 'h' : '') + (n % 60 ? (n >= 60 ? ' ' : '') + (n % 60) + 'm' : '') || '0h'
  const calState = () =>
    state.cal || (state.cal = { day: TODAY, month: TODAY.slice(0, 7), mode: 'month', selected: null })
  const allWindows = () => state.workWindows || defaultWindows
  const dayEvents = (date) =>
    state.events.filter((e) => (e.date || TODAY) === date).sort((a, b) => a.start.localeCompare(b.start))
  const dayReminders = (date) =>
    state.reminders.filter((r) => r.at.slice(0, 10) === date).sort((a, b) => a.at.localeCompare(b.at))
  function dayDeadlines(date) {
    const found = allWindows()
      .filter((w) => w.due === date && (w.type === 'project' || !isDone(w.itemId)))
      .map((w) => ({ id: w.id, title: w.title, kind: 'window', date }))
    allTasks()
      .filter((t) => t.status !== 'Done' && t.date === date)
      .forEach((t) => {
        if (!found.some((x) => x.title === (t.title || t.text)))
          found.push({ id: t.id, title: t.title || t.text, kind: 'task', date })
      })
    return found
  }
  let scheduleOptions = function () {
    const options = []
    const add = (o) => {
      if (!options.some((x) => x.key === o.key)) options.push(o)
    }
    state.todos.forEach((t) =>
      add({ key: 'todo:' + t.id, id: t.id, title: t.title, project: t.project, source: 'todos' }),
    )
    state.notes
      .filter((n) => n.type === 'Task')
      .forEach((n) => add({ key: 'note:' + n.id, id: n.id, title: n.text, project: n.project, source: 'notes' }))
    state.projects.forEach((p) =>
      add({ key: 'project:' + p.id, id: p.id, title: p.title, project: p.title, source: 'project' }),
    )
    return options
  }
  function changePage(page) {
    state.page = page
    drawCalendar()
    save()
    root.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
  function selectDay(day, selected = null) {
    const cs = calState()
    cs.day = day
    cs.selected = selected
    drawCalendar()
    save()
  }
  function fillPlanner(key) {
    const select = root.querySelector('.wc-planitem')
    if ([...select.options].some((o) => o.value === key)) select.value = key
    root.querySelector('.wc-planstart').focus()
  }
  let drawCalendar = function () {
    const cs = calState()
    const isCalendar = state.page === 'calendar'
    root.querySelector('.wc-view').hidden = !isCalendar
    root.querySelector('.wd-dashboardview').hidden = isCalendar
    root.querySelectorAll('[data-page]').forEach((b) => {
      const active = b.dataset.page === (state.page || 'dashboard')
      b.classList.toggle('wd-active', active)
      b.setAttribute('aria-pressed', String(active))
    })
    root
      .querySelectorAll('[data-cal-mode]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.calMode === cs.mode)))
    const monthDate = dayObject(cs.month + '-01')
    let gridStart = plusDays(cs.month + '-01', -monthDate.getDay()),
      weeks = 5
    if (cs.mode === 'week') {
      gridStart = plusDays(cs.day, -dayObject(cs.day).getDay())
      weeks = 1
      root.querySelector('.wc-monthtitle').textContent =
        shortDate(gridStart) + ' – ' + shortDate(plusDays(gridStart, 6))
    } else {
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      weeks = Math.ceil((monthDate.getDay() + end.getDate()) / 7)
      root.querySelector('.wc-monthtitle').textContent = monthDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    }
    root.querySelector('.wc-month').classList.toggle('wc-weekmode', cs.mode === 'week')
    const host = root.querySelector('.wc-weeks')
    host.replaceChildren()
    for (let wi = 0; wi < weeks; wi++) {
      const start = plusDays(gridStart, wi * 7),
        end = plusDays(start, 6)
      const week = el('div', 'wc-week'),
        days = el('div', 'wc-days')
      for (let di = 0; di < 7; di++) {
        const date = plusDays(start, di)
        const cell = el(
          'div',
          'wc-day' +
            (date.slice(0, 7) !== cs.month ? ' wc-outside' : '') +
            (date === TODAY ? ' wc-istoday' : '') +
            (date === cs.day ? ' wc-selected' : ''),
        )
        const top = el('div', 'wc-daytop')
        const dateButton = button(String(dayObject(date).getDate()), () => selectDay(date), 'wc-daynumber')
        dateButton.setAttribute('aria-label', fullDate(date) + (date === TODAY ? ', today' : ''))
        dateButton.setAttribute('aria-pressed', String(date === cs.day))
        const events = dayEvents(date)
        const mins = events.reduce((n, e) => n + minutes(e.end) - minutes(e.start), 0)
        top.append(dateButton, el('span', 'wc-dayload', mins ? durationLabel(mins) : ''))
        cell.append(top)
        const entries = [
          ...dayDeadlines(date).map((d) => ({
            kind: d.kind,
            id: d.id,
            text: '◆ ' + d.title,
            cls: 'wc-anchor',
            label: d.title + ' deadline, ' + fullDate(date),
          })),
          ...dayReminders(date).map((r) => ({
            kind: 'reminder',
            id: r.id,
            text: 'Reminder · ' + clock(r.at.slice(11)) + ' ' + r.title,
            cls: 'wc-bell',
            label: r.title + ' reminder at ' + clock(r.at.slice(11)),
          })),
          ...events.map((e) => ({
            kind: 'event',
            id: e.id,
            text: '● ' + clock(e.start) + ' ' + e.title,
            cls: '',
            label: e.title + ', ' + clock(e.start) + '–' + clock(e.end),
          })),
        ]
        const limit = cs.mode === 'week' ? 8 : 2
        entries.slice(0, limit).forEach((e) => {
          const b = button(e.text, () => selectDay(date, { kind: e.kind, id: e.id }), 'wc-chip ' + e.cls)
          b.dataset.workId = e.id
          b.dataset.workKind = e.kind
          b.setAttribute('aria-label', e.label)
          b.setAttribute('data-tooltip', e.label)
          cell.append(b)
        })
        if (entries.length > limit)
          cell.append(button('+' + (entries.length - limit) + ' more', () => selectDay(date), 'wc-more'))
        days.append(cell)
      }
      week.append(days)
      const windows = allWindows().filter(
        (w) => w.start <= end && w.end >= start && (w.type === 'project' || !isDone(w.itemId)),
      )
      if (windows.length) {
        const spans = el('div', 'wc-spans')
        windows.forEach((w, index) => {
          const from = w.start > start ? w.start : start,
            to = w.end < end ? w.end : end
          const c1 = Math.round((dayObject(from) - dayObject(start)) / 86400000) + 1,
            c2 = Math.round((dayObject(to) - dayObject(start)) / 86400000) + 2
          const b = button(
            '',
            () => selectDay(cs.day >= w.start && cs.day <= w.end ? cs.day : from, { kind: 'window', id: w.id }),
            'wc-span' +
              (w.type === 'project' ? ' wc-projectwindow' : '') +
              (cs.selected?.id === w.id ? ' wc-spanselected' : ''),
          )
          b.dataset.workId = w.id
          b.dataset.workKind = 'window'
          b.style.gridColumn = c1 + ' / ' + c2
          b.style.gridRow = String(index + 1)
          b.append(
            el('span', '', (w.start < start ? '← ' : '') + w.title + (w.end > end ? ' →' : '')),
            el('small', '', durationLabel(w.effort)),
          )
          const label =
            w.title +
            ' WorkWindow: ' +
            shortDate(w.start) +
            '–' +
            shortDate(w.end) +
            ', ' +
            durationLabel(w.effort) +
            ' effort'
          b.setAttribute('aria-label', label)
          b.setAttribute('data-tooltip', label)
          spans.append(b)
        })
        week.append(spans)
      }
      host.append(week)
    }
    drawCalendarDay()
    drawCalendarDetail()
    const options = scheduleOptions(),
      picker = root.querySelector('.wc-planitem'),
      old = picker.value
    picker.replaceChildren()
    options.forEach((o) => {
      const option = el('option', '', o.title + (o.source === 'project' ? ' · Project' : ''))
      option.value = o.key
      picker.append(option)
    })
    if (options.some((o) => o.key === old)) picker.value = old
    root.querySelector('.wc-plandate').value = cs.day
    root.querySelector('.wc-windowend').value = plusDays(cs.day, 2)
    const occupied = dayEvents(cs.day)
    let free = 9 * 60
    while (free + 30 <= 17 * 60 && occupied.some((e) => free < minutes(e.end) && free + 30 > minutes(e.start)))
      free += 30
    root.querySelector('.wc-planstart').value =
      free < 17 * 60
        ? String(Math.floor(free / 60)).padStart(2, '0') + ':' + String(free % 60).padStart(2, '0')
        : '09:00'
    const ready = options.filter((o) => o.source !== 'project')
    root.querySelector('.wc-readycount').textContent = ready.length + ' unscheduled'
    const readyHost = root.querySelector('.wc-readyitems')
    readyHost.replaceChildren()
    ready.slice(0, 4).forEach((o) => readyHost.append(button(o.title + ' →', () => fillPlanner(o.key), '')))
    if (!ready.length) readyHost.append(el('span', 'wc-empty', 'Your tasks have time on the calendar.'))
    if (ready.length > 4)
      readyHost.append(el('span', 'wc-empty', '+' + (ready.length - 4) + ' in the work-item picker'))
  }
  let drawCalendarDay = function () {
    const cs = calState(),
      host = root.querySelector('.wc-daydetail')
    host.replaceChildren()
    host.append(
      el('p', 'wc-inspectorkicker', cs.day === TODAY ? 'TODAY' : 'SELECTED DAY'),
      el('h3', '', fullDate(cs.day)),
    )
    const events = dayEvents(cs.day),
      reminders = dayReminders(cs.day),
      deadlines = dayDeadlines(cs.day),
      total = events.reduce((n, e) => n + minutes(e.end) - minutes(e.start), 0)
    host.append(
      el(
        'p',
        'wc-daystats',
        durationLabel(total) + ' planned · ' + reminders.length + ' reminder' + (reminders.length === 1 ? '' : 's'),
      ),
    )
    const rows = [
      ...events.map((e) => ({
        id: e.id,
        kind: 'event',
        title: e.title,
        time: clock(e.start) + '–' + clock(e.end) + (deadlines.some((d) => d.title === e.title) ? ' · Due today' : ''),
        sort: e.start,
      })),
      ...reminders.map((r) => ({
        id: r.id,
        kind: 'reminder',
        title: r.title,
        time: 'Reminder · ' + clock(r.at.slice(11)),
        sort: r.at.slice(11),
      })),
      ...deadlines
        .filter((d) => !events.some((e) => e.title === d.title))
        .map((d) => ({ id: d.id, kind: d.kind, title: d.title, time: '◆ Deadline', sort: '24:00' })),
    ].sort((a, b) => a.sort.localeCompare(b.sort))
    if (cs.selected?.kind === 'window') {
      host.append(button('Show day plan (' + rows.length + ')', () => selectDay(cs.day), 'wd-link'))
      return
    }
    rows.forEach((row) => {
      const b = button(
        '',
        () => selectDay(cs.day, { kind: row.kind, id: row.id }),
        'wc-dayentry' + (cs.selected?.id === row.id ? ' wc-entryselected' : ''),
      )
      b.dataset.workId = row.id
      b.dataset.workKind = row.kind
      b.append(el('span', '', row.time), el('strong', '', row.title))
      host.append(b)
    })
    if (!rows.length) host.append(el('p', 'wc-empty', 'No booked work or deadlines. Room to plan.'))
    if (cs.day === TODAY)
      host.append(button('Open today on dashboard →', () => changePage('dashboard'), 'wd-link wc-open-dashboard'))
  }
  function drawCalendarDetail() {
    const cs = calState(),
      host = root.querySelector('.wc-itemdetail')
    host.replaceChildren()
    host.hidden = !cs.selected
    if (!cs.selected) return
    const selected = cs.selected
    if (selected.kind === 'window') {
      const w = allWindows().find((x) => x.id === selected.id)
      if (!w) {
        host.hidden = true
        return
      }
      host.append(
        el('p', 'wc-inspectorkicker', w.type === 'project' ? 'PROJECT WORKWINDOW' : 'TASK WORKWINDOW'),
        el('h3', '', w.title),
        el('p', 'wc-windowdates', shortDate(w.start) + ' → ' + shortDate(w.end)),
        el('p', 'wc-deadline', '◆ Deadline · ' + shortDate(w.due)),
      )
      const breakdown = el('div', 'wc-breakdown')
      ;(w.parts || [['Focus', w.effort]]).forEach(([label, value]) =>
        breakdown.append(el('span', '', label + ' ' + durationLabel(value))),
      )
      host.append(breakdown, el('p', 'wc-footprint', durationLabel(w.effort) + ' of effort within this window.'))
      host.append(
        button(
          'Plan a time block →',
          () => {
            root.querySelector('.wc-plankind').value = 'block'
            plannerKind()
            const option = scheduleOptions().find((o) => o.id === w.itemId || o.title === w.title)
            if (option) fillPlanner(option.key)
            else {
              const select = root.querySelector('.wc-planitem')
              const key = 'window:' + w.id
              if (![...select.options].some((o) => o.value === key)) {
                const opt = el('option', '', w.title)
                opt.value = key
                select.append(opt)
              }
              select.value = key
              root.querySelector('.wc-planstart').focus()
            }
          },
          'wd-link',
        ),
      )
    } else if (selected.kind === 'event') {
      const event = state.events.find((e) => e.id === selected.id)
      if (!event) {
        host.hidden = true
        return
      }
      host.append(
        el('p', 'wc-inspectorkicker', 'PLANNED WORK'),
        el('h3', '', event.title),
        el('p', 'wc-windowdates', clock(event.start) + '–' + clock(event.end)),
        el('p', 'wc-footprint', event.detail),
      )
      host.append(
        button(
          'Mark done',
          () => {
            state.cal.selected = null
            complete(event, 'events')
            root.querySelector('.wc-status').textContent = 'Completed. Also updated on your dashboard.'
          },
          'wd-link',
        ),
      )
    } else if (selected.kind === 'reminder') {
      const r = state.reminders.find((x) => x.id === selected.id)
      if (!r) {
        host.hidden = true
        return
      }
      host.append(
        el('p', 'wc-inspectorkicker', 'REMINDER'),
        el('h3', '', r.title),
        el('p', 'wc-windowdates', fullDate(r.at.slice(0, 10)) + ' · ' + clock(r.at.slice(11))),
      )
    } else {
      const item = [...state.todos, ...state.notes].find((x) => x.id === selected.id)
      if (!item) {
        host.hidden = true
        return
      }
      host.append(
        el('p', 'wc-inspectorkicker', 'TASK DEADLINE'),
        el('h3', '', item.title || item.text),
        el('p', 'wc-deadline', '◆ ' + fullDate(item.date)),
        button(
          'Plan time →',
          () => {
            const option = scheduleOptions().find((o) => o.id === item.id)
            if (option) fillPlanner(option.key)
          },
          'wd-link',
        ),
      )
    }
  }
  function plannerKind() {
    const windowMode = root.querySelector('.wc-plankind').value === 'window'
    root.querySelector('.wc-planpair').hidden = windowMode
    root.querySelector('.wc-windowfields').hidden = !windowMode
    root.querySelector('.wc-planstart').required = !windowMode
    root.querySelector('.wc-windowend').required = windowMode
    root.querySelector('.wc-datelabel').textContent = windowMode ? 'Window starts' : 'Date'
    root.querySelector('.wc-save').textContent = windowMode ? 'Save WorkWindow' : 'Save time block'
    root.querySelector('.wc-plannerhint').textContent = windowMode
      ? 'Set the room to work before the deadline.'
      : 'Book actual time. Today’s blocks also appear on your dashboard.'
    root.querySelector('.wc-error').textContent = ''
  }
  root.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => changePage(b.dataset.page)))
  root.querySelectorAll('[data-cal-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      calState().mode = b.dataset.calMode
      drawCalendar()
      save()
    }),
  )
  function movePeriod(direction) {
    const cs = calState()
    if (cs.mode === 'week') {
      cs.day = plusDays(cs.day, direction * 7)
      cs.month = cs.day.slice(0, 7)
    } else {
      const d = dayObject(cs.month + '-01')
      d.setMonth(d.getMonth() + direction)
      cs.month = dayISO(d).slice(0, 7)
      cs.day = cs.month + '-01'
    }
    cs.selected = null
    drawCalendar()
    save()
  }
  root.querySelector('.wc-prev').addEventListener('click', () => movePeriod(-1))
  root.querySelector('.wc-next').addEventListener('click', () => movePeriod(1))
  root.querySelector('.wc-today').addEventListener('click', () => {
    Object.assign(calState(), { day: TODAY, month: TODAY.slice(0, 7), selected: null })
    drawCalendar()
    save()
  })
  root.querySelector('.wc-plankind').addEventListener('change', plannerKind)
  root.querySelector('.wc-save').addEventListener('click', () => {
    const form = root.querySelector('.wc-planform')
    if (!form.reportValidity()) return
    const picker = root.querySelector('.wc-planitem'),
      key = picker.value
    let item = scheduleOptions().find((o) => o.key === key)
    if (!item && key.startsWith('window:')) {
      const w = allWindows().find((w) => w.id === key.slice(7))
      if (w)
        item = {
          id: w.itemId,
          title: w.title,
          source: w.type === 'project' ? 'project' : 'window',
          project: w.type === 'project' ? w.title : undefined,
        }
    }
    const error = root.querySelector('.wc-error')
    if (!item) {
      error.textContent = 'Choose a work item first.'
      return
    }
    const date = root.querySelector('.wc-plandate').value
    if (root.querySelector('.wc-plankind').value === 'window') {
      const end = root.querySelector('.wc-windowend').value
      if (end < date) {
        error.textContent = 'The deadline must be on or after the window start.'
        return
      }
      if (!state.workWindows) state.workWindows = copy(defaultWindows)
      const effort = Number(root.querySelector('.wc-windoweffort').value)
      const id = 'window-' + uid()
      state.workWindows.push({
        id,
        itemId: item.id,
        title: item.title,
        type: item.source === 'project' ? 'project' : 'task',
        start: date,
        end,
        due: end,
        effort,
        parts: [['Focus', effort]],
      })
      Object.assign(calState(), { day: date, month: date.slice(0, 7), selected: { kind: 'window', id } })
      commit('WorkWindow saved.')
      root.querySelector('.wc-status').textContent = 'WorkWindow saved. Book a time block when you’re ready.'
      return
    }
    const start = root.querySelector('.wc-planstart').value,
      a = minutes(start),
      duration = Number(root.querySelector('.wc-duration').value),
      b = a + duration
    if (a < 0 || b > 1440) {
      error.textContent = 'Choose a time block within this day.'
      return
    }
    if (dayEvents(date).some((e) => a < minutes(e.end) && b > minutes(e.start))) {
      error.textContent = 'That overlaps booked work. Choose another time.'
      return
    }
    const id = item.source === 'project' || item.source === 'window' ? uid() : item.id
    const end = String(Math.floor(b / 60)).padStart(2, '0') + ':' + String(b % 60).padStart(2, '0')
    state.events.push({
      id,
      title: item.title,
      project: item.project,
      date,
      start,
      end,
      detail: durationLabel(duration) + ' planned effort.',
    })
    if (item.source === 'todos') state.todos = state.todos.filter((t) => t.id !== item.id)
    if (item.source === 'notes') state.notes = state.notes.filter((n) => n.id !== item.id)
    Object.assign(calState(), { day: date, month: date.slice(0, 7), selected: { kind: 'event', id } })
    if (date === TODAY) state.selected = id
    commit('Time block saved.')
    root.querySelector('.wc-status').textContent =
      date === TODAY ? 'Scheduled for today. Your dashboard is updated.' : 'Scheduled for ' + fullDate(date) + '.'
  })
  // Drag empty date cells to draft a window; assignment is explicit before saving.
  const rangeHint = el('p', 'wc-rangehint', 'Drag across dates to create a WorkWindow · or Shift-click an end date.')
  root.querySelector('.wc-calendararea').prepend(rangeHint)
  const rangeDialog = el('dialog', 'wc-range-dialog')
  rangeDialog.setAttribute('aria-labelledby', 'wc-range-title')
  rangeDialog.innerHTML =
    '<h3 id="wc-range-title">Create WorkWindow</h3><p class="wc-range-summary"></p><form class="wc-planform"><label>Assign to<select class="wc-range-item" required aria-label="Assign WorkWindow to task or project"></select></label><div class="wc-planpair"><label>Starts<input class="wc-range-start" type="date" required></label><label>Deadline<input class="wc-range-end" type="date" required></label></div><label>Estimated effort<select class="wc-range-effort"><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="480">8 hours</option></select></label><p class="wc-plannerhint">This reserves a window of opportunity. Book specific time blocks when you’re ready.</p><p class="wc-range-error wc-error" role="alert"></p><div class="wc-range-actions"><button type="button" class="wc-range-cancel wc-btn cursor-interaction">Cancel</button><button type="button" class="wc-range-save wc-btn wc-primary cursor-interaction">Create WorkWindow</button></div></form>'
  root.append(rangeDialog)
  let dragRange = null,
    _rangeDraft = null,
    suppressRangeClick = false,
    rangeOptions = []
  const rangeCells = () => [...root.querySelectorAll('.wc-day')]
  function markRange(a, b) {
    const start = a < b ? a : b,
      end = a < b ? b : a
    rangeCells().forEach((c) => c.classList.toggle('wc-inrange', c.dataset.date >= start && c.dataset.date <= end))
    rangeHint.textContent = shortDate(start) + ' → ' + shortDate(end) + ' · Release to assign a task or project'
  }
  function clearRange() {
    rangeCells().forEach((c) => c.classList.remove('wc-inrange'))
    rangeHint.textContent = 'Drag across dates to create a WorkWindow · or Shift-click an end date.'
    dragRange = null
    _rangeDraft = null
  }
  function openRange(a, b) {
    const start = a < b ? a : b,
      end = a < b ? b : a
    _rangeDraft = { start, end }
    markRange(start, end)
    rangeHint.textContent = shortDate(start) + ' → ' + shortDate(end) + ' · Assign your WorkWindow'
    rangeOptions = scheduleOptions()
    if (!rangeOptions.length && !state.events.length) {
      clearRange()
      openCapture('Task')
      showNotice('Create a task or project, then assign its WorkWindow.')
      return
    }
    state.events
      .filter((e) => !isDone(e.id))
      .forEach((e) => {
        if (!rangeOptions.some((o) => o.id === e.id || o.title === e.title))
          rangeOptions.push({ key: 'event:' + e.id, id: e.id, title: e.title, source: 'event' })
      })
    const picker = rangeDialog.querySelector('.wc-range-item')
    picker.replaceChildren()
    const placeholder = el('option', '', 'Choose a task or project')
    placeholder.value = ''
    picker.append(placeholder)
    for (const [kind, label] of [
      ['task', 'Tasks'],
      ['project', 'Projects'],
    ]) {
      const group = el('optgroup')
      group.label = label
      rangeOptions
        .filter((o) => (o.source === 'project' ? 'project' : 'task') === kind)
        .forEach((o) => {
          const opt = el('option', '', o.title)
          opt.value = o.key
          group.append(opt)
        })
      picker.append(group)
    }
    rangeDialog.querySelector('.wc-range-start').value = start
    rangeDialog.querySelector('.wc-range-end').value = end
    rangeDialog.querySelector('.wc-range-summary').textContent = fullDate(start) + ' → ' + fullDate(end)
    rangeDialog.querySelector('.wc-range-error').textContent = ''
    rangeDialog.showModal()
    picker.focus()
  }
  // Associate cells with their existing, verified date-button labels on each draw.
  const originalDrawCalendar = drawCalendar
  drawCalendar = function () {
    originalDrawCalendar()
    const cs = calState(),
      first =
        cs.mode === 'week'
          ? plusDays(cs.day, -dayObject(cs.day).getDay())
          : plusDays(cs.month + '-01', -dayObject(cs.month + '-01').getDay())
    rangeCells().forEach((c, i) => {
      c.dataset.date = plusDays(first, i)
    })
  }
  const weeksHost = root.querySelector('.wc-weeks')
  weeksHost.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.wc-chip,.wc-more,.wc-span')) return
    const cell = e.target.closest('.wc-day')
    if (!cell) return
    dragRange = {
      anchor: cell.dataset.date,
      end: cell.dataset.date,
      x: e.clientX,
      y: e.clientY,
      pointer: e.pointerId,
      moved: false,
    }
  })
  documentEvents.addEventListener('pointermove', (e) => {
    if (!dragRange || e.pointerId !== dragRange.pointer) return
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wc-day')
    if (!cell || !root.contains(cell)) return
    if (Math.hypot(e.clientX - dragRange.x, e.clientY - dragRange.y) > 5) dragRange.moved = true
    dragRange.end = cell.dataset.date
    if (dragRange.moved) {
      e.preventDefault()
      markRange(dragRange.anchor, dragRange.end)
    }
  })
  documentEvents.addEventListener('pointerup', (e) => {
    if (!dragRange || e.pointerId !== dragRange.pointer) return
    const draft = dragRange
    dragRange = null
    if (!draft.moved) return
    if (!root.querySelector('.wc-month').contains(document.elementFromPoint(e.clientX, e.clientY))) {
      clearRange()
      return
    }
    suppressRangeClick = true
    openRange(draft.anchor, draft.end)
    setTimeout(() => {
      suppressRangeClick = false
    }, 0)
  })
  documentEvents.addEventListener('pointercancel', clearRange)
  weeksHost.addEventListener(
    'click',
    (e) => {
      if (suppressRangeClick) {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      const cell = e.target.closest('.wc-day')
      if (e.shiftKey && cell && !e.target.closest('.wc-chip,.wc-more')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        openRange(calState().day, cell.dataset.date)
      } else if (cell && !e.target.closest('button')) selectDay(cell.dataset.date)
    },
    true,
  )
  documentEvents.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dragRange) clearRange()
  })
  rangeDialog.addEventListener('close', clearRange)
  rangeDialog.querySelector('.wc-range-cancel').addEventListener('click', () => rangeDialog.close())
  rangeDialog.querySelector('.wc-range-save').addEventListener('click', () => {
    const form = rangeDialog.querySelector('form')
    if (!form.reportValidity()) return
    const item = rangeOptions.find((o) => o.key === rangeDialog.querySelector('.wc-range-item').value),
      start = rangeDialog.querySelector('.wc-range-start').value,
      end = rangeDialog.querySelector('.wc-range-end').value
    if (end < start) {
      rangeDialog.querySelector('.wc-range-error').textContent = 'The deadline must be on or after the start date.'
      return
    }
    if (!item) return
    const effort = Number(rangeDialog.querySelector('.wc-range-effort').value),
      id = 'window-' + uid()
    if (!state.workWindows) state.workWindows = copy(defaultWindows)
    state.workWindows.push({
      id,
      itemId: item.id,
      title: item.title,
      type: item.source === 'project' ? 'project' : 'task',
      start,
      end,
      due: end,
      effort,
      parts: [['Focus', effort]],
    })
    Object.assign(calState(), { day: start, month: start.slice(0, 7), selected: { kind: 'window', id } })
    rangeDialog.close()
    clearRange()
    commit('WorkWindow created.')
    root.querySelector('.wc-status').textContent = 'WorkWindow assigned to ' + item.title + '.'
  })
  const workflowStages = ['Backlog', 'Ready', 'In progress', 'Done']
  const projectSeeds = []
  const taskSeeds = []
  function workflowState() {
    if (!state.workItems) state.workItems = []
    if (!state.taskMeta) state.taskMeta = {}
  }
  function projectList() {
    return [...projectSeeds, ...state.projects.filter((p) => !projectSeeds.some((s) => s.id === p.id))]
  }
  function allTasks() {
    workflowState()
    const found = new Map()
    for (const source of ['done', 'events', 'todos', 'notes', 'workItems']) {
      for (const raw of state[source]) {
        if (source === 'notes' && raw.type !== 'Task') continue
        if (found.has(raw.id)) continue
        const meta = state.taskMeta[raw.id] || {},
          seed = taskSeeds.find((t) => t.id === raw.id)
        const project = meta.project !== undefined ? meta.project : raw.project || seed?.project || ''
        const status =
          source === 'done'
            ? 'Done'
            : (meta.status === 'Done' ? null : meta.status) ||
              (source === 'workItems' ? raw.status : source === 'notes' ? 'Backlog' : 'Ready')
        found.set(raw.id, {
          ...seed,
          ...raw,
          ...meta,
          id: raw.id,
          title: raw.title || raw.text,
          project,
          status,
          source,
        })
      }
    }
    return [...found.values()]
  }
  function taskBlocked(t) {
    if (t.status === 'Done') return ''
    if (t.blocked) return t.blocked
    for (const id of new Set([...(t.dependencies || []), t.dependsOn].filter(Boolean))) {
      const dependency = allTasks().find((x) => x.id === id)
      if (dependency && dependency.status !== 'Done') return 'Waiting for ' + dependency.title
    }
    return ''
  }
  function taskTime(t) {
    const event = state.events.find((e) => e.id === t.id)
    if (event) return dateLabel(event.date || TODAY) + ' · ' + clock(event.start) + '–' + clock(event.end)
    const anytime = state.todos.find((x) => x.id === t.id)
    if (anytime) return dateLabel(anytime.plannedFor || TODAY) + ' · anytime'
    const w = allWindows().find((w) => w.itemId === t.id)
    return w ? 'Window · ' + shortDate(w.start) + '–' + shortDate(w.end) : 'Not scheduled'
  }
  function projectStats(p) {
    const tasks = allTasks().filter((t) => t.project === p.title),
      done = tasks.filter((t) => t.status === 'Done').length,
      blocked = tasks.filter((t) => taskBlocked(t)),
      open = tasks.filter((t) => t.status !== 'Done')
    const available = open.filter((t) => !taskBlocked(t))
    available.sort((a, b) => {
      const unblocks = (t) => blocked.filter((x) => x.dependsOn === t.id).length
      return (
        unblocks(b) - unblocks(a) ||
        (inToday(b.id) ? 1 : 0) - (inToday(a.id) ? 1 : 0) ||
        ['In progress', 'Ready', 'Backlog'].indexOf(a.status) - ['In progress', 'Ready', 'Backlog'].indexOf(b.status)
      )
    })
    const next = available[0],
      windows = allWindows().filter((w) => w.type === 'project' && (w.itemId === p.id || w.title === p.title)),
      deadline = windows.map((w) => w.due || w.end).sort()[0]
    const estimates = open.map((t) =>
      allWindows()
        .filter((w) => w.type !== 'project' && w.itemId === t.id)
        .reduce((sum, w) => sum + w.effort, 0),
    )
    const ids = new Set(tasks.map((t) => t.id))
    const booked = state.events
      .filter(
        (e) =>
          (ids.has(e.id) || e.project === p.title) &&
          (e.date || TODAY) >= TODAY &&
          (!deadline || (e.date || TODAY) <= deadline) &&
          !isDone(e.id),
      )
      .reduce((sum, e) => sum + minutes(e.end) - minutes(e.start), 0)
    const recent = tasks
      .filter(
        (t) => t.status === 'Done' && t.completedOn && t.completedOn >= plusDays(TODAY, -6) && t.completedOn <= TODAY,
      )
      .sort((a, b) => b.completedOn.localeCompare(a.completedOn))
    return {
      tasks,
      done,
      blocked,
      next,
      windows,
      open,
      deadline,
      booked,
      estimatedCount: estimates.filter(Boolean).length,
      openEffort: estimates.reduce((a, b) => a + b, 0),
      recent,
    }
  }
  function openProject(title) {
    state.projectSelected = projectList().find((p) => p.title === title)?.id
    changePage('projects')
  }
  function openProjectBoard(title) {
    state.boardFilter = title
    changePage('boards')
  }
  function calendarFor(item, windowMode = false) {
    const w = allWindows().find((w) => w.itemId === item.id)
    const event = state.events.find((e) => e.id === item.id)
    const date = w?.start || event?.date || TODAY
    Object.assign(calState(), {
      day: date,
      month: date.slice(0, 7),
      selected: w ? { kind: 'window', id: w.id } : event ? { kind: 'event', id: event.id } : null,
    })
    changePage('calendar')
    if (!w && !event) {
      root.querySelector('.wc-plankind').value = windowMode ? 'window' : 'block'
      plannerKind()
      const opt = scheduleOptions().find((o) => o.id === item.id)
      if (opt) {
        root.querySelector('.wc-planitem').value = opt.key
        root.querySelector('.wc-planitem').focus()
        root.querySelector('.wc-planner').scrollIntoView({ block: 'center' })
      }
    }
  }
  const oldScheduleOptions = scheduleOptions
  scheduleOptions = function () {
    const options = oldScheduleOptions()
    allTasks()
      .filter((t) => t.status !== 'Done' && !state.events.some((e) => e.id === t.id))
      .forEach((t) => {
        if (!options.some((o) => o.id === t.id))
          options.push({ key: 'work:' + t.id, id: t.id, title: t.title, project: t.project, source: 'workItems' })
      })
    return options
  }
  let updateTaskStatus = function (t, status) {
    workflowState()
    state.taskMeta[t.id] = { ...state.taskMeta[t.id], status }
    if (status === 'Done' && t.status !== 'Done') {
      for (const source of ['events', 'todos', 'notes', 'workItems'])
        state[source] = state[source].filter((x) => x.id !== t.id)
      state.done.push({ ...t, from: t.source, completedOn: TODAY })
    } else if (t.status === 'Done' && status !== 'Done') {
      state.done = state.done.filter((x) => x.id !== t.id)
      state.workItems = state.workItems.filter((x) => x.id !== t.id)
      state.workItems.push({ ...t, status })
    }
    commit(t.title + ' → ' + status)
    root.querySelector('.wb-feedback').textContent = t.title + ' moved to ' + status + '. All views updated.'
  }
  function taskCard(t) {
    const card = el('article', 'wb-task')
    card.draggable = false
    card.dataset.taskId = t.id
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', t.id)
      e.dataTransfer.effectAllowed = 'move'
    })
    if (t.project) card.append(button(t.project, () => openProject(t.project), 'wd-link wb-projectlink'))
    else card.append(el('p', '', 'Standalone task'))
    card.append(el('h3', '', t.title))
    const blocker = taskBlocked(t)
    if (blocker) card.append(el('p', 'wb-blocker', 'Blocked · ' + blocker))
    card.append(el('p', '', t.status === 'Done' ? 'Completed' : taskTime(t)))
    const status = el('select')
    status.setAttribute('aria-label', 'Status for ' + t.title)
    workflowStages.forEach((value) => {
      const opt = el('option', '', value)
      opt.value = value
      status.append(opt)
    })
    status.value = t.status
    status.addEventListener('change', () => updateTaskStatus(t, status.value))
    card.append(status)
    const assignment = el('select')
    assignment.setAttribute('aria-label', 'Project for ' + t.title)
    ;['', ...projectList().map((p) => p.title)].forEach((name) => {
      const opt = el('option', '', name || 'No project')
      opt.value = name
      assignment.append(opt)
    })
    assignment.value = t.project || ''
    assignment.addEventListener('change', () => {
      state.taskMeta[t.id] = { ...state.taskMeta[t.id], project: assignment.value }
      for (const source of ['todos', 'events', 'notes', 'done', 'workItems'])
        state[source].filter((x) => x.id === t.id).forEach((x) => (x.project = assignment.value))
      commit('Project assignment updated.')
    })
    const manage = el('details', 'wb-manage')
    manage.append(el('summary', 'cursor-interaction', 'Project & blocker'), assignment)
    card.append(manage)
    if (t.status !== 'Done') {
      const actions = el('div', 'wb-actions')
      if (!inToday(t.id))
        actions.append(
          button('Add to today', () => {
            addToday({ id: t.id, title: t.title, project: t.project })
            root.querySelector('.wb-feedback').textContent = t.title + ' added to the dashboard’s Today list.'
          }),
        )
      else actions.append(button('View today', () => changePage('dashboard')))
      actions.append(
        button(state.events.some((e) => e.id === t.id) ? 'View calendar' : 'Plan time', () => calendarFor(t)),
      )
      const blocked = button(t.blocked ? 'Clear blocker' : 'Flag blocker', () => {
        state.taskMeta[t.id] = { ...state.taskMeta[t.id], blocked: t.blocked ? '' : 'Needs attention' }
        commit('Blocker updated.')
      })
      if (!t.dependsOn) manage.append(blocked)
      card.append(actions)
    }
    return card
  }
  let drawBoard = function () {
    const filter = root.querySelector('.wb-filter')
    filter.replaceChildren()
    ;['All work', ...projectList().map((p) => p.title), 'No project'].forEach((name) => {
      const o = el('option', '', name)
      o.value = name
      filter.append(o)
    })
    filter.value = state.boardFilter || 'All work'
    if (!filter.value) filter.value = 'All work'
    const tasks = allTasks().filter(
      (t) => filter.value === 'All work' || (filter.value === 'No project' ? !t.project : t.project === filter.value),
    )
    root.querySelector('.wb-summary').textContent =
      tasks.length + ' tasks · ' + tasks.filter((t) => taskBlocked(t)).length + ' blocked'
    const host = root.querySelector('.wb-columns')
    host.replaceChildren()
    workflowStages.forEach((stage) => {
      const col = el('section', 'wb-column')
      col.dataset.stage = stage
      col.setAttribute('aria-label', stage + ' tasks')
      const list = tasks.filter((t) => t.status === stage)
      const head = el('h2', '', stage)
      head.append(el('span', '', String(list.length)))
      col.append(head)
      list.forEach((t) => col.append(taskCard(t)))
      if (!list.length) col.append(el('p', 'wp-empty', 'No tasks here.'))
      col.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        col.classList.add('wb-over')
      })
      col.addEventListener('dragleave', () => col.classList.remove('wb-over'))
      col.addEventListener('drop', (e) => {
        e.preventDefault()
        col.classList.remove('wb-over')
        const t = allTasks().find((t) => t.id === e.dataTransfer.getData('text/plain'))
        if (t) updateTaskStatus(t, stage)
      })
      host.append(col)
    })
  }
  function progressMeter(done, total) {
    const meter = el('div', 'wd-meter')
    meter.setAttribute('role', 'progressbar')
    meter.setAttribute('aria-label', 'Tasks completed')
    meter.setAttribute('aria-valuemin', '0')
    meter.setAttribute('aria-valuemax', String(total || 1))
    meter.setAttribute('aria-valuenow', String(done))
    const fill = el('span')
    fill.style.width = (total ? (done / total) * 100 : 0) + '%'
    meter.append(fill)
    return meter
  }

  function projectTimetable(p, stats) {
    const panel = el('section', 'wp-timetable')
    panel.setAttribute('aria-label', p.title + ' WorkWindow')
    if (!stats.windows.length) {
      panel.append(
        el('p', 'wd-eyebrow', 'WORKWINDOW'),
        el('strong', '', 'No timetable yet'),
        el('p', 'wp-stat', 'Choose working dates, a deadline, and estimated effort.'),
        button('Set WorkWindow →', () => calendarFor(p, true), 'wd-link'),
      )
      return panel
    }
    stats.windows.forEach((w) => {
      const row = el('div', 'wp-windowrow')
      const top = el('div', 'wp-windowtop')
      top.append(
        el('strong', '', shortDate(w.start) + ' – ' + shortDate(w.end)),
        el('span', 'wp-effort', durationLabel(w.effort) + ' estimated effort'),
      )
      row.append(top)
      const dates = el('div', 'wp-windowdates')
      dates.append(
        el('span', '', 'Start · ' + shortDate(w.start)),
        el('span', '', 'Deadline · ' + shortDate(w.due || w.end)),
      )
      row.append(dates)
      const rail = el('div', 'wp-timerail')
      rail.setAttribute('role', 'img')
      rail.setAttribute(
        'aria-label',
        'Working window ' +
          shortDate(w.start) +
          ' to ' +
          shortDate(w.end) +
          '. Today ' +
          shortDate(TODAY) +
          '. Deadline ' +
          shortDate(w.due || w.end),
      )
      if (TODAY >= w.start && TODAY <= w.end) {
        const range = dayObject(w.end) - dayObject(w.start),
          position = range ? ((dayObject(TODAY) - dayObject(w.start)) / range) * 100 : 50
        const marker = el('span', 'wp-todaymarker')
        marker.style.left = position + '%'
        rail.append(marker)
      }
      row.append(
        rail,
        el(
          'p',
          'wp-windowtoday',
          TODAY < w.start
            ? 'Starts ' + shortDate(w.start)
            : TODAY > w.end
              ? 'Window ended ' + shortDate(w.end)
              : 'Today · ' + shortDate(TODAY),
        ),
      )
      row.append(
        button(
          'View in calendar →',
          () => {
            Object.assign(calState(), {
              day: w.start,
              month: w.start.slice(0, 7),
              selected: { kind: 'window', id: w.id },
            })
            changePage('calendar')
          },
          'wd-link',
        ),
      )
      panel.append(row)
    })
    return panel
  }
  function projectTaskTile(t) {
    const card = button('', () => openCard(t), 'wp-tasktile')
    card.setAttribute('aria-label', 'Open task: ' + t.title)
    const head = el('div', 'wp-tasktilehead')
    head.append(el('strong', '', t.title), el('span', 'wp-taskstatus', t.status))
    card.append(head)
    if (t.status !== 'Done') {
      const time = taskTime(t)
      if (time !== 'Not scheduled') card.append(el('span', 'wp-tasktime', time))
      const blocked = taskBlocked(t)
      if (blocked) card.append(el('span', 'wp-taskblocked', 'Blocked · ' + blocked))
    }
    return card
  }
  let drawProjectPages = function () {
    const projects = projectList(),
      list = root.querySelector('.wp-list')
    list.replaceChildren()
    const selected = projects.find((p) => p.id === state.projectSelected) || projects[0]
    projects.forEach((p) => {
      const stats = projectStats(p),
        b = button(
          '',
          () => {
            state.projectSelected = p.id
            drawProjectPages()
            save()
          },
          'wp-project',
        )
      b.setAttribute('aria-pressed', String(p.id === selected.id))
      b.append(
        el('strong', '', p.title),
        el('span', '', stats.done + ' of ' + stats.tasks.length + ' tasks complete'),
        progressMeter(stats.done, stats.tasks.length),
        el(
          'span',
          '',
          stats.blocked.length
            ? stats.blocked.length + ' blocked · needs attention'
            : stats.next
              ? 'Next · ' + stats.next.title
              : 'Define the next step',
        ),
      )
      list.append(b)
    })
    list.append(button('+ Capture a project', () => openCapture('Project'), 'wc-btn'))
    const p = selected,
      stats = projectStats(p),
      host = root.querySelector('.wp-detail')
    host.replaceChildren()
    host.append(
      el('p', 'wd-eyebrow', 'PROJECT & WORKWINDOW'),
      el('h2', '', p.title),
      projectTimetable(p, stats),
      el('p', 'wp-outcome', p.outcome || 'Shape this idea into an outcome, then build the steps below.'),
      el(
        'p',
        'wp-stat',
        stats.done + ' of ' + stats.tasks.length + ' tasks complete · ' + stats.blocked.length + ' blocked',
      ),
      progressMeter(stats.done, stats.tasks.length),
    )
    const actions = el('div', 'wb-actions')
    actions.append(button('Open project board →', () => openProjectBoard(p.title), 'wc-btn'))
    host.append(actions)
    if (stats.next) {
      const next = el('div', 'wp-next')
      next.append(
        el('small', '', 'NEXT ACTION'),
        el('strong', '', stats.next.title),
        el('p', 'wp-stat', taskTime(stats.next)),
      )
      const b = button(inToday(stats.next.id) ? 'View on dashboard →' : 'Add to today →', () => {
        if (inToday(stats.next.id)) changePage('dashboard')
        else addToday({ id: stats.next.id, title: stats.next.title, project: p.title })
      })
      next.append(b)
      host.append(next)
    }
    host.append(
      el('h3', '', 'Tasks'),
      el('p', 'wp-taskhint', 'The same cards as your board. Select a task to view or edit it.'),
    )
    const tasks = el('div', 'wp-tasklist')
    stats.tasks.filter((t) => t.status !== 'Done').forEach((t) => tasks.append(projectTaskTile(t)))
    if (!tasks.children.length)
      tasks.append(
        el('p', 'wp-empty', stats.tasks.length ? 'All tasks complete.' : 'Start with one small, concrete action.'),
      )
    host.append(tasks)
    if (stats.done) {
      const completed = el('details', 'wp-completed')
      completed.append(el('summary', 'cursor-interaction', 'Completed · ' + stats.done))
      const doneList = el('div', 'wp-tasklist')
      stats.tasks.filter((t) => t.status === 'Done').forEach((t) => doneList.append(projectTaskTile(t)))
      completed.append(doneList)
      host.append(completed)
    }
    const add = el('form', 'wp-add'),
      input = el('input')
    input.placeholder = 'Add a task to this project…'
    input.setAttribute('aria-label', 'New task for ' + p.title)
    input.maxLength = 180
    input.required = true
    const create = () => {
      if (!input.reportValidity() || !input.value.trim()) return
      state.workItems.push({ id: uid(), title: input.value.trim(), project: p.title, status: 'Backlog' })
      commit('Task added to project backlog.')
    }
    add.append(input, button('Add task', create, 'wc-btn'))
    add.addEventListener('submit', (e) => {
      e.preventDefault()
      create()
    })
    host.append(add)
    host.append(
      el('h3', '', 'Notes & reminders'),
      el('p', 'wp-taskhint', 'Saved here in ' + p.title + ' and in your dashboard’s sticky inbox.'),
    )
    const notes = state.notes.filter((n) => n.project === p.title && n.type !== 'Task'),
      reminders = state.reminders.filter((r) => r.project === p.title)
    if (!notes.length && !reminders.length) host.append(el('p', 'wp-empty', 'No project notes or reminders yet.'))
    notes.forEach((n) => {
      const note = el('article', 'wp-savednote')
      note.dataset.noteId = n.id
      note.append(el('small', '', 'PROJECT NOTE · ' + p.title), el('p', '', n.text))
      host.append(note)
    })
    reminders.forEach((r) =>
      host.append(
        el('p', 'wp-related', dateLabel(r.at.slice(0, 10)) + ' · ' + clock(r.at.slice(11)) + ' · ' + r.title),
      ),
    )
  }
  drawProjects = function () {
    const host = root.querySelector('.wd-projectlist')
    host.replaceChildren()
    projectList().forEach((p) => {
      const s = projectStats(p)
      const card = el('article', 'wd-project')
      card.append(
        el('h3', '', p.title),
        el(
          'p',
          'wd-projectstage',
          s.blocked.length
            ? s.blocked.length + ' blocked · needs attention'
            : s.tasks.length && s.done === s.tasks.length
              ? 'Complete'
              : s.tasks.length
                ? 'In progress'
                : 'Not started',
        ),
        el('p', 'wd-projectdue', s.deadline ? 'Next deadline · ' + shortDate(s.deadline) : 'No deadline yet'),
        el('p', 'wp-stat', s.done + ' of ' + s.tasks.length + ' tasks done'),
        progressMeter(s.done, s.tasks.length),
      )
      if (s.blocked.length) card.append(el('p', 'wd-blocker', taskBlocked(s.blocked[0])))
      const next = el('div', 'wd-next')
      next.append(
        el('small', '', 'NEXT ACTION'),
        el(
          'strong',
          '',
          s.next?.title ||
            (s.tasks.length && s.done === s.tasks.length ? 'Planned tasks complete' : 'Define the next step'),
        ),
      )
      if (s.next) {
        next.append(
          button(
            inToday(s.next.id) ? 'View today’s work' : 'Add to today',
            () => {
              if (inToday(s.next.id)) {
                state.selected = s.next.id
                drawDetail()
                root.querySelector('.wd-day').scrollIntoView({ block: 'start' })
              } else addToday({ id: s.next.id, title: s.next.title, project: p.title })
            },
            'wd-projectaction',
          ),
        )
      }
      next.append(button('Open project →', () => openProject(p.title)))
      card.append(next)
      host.append(card)
    })
    root.querySelector('.wd-projectcount').textContent =
      projectList().length + ' project' + (projectList().length === 1 ? '' : 's')
  }
  const pileKey = (stage, project) => JSON.stringify([stage, project || ''])
  const pileOpen = (key) => !!state.boardPiles?.[key]
  function projectColor(project) {
    if (!project) return 'var(--wd-muted)'
    const index = projectList().findIndex((p) => p.title === project)
    return ['light-dark(#3c9b87,#75c4ae)', 'light-dark(#9563c4,#b394df)', 'var(--wd-blue)'][Math.max(0, index) % 3]
  }
  const cardDialog = el('dialog', 'wc-range-dialog wb-card-dialog')
  cardDialog.setAttribute('aria-label', 'Task details')
  root.append(cardDialog)
  let detailTaskId = null
  function drawCardDialog() {
    if (!cardDialog.open) return
    const t = allTasks().find((t) => t.id === detailTaskId)
    if (!t) {
      cardDialog.close()
      return
    }
    cardDialog.style.setProperty('--ww-project-color', projectColor(t.project))
    const header = el('div', 'wb-editorheader')
    header.append(
      el('h2', '', 'Card details'),
      ribbon(t.project || ''),
      button('Close', () => closeCard(), 'wc-btn wb-dialogclose'),
    )
    cardDialog.replaceChildren(header)
    const form = el('form', 'wb-editor')
    function field(label, input) {
      const wrap = el('label', 'wb-editorfield', label)
      wrap.append(input)
      form.append(wrap)
      return input
    }
    const title = field('Task title', el('input'))
    title.value = t.title
    title.required = true
    title.maxLength = 180
    const description = field('Short description', el('input'))
    description.value = t.description || ''
    description.maxLength = 300
    const notes = field('Notes & information', el('textarea'))
    notes.value = t.notes || ''
    notes.rows = 3
    notes.parentElement.classList.add('wb-editorwide')
    notes.maxLength = 4000
    notes.placeholder = 'Details, context, links, or anything you need to remember…'
    const status = field('Workflow stage', el('select'))
    workflowStages.forEach((v) => {
      const o = el('option', '', v)
      o.value = v
      status.append(o)
    })
    status.value = t.status
    const project = field('Project', el('select'))
    ;['', ...projectList().map((p) => p.title)].forEach((v) => {
      const o = el('option', '', v || 'No project')
      o.value = v
      project.append(o)
    })
    project.value = t.project || ''
    const taskWindows = allWindows().filter((w) => w.itemId === t.id && w.type !== 'project')
    const windowSection = el('fieldset', 'wb-windowfields')
    windowSection.append(el('legend', '', 'Task WorkWindow'))
    const windowInputs = (taskWindows.length ? taskWindows : [null]).map((w) => {
      const row = el('div', 'wb-windowinputs')
      function input(label, type, value) {
        const wrap = el('label', 'wb-editorfield', label),
          control = el('input')
        control.type = type
        control.value = value
        wrap.append(control)
        row.append(wrap)
        return control
      }
      const start = input('Start date', 'date', w?.start || ''),
        end = input('Deadline', 'date', w?.due || w?.end || ''),
        effort = input('Estimated effort (hours)', 'number', w ? String(w.effort / 60) : '')
      effort.min = '0.25'
      effort.step = 'any'
      effort.placeholder = 'e.g. 1.5'
      start.addEventListener('change', () => {
        end.min = start.value
      })
      end.min = start.value
      windowSection.append(row)
      return { original: w, start, end, effort }
    })
    if (!taskWindows.length)
      windowSection.append(
        el('p', 'wb-windowhint', 'Optional. Set a window for this task; the project’s timetable stays separate.'),
      )
    form.append(windowSection)
    const blockSection = el('div', 'wb-editorblock')
    const checkLabel = el('label', 'wb-blockcheck')
    const blocked = el('input')
    blocked.type = 'checkbox'
    blocked.checked = !!t.blocked
    checkLabel.append(blocked, el('span', '', 'Mark as blocked'))
    blockSection.append(checkLabel)
    const reason = el('textarea')
    reason.rows = 2
    reason.maxLength = 500
    reason.value = t.blocked || ''
    reason.placeholder = 'What is holding this up?'
    reason.setAttribute('aria-label', 'Blocker reason')
    reason.hidden = !blocked.checked
    blocked.addEventListener('change', () => {
      reason.hidden = !blocked.checked
      if (blocked.checked) reason.focus()
    })
    blockSection.append(reason)
    const dependencyLabel = el('label', 'wb-editorfield wb-dependencyfield', 'Waiting on a task')
    const dependency = el('select')
    dependency.append(el('option', '', 'None'))
    dependency.options[0].value = ''
    allTasks()
      .filter((x) => x.id !== t.id)
      .forEach((x) => {
        const o = el('option', '', x.title + (x.status === 'Done' ? ' (done)' : ''))
        o.value = x.id
        dependency.append(o)
      })
    dependency.value = t.dependsOn || ''
    dependencyLabel.append(dependency)
    blockSection.append(dependencyLabel)
    form.append(blockSection)
    form.append(el('p', 'wp-stat', taskTime(t)))
    const notice = el('p', 'wb-editnotice')
    notice.setAttribute('role', 'status')
    form.append(notice)
    const actions = el('div', 'wb-editoractions')
    const saveButton = el('button', 'wc-btn', 'Save changes')
    saveButton.type = 'submit'
    actions.append(
      saveButton,
      button('Cancel', () => closeCard(), 'wd-link'),
    )
    form.append(actions)
    const saveCard = (e) => {
      e.preventDefault()
      if (!form.reportValidity() || !title.value.trim()) return
      const drafts = []
      for (const inputs of windowInputs) {
        const { original, start, end, effort } = inputs
        if (!original && !start.value && !end.value && !effort.value) continue
        if (
          !start.value ||
          !end.value ||
          !effort.value ||
          end.value < start.value ||
          !Number.isFinite(Number(effort.value)) ||
          Number(effort.value) <= 0
        ) {
          notice.textContent = 'Enter a start date, a deadline on or after it, and a positive effort estimate.'
          return
        }
        drafts.push({ original, start: start.value, end: end.value, effort: Math.round(Number(effort.value) * 60) })
      }

      const patch = {
        title: title.value.trim(),
        description: description.value.trim(),
        notes: notes.value.trim(),
        project: project.value,
        blocked: blocked.checked ? reason.value.trim() || 'Needs attention' : '',
        dependsOn: dependency.value,
        dependencies: [
          ...new Set([...(t.dependencies || []).filter((id) => id !== t.dependsOn), dependency.value].filter(Boolean)),
        ],
      }
      if (drafts.length) {
        if (!state.workWindows) state.workWindows = copy(defaultWindows)
        drafts.forEach((d) => {
          const existing = d.original && state.workWindows.find((w) => w.id === d.original.id)
          const fields = {
            itemId: t.id,
            title: patch.title,
            type: 'task',
            start: d.start,
            end: d.end,
            due: d.end,
            effort: d.effort,
          }
          if (existing) {
            if (existing.effort !== d.effort) existing.parts = [['Focus', d.effort]]
            Object.assign(existing, fields)
          } else state.workWindows.push({ id: 'window-' + uid(), ...fields, parts: [['Focus', d.effort]] })
        })
      }
      state.taskMeta[t.id] = { ...state.taskMeta[t.id], ...patch }
      for (const source of ['todos', 'events', 'notes', 'done', 'workItems'])
        state[source]
          .filter((x) => x.id === t.id)
          .forEach((x) => {
            Object.assign(x, patch)
            if (source === 'notes') x.text = patch.title
          })
      if (status.value !== t.status) updateTaskStatus({ ...t, ...patch }, status.value)
      else commit('Card changes saved.')
      cardDialog.querySelector('.wb-editnotice').textContent =
        'Saved. Card details and WorkWindow updated across the app.'
    }
    saveButton.type = 'button'
    saveButton.addEventListener('click', saveCard)
    form.addEventListener('submit', saveCard)
    const links = el('div', 'wb-editorlinks')
    links.append(button('View / plan time →', () => closeCard(() => calendarFor(t)), 'wd-link'))
    if (t.status !== 'Done')
      links.append(
        button(
          inToday(t.id) ? 'View today →' : 'Add to today →',
          () =>
            closeCard(() => {
              if (inToday(t.id)) changePage('dashboard')
              else addToday({ id: t.id, title: t.title, project: t.project })
            }),
          'wd-link',
        ),
      )
    form.insertBefore(links, actions)
    cardDialog.append(form)
  }
  let cardClosing = false
  function closeCard(after) {
    if (cardClosing || !cardDialog.open) return
    cardClosing = true
    const finish = () => {
      cardDialog.close()
      cardClosing = false
      if (after) after()
    }
    cardDialog.getAnimations().forEach((animation) => animation.cancel())
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const motion = cardDialog.animate(
      [
        { transform: 'perspective(1200px) rotateY(0) scale(1)', opacity: 1 },
        { transform: 'perspective(1200px) rotateY(-85deg) scale(.92)', opacity: 0.3 },
      ],
      { duration: 280, easing: 'cubic-bezier(.55,0,.8,.25)', fill: 'forwards' },
    )
    motion.onfinish = () => {
      finish()
      motion.cancel()
    }
  }
  cardDialog.addEventListener('cancel', (e) => {
    e.preventDefault()
    closeCard()
  })
  function openCard(t) {
    detailTaskId = t.id
    if (!cardDialog.open) cardDialog.showModal()
    drawCardDialog()
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      cardDialog.animate(
        [
          { transform: 'perspective(1200px) rotateY(-85deg) scale(.92)', opacity: 0.3 },
          { transform: 'perspective(1200px) rotateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 340, easing: 'cubic-bezier(.2,.75,.25,1)' },
      )
  }
  cardDialog.addEventListener('click', (e) => {
    if (e.target.closest('.wb-actions button,.wb-projectlink')) closeCard()
  })
  const expandBoard = button(
    'Expand all piles',
    () => {
      const piles = [...root.querySelectorAll('.wb-pile')],
        open = !piles.every((p) => pileOpen(p.dataset.pile))
      state.boardPiles = state.boardPiles || {}
      piles.forEach((p) => {
        state.boardPiles[p.dataset.pile] = open
        updatePile(p, p.dataset.pile, open)
      })
      syncPileToggles()
      save()
    },
    'wc-btn wb-expandall',
  )
  root.querySelector('.wb-toolbar').insertBefore(expandBoard, root.querySelector('.wb-capture'))
  function syncPileToggles() {
    syncProjectToggles()
    const piles = [...root.querySelectorAll('.wb-pile')]
    expandBoard.textContent =
      piles.length && piles.every((p) => pileOpen(p.dataset.pile)) ? 'Collapse all piles' : 'Expand all piles'
    root.querySelectorAll('.wb-column').forEach((col) => {
      const toggle = col.querySelector('.wb-column-toggle')
      if (toggle)
        toggle.textContent = [...col.querySelectorAll('.wb-pile')].every((p) => pileOpen(p.dataset.pile))
          ? 'Collapse piles'
          : 'Expand piles'
    })
  }
  function updatePile(pile, key, open) {
    pile.classList.toggle('wb-pileopen', open)
    const cards = [...pile.querySelectorAll('.wb-property')]
    const rack = pile.querySelector('.wb-rack')
    rack.style.height = (open ? cards.length * 94 + 30 : Math.min(cards.length, 3) * 58 + 12) + 'px'
    cards.forEach((card, i) => {
      card.style.transform = 'translateY(' + (open ? i * 94 : i * 58) + 'px)'
      card.inert = !open && i >= 3
      card.style.visibility = !open && i >= 3 ? 'hidden' : 'visible'
      card.style.zIndex = String(i + 1)
    })
    const toggle = pile.querySelector('.wb-piletoggle')
    const chevron = el('i')
    chevron.setAttribute('data-lucide', open ? 'chevron-up' : 'chevron-down')
    chevron.setAttribute('aria-hidden', 'true')
    toggle.replaceChildren(chevron, el('span', '', String(cards.length)))
    const label =
      (open ? 'Collapse ' : 'Expand ') + (pile.dataset.project || 'No project') + ' pile in ' + JSON.parse(key)[0]
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('data-tooltip', label)
    if (typeof lucide !== 'undefined') lucide.createIcons()
    toggle.setAttribute('aria-expanded', String(open))
    toggle.hidden = !cards.length
    pile.classList.toggle('wb-pileempty', !cards.length)
    if (!cards.length) {
      rack.style.height = '32px'
      rack.textContent = 'No tasks in this stage'
    }
    const more = pile.querySelector('.wb-pilemore')
    more.hidden = open || cards.length <= 3
    scheduleProjectAlignment()
  }
  drawBoard = function () {
    const filter = root.querySelector('.wb-filter')
    filter.replaceChildren()
    ;['All work', ...projectList().map((p) => p.title), 'No project'].forEach((name) => {
      const o = el('option', '', name)
      o.value = name
      filter.append(o)
    })
    filter.value = state.boardFilter || 'All work'
    if (!filter.value) filter.value = 'All work'
    const tasks = allTasks().filter(
      (t) => filter.value === 'All work' || (filter.value === 'No project' ? !t.project : t.project === filter.value),
    )
    root.querySelector('.wb-summary').textContent =
      tasks.length + ' tasks · ' + tasks.filter((t) => taskBlocked(t)).length + ' blocked'
    const host = root.querySelector('.wb-columns')
    host.replaceChildren()
    workflowStages.forEach((stage) => {
      const col = el('section', 'wb-column')
      col.dataset.stage = stage
      col.setAttribute('aria-label', stage + ' tasks')
      const list = tasks.filter((t) => t.status === stage),
        head = el('h2', '', stage)
      head.append(el('span', '', String(list.length)))
      const columnHead = el('div', 'wb-columnhead')
      columnHead.append(
        head,
        el(
          'p',
          'wb-stagehint',
          {
            Backlog: 'Ideas to shape',
            Ready: 'Ready for the next step',
            'In progress': 'Work underway',
            Done: 'Finished work',
          }[stage],
        ),
      )
      col.append(columnHead)
      const groups = orderedProjects(tasks)
      if (groups.length) {
        const stageToggle = button(
          groups.every((p) => pileOpen(pileKey(stage, p))) ? 'Collapse piles' : 'Expand piles',
          () => {
            const open = !groups.every((p) => pileOpen(pileKey(stage, p)))
            state.boardPiles = state.boardPiles || {}
            groups.forEach((p) => {
              const key = pileKey(stage, p)
              state.boardPiles[key] = open
              const pile = [...col.querySelectorAll('.wb-pile')].find((p) => p.dataset.pile === key)
              updatePile(pile, key, open)
            })
            stageToggle.textContent = open ? 'Collapse piles' : 'Expand piles'
            syncPileToggles()
            save()
          },
          'wd-link wb-column-toggle',
        )
        col.append(stageToggle)
      }
      groups.forEach((project) => {
        const key = pileKey(stage, project),
          items = list.filter((t) => (t.project || '') === project),
          pile = el('div', 'wb-pile')
        pile.dataset.pile = key
        pile.dataset.project = project
        pile.style.setProperty('--wb-property-color', projectColor(project))
        const pileHead = el('div', 'wb-pilehead')
        pileHead.append(el('h3', 'wb-piletitle', project || 'No project'))
        const toggle = button(
          '',
          () => {
            const open = !pileOpen(key)
            state.boardPiles = state.boardPiles || {}
            state.boardPiles[key] = open
            updatePile(pile, key, open)
            syncPileToggles()
            save()
          },
          'wd-link wb-piletoggle',
        )
        pileHead.append(toggle)
        pile.append(pileHead)
        const rack = el('div', 'wb-rack')
        items.forEach((t) => {
          const card = el('article', 'wb-task wb-property')
          card.dataset.taskId = t.id
          const band = el('div', 'wb-property-band', taskBlocked(t) ? 'Blocked' : '')
          band.classList.toggle('wb-bandblocked', !!taskBlocked(t))
          const heading = el('h3')
          heading.append(button(t.title, () => openCard(t), 'wb-cardtitle'))
          card.append(band, heading)
          const description = taskBlocked(t)
            ? 'Blocked · ' + taskBlocked(t)
            : t.description || (t.status === 'Done' ? 'Completed' : taskTime(t))
          const desc = el('p', 'wb-property-desc', description)
          desc.setAttribute('data-tooltip', description)
          card.append(desc)
          const details = button('Open task', () => openCard(t), 'wd-link wb-property-open')
          details.setAttribute('aria-label', 'Open task: ' + t.title)
          card.append(details)
          rack.append(card)
        })
        pile.append(rack)
        pile.append(el('p', 'wb-pilemore', '+' + Math.max(0, items.length - 3) + ' tucked away'))
        col.append(pile)
        updatePile(pile, key, pileOpen(key))
      })
      if (!tasks.length) col.append(el('p', 'wp-empty', 'No tasks in this stage.'))
      host.append(col)
    })
    const piles = [...host.querySelectorAll('.wb-pile')]
    expandBoard.textContent =
      piles.length && piles.every((p) => pileOpen(p.dataset.pile)) ? 'Collapse all piles' : 'Expand all piles'
    root.querySelector('.wb-help').textContent =
      'Expand a project pile or a whole column. Drag a card to move it; open a task for details and scheduling.'
    drawCardDialog()
  }
  let boardDrag = null
  root.querySelector('.wb-columns').addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.wb-task')
    if (e.button !== 0 || !card || e.target.closest('button,select,input,summary')) return
    e.preventDefault()
    boardDrag = { id: card.dataset.taskId, x: e.clientX, y: e.clientY, moved: false }
  })
  documentEvents.addEventListener('pointermove', (e) => {
    if (!boardDrag) return
    if (Math.hypot(e.clientX - boardDrag.x, e.clientY - boardDrag.y) > 6) boardDrag.moved = true
    if (!boardDrag.moved) return
    const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wb-column')
    root.querySelectorAll('.wb-column').forEach((c) => c.classList.toggle('wb-over', c === col))
  })
  documentEvents.addEventListener('pointerup', (e) => {
    if (!boardDrag) return
    const drag = boardDrag
    boardDrag = null
    root.querySelectorAll('.wb-column').forEach((c) => c.classList.remove('wb-over'))
    const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wb-column')
    if (drag.moved && col) {
      const task = allTasks().find((t) => t.id === drag.id)
      if (task && task.status !== col.dataset.stage) updateTaskStatus(task, col.dataset.stage)
    } else if (
      !drag.moved &&
      document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task-id]')?.dataset.taskId === drag.id
    ) {
      const task = allTasks().find((t) => t.id === drag.id)
      if (task) openCard(task)
    }
  })
  documentEvents.addEventListener('pointercancel', () => {
    boardDrag = null
    root.querySelectorAll('.wb-column').forEach((c) => c.classList.remove('wb-over'))
  })
  const baseProjectPages = drawProjectPages
  drawProjectPages = function () {
    baseProjectPages()
    const p = projectList().find((p) => p.id === state.projectSelected) || projectList()[0],
      host = root.querySelector('.wp-detail')
    const form = el('form', 'wp-add'),
      input = el('input')
    input.placeholder = 'Capture a note or reminder for ' + p.title + '…'
    input.setAttribute('aria-label', 'Project note or reminder')
    input.required = true
    input.maxLength = 300
    const at = el('input')
    at.type = 'datetime-local'
    at.value = TODAY + 'T16:00'
    at.setAttribute('aria-label', 'Project reminder time')
    const addNote = () => {
      if (!input.reportValidity() || !input.value.trim()) return
      state.notes.unshift({ id: uid(), text: input.value.trim(), project: p.title, when: 'Just captured' })
      commit('Saved to ' + p.title + ' notes.')
      const message = root.querySelector('.wp-noteconfirmation')
      message.textContent = 'Saved to ' + p.title + ' notes · also in dashboard sticky inbox.'
      root.querySelector('.wp-savednote')?.scrollIntoView({ block: 'nearest' })
    }
    const addReminder = () => {
      if (!input.reportValidity() || !input.value.trim() || !at.value) return
      state.reminders.push({ id: uid(), title: input.value.trim(), project: p.title, at: at.value })
      commit('Reminder added to project and calendar.')
    }
    const confirmation = el('p', 'wp-noteconfirmation')
    confirmation.setAttribute('role', 'status')
    confirmation.setAttribute('aria-live', 'polite')
    host.append(confirmation)
    form.append(input, button('Save note', addNote, 'wc-btn'), at, button('Add reminder', addReminder, 'wc-btn'))
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      addNote()
    })
    host.append(form)
  }
  const calendarAndRangeDraw = drawCalendar
  drawCalendar = function () {
    calendarAndRangeDraw()
    const page = state.page || 'dashboard'
    root.querySelector('.wd-dashboardview').hidden = page !== 'dashboard'
    root.querySelector('.wc-view').hidden = page !== 'calendar'
    root.querySelector('.wb-view').hidden = page !== 'boards'
    root.querySelector('.wp-view').hidden = page !== 'projects'
    drawBoard()
    drawProjectPages()
  }
  root.querySelector('.wb-filter').addEventListener('change', (e) => {
    state.boardFilter = e.target.value
    drawBoard()
    save()
  })
  root.querySelector('.wb-capture').addEventListener('click', () => openCapture())
  function identity(node, project, ribbon = false) {
    node.style.setProperty('--ww-project-color', projectColor(project))
    node.classList.add(ribbon ? 'ww-project-ribbon' : 'ww-project-accent')
    return node
  }
  function ribbon(project) {
    return identity(el('span', '', project || 'No project'), project, true)
  }
  function workProject(id, kind) {
    if (kind === 'window') {
      const w = allWindows().find((w) => w.id === id)
      return w?.type === 'project' ? w.title : allTasks().find((t) => t.id === w?.itemId)?.project || ''
    }
    if (kind === 'reminder') return state.reminders.find((r) => r.id === id)?.project || ''
    return allTasks().find((t) => t.id === id)?.project || ''
  }
  function decorateCalendar() {
    root.querySelectorAll('.wc-view [data-work-id]').forEach((node) => {
      const project = workProject(node.dataset.workId, node.dataset.workKind)
      identity(node, project)
      if (node.classList.contains('wc-span')) node.classList.add('ww-window-ribbon')
      if (node.classList.contains('wc-dayentry')) node.append(ribbon(project))
    })
    const detail = root.querySelector('.wc-itemdetail'),
      selected = calState().selected
    if (selected && !detail.hidden) {
      const project = workProject(selected.id, selected.kind),
        heading = detail.querySelector('h3')
      if (heading?.textContent === project) identity(heading, project, true)
      else if (heading) heading.before(ribbon(project))
    }
    const legend = root.querySelector('.wc-legend')
    legend.querySelector('.ww-project-keys')?.remove()
    const keys = el('div', 'ww-project-keys')
    projectList().forEach((p) => keys.append(ribbon(p.title)))
    keys.append(ribbon(''))
    legend.append(keys)
  }
  const identityProjects = drawProjects
  drawProjects = function () {
    identityProjects()
    root.querySelectorAll('.wd-projectlist>.wd-project').forEach((card, i) => {
      const p = projectList()[i]
      if (!p) return
      identity(card, p.title)
      identity(card.querySelector('h3'), p.title, true)
    })
  }
  const identityProjectPages = drawProjectPages
  drawProjectPages = function () {
    identityProjectPages()
    root.querySelectorAll('.wp-project').forEach((card, i) => {
      const p = projectList()[i]
      if (!p) return
      identity(card, p.title)
      identity(card.querySelector('strong'), p.title, true)
    })
    const p = projectList().find((p) => p.id === state.projectSelected) || projectList()[0]
    const detail = root.querySelector('.wp-detail')
    identity(detail, p.title)
    identity(detail.querySelector('h2'), p.title, true)
    root.querySelectorAll('.wp-detail .wb-projectlink').forEach((label) => identity(label, label.textContent, true))
  }
  const identityTodos = drawTodos
  drawTodos = function () {
    identityTodos()
    root.querySelectorAll('.wd-todo').forEach((row, i) => {
      const t = state.todos[i],
        project = workProject(t.id, 'task')
      identity(row, project)
      const text = row.querySelector('label>span')
      text.querySelector('small')?.remove()
      text.append(ribbon(project))
    })
  }
  const identityReminders = drawReminders
  drawReminders = function () {
    identityReminders()
    const reminders = state.reminders
      .filter((r) => r.at.slice(0, 10) === TODAY)
      .sort((a, b) => a.at.localeCompare(b.at))
    root.querySelectorAll('.wd-reminderrow').forEach((row, i) => {
      const project = reminders[i]?.project || ''
      identity(row, project)
      if (project) row.append(ribbon(project))
    })
  }
  const identityNotes = drawNotes
  drawNotes = function () {
    identityNotes()
    const notes = state.showBacklog ? state.notes : state.notes.slice(0, 3)
    root.querySelectorAll('.wd-note').forEach((card, i) => {
      if (notes[i]?.project) card.prepend(ribbon(notes[i].project))
    })
  }
  const identityDetail = drawDetail
  drawDetail = function () {
    const box = root.querySelector('.wd-selection')
    box.querySelector('.ww-project-ribbon')?.remove()
    identityDetail()
    if (!box.hidden) {
      const event = activeEvents().find((e) => e.id === state.selected) || activeEvents()[0]
      box.prepend(ribbon(workProject(event.id, 'event')))
    }
  }
  const identityTimeline = formatTimelineTimes
  formatTimelineTimes = function () {
    identityTimeline()
    calendar.shadowRoot?.querySelectorAll('[data-event-index]').forEach((node) => {
      const event = activeEvents()[Number(node.dataset.eventIndex)]
      if (!event) return
      const project = workProject(event.id, 'event')
      node.style.background = 'color-mix(in srgb,' + projectColor(project) + ' 28%,var(--wd-panel))'
      node.style.borderLeft = '4px solid ' + projectColor(project)
      node.setAttribute(
        'data-tooltip',
        (project || 'No project') + ' · ' + event.title + ' · ' + clock(event.start) + '–' + clock(event.end),
      )
    })
  }
  const expandedBoardDraw = drawBoard
  drawBoard = function () {
    expandedBoardDraw()
    const scope = state.boardFilter || 'All work'
    root.querySelectorAll('.wb-column').forEach((col, index) => {
      const stage = col.dataset.stage,
        head = col.querySelector('.wb-columnhead'),
        body = el('div', 'wb-columnbody'),
        inner = el('div', 'wb-columninner')
      body.id = 'ww-column-content-' + index
      ;[...col.children].filter((node) => node !== head).forEach((node) => inner.append(node))
      body.append(inner)
      col.append(body)
      const toggle = button(
        '',
        () => {
          state.boardColumns = state.boardColumns || {}
          state.boardColumns[scope] = state.boardColumns[scope] || {}
          state.boardColumns[scope][stage] = !state.boardColumns[scope][stage]
          update()
          syncProjectToggles()
          scheduleProjectAlignment()
          save()
        },
        'wb-column-arrow cursor-interaction',
      )
      const chevron = el('i')
      chevron.setAttribute('data-lucide', 'chevron-down')
      chevron.setAttribute('aria-hidden', 'true')
      toggle.append(chevron)
      toggle.setAttribute('aria-controls', body.id)
      head.append(toggle)
      function update() {
        const closed = !!state.boardColumns?.[scope]?.[stage]
        col.classList.toggle('wb-columnclosed', closed)
        body.inert = closed
        body.setAttribute('aria-hidden', String(closed))
        toggle.setAttribute('aria-expanded', String(!closed))
        toggle.setAttribute('aria-label', (closed ? 'Expand ' : 'Collapse ') + stage + ' column')
        toggle.setAttribute('data-tooltip', (closed ? 'Expand ' : 'Collapse ') + stage)
      }
      update()
    })
    if (typeof lucide !== 'undefined') lucide.createIcons()
    root.querySelector('.wb-help').textContent =
      'Use the arrow under a count to hide that column. Filter by project to focus on one project and stage. Your pile layout is remembered.'
  }
  const collapsibleBoardDraw = drawBoard
  function orderedProjects(tasks) {
    const present = new Set(tasks.map((t) => t.project || ''))
    return [
      ...projectList().map((p) => p.title),
      '',
      ...[...present].filter((p) => p && !projectList().some((x) => x.title === p)),
    ].filter((p, i, a) => present.has(p) && a.indexOf(p) === i)
  }
  drawBoard = function () {
    collapsibleBoardDraw()
    const scope = state.boardFilter || 'All work',
      tasks = allTasks().filter(
        (t) => scope === 'All work' || (scope === 'No project' ? !t.project : t.project === scope),
      )
    const projects = orderedProjects(tasks)
    root.querySelectorAll('.wb-column').forEach((col) => {
      const stage = col.dataset.stage,
        list = tasks.filter((t) => t.status === stage),
        summary = el('div', 'wb-workload wb-deedstack')
      summary.setAttribute('aria-label', stage + ' project cards')
      projects.forEach((project, index) => {
        const group = list.filter((t) => (t.project || '') === project),
          blocked = group.filter((t) => taskBlocked(t)).length
        const row = button(
          '',
          () => {
            state.boardColumns = state.boardColumns || {}
            state.boardColumns[scope] = state.boardColumns[scope] || {}
            state.boardColumns[scope][stage] = false
            state.boardPiles = state.boardPiles || {}
            state.boardPiles[pileKey(stage, project)] = true
            drawBoard()
            save()
          },
          'wb-deed' + (!group.length ? ' wb-deedempty' : ''),
        )
        row.style.setProperty('--ww-project-color', projectColor(project))
        row.style.zIndex = String(index + 1)
        const info =
          (project || 'No project') +
          ' · ' +
          group.length +
          ' task' +
          (group.length === 1 ? '' : 's') +
          (blocked ? ' · ' + blocked + ' blocked' : '')
        row.setAttribute('aria-label', info + (group.length ? '. Open pile' : '. No work in this stage'))
        row.setAttribute('data-tooltip', info)
        row.disabled = !group.length
        row.append(el('span', 'wb-deed-name', project || 'No project'))
        summary.append(row)
      })
      if (!projects.length) summary.append(el('p', 'wp-empty', 'No work yet.'))
      col.append(summary)
    })
    root.querySelector('.wb-help').textContent =
      'Projects stay in the same order across stages. Select a name to open its pile; hover or focus for task counts. Faded cards mean no work in that stage.'
  }

  // Share each project's row height across visible stages; card heights still show workload.
  let projectAlignmentFrame = 0
  function scheduleProjectAlignment() {
    if (projectAlignmentFrame) return
    projectAlignmentFrame = requestAnimationFrame(() => {
      projectAlignmentFrame = 0
      alignProjectRows()
    })
  }
  function alignProjectRows() {
    const columns = [...root.querySelectorAll('.wb-column:not(.wb-columnclosed)')].filter(
      (c) => c.getBoundingClientRect().width,
    )
    root.querySelectorAll('.wb-pile,.wb-pilehead').forEach((p) => (p.style.minHeight = ''))
    // Only align columns alongside each other, preserving compact layouts on narrow screens.
    const rows = new Map()
    columns.forEach((col) => {
      const top = Math.round(col.getBoundingClientRect().top)
      if (!rows.has(top)) rows.set(top, [])
      rows.get(top).push(col)
    })
    rows.forEach((cols) => {
      const groups = new Map()
      cols.forEach((col) =>
        col.querySelectorAll('.wb-pile').forEach((p) => {
          const key = p.dataset.project
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key).push(p)
        }),
      )
      groups.forEach((piles) => {
        const height = Math.max(...piles.map((p) => p.querySelector('.wb-pilehead').getBoundingClientRect().height))
        piles.forEach((p) => (p.querySelector('.wb-pilehead').style.minHeight = height + 'px'))
      })
      groups.forEach((piles) => {
        const height = Math.max(...piles.map((p) => p.getBoundingClientRect().height))
        piles.forEach((p) => (p.style.minHeight = height + 'px'))
      })
    })
  }
  const projectRowObserver = new ResizeObserver(scheduleProjectAlignment)
  const unalignedBoardDraw = drawBoard
  drawBoard = function () {
    unalignedBoardDraw()
    projectRowObserver.disconnect()
    root.querySelectorAll('.wb-rack,.wb-piletitle,.wb-columnhead').forEach((n) => projectRowObserver.observe(n))
    scheduleProjectAlignment()
  }

  function projectIsExpanded(project) {
    const piles = [...root.querySelectorAll('.wb-pile')].filter(
      (p) => p.dataset.project === project && p.querySelector('.wb-property'),
    )
    return (
      piles.length > 0 &&
      piles.every((p) => pileOpen(p.dataset.pile) && !p.closest('.wb-column').classList.contains('wb-columnclosed'))
    )
  }
  function syncProjectToggles() {
    root.querySelectorAll('.wb-projecttoggle').forEach((control) => {
      const expanded = projectIsExpanded(control.dataset.project),
        name = control.dataset.project || 'No project'
      control.setAttribute('aria-expanded', String(expanded))
      control.setAttribute('aria-label', (expanded ? 'Collapse ' : 'Expand ') + name + ' across all columns')
      control.setAttribute('data-tooltip', (expanded ? 'Collapse ' : 'Expand ') + name + ' across all columns')
      control.classList.toggle('wb-projectexpanded', expanded)
    })
  }
  const projectToggleBoardDraw = drawBoard
  drawBoard = function () {
    projectToggleBoardDraw()
    root.querySelectorAll('.wb-pile').forEach((pile) => {
      const project = pile.dataset.project,
        stage = pile.closest('.wb-column').dataset.stage
      const label = button(
        '',
        () => {
          const open = !projectIsExpanded(project),
            scope = state.boardFilter || 'All work'
          state.boardPiles = state.boardPiles || {}
          state.boardColumns = state.boardColumns || {}
          state.boardColumns[scope] = state.boardColumns[scope] || {}
          workflowStages.forEach((stage) => {
            state.boardPiles[pileKey(stage, project)] = open
            if (open) state.boardColumns[scope][stage] = false
          })
          drawBoard()
          save()
          const same = [...root.querySelectorAll('.wb-projecttoggle')].find(
            (b) => b.dataset.project === project && b.closest('.wb-column').dataset.stage === stage,
          )
          same?.focus({ preventScroll: true })
        },
        'wb-piletitle wb-projecttoggle cursor-interaction',
      )
      label.dataset.project = project
      label.append(el('span', '', project || 'No project'))
      const icon = el('i')
      icon.setAttribute('data-lucide', 'chevrons-down')
      icon.setAttribute('aria-hidden', 'true')
      label.append(icon)
      pile.querySelector('.wb-piletitle').replaceWith(label)
      projectRowObserver.observe(label)
    })
    syncProjectToggles()
    if (typeof lucide !== 'undefined') lucide.createIcons()
    root.querySelector('.wb-help').textContent =
      'Select a project ribbon to expand or collapse its piles across all columns. Use the control beside it to change only that pile.'
    scheduleProjectAlignment()
  }
  const identityCalendar = drawCalendar
  drawCalendar = function () {
    identityCalendar()
    decorateCalendar()
  }
  // Shared capture keeps the same draft and creation controls in every view.
  const captureForm = root.querySelector('.wd-capture'),
    captureText = captureForm.querySelector('textarea')
  const captureAnchor = document.createComment('capture home')
  captureForm.before(captureAnchor)
  const captureDialog = el('dialog', 'wc-range-dialog ww-capture-dialog')
  captureDialog.setAttribute('aria-label', 'Quick capture')
  const captureHeader = el('div', 'ww-dialogheader')
  captureHeader.append(
    el('h2', '', 'Quick capture'),
    button('Close', () => captureDialog.close(), 'wc-btn'),
  )
  const captureHint = el('p', 'ww-captureintro', 'Get it out of your head. Details can wait.')
  captureDialog.append(captureHeader, captureHint)
  root.append(captureDialog)
  const projectPicker = root.querySelector('.wd-projectpick')
  captureForm.querySelector('.wd-capturehint').after(projectPicker)
  const captureProject = projectPicker.querySelector('select'),
    captureReminder = captureForm.querySelector('.wd-reminderoption input'),
    captureToday = captureForm.querySelector('.wd-todaycheck input')
  const draft = state.captureDraft || {}
  captureText.value = draft.text || ''
  captureType = draft.type || 'Sticky'
  updateCapture()
  captureProject.value = draft.text ? draft.project || '' : ''
  captureReminder.value = draft.reminder || ''
  captureToday.checked = !!draft.today
  let draftTimer
  function rememberCapture() {
    state.captureDraft = {
      text: captureText.value,
      type: captureType,
      project: captureProject.value,
      reminder: captureReminder.value,
      today: captureToday.checked,
    }
  }
  captureForm.addEventListener('input', () => {
    rememberCapture()
    clearTimeout(draftTimer)
    draftTimer = setTimeout(save, 250)
  })
  captureForm.addEventListener('change', () => {
    rememberCapture()
    save()
  })
  captureForm.querySelectorAll('[data-capture-type]').forEach((b) =>
    b.addEventListener('click', () => {
      rememberCapture()
      save()
    }),
  )
  function openCapture(type) {
    if (type) {
      captureType = type
      updateCapture()
    }
    if (!captureText.value) {
      const project =
        state.page === 'projects'
          ? (projectList().find((p) => p.id === state.projectSelected) || projectList()[0])?.title
          : state.page === 'boards' && projectList().some((p) => p.title === state.boardFilter)
            ? state.boardFilter
            : ''
      captureProject.value = project || ''
    }
    captureDialog.append(captureForm)
    if (!captureDialog.open) captureDialog.showModal()
    captureText.focus()
  }
  captureDialog.addEventListener('close', () => {
    if (!captureText.value) captureProject.value = ''
    rememberCapture()
    captureAnchor.after(captureForm)
    save()
  })
  root.querySelector('.ww-globalcapture').addEventListener('click', () => openCapture())
  captureForm.querySelector('.wd-capturebutton').addEventListener('click', () => {
    if (captureText.value) return
    rememberCapture()
    save()
    if (captureDialog.open) captureDialog.close()
    showNotice(root.querySelector('.wd-feedback').textContent || 'Saved.')
  })
  documentEvents.addEventListener('keydown', (e) => {
    if (
      e.key.toLowerCase() === 'n' &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.target.closest('input,textarea,select,[contenteditable=true]') &&
      !root.querySelector('dialog[open]')
    ) {
      e.preventDefault()
      openCapture()
    }
  })
  const toast = el('div', 'ww-toast')
  toast.hidden = true
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  root.querySelector('.wd-main').append(toast)
  function showNotice(message, undo) {
    const view = root.querySelector(
      state.page === 'boards'
        ? '.wb-view'
        : state.page === 'projects'
          ? '.wp-view'
          : state.page === 'calendar'
            ? '.wc-view'
            : '.wd-dashboardview',
    )
    view.querySelector('.wd-header').after(toast)
    toast.replaceChildren(el('span', '', message))
    if (undo)
      toast.append(
        button(
          'Undo',
          () => {
            undo()
            toast.hidden = true
          },
          'wd-link',
        ),
      )
    toast.append(
      button(
        'Dismiss',
        () => {
          toast.hidden = true
        },
        'wd-link',
      ),
    )
    toast.hidden = false
  }
  function taskSnapshot(id) {
    return {
      sources: Object.fromEntries(
        ['todos', 'events', 'notes', 'done', 'workItems'].map((source) => [
          source,
          (state[source] || []).filter((t) => t.id === id).map(copy),
        ]),
      ),
      meta: state.taskMeta?.[id] && copy(state.taskMeta[id]),
    }
  }
  function undoTask(id, snapshot) {
    for (const [source, items] of Object.entries(snapshot.sources))
      state[source] = [...(state[source] || []).filter((t) => t.id !== id), ...items]
    if (snapshot.meta) state.taskMeta[id] = snapshot.meta
    else delete state.taskMeta[id]
    commit('Restored.')
  }
  const completeWithUndo = complete
  complete = function (item, from) {
    const snapshot = taskSnapshot(item.id)
    completeWithUndo(item, from)
    showNotice('Completed · ' + item.title, () => undoTask(item.id, snapshot))
  }
  const statusWithUndo = updateTaskStatus
  updateTaskStatus = function (task, status) {
    const snapshot = taskSnapshot(task.id)
    statusWithUndo(task, status)
    if (status === 'Done' && task.status !== 'Done')
      showNotice('Completed · ' + task.title, () => undoTask(task.id, snapshot))
  }
  // Keep advanced board layout controls available through View and column menus.
  const boardView = el('details', 'ww-boardview')
  boardView.append(el('summary', 'wc-btn cursor-interaction', 'View'))
  const boardMenu = el('div', 'ww-boardmenu')
  boardMenu.append(el('span', 'ww-menulabel', 'PROJECT PILES'), expandBoard)
  boardView.append(boardMenu)
  root.querySelector('.wb-toolbar').append(boardView)
  const boardPolish = drawBoard
  drawBoard = function () {
    boardPolish()
    root.querySelectorAll('.wb-column').forEach((col) => {
      const toggle = col.querySelector('.wb-column-toggle')
      if (!toggle) return
      const menu = el('details', 'ww-columnmenu')
      const summary = el('summary', 'wd-link cursor-interaction', 'Options')
      summary.setAttribute('aria-label', col.dataset.stage + ' column options')
      menu.append(summary)
      const content = el('div', 'ww-boardmenu')
      content.append(toggle)
      menu.append(content)
      col.querySelector('.wb-columninner').prepend(menu)
    })
    root.querySelector('.wb-help').textContent =
      'Drag cards between stages. Select a card to edit it, or use a project ribbon to fold its piles across the board.'
  }
  // Appearance follows macOS by default and can be previewed in either mode.
  const appearanceLabel = el('label', 'ww-appearance', 'Appearance'),
    appearance = el('select')
  appearance.setAttribute('aria-label', 'Appearance')
  ;[
    ['system', 'Automatic'],
    ['light', 'Light'],
    ['dark', 'Dark'],
  ].forEach(([value, label]) => {
    const option = el('option', '', label)
    option.value = value
    appearance.append(option)
  })
  appearance.value = state.appearance || 'system'
  function applyAppearance() {
    root.style.colorScheme = appearance.value === 'system' ? 'light dark' : appearance.value
  }
  applyAppearance()
  appearance.addEventListener('change', () => {
    state.appearance = appearance.value
    applyAppearance()
    save()
  })
  appearanceLabel.append(appearance)
  root.querySelector('.wd-profile').before(appearanceLabel)

  // A project summary explains the next action, constraints, and time planning.
  function projectPlanningText(s) {
    const booked = durationLabel(s.booked) + ' booked' + (s.deadline ? ' through ' + shortDate(s.deadline) : ' ahead')
    if (!s.tasks.length) return 'Add a task to start planning.'
    if (!s.open.length)
      return s.tasks.length === 1 ? 'Your task is complete.' : 'All ' + s.tasks.length + ' tasks complete.'
    if (!s.estimatedCount)
      return (
        booked +
        ' · ' +
        s.open.length +
        (s.open.length === 1
          ? ' open task still needs an effort estimate.'
          : ' open tasks still need effort estimates.')
      )
    const estimate =
      durationLabel(s.openEffort) + ' estimated across ' + s.estimatedCount + ' of ' + s.open.length + ' open tasks'
    if (s.estimatedCount < s.open.length)
      return booked + ' · ' + estimate + '. ' + (s.open.length - s.estimatedCount) + ' estimates missing.'
    return (
      booked +
      ' · ' +
      estimate +
      '. ' +
      (s.booked < s.openEffort
        ? durationLabel(s.openEffort - s.booked) + ' more to book.'
        : 'Enough time booked for the current estimates.')
    )
  }
  function nextReason(s) {
    if (!s.next && s.tasks.length && s.done === s.tasks.length)
      return 'Review the outcome or add a next step when needed.'
    if (!s.next) return s.blocked.length ? 'Resolve a blocker to move forward.' : 'Choose the next concrete step.'
    const unblocks = s.blocked.filter((t) => t.dependsOn === s.next.id).length
    return unblocks
      ? 'Unblocks ' + unblocks + ' task' + (unblocks === 1 ? '' : 's')
      : s.next.status === 'In progress'
        ? 'Continue work already underway.'
        : s.next.status === 'Ready'
          ? 'Ready to start.'
          : 'A small next step from your backlog.'
  }
  const usefulProjects = drawProjectPages
  drawProjectPages = function () {
    usefulProjects()
    const p = projectList().find((p) => p.id === state.projectSelected) || projectList()[0],
      s = projectStats(p),
      host = root.querySelector('.wp-detail')
    const summary = el('section', 'ww-projectinsight')
    summary.setAttribute('aria-label', 'Project progress and planning')
    const stages = el('div', 'ww-stagecounts')
    workflowStages.forEach((stage) =>
      stages.append(el('span', '', stage + ' ' + s.tasks.filter((t) => t.status === stage).length)),
    )
    summary.append(stages)
    const planning = el('p', 'ww-planningtext', projectPlanningText(s))
    summary.append(planning)
    if (s.deadline) {
      const days = Math.round((dayObject(s.deadline) - dayObject(TODAY)) / 86400000)
      summary.append(
        el(
          'p',
          'ww-deadlinecontext',
          days < 0
            ? 'Deadline passed ' + -days + ' day' + (days === -1 ? '' : 's') + ' ago'
            : days === 0
              ? 'Deadline is today'
              : days + ' calendar days until the next deadline',
        ),
      )
    }
    if (s.blocked.length) {
      const blockers = el('div', 'ww-projectblockers')
      blockers.append(el('strong', '', 'Needs attention'))
      s.blocked
        .slice(0, 2)
        .forEach((task) =>
          blockers.append(button(task.title + ' · ' + taskBlocked(task), () => openCard(task), 'ww-blockerlink')),
        )
      summary.append(blockers)
    }
    const recent = el('details', 'ww-projectrecent')
    recent.append(el('summary', 'cursor-interaction', 'Completed this week · ' + s.recent.length))
    if (s.recent.length)
      s.recent
        .slice(0, 4)
        .forEach((task) => recent.append(el('p', '', task.title + ' · ' + shortDate(task.completedOn))))
    else recent.append(el('p', '', 'New completions will appear here as you finish tasks.'))
    summary.append(recent)
    const next = host.querySelector('.wp-next')
    if (next) {
      next.querySelector('strong').after(el('p', 'ww-nextreason', nextReason(s)))
      next.before(summary)
      const action = next.querySelector('button')
      if (action && !inToday(s.next.id)) action.classList.add('wc-btn', 'ww-primary')
    } else host.querySelector('.wb-actions').after(summary)
    host.querySelectorAll('.wp-add button').forEach((button) => {
      if (button.textContent === 'Add task' || button.textContent === 'Save note') button.classList.add('ww-primary')
    })
    root.querySelectorAll('.wp-project').forEach((card, i) => {
      const project = projectList()[i]
      if (!project) return
      const stats = projectStats(project)
      card.append(
        el(
          'span',
          'ww-projectlistcontext',
          stats.deadline ? 'Next deadline ' + shortDate(stats.deadline) : 'No deadline yet',
        ),
      )
    })
  }
  const usefulPulse = drawProjects
  drawProjects = function () {
    usefulPulse()
    root.querySelectorAll('.wd-projectlist>.wd-project').forEach((card, i) => {
      const p = projectList()[i]
      if (!p) return
      const s = projectStats(p)
      card.querySelector('.wd-meter').after(el('p', 'ww-pulseplanning', projectPlanningText(s)))
      if (s.recent.length)
        card.querySelector('.wd-next').before(el('p', 'ww-pulserecent', s.recent.length + ' completed this week'))
      const next = card.querySelector('.wd-next')
      if (s.next && !inToday(s.next.id)) next.querySelector('.wd-projectaction')?.classList.add('ww-primary')
      next.querySelector('strong').after(el('span', 'ww-nextreason', nextReason(s)))
    })
  }
  // Today is an intention, distinct from a deadline or a reserved time block.
  const pendingToday = () => {
    const map = new Map(),
      tasks = allTasks()
    ;[...activeTodos(), ...activeEvents()].forEach((item) => {
      const task = tasks.find((t) => t.id === item.id) || item
      if (task.status !== 'Done') map.set(item.id, { ...task, ...item, title: task.title, project: task.project })
    })
    return [...map.values()]
  }
  const doneTodayItems = () => state.done.filter((t) => !t.completedOn || t.completedOn === TODAY)
  const dayReview = el('section', 'ww-dayreview')
  dayReview.setAttribute('aria-label', 'Today progress')
  root.querySelector('.wd-anytime').before(dayReview)
  const reviewDialog = el('dialog', 'wc-range-dialog ww-reviewdialog')
  reviewDialog.setAttribute('aria-label', 'Review today')
  root.append(reviewDialog)
  const deferDialog = el('dialog', 'wc-range-dialog ww-deferdialog')
  deferDialog.setAttribute('aria-label', 'Defer task')
  root.append(deferDialog)
  let _deferTaskId = null
  function finishTodayTask(task) {
    const from = state.events.some((e) => e.id === task.id && (e.date || TODAY) === TODAY) ? 'events' : 'todos'
    complete(task, from)
  }
  function moveTask(task, date) {
    const snapshot = taskSnapshot(task.id),
      id = uid()
    state.todos = state.todos.filter((t) => t.id !== task.id)
    state.events = state.events.filter((e) => e.id !== task.id || (e.date || TODAY) !== TODAY)
    const value = { ...task }
    delete value.start
    delete value.end
    delete value.source
    delete value.completedOn
    delete value.from
    if (date) state.todos.push({ ...value, plannedFor: date })
    else {
      if (!state.workItems.some((t) => t.id === task.id)) state.workItems.push({ ...value, status: 'Backlog' })
      state.taskMeta[task.id] = { ...state.taskMeta[task.id], status: 'Backlog' }
    }
    state.deferredLog = [...(state.deferredLog || []), { id, taskId: task.id, on: TODAY, to: date || 'Backlog' }].slice(
      -50,
    )
    deferDialog.close()
    commit(date ? 'Moved to ' + dateLabel(date) + ', anytime.' : 'Returned to Backlog.')
    showNotice(task.title + ' → ' + (date ? dateLabel(date) + ', anytime' : 'Backlog'), () => {
      state.deferredLog = (state.deferredLog || []).filter((x) => x.id !== id)
      undoTask(task.id, snapshot)
    })
  }
  function openDefer(task) {
    _deferTaskId = task.id
    deferDialog.replaceChildren(el('h3', '', 'Defer task'), el('p', 'ww-defertitle', task.title))
    const label = el('label', 'wb-editorfield', 'Move to a day'),
      date = el('input')
    date.type = 'date'
    date.required = true
    date.min = plusDays(TODAY, 1)
    date.value = plusDays(TODAY, 1)
    date.setAttribute('aria-label', 'Day to defer task to')
    label.append(date)
    deferDialog.append(
      label,
      el('p', 'ww-deferhint', 'Moves to that day’s anytime list. Deadlines and WorkWindows stay as set.'),
    )
    const actions = el('div', 'ww-reviewactions')
    actions.append(
      button(
        'Move to day',
        () => {
          if (date.reportValidity()) moveTask(task, date.value)
        },
        'wc-btn ww-primary',
      ),
      button('Back to Backlog', () => moveTask(task, null), 'wc-btn'),
      button('Cancel', () => deferDialog.close(), 'wd-link'),
    )
    deferDialog.append(actions)
    deferDialog.showModal()
  }
  function drawReview() {
    if (!reviewDialog.open) return
    const pending = pendingToday(),
      done = doneTodayItems()
    reviewDialog.replaceChildren()
    const header = el('div', 'ww-dialogheader')
    header.append(
      el('h2', '', pending.length ? 'Review today' : 'Today, settled'),
      button('Close', () => reviewDialog.close(), 'wc-btn'),
    )
    reviewDialog.append(
      header,
      el('p', 'ww-reviewintro', done.length + ' completed · ' + pending.length + ' left today'),
    )
    if (pending.length) {
      pending.forEach((task) => {
        const row = el('div', 'ww-reviewrow'),
          copy = el('div')
        copy.append(el('strong', '', task.title), el('span', '', task.project || 'No project'))
        const actions = el('div', 'ww-reviewactions')
        actions.append(
          button('Done', () => finishTodayTask(task), 'wc-btn ww-primary'),
          button('Defer', () => openDefer(task), 'wc-btn'),
        )
        row.append(copy, actions)
        reviewDialog.append(row)
      })
    } else
      reviewDialog.append(
        el('p', 'ww-reviewclear', 'Nothing left on today’s list. You can leave the rest for another day.'),
      )
    const deferred = (state.deferredLog || []).filter((x) => x.on === TODAY).length
    if (deferred)
      reviewDialog.append(
        el('p', 'ww-reviewintro', deferred + ' task' + (deferred === 1 ? '' : 's') + ' moved out of today.'),
      )
    if (done.length) {
      const completed = el('details', 'ww-reviewcompleted')
      completed.append(el('summary', 'cursor-interaction', 'Finished today · ' + done.length))
      done.forEach((task) => completed.append(el('p', '', task.title)))
      reviewDialog.append(completed)
    }
    if (!pending.length)
      reviewDialog.append(
        button(
          'Finish for today',
          () => {
            state.wrappedDay = TODAY
            reviewDialog.close()
            commit('Today is wrapped up.')
            showNotice('Today is wrapped up. Your work is saved.')
          },
          'wc-btn ww-primary',
        ),
      )
  }
  function drawDayReview() {
    const pending = pendingToday(),
      done = doneTodayItems()
    if (pending.length && state.wrappedDay === TODAY) state.wrappedDay = null
    dayReview.replaceChildren()
    const content = el('div')
    content.append(
      el(
        'strong',
        '',
        pending.length
          ? 'Today’s progress'
          : state.wrappedDay === TODAY
            ? 'Today is wrapped up'
            : 'Today’s tasks are clear',
      ),
      el('span', '', done.length + ' completed · ' + pending.length + ' left today'),
    )
    dayReview.append(
      content,
      button(
        pending.length ? 'Review today' : 'Wrap up',
        () => {
          reviewDialog.showModal()
          drawReview()
        },
        'wc-btn',
      ),
    )
    const tomorrow = state.todos.filter((t) => t.plannedFor === plusDays(TODAY, 1))
    if (tomorrow.length)
      dayReview.append(
        button(
          'Tomorrow · ' + tomorrow.length + ' anytime',
          () => {
            Object.assign(calState(), {
              day: plusDays(TODAY, 1),
              month: plusDays(TODAY, 1).slice(0, 7),
              selected: null,
            })
            changePage('calendar')
          },
          'wd-link ww-tomorrowlink',
        ),
      )
    drawReview()
  }
  const selectionWithDefer = drawDetail
  drawDetail = function () {
    selectionWithDefer()
    const box = root.querySelector('.wd-selection')
    box.querySelector('.ww-deferblock')?.remove()
    const task = activeEvents().find((t) => t.id === state.selected)
    if (task)
      box.append(
        button(
          'Defer task',
          () => openDefer(allTasks().find((t) => t.id === task.id) || task),
          'wd-link ww-deferblock',
        ),
      )
  }
  const calendarDayWithAnytime = drawCalendarDay
  drawCalendarDay = function () {
    calendarDayWithAnytime()
    const date = calState().day,
      tasks = state.todos.filter((t) => (t.plannedFor || TODAY) === date && !isDone(t.id))
    if (!tasks.length) return
    const section = el('section', 'ww-calendaranytime')
    section.append(el('h3', '', 'Anytime · ' + tasks.length))
    tasks.forEach((task) => {
      const row = button('', () => openCard(allTasks().find((t) => t.id === task.id) || task), 'wc-dayentry')
      row.append(el('span', '', 'No time block reserved'), el('strong', '', task.title))
      section.append(row)
    })
    root.querySelector('.wc-daydetail').append(section)
  }
  const calendarWithDailyReview = drawCalendar
  drawCalendar = function () {
    calendarWithDailyReview()
    drawDayReview()
  }
  const clearerTimeline = formatTimelineTimes
  formatTimelineTimes = function () {
    clearerTimeline()
    const shadow = calendar.shadowRoot
    if (!shadow || shadow.querySelector('[data-ww-readable]')) return
    const style = document.createElement('style')
    style.dataset.wwReadable = 'true'
    style.textContent = '.event{font-size:14px}.hour span{font-size:12px}.date{font-size:15px}'
    shadow.append(style)
  }

  const populatedProjects = drawProjectPages
  drawProjectPages = function () {
    if (projectList().length) {
      populatedProjects()
      return
    }
    const list = root.querySelector('.wp-list'),
      detail = root.querySelector('.wp-detail')
    list.replaceChildren(button('Create project', () => openCapture('Project'), 'wc-btn ww-primary'))
    detail.replaceChildren(
      el('h2', '', 'Room for your next project'),
      el('p', 'wp-empty', 'Create a project to bring its tasks, notes, and WorkWindow together.'),
    )
  }
  const releaseProjects = drawProjects
  drawProjects = function () {
    releaseProjects()
    if (!projectList().length)
      root.querySelector('.wd-projectlist').append(
        el('p', 'wp-empty', 'No projects yet. Start one when a thought needs a few steps.'),
        button('Create project', () => openCapture('Project'), 'wc-btn'),
      )
  }
  const releaseCalendar = drawCalendar
  drawCalendar = function () {
    releaseCalendar()
    const empty = !scheduleOptions().length
    root.querySelector('.wc-save').disabled = empty
    root.querySelector('.wc-planitem').disabled = empty
    if (empty) {
      root.querySelector('.wc-readyitems').replaceChildren(
        el('span', 'wc-empty', 'Capture a task or project to begin planning.'),
        button('Quick capture', () => openCapture('Task'), 'wc-btn'),
      )
    }
  }
  root.querySelector('.wd-header .wd-eyebrow').textContent = new Date(TODAY + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()
  root.querySelector('.wd-date').textContent = new Date(TODAY + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
  })
  plannerKind()
  render()
  updateCapture()

  const dayTimer = setInterval(() => {
    const next = localDate(new Date())
    if (next !== TODAY) {
      TODAY = next
      TOMORROW = plusDays(TODAY, 1)
      calendar.setAttribute('date', TODAY)
      root.querySelector('.wd-header .wd-eyebrow').textContent = fullDate(TODAY)
      root.querySelector('.wd-date').textContent = shortDate(TODAY)
      render()
    }
  }, 30000)
  lucide.createIcons()
  return () => {
    lifecycle.abort()
    clearInterval(dayTimer)
    projectRowObserver.disconnect()
    cancelAnimationFrame(projectAlignmentFrame)
    clearTimeout(draftTimer)
    root.querySelectorAll('dialog[open]').forEach((d) => d.close())
  }
}
