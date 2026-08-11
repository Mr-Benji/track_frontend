const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function toISODate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function sameDay(a, b) {
  return toISODate(a) === toISODate(b)
}

export function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function isWithinWeek(date, referenceDate) {
  const start = startOfWeek(referenceDate)
  const end = addDays(start, 6)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return target >= start && target <= end
}

// Sun-Sat grid covering the full month, including leading/trailing days
// from adjacent months so every week row has 7 days.
export function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = startOfWeek(firstOfMonth)
  const weeks = []
  let cursor = gridStart
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push({ date: cursor, inMonth: cursor.getMonth() === month })
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
    if (cursor.getMonth() !== month && cursor > firstOfMonth) break
  }
  return weeks
}

export function buildWeekRow(referenceDate) {
  const start = startOfWeek(referenceDate)
  const month = referenceDate.getMonth()
  return [...Array(7)].map((_, i) => {
    const date = addDays(start, i)
    return { date, inMonth: date.getMonth() === month }
  })
}

export function monthTitle(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
}

// A task is overdue only relative to *today* — recomputed on every read so
// the flag never goes stale as real time passes, instead of being frozen
// at whatever value the mock data happened to seed.
export function isOverdue(dueDateISO, status, referenceDate = new Date()) {
  if (!dueDateISO || status === 'Done') return false
  return toISODate(dueDateISO) < toISODate(referenceDate)
}

// Short display label ("Jul 20") for an ISO date, matching the format
// already used across task/project cards.
export function shortLabel(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// "Jul 16, 2026, 3:45 PM" — used for activity log / comment timestamps.
export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export { DAY_LABELS }
