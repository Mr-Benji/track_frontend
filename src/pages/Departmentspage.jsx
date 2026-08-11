import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDepartments, createDepartment } from '../features/departments/api'

function DepartmentCard({ d }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{d.name}</p>
          <div className="mt-2 text-xs min-w-0">
            <p className="font-semibold text-gray-700 truncate">{d.lead}</p>
            <p className="text-gray-400">Department lead</p>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50">
        <span className="text-xs text-gray-400">
          {d.members} {d.members === 1 ? 'member' : 'members'}
        </span>
        <p className="text-xs text-gray-600 mt-1 truncate">{d.people.join(', ')}</p>
      </div>
    </div>
  )
}

export default function DepartmentsPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLead, setNewLead] = useState('')

  const queryClient = useQueryClient()
  const departments = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })

  const create = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setShowNew(false)
      setNewName('')
      setNewLead('')
    },
  })

  const all = departments.data ?? []
  const visible = all.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.lead.toLowerCase().includes(search.toLowerCase())
  )
  const totalMembers = all.reduce((sum, d) => sum + d.members, 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Departments <span className="text-gray-300 font-medium text-lg">({all.length})</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your workspace departments · {totalMembers} people in total
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + New department
        </button>
      </div>

      <div className="mt-6 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search departments or leads..."
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 w-72"
        />
      </div>

      {departments.isLoading && (
        <p className="text-center py-12 text-sm text-gray-400">Loading departments...</p>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((d) => (
          <DepartmentCard key={d.id} d={d} />
        ))}
      </div>

      {!departments.isLoading && visible.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="font-semibold text-gray-700">No departments found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search or create one.</p>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">New department</h2>
              <p className="text-sm text-gray-400 mt-0.5">Give it a name and assign a lead.</p>
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Department name"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              value={newLead}
              onChange={(e) => setNewLead(e.target.value)}
              placeholder="Department lead (name)"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {create.isError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{create.error.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ name: newName, lead: newLead })}
                disabled={create.isPending || !newName || !newLead}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
              >
                {create.isPending ? 'Creating...' : 'Create department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}