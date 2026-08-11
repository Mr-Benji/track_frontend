let meetings = [
  { id: 1, title: 'Sprint 3 Planning', date: '2026-07-21', time: '10:00 AM', attendees: ['Uwera Maggy', 'Aaron Ariel', 'Shema Kevin'] },
  { id: 2, title: 'Design Review — Onboarding Flow', date: '2026-07-24', time: '2:00 PM', attendees: ['M Gentille', 'Alice Uwase'] },
]

export async function fetchMeetings() {
  await new Promise((r) => setTimeout(r, 500))
  return [...meetings].sort((a, b) => a.date.localeCompare(b.date))
}

export async function createMeeting({ title, date, time }) {
  await new Promise((r) => setTimeout(r, 600))
  if (!title?.trim()) throw new Error('Meeting title is required')
  if (!date) throw new Error('Date is required')
  const meeting = { id: Date.now(), title: title.trim(), date, time: time || '', attendees: [] }
  meetings.push(meeting)
  return meeting
}
