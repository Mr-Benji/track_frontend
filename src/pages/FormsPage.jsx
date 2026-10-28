import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchForms, createForm, updateForm,
  submitFormResponse, fetchFormResponses, fetchMyResponses,
} from '../features/forms/api'
import { formatDate, formatDateTime } from '../lib/dateUtils'

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

const FIELD_TYPES = [
  { value: 'text', label: 'Short answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'choice', label: 'Multiple choice' },
]

const inputClass = 'w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400'

function ErrorNote({ message }) {
  if (!message) return null
  return <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{message}</p>
}

function ModalShell({ title, subtitle, onClose, wide, children }) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-2xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} shadow-2xl space-y-4 mx-4`}>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

// Editor rows keep a local `key`; `id` is only set for questions that already
// exist on the server, so the backend edits those in place.
let nextKey = 1
const toDraft = (f) => ({
  key: nextKey++, id: f.id, label: f.label, type: f.type, required: f.required,
  optionsText: (f.options ?? []).join('\n'),
})
const toPayload = (drafts) => drafts.map((d) => ({
  ...(d.id ? { id: d.id } : {}),
  label: d.label.trim(),
  type: d.type,
  required: d.required,
  options: d.type === 'choice' ? d.optionsText.split('\n').map((o) => o.trim()).filter(Boolean) : [],
}))

function FieldsEditor({ fields, onChange }) {
  const update = (key, patch) => onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Questions ({fields.length})</label>
      <div className="space-y-2.5">
        {fields.map((f, i) => (
          <div key={f.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">{i + 1}.</span>
              <input
                value={f.label}
                onChange={(e) => update(f.key, { label: e.target.value })}
                placeholder="Question"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="button"
                onClick={() => onChange(fields.filter((x) => x.key !== f.key))}
                className="text-gray-400 hover:text-red-500 text-xs shrink-0 px-1"
                title="Remove question"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-3 pl-7">
              <select
                value={f.type}
                onChange={(e) => update(f.key, { type: e.target.value })}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(f.key, { required: e.target.checked })}
                  className="accent-sky-500"
                />
                Required
              </label>
            </div>
            {f.type === 'choice' && (
              <textarea
                value={f.optionsText}
                onChange={(e) => update(f.key, { optionsText: e.target.value })}
                placeholder="One option per line"
                rows={3}
                className="ml-7 w-[calc(100%-1.75rem)] px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="text-xs text-gray-400 italic">No questions yet</p>}
        <button
          type="button"
          onClick={() => onChange([...fields, { key: nextKey++, label: '', type: 'text', required: false, optionsText: '' }])}
          className="w-full text-center text-xs font-semibold text-sky-600 border border-dashed border-sky-200 rounded-lg py-1.5 hover:bg-sky-50"
        >
          + Add question
        </button>
      </div>
    </div>
  )
}

// Create and edit share one modal; status only applies when editing.
function FormEditorModal({ form, onClose, onSave, saving, error }) {
  const editing = !!form
  const [title, setTitle] = useState(form?.title ?? '')
  const [description, setDescription] = useState(form?.description ?? '')
  const [status, setStatus] = useState(form?.status ?? 'Open')
  const [target, setTarget] = useState(form?.target ? String(form.target) : '')
  const [fields, setFields] = useState(() => (form?.fields ?? []).map(toDraft))

  function submit() {
    const patch = {
      title,
      description,
      // 0 clears the target on the backend; an empty box means "no target".
      target: target ? Number(target) : 0,
      fields: toPayload(fields),
    }
    onSave(editing ? { ...patch, status } : patch)
  }

  return (
    <ModalShell
      title={editing ? 'Edit form' : 'Create form'}
      subtitle={editing ? null : 'It will open for responses immediately.'}
      onClose={onClose}
      wide
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Form title" className={inputClass} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        rows={3}
        className={`${inputClass} resize-none`}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Response target</label>
          <input
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="No target"
            className={inputClass}
          />
        </div>
        {editing && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}
      </div>
      <FieldsEditor fields={fields} onChange={setFields} />
      <ErrorNote message={error} />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !title}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : editing ? 'Save' : 'Create form'}
        </button>
      </div>
    </ModalShell>
  )
}

function FillFormModal({ form, onClose }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({})
  const submit = useMutation({
    mutationFn: submitFormResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      queryClient.invalidateQueries({ queryKey: ['my-responses'] })
      onClose()
    },
  })
  const set = (id, value) => setValues((prev) => ({ ...prev, [id]: value }))

  return (
    <ModalShell title={form.title} subtitle={form.description} onClose={onClose} wide>
      {form.fields.length === 0 && <p className="text-sm text-gray-400">This form has no questions yet.</p>}
      {form.fields.map((f) => (
        <div key={f.id}>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {f.label}{f.required && <span className="text-red-500"> *</span>}
          </label>
          {f.type === 'text' && (
            <input value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} className={inputClass} />
          )}
          {f.type === 'paragraph' && (
            <textarea value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} rows={3} className={`${inputClass} resize-none`} />
          )}
          {f.type === 'choice' && (
            <div className="space-y-1.5">
              {f.options.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name={f.id}
                    checked={values[f.id] === o}
                    onChange={() => set(f.id, o)}
                    className="accent-sky-500"
                  />
                  {o}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <ErrorNote message={submit.isError ? submit.error.message : null} />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => submit.mutate({
            formId: form.id,
            answers: Object.entries(values).map(([fieldId, value]) => ({ fieldId, value })),
          })}
          disabled={submit.isPending || form.fields.length === 0}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
        >
          {submit.isPending ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </ModalShell>
  )
}

function AnswerList({ answers }) {
  return (
    <dl className="space-y-1.5">
      {answers.map((a, i) => (
        <div key={`${a.fieldId ?? 'removed'}-${i}`}>
          <dt className="text-xs font-semibold text-gray-500">{a.label}</dt>
          <dd className="text-sm text-gray-800 whitespace-pre-wrap">{a.value || <span className="text-gray-300 italic">No answer</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResponsesModal({ form, onClose }) {
  const responses = useQuery({ queryKey: ['form-responses', form.id], queryFn: () => fetchFormResponses(form.id) })
  const list = responses.data ?? []
  return (
    <ModalShell title={`Responses · ${form.title}`} subtitle={`${form.responses} received`} onClose={onClose} wide>
      {responses.isLoading && <p className="text-sm text-gray-400">Loading responses...</p>}
      <ErrorNote message={responses.isError ? responses.error.message : null} />
      {!responses.isLoading && list.length === 0 && !responses.isError && (
        <p className="text-sm text-gray-400">No responses yet.</p>
      )}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {list.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-800">{r.respondent ?? 'Unknown'}</p>
            <p className="text-xs text-gray-400 mb-3">{formatDateTime(r.submittedAt)}</p>
            <AnswerList answers={r.answers} />
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
          Close
        </button>
      </div>
    </ModalShell>
  )
}

function FormCard({ f, onEdit, onFill, onViewResponses }) {
  const owner = f.owner || 'Unknown'
  const pct = f.target ? Math.min(100, Math.round((f.responses / f.target) * 100)) : null
  const fillLabel = f.respondedByMe ? 'Responded' : f.status === 'Open' ? 'Fill form' : 'Closed'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 leading-snug">{f.title}</p>
          <p className="text-xs text-gray-400 mt-1">{f.questions} questions · created {formatDate(f.created)}</p>
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
        <div className={`w-7 h-7 rounded-full ${colorFor(owner)} flex items-center justify-center text-[10px] font-bold`}>
          {initials(owner)}
        </div>
        <p className="text-xs text-gray-500">
          by <span className="font-semibold text-gray-700">{owner}</span>
        </p>
      </div>

      <div className="mt-auto">
        {pct === null ? (
          <p className="text-xs text-gray-400">{f.responses} {f.responses === 1 ? 'response' : 'responses'}</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">{f.responses} of {f.target} responses</span>
              <span className="font-bold text-gray-700">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }}></div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {f.canManage && (
          <button
            onClick={() => onViewResponses(f)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-sky-600 border border-sky-200 hover:bg-sky-50 transition"
          >
            View responses
          </button>
        )}
        <button
          onClick={() => onFill(f)}
          disabled={f.status !== 'Open' || f.respondedByMe}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-white bg-sky-500 hover:bg-sky-600 transition disabled:opacity-40"
        >
          {fillLabel}
        </button>
        {f.canManage && (
          <button
            onClick={() => onEdit(f)}
            className="px-3 py-2 text-xs font-semibold rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

export default function FormsPage() {
  const [tab, setTab] = useState('Forms')
  const [showNew, setShowNew] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [fillingForm, setFillingForm] = useState(null)
  const [viewingForm, setViewingForm] = useState(null)
  const [openResponse, setOpenResponse] = useState(null)

  const queryClient = useQueryClient()
  const forms = useQuery({ queryKey: ['forms'], queryFn: fetchForms })
  const mine = useQuery({ queryKey: ['my-responses'], queryFn: fetchMyResponses, enabled: tab === 'My responses' })

  const create = useMutation({
    mutationFn: createForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setShowNew(false)
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
  const myResponses = mine.data ?? []

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-500 mt-1">Create and manage custom forms for data collection</p>
        </div>
        <button
          onClick={() => { create.reset(); setShowNew(true) }}
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
          {!forms.isLoading && all.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <p className="font-semibold text-gray-700">No forms yet</p>
              <p className="text-sm text-gray-400 mt-1">Create a form to start collecting responses.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {all.map((f) => (
              <FormCard
                key={f.id}
                f={f}
                onEdit={(form) => { edit.reset(); setEditingForm(form) }}
                onFill={setFillingForm}
                onViewResponses={setViewingForm}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'My responses' && (
        mine.isLoading ? (
          <p className="text-center py-12 text-sm text-gray-400">Loading responses...</p>
        ) : myResponses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <p className="font-semibold text-gray-700">No responses yet</p>
            <p className="text-sm text-gray-400 mt-1">Forms you fill out will show up here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Form</th>
                  <th className="px-6 py-4 font-semibold">Submitted</th>
                  <th className="px-6 py-4 font-semibold">Answers</th>
                </tr>
              </thead>
              <tbody>
                {myResponses.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setOpenResponse(openResponse === r.id ? null : r.id)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800">{r.formTitle}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDateTime(r.submittedAt)}</td>
                      <td className="px-6 py-4 text-sky-600 text-xs font-semibold">
                        {openResponse === r.id ? 'Hide' : `View ${r.answers.length}`}
                      </td>
                    </tr>
                    {openResponse === r.id && (
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <td colSpan={3} className="px-6 py-4"><AnswerList answers={r.answers} /></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showNew && (
        <FormEditorModal
          onClose={() => setShowNew(false)}
          onSave={(payload) => create.mutate(payload)}
          saving={create.isPending}
          error={create.isError ? create.error.message : null}
        />
      )}

      {editingForm && (
        <FormEditorModal
          form={editingForm}
          onClose={() => setEditingForm(null)}
          onSave={(patch) => edit.mutate({ formId: editingForm.id, ...patch })}
          saving={edit.isPending}
          error={edit.isError ? edit.error.message : null}
        />
      )}

      {fillingForm && <FillFormModal form={fillingForm} onClose={() => setFillingForm(null)} />}
      {viewingForm && <ResponsesModal form={viewingForm} onClose={() => setViewingForm(null)} />}
    </div>
  )
}
