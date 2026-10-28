import { useQuery } from '@tanstack/react-query'
import { fetchMembers } from '../features/members/api'

// Picks a member by name — leads and assignees are matched by name on the
// backend, so choosing from the real list avoids "No user found" errors.
// Suspended members are left out; the current value is kept even if it's one.
export default function MemberSelect({ value, onChange, placeholder = 'Select a member...', exclude = [], className }) {
  const membersQ = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const options = (membersQ.data ?? [])
    .filter((m) => m.status !== 'Suspended' || m.name === value)
    .filter((m) => !exclude.includes(m.name))
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? 'w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400'}
    >
      <option value="">{placeholder}</option>
      {options.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
    </select>
  )
}
