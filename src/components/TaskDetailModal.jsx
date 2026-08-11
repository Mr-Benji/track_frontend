import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  updateTask,
  updateTaskStatus,
  addComment,
  addSubtask,
  toggleSubtask,
  addLink,
  removeLink,
  addFile,
  removeFile,
  addAssignee,
  removeAssignee,
} from '../features/tasks/api'
import { fetchProjects } from '../features/projects/api'
import { fetchMembers } from '../features/members/api'
import { formatDateTime } from '../lib/dateUtils'
import AssigneePicker from './AssigneePicker'
import RichTextEditor from './RichTextEditor'

const STATUSES = ['To Do', 'In Progress', 'Done']
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low']

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <p className="text-[11px] font-semibold text-gray-500 mb-1">{children}</p>
}

export default function TaskDetailModal({ task, user, onClose }) {
  const queryClient = useQueryClient()
  const author = user?.name ?? 'Someone'

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [narrativeDraft, setNarrativeDraft] = useState(task.narrative ?? '')
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? '')
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [shareCopied, setShareCopied] = useState(false)

  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const projects = projectsQ.data ?? []
  const project = projects.find((p) => p.id === task.projectId)

  const membersQ = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const members = membersQ.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] })

  const patch = useMutation({ mutationFn: updateTask, onSuccess: invalidate })
  const setStatus = useMutation({ mutationFn: updateTaskStatus, onSuccess: invalidate })
  const postComment = useMutation({
    mutationFn: addComment,
    onSuccess: () => { setNewComment(''); invalidate() },
  })
  const createSubtask = useMutation({
    mutationFn: addSubtask,
    onSuccess: () => { setNewSubtask(''); invalidate() },
  })
  const flipSubtask = useMutation({ mutationFn: toggleSubtask, onSuccess: invalidate })
  const createLink = useMutation({
    mutationFn: addLink,
    onSuccess: () => { setNewLinkLabel(''); setNewLinkUrl(''); invalidate() },
  })
  const deleteLink = useMutation({ mutationFn: removeLink, onSuccess: invalidate })
  const uploadFile = useMutation({ mutationFn: addFile, onSuccess: invalidate })
  const deleteFile = useMutation({ mutationFn: removeFile, onSuccess: invalidate })
  const assignPerson = useMutation({ mutationFn: addAssignee, onSuccess: invalidate })
  const unassignPerson = useMutation({ mutationFn: removeAssignee, onSuccess: invalidate })

  function saveTitle() {
    setEditingTitle(false)
    if (titleDraft.trim() && titleDraft !== task.title) {
      patch.mutate({ id: task.id, title: titleDraft.trim() })
    } else {
      setTitleDraft(task.title)
    }
  }

  // Hash-based link — the app has no router, so a path like "/tasks/123"
  // would just 404. main.jsx reads this hash on load and reopens the task.
  function shareTask() {
    const link = `${window.location.origin}${window.location.pathname}#task-${task.id}`
    navigator.clipboard?.writeText(link).catch(() => {})
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  // Merge system activity entries and free-text comments into one
  // chronological feed (US-31).
  const feed = [
    ...(task.activityLog ?? []).map((e) => ({ ...e, kind: 'activity' })),
    ...(task.comments ?? []).map((c) => ({ ...c, kind: 'comment' })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="w-full text-xl font-bold text-gray-900 border border-sky-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-gray-900 cursor-text hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2"
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={shareTask}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">
              ✕
            </button>
          </div>
        </div>

        {task.isDraft && (
          <div className="flex items-center justify-between gap-3 mx-6 mt-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            <span className="font-medium">This task is a draft — only you can see it until it's published.</span>
            <button
              onClick={() => patch.mutate({ id: task.id, isDraft: false })}
              disabled={patch.isPending}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 shrink-0"
            >
              Publish task
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 p-6">
          {/* Left column */}
          <div className="md:col-span-2 space-y-6">
            <Section title="Implementation Narrative">
              <textarea
                value={narrativeDraft}
                onChange={(e) => setNarrativeDraft(e.target.value)}
                onBlur={() => narrativeDraft !== (task.narrative ?? '') && patch.mutate({ id: task.id, narrative: narrativeDraft })}
                placeholder="Document how this task was or will be carried out..."
                rows={3}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </Section>

            <Section title="Description">
              <RichTextEditor
                value={descriptionDraft}
                onChange={setDescriptionDraft}
                onBlur={(html) => html !== (task.description ?? '') && patch.mutate({ id: task.id, description: html })}
                placeholder="Add a description..."
              />
            </Section>

            <Section title={`Subtasks (${(task.subtasks ?? []).filter((s) => s.done).length}/${(task.subtasks ?? []).length})`}>
              <div className="space-y-1.5">
                {(task.subtasks ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => flipSubtask.mutate({ taskId: task.id, subtaskId: s.id })}
                      className="accent-sky-500"
                    />
                    <span className={`text-sm ${s.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.text}</span>
                  </label>
                ))}
                {(task.subtasks ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 px-2">No subtasks yet.</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && newSubtask.trim() && createSubtask.mutate({ taskId: task.id, text: newSubtask.trim() })}
                    placeholder="Add a subtask..."
                    className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    disabled={!newSubtask.trim() || createSubtask.isPending}
                    onClick={() => createSubtask.mutate({ taskId: task.id, text: newSubtask.trim() })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Activity Log">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {feed.map((entry) => (
                  <div key={`${entry.kind}-${entry.id}`} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    {entry.kind === 'activity' ? (
                      <p className="text-gray-700">
                        <span className="font-semibold">{entry.change}</span>
                        {entry.progressChange && <span className="text-gray-400"> · progress {entry.progressChange}</span>}
                      </p>
                    ) : (
                      <p className="text-gray-700">{entry.text}</p>
                    )}
                    <p className="text-gray-400 mt-0.5">{entry.author} · {formatDateTime(entry.timestamp)}</p>
                  </div>
                ))}
                {feed.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newComment.trim() && postComment.mutate({ taskId: task.id, author, text: newComment.trim() })}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <button
                  disabled={!newComment.trim() || postComment.isPending}
                  onClick={() => postComment.mutate({ taskId: task.id, author, text: newComment.trim() })}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={task.status}
                onChange={(e) => setStatus.mutate({ id: task.id, status: e.target.value, author })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel>Assignees</FieldLabel>
              <AssigneePicker
                assignees={task.assignees ?? []}
                members={members}
                onAdd={(name) => assignPerson.mutate({ taskId: task.id, name })}
                onRemove={(name) => unassignPerson.mutate({ taskId: task.id, name })}
              />
            </div>

            <div>
              <FieldLabel>Priority</FieldLabel>
              <select
                value={task.priority}
                onChange={(e) => patch.mutate({ id: task.id, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Start date</FieldLabel>
                <input
                  type="date"
                  defaultValue={task.startDate ?? ''}
                  onBlur={(e) => e.target.value !== (task.startDate ?? '') && patch.mutate({ id: task.id, startDate: e.target.value || null })}
                  className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <FieldLabel>Due date</FieldLabel>
                <input
                  type="date"
                  defaultValue={task.dueDate ?? ''}
                  onBlur={(e) => e.target.value && e.target.value !== task.dueDate && patch.mutate({ id: task.id, dueDate: e.target.value })}
                  className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Project</FieldLabel>
              <select
                value={task.projectId ?? ''}
                onChange={(e) => patch.mutate({ id: task.id, projectId: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {project && <p className="text-[11px] text-gray-400 mt-1">Currently in {project.name}</p>}
            </div>

            <div>
              <FieldLabel>Files ({(task.files ?? []).length})</FieldLabel>
              <div className="space-y-1.5">
                {(task.files ?? []).map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-gray-700 truncate">{f.name}</span>
                    <button onClick={() => deleteFile.mutate({ taskId: task.id, fileId: f.id })} className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                  </div>
                ))}
                {(task.files ?? []).length === 0 && (
                  <p className="text-xs text-gray-400">No files uploaded</p>
                )}
                <label className="block text-center text-xs font-semibold text-sky-600 border border-dashed border-sky-200 rounded-lg py-1.5 cursor-pointer hover:bg-sky-50">
                  + Add file
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadFile.mutate({ taskId: task.id, name: file.name })
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <FieldLabel>Links ({(task.links ?? []).length})</FieldLabel>
              <div className="space-y-1.5">
                {(task.links ?? []).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline truncate">{l.label}</a>
                    <button onClick={() => deleteLink.mutate({ taskId: task.id, linkId: l.id })} className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                  </div>
                ))}
                <div className="space-y-1.5 pt-1">
                  <input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label"
                    className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    disabled={!newLinkUrl.trim() || createLink.isPending}
                    onClick={() => createLink.mutate({ taskId: task.id, label: newLinkLabel.trim(), url: newLinkUrl.trim() })}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
                  >
                    Add link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
