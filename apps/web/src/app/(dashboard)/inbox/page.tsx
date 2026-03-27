'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'

type FilterType = 'all' | 'gorev' | 'todo'

interface UnifiedTask {
  id: string
  type: 'gorev' | 'todo'
  title: string
  priority?: string
  dueDate?: string | null
  source?: string  // filial/layihə adı
  assignedBy?: string
  isCompleted?: boolean
  raw: any
}

export default function InboxPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<FilterType>('all')
  const [gorevTasks, setGorevTasks] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)

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
        api.getTodoistTasks({ includeCompleted: 'false' }).catch(() => []),
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
      ])
      // GÖREV: yeni atanmış bütün görevlər (tarixli/tarixsiz)
      setGorevTasks(gorevs.filter((t: any) => !['COMPLETED', 'APPROVED'].includes(t.status)))
      // TODO: tamamlanmamış bütün todo-lar
      setTodoTasks(todos.filter((t: any) => !t.isCompleted))
      setUsers(u)
      setDepartments(d)
      // Filialları users-dən çıxar
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

    // GÖREV click məntiqi
    const raw = task.raw
    if (!user) return

    if (raw.type === 'GOREV' || raw.type === 'TASK') {
      // Sub-tasklar var
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
      // Üst-səviyyə approverId
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
    // Fallback: edit modal
    setEditingTask(raw)
    setAddOpen(true)
  }

  // Birləşmiş tapşırıq siyahısı
  const unified: UnifiedTask[] = [
    ...gorevTasks.map((t: any) => ({
      id: t.id,
      type: 'gorev' as const,
      title: t.title || t.content || 'Tapşırıq',
      priority: t.priority,
      dueDate: t.dueDate,
      source: t.business?.name || '',
      assignedBy: t.creator?.fullName || '',
      raw: t,
    })),
    ...todoTasks.map((t: any) => ({
      id: t.id,
      type: 'todo' as const,
      title: t.content || 'Todo',
      priority: t.priority,
      dueDate: t.dueDate,
      source: t.project?.name || '',
      raw: t,
    })),
  ]

  const filtered = filter === 'all' ? unified
    : filter === 'gorev' ? unified.filter(t => t.type === 'gorev')
    : unified.filter(t => t.type === 'todo')

  const gorevCount = unified.filter(t => t.type === 'gorev').length
  const todoCount = unified.filter(t => t.type === 'todo').length

  const priorityColors: Record<string, string> = {
    P1: 'var(--todoist-red)', CRITICAL: 'var(--todoist-red)',
    P2: '#EB8909', HIGH: '#EB8909',
    P3: '#246FE0', MEDIUM: '#246FE0',
    P4: 'var(--todoist-text-secondary)', LOW: 'var(--todoist-text-secondary)',
  }

  const handleTodoToggle = async (id: string) => {
    try {
      await api.completeTodoistTask(id)
      loadData()
    } catch {}
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-100" />
          <div className="h-12 w-full rounded bg-gray-100" />
          <div className="h-12 w-full rounded bg-gray-100" />
          <div className="h-12 w-full rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Gələnlər</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Aktiv tapşırıqlar — GÖREV + TODO · {unified.length} ədəd</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid var(--todoist-divider)' }}>
        <button onClick={() => setFilter('all')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'all' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
          Hamısı
          <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${filter === 'all' ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{unified.length}</span>
        </button>
        <button onClick={() => setFilter('gorev')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'gorev' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
          <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold">GÖREV</span>
          Tapşırıqlar
          <span className="text-[10px] text-[var(--todoist-text-tertiary)]">{gorevCount}</span>
        </button>
        <button onClick={() => setFilter('todo')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5
            ${filter === 'todo' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
          <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
          Şəxsi
          <span className="text-[10px] text-[var(--todoist-text-tertiary)]">{todoCount}</span>
        </button>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="w-16 h-16 mb-4 text-[var(--todoist-divider)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
          </svg>
          <p className="text-[14px] font-semibold text-[var(--todoist-text)] mb-1">Gələnlər qutusu boşdur</p>
          <p className="text-[12px] text-[var(--todoist-text-secondary)]">Tarixsiz tapşırıq yoxdur</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(task => (
            <div key={`${task.type}-${task.id}`}
              onClick={() => handleTaskClick(task)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--todoist-bg)] cursor-pointer transition group">
              {/* Checkbox */}
              <button onClick={(e) => { e.stopPropagation(); if (task.type === 'todo') handleTodoToggle(task.id) }}
                className="w-[18px] h-[18px] rounded-full border-2 shrink-0 transition hover:bg-gray-50"
                style={{ borderColor: priorityColors[task.priority || 'P4'] || 'var(--todoist-text-secondary)' }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--todoist-text)] truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-px rounded font-bold ${task.type === 'gorev' ? 'bg-[#E8F0FE] text-[#246FE0]' : 'bg-[#FFF3E0] text-[#EB8909]'}`}>
                    {task.type === 'gorev' ? 'GÖREV' : 'TODO'}
                  </span>
                  {task.source && (
                    <span className="text-[10px] text-[var(--todoist-text-tertiary)]">
                      {task.assignedBy ? `${task.assignedBy} · ` : ''}{task.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Bar */}
      <div onClick={() => {
        const content = prompt('Tapşırıq adı:')
        if (content?.trim()) {
          api.createTodoistTask({ content: content.trim() }).then(() => loadData()).catch(() => {})
        }
      }}
        className="flex items-center gap-2 px-3 py-2.5 mt-3 border-[1.5px] border-dashed border-[var(--todoist-divider)] rounded-xl text-[12px] text-[var(--todoist-text-tertiary)] cursor-pointer transition hover:border-[var(--todoist-red)] hover:text-[var(--todoist-red)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Gələnlərə tapşırıq əlavə et...
      </div>

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
