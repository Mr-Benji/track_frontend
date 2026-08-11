let sprints = [
  { id: 1, name: 'Sprint 1 - Foundations', goal: 'Set up the project, login flow, and base layout.', status: 'Completed', start: '16 Jun', end: '27 Jun', tasks: 10, done: 10, velocity: 21 },
  { id: 2, name: 'Sprint 2 - Members Module', goal: 'Build the members table, invites, and status management.', status: 'Completed', start: '30 Jun', end: '11 Jul', tasks: 12, done: 12, velocity: 26 },
  { id: 3, name: 'Sprint 3 - Dashboard and Analytics', goal: 'Ship the home calendar, charts, and projects module.', status: 'Active', start: '14 Jul', end: '25 Jul', tasks: 14, done: 8, velocity: 18 },
  { id: 4, name: 'Sprint 4 - Forms and Polish', goal: 'Forms module, design polish, and bug fixes before demo.', status: 'Active', start: '14 Jul', end: '25 Jul', tasks: 9, done: 3, velocity: 9 },
  { id: 5, name: 'Sprint 5 - Backend Integration', goal: 'Replace fake APIs with a real backend and authentication.', status: 'Planning', start: '28 Jul', end: '08 Aug', tasks: 6, done: 0, velocity: 0 },
]

export async function fetchSprints() {
  await new Promise((r) => setTimeout(r, 600))
  return [...sprints]
}

export async function createSprint({ name, goal }) {
  await new Promise((r) => setTimeout(r, 900))
  if (sprints.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A sprint with this name already exists')
  }
  const newSprint = { id: Date.now(), name, goal: goal || 'No goal set yet.', status: 'Planning', start: '15 Jul', end: 'TBD', tasks: 0, done: 0, velocity: 0 }
  sprints.push(newSprint)
  return newSprint
}
