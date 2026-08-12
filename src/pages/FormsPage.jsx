import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchForms, createForm, updateForm } from '../features/forms/api'

const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

const colorFor = (name) => {
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function EditFormModal({ form, onClose, onSave, saving, error }) {
  const [title, setTitle] = useState(form.title)
  const [description, setDescription] = useState(form.description ?? '')
  const [status, setStatus] = useState(form.status)

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit form</h2>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Form title"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          rows={3}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, description, status })}
            disabled={saving || !title}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormCard({ f, onEdit }) {
  const pct = f.target === 0 ? 0 : Math.min(100, Math.round((f.responses / f.target) * 100))
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 leading-snug">{f.title}</p>
          <p className="text-xs text-gray-400 mt-1">{f.questions} questions · created {f.created}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
          f.status === 'Open'
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          {f.status}
        </span>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>

      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full ${colorFor(f.owner)} flex items-center justify-center text-[10px] font-bold`}>
          {initials(f.owner)}
        </div>
        <p className="text-xs text-gray-500">
          by <span className="font-semibold text-gray-700">{f.owner}</span>
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">{f.responses} of {f.target} responses</span>
          <span className="font-bold text-gray-700">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-sky-600 border border-sky-200 hover:bg-sky-50 transition">
          View responses
        </button>
        <button
          disabled={f.status !== 'Open'}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-white bg-sky-500 hover:bg-sky-600 transition disabled:opacity-40"
        >
          Fill form
        </button>
        <button
          onClick={() => onEdit(f)}
          className="px-3 py-2 text-xs font-semibold rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

export default function FormsPage() {
  const [tab, setTab] = useState('Forms')
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingForm, setEditingForm] = useState(null)

  const queryClient = useQueryClient()
  const forms = useQuery({ queryKey: ['forms'], queryFn: fetchForms })

  const create = useMutation({
    mutationFn: createForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setShowNew(false)
      setNewTitle('')
      setNewDesc('')
    },
  })

  const edit = useMutation({
    mutationFn: updateForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setEditingForm(null)
    },
  })

  const all = forms.data ?? []

  const myResponses = [
    { id: 1, form: 'Weekly Team Check-in', submitted: 'Jul 14, 9:20 AM', status: 'Reviewed' },
    { id: 2, form: 'Internship Feedback Survey', submitted: 'Jul 10, 3:45 PM', status: 'Pending' },
    { id: 3, form: 'Equipment Request', submitted: 'Jul 02, 11:05 AM', status: 'Approved' },
  ]

  const respStyle = {
    Reviewed: 'bg-sky-50 text-sky-600 border-sky-200',
    Pending: 'bg-amber-50 text-amber-600 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-500 mt-1">Create and manage custom forms for data collection</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + Create form
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mt-6 mb-5">
        {['Forms', 'My responses'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Forms' && (
        <>
          {forms.isLoading && (
            <p className="text-center py-12 text-sm text-gray-400">Loading forms...</p>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {all.map((f) => (
              <FormCard key={f.id} f={f} onEdit={setEditingForm} />
            ))}
          </div>
        </>
      )}

      {tab === 'My responses' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Form</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {myResponses.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70">
                  <td className="px-6 py-4 font-semibold text-gray-800">{r.form}</td>
                  <td className="px-6 py-4 text-gray-500">{r.submitted}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${respStyle[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create form</h2>
              <p className="text-sm text-gray-400 mt-0.5">It will open for responses immediately.</p>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Form title"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short description"
              rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
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
                onClick={() => create.mutate({ title: newTitle, description: newDesc })}
                disabled={create.isPending || !newTitle}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
              >
                {create.isPending ? 'Creating...' : 'Create form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingForm && (
        <EditFormModal
          form={editingForm}
          onClose={() => setEditingForm(null)}
          onSave={(patch) => edit.mutate({ formId: editingForm.id, ...patch })}
          saving={edit.isPending}
          error={edit.isError ? edit.error.message : null}
        />
      )}
    </div>
  )
}