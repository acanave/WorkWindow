export function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function isSameDay(a, b) {
  return formatDateKey(a) === formatDateKey(b)
}

export function getMonthGrid(dateInMonth) {
  const monthStart = startOfMonth(dateInMonth)
  const startWeekday = monthStart.getDay() // Sunday start
  const gridStart = addDays(monthStart, -startWeekday)

  return Array.from({ length: 42 }).map((_, index) => {
    const date = addDays(gridStart, index)
    return {
      date,
      dateKey: formatDateKey(date),
      inCurrentMonth: date.getMonth() === dateInMonth.getMonth(),
    }
  })
}
