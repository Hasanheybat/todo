'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'

type FilterType = 'all' | 'gorev' | 'todo'
type ViewType = 'list' | 'calendar'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

const dayNames = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə']
const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

const priorityColors: Record<string, string> = {
  P1: '#DC4C3E', CRITICAL: '#DC4C3E',
  P2: '#EB8909', HIGH: '#EB8909',
  P3: '#246FE0', MEDIUM: '#246FE0',
  P4: '#808080', LOW: '#808080',
}

interface UnifiedTask {
  id: string
  type: 'gorev' | 'todo'
  title: string
  priority?: string
  dueDate: string
  source?: string
  raw: any
}

export default function UpcomingPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<FilterType>('all')
  const [view, setView] = useState<ViewType>('list')
  const [gorevTasks, setGorevTasks] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })

  // GÖREV modalları
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([])
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [assigneeModal, setAssigneeModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [approverModal, setApproverModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [creatorModal, setCreatorModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [gorevs, todos, u, d] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getTodoistTasksUpcoming().catch(() => []),
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
      ])
      setGorevTasks(gorevs.filter((t: any) => t.dueDate))
      setTodoTasks(todos.filter((t: any) => !t.isCompleted))
      setUsers(u)
      setDepartments(d)
      const bizMap = new Map<string, string>()
      u.forEach((usr: any) => usr.businesses?.forEach((b: any) => { if (b.business) bizMap.set(b.business.id, b.business.name) }))
      setBusinesses([...bizMap.entries()].map(([id, name]) => ({ id, name })))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Dashboard-dakı handleTaskClick məntiqi
  function handleTaskClick(task: UnifiedTask) {
    if (task.type === 'todo') {
      setSelectedTodoId(task.id)
      return
    }

    const raw = task.raw
    if (!user) return

    if (raw.type === 'GOREV' || raw.type === 'TASK') {
      if (raw.subTasks?.length > 0) {
        for (const sub of raw.subTasks) {
          if (sub.approverId === user.id) {
            setApproverModal({ open: true, task: raw, subTask: sub })
            return
          }
        }
        for (const sub of raw.subTasks) {
          const isAssignee = sub.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
          if (isAssignee) {
            setAssigneeModal({ open: true, task: raw, subTask: sub })
            return
          }
        }
      }
      if (raw.approverId) {
        if (raw.approverId === user.id) {
          setApproverModal({ open: true, task: raw, subTask: null })
          return
        }
        const isAssignee = raw.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
        if (isAssignee) {
          setAssigneeModal({ open: true, task: raw, subTask: null })
          return
        }
      }
      if (raw.creatorId === user.id) {
        setCreatorModal({ open: true, task: raw, subTask: null })
        return
      }
    }
    setEditingTask(raw)
    setAddOpen(true)
  }

  // Birləşmiş siyahı
  const unified: UnifiedTask[] = useMemo(() => [
    ...gorevTasks.map((t: any) => ({
      id: t.id, type: 'gorev' as const,
      title: t.title || t.content || 'Tapşırıq',
      priority: t.priority, dueDate: t.dueDate?.split('T')[0] || '',
      source: t.business?.name || '', raw: t,
    })),
    ...todoTasks.map((t: any) => ({
      id: t.id, type: 'todo' as const,
      title: t.content || 'Todo',
      priority: t.priority, dueDate: t.dueDate?.split('T')[0] || '',
      source: t.project?.name || '', raw: t,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [gorevTasks, todoTasks])

  const filtered = filter === 'all' ? unified
    : filter === 'gorev' ? unified.filter(t => t.type === 'gorev')
    : unified.filter(t => t.type === 'todo')

  const gorevCount = unified.filter(t => t.type === 'gorev').length
  const todoCount = unified.filter(t => t.type === 'todo').length

  // 14 gün
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      return {
        date: d,
        dateStr: toDateStr(d),
        label: i === 0 ? 'Bugün' : i === 1 ? 'Sabah' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthShort: monthNames[d.getMonth()].slice(0, 3),
        isToday: i === 0,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      }
    })
  }, [])

  // Təqvim grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calMonth.year, calMonth.month, 1)
    const lastDay = new Date(calMonth.year, calMonth.month + 1, 0)
    let startDow = firstDay.getDay()
    if (startDow === 0) startDow = 7

    const cells: { date: Date | null; dateStr: string; isCurrentMonth: boolean }[] = []
    for (let i = 1; i < startDow; i++) {
      const d = new Date(firstDay)
      d.setDate(d.getDate() - (startDow - i))
      cells.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calMonth.year, calMonth.month, d)
      cells.push({ date, dateStr: toDateStr(date), isCurrentMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(lastDay)
      d.setDate(d.getDate() + (cells.length - lastDay.getDate() - startDow + 2))
      cells.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false })
    }
    return cells
  }, [calMonth])

  const todayStr = toDateStr(new Date())

  const handleTodoToggle = async (id: string) => {
    try { await api.completeTodoistTask(id); loadData() } catch {}
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-100" />
          <div className="h-12 w-full rounded bg-gray-100" />
          <div className="h-12 w-full rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Gələcək</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>{view === 'list' ? 'Qarşıdakı günlər' : 'Aylıq təqvim'}</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--todoist-divider)]">
          <button onClick={() => setView('list')}
            className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition
              ${view === 'list' ? 'bg-[var(--todoist-red)] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            Siyahı
          </button>
          <button onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition
              ${view === 'calendar' ? 'bg-[var(--todoist-red)] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
            Təqvim
          </button>
        </div>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid var(--todoist-divider)' }}>
        <button onClick={() => setFilter('all')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'all' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)]'}`}>
          Hamısı <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${filter === 'all' ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{unified.length}</span>
        </button>
        <button onClick={() => setFilter('gorev')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'gorev' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)]'}`}>
          <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold">GÖREV</span> {gorevCount}
        </button>
        <button onClick={() => setFilter('todo')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'todo' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)]'}`}>
          <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span> {todoCount}
        </button>
      </div>

      {/* ═══ SİYAHI GÖRÜNÜŞÜ ═══ */}
      {view === 'list' && (
        <div className="space-y-4">
          {days.map(day => {
            const dayTasks = filtered.filter(t => t.dueDate === day.dateStr)
            return (
              <div key={day.dateStr}>
                <div className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0
                    ${day.isToday ? 'bg-[var(--todoist-red)] text-white' : day.isWeekend ? 'text-[#246FE0]' : 'text-[var(--todoist-text)]'}`}>
                    {day.dayNum}
                  </div>
                  <div>
                    <span className={`text-[13px] font-bold ${day.isToday ? 'text-[var(--todoist-red)]' : day.isWeekend ? 'text-[#246FE0]' : 'text-[var(--todoist-text)]'}`}>{day.label}</span>
                    {!day.isToday && <span className="text-[10px] text-[var(--todoist-text-tertiary)] ml-2">{day.dayNum} {day.monthShort}</span>}
                  </div>
                  <div className="flex-1 h-px bg-[var(--todoist-divider)]" />
                  {dayTasks.length > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${day.isToday ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{dayTasks.length}</span>
                  )}
                </div>

                <div className="ml-11">
                  {dayTasks.length > 0 && (
                    <div className="space-y-0.5">
                      {dayTasks.map(task => (
                        <div key={`${task.type}-${task.id}`}
                          onClick={() => handleTaskClick(task)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--todoist-bg)] cursor-pointer transition">
                          <button onClick={(e) => { e.stopPropagation(); if (task.type === 'todo') handleTodoToggle(task.id) }}
                            className="w-[18px] h-[18px] rounded-full border-2 shrink-0"
                            style={{ borderColor: priorityColors[task.priority || 'P4'] || 'var(--todoist-text-secondary)' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--todoist-text)] truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] px-1.5 py-px rounded font-bold ${task.type === 'gorev' ? 'bg-[#E8F0FE] text-[#246FE0]' : 'bg-[#FFF3E0] text-[#EB8909]'}`}>
                                {task.type === 'gorev' ? 'GÖREV' : 'TODO'}
                              </span>
                              {task.source && <span className="text-[10px] text-[var(--todoist-text-tertiary)]">{task.source}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Quick add per day */}
                  <div onClick={() => {
                    const content = prompt('Tapşırıq adı:')
                    if (content?.trim()) {
                      api.createTodoistTask({ content: content.trim(), dueDate: day.dateStr }).then(() => loadData()).catch(() => {})
                    }
                  }}
                    className="flex items-center gap-2 px-3 py-1.5 mt-0.5 text-[11px] text-[var(--todoist-text-tertiary)] cursor-pointer rounded-lg opacity-0 hover:opacity-100 transition-opacity hover:bg-[var(--todoist-bg)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Tapşırıq əlavə et
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ TƏQVİM GÖRÜNÜŞÜ ═══ */}
      {view === 'calendar' && (
        <div>
          {/* Month nav */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">‹</button>
            <span className="text-[16px] font-bold text-[var(--todoist-text)]">{monthNames[calMonth.month]} {calMonth.year}</span>
            <button onClick={() => setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">›</button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-[var(--todoist-divider)] border border-[var(--todoist-divider)] rounded-xl overflow-hidden">
            {/* Day headers */}
            {['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'].map((d, i) => (
              <div key={d} className="bg-[var(--todoist-bg)] px-2 py-2 text-center text-[10px] font-bold" style={{ color: i >= 5 ? '#246FE0' : 'var(--todoist-text-tertiary)' }}>{d}</div>
            ))}

            {/* Cells */}
            {calendarDays.map((cell, i) => {
              const cellTasks = filtered.filter(t => t.dueDate === cell.dateStr)
              const isToday = cell.dateStr === todayStr
              return (
                <div key={i} className={`min-h-[72px] p-1.5 ${cell.isCurrentMonth ? (isToday ? 'bg-[#FFF5F3]' : 'bg-white') : 'bg-[var(--todoist-bg)]'}`}>
                  <span className={`text-[11px] font-semibold inline-flex items-center justify-center
                    ${isToday ? 'w-[22px] h-[22px] rounded-full bg-[var(--todoist-red)] text-white' : cell.isCurrentMonth ? 'text-[var(--todoist-text)]' : 'text-[#D4D4D4]'}`}>
                    {cell.date?.getDate()}
                  </span>
                  {cellTasks.slice(0, 2).map(task => (
                    <div key={`${task.type}-${task.id}`}
                      onClick={() => handleTaskClick(task)}
                      className={`mt-0.5 text-[8px] px-1 py-px rounded font-semibold truncate cursor-pointer hover:opacity-80 transition
                        ${task.type === 'gorev' ? 'bg-[#E8F0FE] text-[#246FE0]' : 'bg-[#FFF3E0] text-[#EB8909]'}`}>
                      {task.title}
                    </div>
                  ))}
                  {cellTasks.length > 2 && (
                    <div className="text-[7px] text-[var(--todoist-text-tertiary)] font-semibold mt-0.5">+{cellTasks.length - 2} daha</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TODO Modal */}
      <TaskDetailModal taskId={selectedTodoId} onClose={() => setSelectedTodoId(null)} onRefresh={loadData} />

      {/* GÖREV Modalları */}
      {assigneeModal.open && (
        <AssigneeTaskModal
          open={assigneeModal.open}
          task={assigneeModal.task}
          subTask={assigneeModal.subTask}
          currentUserId={user?.id || ''}
          onClose={() => setAssigneeModal({ open: false, task: null, subTask: null })}
          onRefresh={loadData}
        />
      )}
      {approverModal.open && (
        <ApproverTaskModal
          open={approverModal.open}
          task={approverModal.task}
          subTask={approverModal.subTask}
          currentUserId={user?.id || ''}
          onClose={() => setApproverModal({ open: false, task: null, subTask: null })}
          onRefresh={loadData}
        />
      )}
      {creatorModal.open && (
        <CreatorTaskModal
          open={creatorModal.open}
          task={creatorModal.task}
          subTask={creatorModal.subTask}
          onClose={() => setCreatorModal({ open: false, task: null, subTask: null })}
          onRefresh={loadData}
        />
      )}
      {addOpen && (
        <TaskFormModal
          open={addOpen}
          onClose={() => { setAddOpen(false); setEditingTask(null) }}
          onSaved={() => { setAddOpen(false); setEditingTask(null); loadData() }}
          editingTask={editingTask}
          users={users}
          departments={departments}
          businesses={businesses}
        />
      )}
    </div>
  )
}
