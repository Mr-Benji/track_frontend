import { useState } from 'react'

// US-20 — search/select a person from the real member list and add them as
// an assignee; current assignments are listed with a removable (x).
// The labels default to task wording; meetings reuse this for attendees.
export default function AssigneePicker({
  assignees, members, onAdd, onRemove,
  currentLabel = 'Current Assignments',
  addLabel = 'Add New Assignment',
  emptyLabel = 'No assignees yet',
}) {
  const [pick, setPick] = useState('')

  // Suspended members can't log in, so they aren't offered.
  const available = members.filter((m) => !assignees.includes(m.name) && m.status !== 'Suspended')

  function handleAdd() {
    if (pick) {
      onAdd(pick)
      setPick('')
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-1">{currentLabel}</p>
        {assignees.length === 0 && <p className="text-xs text-gray-400 italic">{emptyLabel}</p>}
        <div className="flex flex-wrap gap-1.5">
          {assignees.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-600">
              {name}
              <button type="button" onClick={() => onRemove(name)} className="hover:text-sky-800">✕</button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-1">{addLabel}</p>
        <div className="flex gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">Select a member...</option>
            {available.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!pick}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
