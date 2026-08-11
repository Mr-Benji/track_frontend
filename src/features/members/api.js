// A pretend database — an array in memory.
// Resets when you refresh the page; that's fine for learning.
let members = [
  { id: 3, name: 'Umutoni valerie', email: 'valerie@moh.gov.rw', title: 'Software Engineer', role: 'Admin', status: 'Active', department: 'Software Engineering', joined: '2025-01-15' },
  { id: 6, name: 'Ujeneza Sonia', email: 'sonia@moh.gov.rw', title: 'Data Scientist', role: 'User', status: 'Active', department: 'Data Science', joined: '2025-03-02' },
  { id: 13, name: 'Eric marc', email: 'eric@moh.gov.rw', title: 'DevOps Engineer', role: 'User', status: 'Pending', department: 'Software Engineering', joined: '2025-06-20' },
  { id: 4, name: 'Munyana Joyeuse', email: 'joyeuse@moh.gov.rw', title: 'Policy Analyst', role: 'Manager', status: 'Active', department: 'Research & Policy', joined: '2025-02-10' },
  { id: 5, name: 'Gentille Mahirwe ', email: 'gentille@moh.gov.rw', title: 'UI Designer', role: 'User', status: 'Suspended', department: 'Design Studio', joined: '2025-04-08' },
  { id: 8, name: 'Aaron Ariel', email: 'aaron@moh.gov.rw', title: 'AI Researcher', role: 'User', status: 'Active', department: 'AI Laboratory', joined: '2025-05-11' },
  { id: 7, name: 'Shema Kevin', email: 'kevin@moh.gov.rw', title: 'ML Engineer', role: 'User', status: 'Active', department: 'AI Laboratory', joined: '2025-05-19' },
  { id: 2, name: 'Ndateba Eddy', email: 'eddy@moh.gov.rw', title: 'Data Analyst', role: 'User', status: 'Active', department: 'Data Science', joined: '2025-06-01' },
  { id: 1, name: 'H Espoir', email: 'espoir@moh.gov.rw', title: 'Product Designer', role: 'User', status: 'Active', department: 'Design Studio', joined: '2025-06-14' },
  { id: 12, name: 'Iradukunda Christian', email: 'chris@moh.gov.rw', title: 'Operations Lead', role: 'Manager', status: 'Active', department: 'Operations', joined: '2025-03-22' },
  { id: 11, name: 'Gemma Iradukunda', email: 'gemma@moh.gov.rw', title: 'Brand Designer', role: 'User', status: 'Pending', department: 'Design Studio', joined: '2025-07-02' },
  { id: 4, name: 'Uwera Maggy', email: 'maggy@moh.gov.rw', title: 'Frontend Engineer', role: 'User', status: 'Active', department: 'Software Engineering', joined: '2025-04-30' },
  { id: 9, name: 'Gianna M', email: 'gianna@moh.gov.rw', title: 'Backend Engineer', role: 'User', status: 'Suspended', department: 'Software Engineering', joined: '2025-01-28' },
  { id: 10, name: 'Asaiah M', email: 'asaiah@moh.gov.rw', title: 'Research Analyst', role: 'User', status: 'Active', department: 'Research & Policy', joined: '2025-05-05' },
]

export const ROLES = ['Admin', 'Manager', 'User']

// Pretend network delay, so we actually SEE loading states
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchMembers() {
  await wait(600)
  return [...members]
}

export async function inviteMember({ name, email, title, department }) {
  await wait(600)
  if (!name || !email) throw new Error('Name and email are required')
  if (!department) throw new Error('Department is required')
  if (members.some((m) => m.email === email)) throw new Error('That email is already a member')

  const newMember = {
    id: Date.now(),
    name, email,
    title: title || 'Member',
    role: 'User',
    status: 'Pending',   // invited people start as Pending
    department,
    joined: new Date().toISOString().slice(0, 10),
  }
  members.push(newMember)
  return newMember
}
