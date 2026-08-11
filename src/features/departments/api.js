let departments = [
  { id: 1, name: 'Software Engineering', lead: 'Aaron Ariel', members: 6, people: ['Aaron Ariel', 'Shema Kevin', 'Umutoni Valerie', 'M Gentille', 'Eric Ndayisaba', 'Uwera Maggy'] },
  { id: 2, name: 'AI Laboratory', lead: 'Shema Kevin', members: 4, people: ['Shema Kevin', 'Uwera Maggy', 'Aaron Ariel', 'Alice Uwase'] },
  { id: 3, name: 'Design Studio', lead: 'Alice Uwase', members: 3, people: ['Alice Uwase', 'M Gentille', 'Umutoni Valerie'] },
  { id: 4, name: 'Data Science', lead: 'Umutoni Valerie', members: 5, people: ['Umutoni Valerie', 'Eric Ndayisaba', 'Shema Kevin', 'Aaron Ariel', 'Uwera Maggy'] },
  { id: 5, name: 'Operations', lead: 'Eric Ndayisaba', members: 2, people: ['Eric Ndayisaba', 'M Gentille'] },
  { id: 6, name: 'Research & Policy', lead: 'Uwera Maggy', members: 3, people: ['Uwera Maggy', 'Alice Uwase', 'Shema Kevin'] },
]

export async function fetchDepartments() {
  await new Promise((r) => setTimeout(r, 600))
  return [...departments]
}

export async function createDepartment({ name, lead }) {
  await new Promise((r) => setTimeout(r, 900))
  if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A department with this name already exists')
  }
  const newDept = { id: Date.now(), name, lead, members: 1, people: [lead] }
  departments.push(newDept)
  return newDept
}