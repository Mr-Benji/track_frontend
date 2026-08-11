import { useMemo, useState } from 'react'
import {
  DAY_LABELS,
  addDays,
  buildMonthGrid,
  buildWeekRow,
  monthTitle,
  sameDay,
  toISODate,
} from '../lib/dateUtils'

const VIEWS = ['Month', 'Week', 'List']

const statusDot = {
  'To Do': 'bg-gray-400',
  'In Progress': 'bg-sky-500',
  Done: 'bg-emerald-500',
}

function TaskChip({ task }) {
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-blue-50 border-l-2 border-blue-400 text-[11px] text-blue-700 font-medium truncate">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[task.status] ?? 'bg-gray-400'}`} />
      <span className="truncate">{task.title}</span>
    </div>
  )
}

function DayCell({ day, tasksForDay, isToday, maxVisible, onMore }) {
  const visible = tasksForDay.slice(0, maxVisible)
  const overflow = tasksForDay.length - visible.length

  return (
    <div className={`min-h-[92px] p-1.5 rounded-xl border ${day.inMonth ? 'bg-white border-gray-100' : 'bg-gray-50/60 border-transparent'}`}>
      <div className="flex justify-end">
        <span
          className={`w-6 h-6 flex items-center justify-center text-xs rounded-full ${
            isToday
              ? 'bg-blue-600 text-white font-semibold'
              : day.inMonth
              ? 'text-gray-700'
              : 'text-gray-300'
          }`}
        >
          {day.date.getDate()}
        </span>
      </div>
      <div className="mt-1 space-y-1">
        {visible.map((t) => (
          <TaskChip key={t.id} task={t} />
        ))}
        {overflow > 0 && (
          <button
            onClick={() => onMore(day.date)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-1.5"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  )
}

function DayPopover({ date, tasks, onClose }) {
  if (!date) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl mx-4 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status] ?? 'bg-gray-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-[11px] text-gray-400">{t.assignee} · {t.status}</p>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No tasks due this day.</p>}
        </div>
      </div>
    </div>
  )
}

export default function DashboardCalendar({ tasks }) {
  const [view, setView] = useState('Month')
  const [pointer, setPointer] = useState(() => new Date())
  const [popoverDate, setPopoverDate] = useState(null)

  const tasksByDay = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const key = t.dueDate
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    return map
  }, [tasks])

  const tasksOn = (date) => tasksByDay.get(toISODate(date)) ?? []

  function goToday() {
    setPointer(new Date())
  }

  function goPrev() {
    if (view === 'Week') setPointer((p) => addDays(p, -7))
    else setPointer((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))
  }

  function goNext() {
    if (view === 'Week') setPointer((p) => addDays(p, 7))
    else setPointer((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))
  }

  const today = new Date()

  const weeks = useMemo(
    () => (view === 'Week' ? [buildWeekRow(pointer)] : buildMonthGrid(pointer.getFullYear(), pointer.getMonth())),
    [view, pointer]
  )

  const title =
    view === 'Week'
      ? `${weeks[0][0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weeks[0][6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : monthTitle(pointer)

  const listItems = useMemo(() => {
    return [...tasks]
      .filter((t) => t.dueDate)
      .filter((t) => {
        const d = new Date(t.dueDate)
        return d.getFullYear() === pointer.getFullYear() && d.getMonth() === pointer.getMonth()
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [tasks, pointer])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-50">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              ‹
            </button>
            <button onClick={goToday} className="px-3 h-8 flex items-center rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Today
            </button>
            <button onClick={goNext} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              ›
            </button>
          </div>
        </div>
      </div>

      {view === 'List' ? (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {listItems.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-14 shrink-0 text-xs font-semibold text-gray-500">
                {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[t.status] ?? 'bg-gray-400'}`} />
              <p className="text-sm font-medium text-gray-800 truncate flex-1">{t.title}</p>
              <p className="text-xs text-gray-400 shrink-0">{t.assignee}</p>
            </div>
          ))}
          {listItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No tasks due this month.</p>
          )}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className={`grid grid-cols-7 gap-1.5 ${view === 'Week' ? '' : ''}`}>
            {weeks.flat().map((day, i) => (
              <DayCell
                key={i}
                day={day}
                tasksForDay={tasksOn(day.date)}
                isToday={sameDay(day.date, today)}
                maxVisible={view === 'Week' ? 5 : 3}
                onMore={setPopoverDate}
              />
            ))}
          </div>
        </div>
      )}

      <DayPopover date={popoverDate} tasks={popoverDate ? tasksOn(popoverDate) : []} onClose={() => setPopoverDate(null)} />
    </div>
  )
}
