let forms = [
  { id: 1, title: 'Weekly Team Check-in', description: 'Quick weekly pulse on workload, blockers, and morale.', owner: 'Uwera Maggy', status: 'Open', questions: 5, responses: 4, target: 7, created: 'Jul 07' },
  { id: 2, title: 'Internship Feedback Survey', description: 'Feedback on the internship experience and mentorship quality.', owner: 'Aaron Ariel', status: 'Open', questions: 10, responses: 3, target: 6, created: 'Jul 01' },
  { id: 3, title: 'Equipment Request', description: 'Request laptops, monitors, or accessories for your work.', owner: 'Eric Ndayisaba', status: 'Open', questions: 4, responses: 9, target: 10, created: 'Jun 20' },
  { id: 4, title: 'Onboarding Experience', description: 'How smooth was your first week? Help us improve onboarding.', owner: 'M Gentille', status: 'Closed', questions: 8, responses: 6, target: 6, created: 'Jun 10' },
  { id: 5, title: 'Team Lunch Preferences', description: 'Vote for the venue and dietary preferences for Friday lunch.', owner: 'Shema Kevin', status: 'Closed', questions: 3, responses: 7, target: 7, created: 'Jun 05' },
]

export async function fetchForms() {
  await new Promise((r) => setTimeout(r, 600))
  return [...forms]
}

export async function createForm({ title, description }) {
  await new Promise((r) => setTimeout(r, 900))
  if (forms.some((f) => f.title.toLowerCase() === title.toLowerCase())) {
    throw new Error('A form with this title already exists')
  }
  const newForm = {
    id: Date.now(),
    title,
    description: description || 'No description yet.',
    owner: 'Uwera Maggy',
    status: 'Open',
    questions: 0,
    responses: 0,
    target: 10,
    created: 'Jul 14',
  }
  forms.push(newForm)
  return newForm
}
