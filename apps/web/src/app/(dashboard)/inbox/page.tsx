'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'
import RecurringTrackModal from '@/components/templates/RecurringTrackModal'
import WorkerRecurringTaskModal from '@/components/templates/WorkerRecurringTaskModal'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import TaskCard, { P, S, daysDiff } from '@/components/TaskCard'
import GlassFilterBar from '@/components/GlassFilterBar'
import DraggableTodoList from '@/components/todoist/DraggableTodoList'
import TaskTableView from '@/components/TaskTableView'
import TodoTableView from '@/components/TodoTableView'

export default function InboxPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [todoProjects, setTodoProjects] = useState<any[]>([])
  const [todoLabels, setTodoLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewFilter, setViewFilter] = useState<'all' | 'gorev' | 'todo'>('all')

  // Filtrlər
  const [selectedBiz, setSelectedBiz] = useState<string>('ALL')
  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')

  // Modallar
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [todoQuickAddOpen, setTodoQuickAddOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [assigneeModal, setAssigneeModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [approverModal, setApproverModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [creatorModal, setCreatorModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [groupViewModal, setGroupViewModal] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null })
  const groupViewTasks = groupViewModal.groupId ? tasks.filter((t: any) => t.groupId === groupViewModal.groupId) : []
  const [recurringTrackModal, setRecurringTrackModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })
  const [workerRecurringModal, setWorkerRecurringModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })
  const [todoSearch, setTodoSearch] = useState('')
  const [todoStatusFilter, setTodoStatusFilter] = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'>('ALL')
  const [todoView, setTodoView] = useState<'list' | 'board'>('board')
  const [todoDragTaskId, setTodoDragTaskId] = useState<string | null>(null)
  const [todoDragOverCol, setTodoDragOverCol] = useState<string | null>(null)
  const [gorevView, setGorevView] = useState<'cards' | 'table'>('cards')
  const [allView, setAllView] = useState<'list' | 'table'>('list')

  function fmtDuration(mins: number): string {
    if (!mins) return ''
    if (mins < 60) return `${mins} dəq`
    const h = Math.floor(mins / 60), m = mins % 60
    return m > 0 ? `${h}s ${m}d` : `${h} saat`
  }

  function todoDiff(dueDate: string): number | null {
    if (!dueDate) return null
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - now.getTime()) / 86400000)
  }

  useEffect(() => {
    loadData()
    const gorevHandler = () => { setEditingTask(null); setAddOpen(true) }
    const todoHandler = () => setTodoQuickAddOpen(true)
    window.addEventListener('open-add-gorev', gorevHandler)
    window.addEventListener('open-add-todo', todoHandler)
    window.addEventListener('open-add-task', gorevHandler)
    return () => {
      window.removeEventListener('open-add-gorev', gorevHandler)
      window.removeEventListener('open-add-todo', todoHandler)
      window.removeEventListener('open-add-task', gorevHandler)
    }
  }, [])

  // N klaviatura qısayolu — sürətli TODO əlavə et
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setTodoQuickAddOpen(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function loadData() {
    Promise.all([
      api.getTasks().catch(() => []),
      api.getTodoistTasks({ includeCompleted: 'false' }).catch(() => []),
      api.getUsers().catch(() => []),
      api.getDepartments().catch(() => []),
      api.getTodoistProjects().catch(() => []),
      api.getTodoistLabels().catch(() => []),
      api.getAssignableUsers().catch(() => []),
    ]).then(([t, todos, u, d, projects, lbls, assignable]) => {
      // Aktiv GÖREV-lər
      setTasks(t.filter((tk: any) => !['COMPLETED', 'APPROVED'].includes(tk.status)))
      setTodoTasks(todos.filter((tk: any) => !tk.isCompleted))
      setUsers(u); setDepartments(d); setTodoProjects(projects); setTodoLabels(lbls); setAssignableUsers(assignable)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  // Task click routing
  const handleTaskClick = useCallback((task: any) => {
    if (task.sourceTemplateId && user) {
      if (task.creatorId === user.id) setRecurringTrackModal({ open: true, task })
      else setWorkerRecurringModal({ open: true, task })
      return
    }
    if (task.type === 'TASK' && task.groupId && user) {
      const isAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
      if (isAssignee && task.creatorId !== user.id) { setAssigneeModal({ open: true, task, subTask: null }); return }
      if (task.creatorId === user.id) {
        const groupTasks = tasks.filter((t: any) => t.groupId === task.groupId)
        const mergedAssignees = groupTasks.flatMap((t: any) =>
          (t.assignees || []).map((a: any) => ({ ...a, _taskId: t.id, _taskTitle: t.description || t.title }))
        )
        const allBulkNotes: any[] = []
        const seenNotes = new Set<string>()
        for (const gt of groupTasks) {
          for (const bn of (gt.bulkNotes || [])) {
            const key = `${bn.date}_${bn.text}_${bn.senderId || ''}`
            if (!seenNotes.has(key)) { seenNotes.add(key); allBulkNotes.push(bn) }
          }
        }
        allBulkNotes.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setApproverModal({ open: true, task: { ...task, assignees: mergedAssignees, _groupTasks: groupTasks, bulkNotes: allBulkNotes }, subTask: null })
        return
      }
      setGroupViewModal({ open: true, groupId: task.groupId }); return
    }
    if (task.type === 'GOREV' && user) {
      if (task.subTasks?.length > 0) {
        for (const sub of task.subTasks) {
          if (sub.approverId === user.id) { setApproverModal({ open: true, task, subTask: sub }); return }
        }
        for (const sub of task.subTasks) {
          if (sub.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)) { setAssigneeModal({ open: true, task, subTask: sub }); return }
        }
      }
      if (task.approverId) {
        if (task.approverId === user.id) { setApproverModal({ open: true, task, subTask: null }); return }
        if (task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)) { setAssigneeModal({ open: true, task, subTask: null }); return }
      }
      const isDirectAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
      if (isDirectAssignee && task.creatorId !== user.id) { setAssigneeModal({ open: true, task, subTask: null }); return }
      if (task.creatorId === user.id) { setCreatorModal({ open: true, task, subTask: task.subTasks?.[0] || null }); return }
    }
    const isAnyAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user?.id)
      || task.subTasks?.some((st: any) => st.assignees?.some((a: any) => (a.user?.id || a.userId) === user?.id))
    if (isAnyAssignee && task.creatorId !== user?.id) { setAssigneeModal({ open: true, task, subTask: null }); return }
    if (task.creatorId === user?.id) { setEditingTask(task); setAddOpen(true); return }
    setAssigneeModal({ open: true, task, subTask: null })
  }, [user, tasks])

  // İşletmələr
  const businesses = useMemo(() => {
    const bizMap = new Map<string, string>()
    tasks.forEach(t => { if (t.business) bizMap.set(t.business.id, t.business.name) })
    users.forEach((u: any) => {
      u.businesses?.forEach((ub: any) => {
        const b = ub.business || ub
        if (b?.id && b?.name) bizMap.set(b.id, b.name)
      })
    })
    return Array.from(bizMap, ([id, name]) => ({ id, name }))
  }, [tasks, users])

  // myStatus əlavə et
  const tasksWithMyStatus = useMemo(() => {
    if (!user?.id) return tasks
    return tasks.map(t => {
      const myAssignee = t.assignees?.find((a: any) => a.user?.id === user.id)
        || t.subTasks?.flatMap((st: any) => st.assignees || []).find((a: any) => a.user?.id === user.id)
      const isCreator = t.creatorId === user.id
      let myStatus = myAssignee?.status || t.status
      if (isCreator && t.finalized && !t.creatorApproved) myStatus = 'PENDING_APPROVAL'
      return { ...t, myStatus, isCreator }
    })
  }, [tasks, user?.id])

  // Filtr
  const filtered = useMemo(() => {
    return tasksWithMyStatus.filter(t => {
      if (selectedBiz !== 'ALL' && t.business?.id !== selectedBiz) return false
      if (selectedUser !== 'ALL' && !t.assignees?.some((a: any) => a.user.id === selectedUser)) return false
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false
      const status = t.myStatus
      if (selectedStatus === 'COMPLETED') return ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(status)
      if (selectedStatus === 'PENDING') return ['PENDING', 'CREATED'].includes(status)
      if (selectedStatus === 'REJECTED') return ['REJECTED', 'DECLINED'].includes(status)
      return status === selectedStatus
    })
  }, [tasksWithMyStatus, selectedBiz, selectedUser, selectedPriority, selectedStatus])

  // Group dedup
  const displayTasks = useMemo(() => {
    const seenGroups = new Set<string>()
    const result: any[] = []
    for (const t of filtered) {
      if (t.groupId) {
        const isCreator = t.creatorId === user?.id
        if (isCreator) {
          if (seenGroups.has(t.groupId)) continue
          seenGroups.add(t.groupId)
          const groupTasks = filtered.filter((x: any) => x.groupId === t.groupId)
          result.push({ ...t, _groupTasks: groupTasks, _groupCount: groupTasks.length })
        } else {
          result.push(t)
        }
      } else {
        result.push(t)
      }
    }
    return result
  }, [filtered, user?.id])

  // Status sayları
  const statusTabCounts = useMemo(() => {
    const base = tasksWithMyStatus.filter(t => {
      if (selectedBiz !== 'ALL' && t.business?.id !== selectedBiz) return false
      if (selectedUser !== 'ALL' && !t.assignees?.some((a: any) => a.user.id === selectedUser)) return false
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false
      return true
    })
    return {
      PENDING: base.filter(t => ['PENDING', 'CREATED'].includes(t.myStatus)).length,
      IN_PROGRESS: base.filter(t => t.myStatus === 'IN_PROGRESS').length,
      PENDING_APPROVAL: base.filter(t => t.myStatus === 'PENDING_APPROVAL').length,
      COMPLETED: base.filter(t => ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(t.myStatus)).length,
      REJECTED: base.filter(t => ['REJECTED', 'DECLINED'].includes(t.myStatus)).length,
    }
  }, [tasksWithMyStatus, selectedBiz, selectedUser, selectedPriority])

  const incompleteTodos = todoTasks
  const filteredTodos = todoStatusFilter === 'ALL'
    ? incompleteTodos
    : incompleteTodos.filter((t: any) => (t.todoStatus || 'WAITING') === todoStatusFilter)

  if (loading) return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-6 w-6" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>

  return (
    <div className="pb-10">
      {/* Başlıq */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Gələnlər</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Aktiv tapşırıqlar — {displayTasks.length + incompleteTodos.length} ədəd</p>
        </div>
      </div>

      {/* ── GLASS FILTER BAR V4 ── */}
      <GlassFilterBar
        viewFilter={viewFilter}
        onViewFilter={v => { setViewFilter(v); setSelectedStatus('PENDING'); setTodoStatusFilter('ALL') }}
        gorevCount={displayTasks.length}
        todoCount={incompleteTodos.length}
        businesses={businesses}
        selectedBiz={selectedBiz}
        onBizChange={setSelectedBiz}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        users={users}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        statusTabs={viewFilter === 'todo' ? [
          { key: 'ALL',         label: 'Hamısı',    dot: '#94A3B8', count: incompleteTodos.length },
          { key: 'WAITING',     label: 'Gözləyir',  dot: '#64748B', count: incompleteTodos.filter((t:any) => (t.todoStatus||'WAITING')==='WAITING').length },
          { key: 'IN_PROGRESS', label: 'Davam edir',dot: '#3B82F6', count: incompleteTodos.filter((t:any) => (t.todoStatus||'WAITING')==='IN_PROGRESS').length },
          { key: 'DONE',        label: 'Tamamlandı',dot: '#10B981', count: incompleteTodos.filter((t:any) => (t.todoStatus||'WAITING')==='DONE').length },
          { key: 'CANCELLED',   label: 'İptal',     dot: '#EF4444', count: incompleteTodos.filter((t:any) => (t.todoStatus||'WAITING')==='CANCELLED').length },
        ] : [
          { key: 'PENDING',          label: 'Gözləyir',     dot: '#64748B', count: statusTabCounts.PENDING },
          { key: 'IN_PROGRESS',      label: 'Davam edir',   dot: '#3B82F6', count: statusTabCounts.IN_PROGRESS },
          { key: 'PENDING_APPROVAL', label: 'Onay gözl.',   dot: '#F59E0B', count: statusTabCounts.PENDING_APPROVAL },
          { key: 'COMPLETED',        label: 'Tamamlandı',   dot: '#10B981', count: statusTabCounts.COMPLETED },
          { key: 'REJECTED',         label: 'Rədd',         dot: '#EF4444', count: statusTabCounts.REJECTED },
        ]}
        selectedStatus={viewFilter === 'todo' ? todoStatusFilter : selectedStatus}
        onStatusChange={viewFilter === 'todo' ? (k => setTodoStatusFilter(k as any)) : setSelectedStatus}
        showReset={selectedBiz !== 'ALL' || selectedUser !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'PENDING' || todoStatusFilter !== 'ALL'}
        onReset={() => { setSelectedBiz('ALL'); setSelectedUser('ALL'); setSelectedPriority('ALL'); setSelectedStatus('PENDING'); setTodoStatusFilter('ALL') }}
      />

      {/* ══════ HAMISİ — birləşmiş siyahı/cədvəl ══════ */}
      {viewFilter === 'all' && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Bütün tapşırıqlar</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{displayTasks.length + incompleteTodos.length}</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--todoist-divider)' }}>
              <button onClick={() => setAllView('list')}
                className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition ${allView === 'list' ? 'bg-[var(--todoist-red)] text-white' : 'text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}
                style={{ backgroundColor: allView === 'list' ? undefined : 'var(--todoist-surface)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                Siyahı
              </button>
              <button onClick={() => setAllView('table')}
                className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition ${allView === 'table' ? 'bg-[#2563EB] text-white' : 'text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}
                style={{ backgroundColor: allView === 'table' ? undefined : 'var(--todoist-surface)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                Cədvəl
              </button>
            </div>
          </div>

          {allView === 'list' && (
            <div className="space-y-1">
              {displayTasks.map((task: any) => (
                <div key={task.id} onClick={() => handleTaskClick(task)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition overflow-hidden"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--todoist-bg)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold shrink-0">GÖREV</span>
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: P[task.priority] || '#808080' }} />
                  <span className="text-[13px] font-medium flex-1 min-w-0" style={{ color: 'var(--todoist-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  {task.dueDate && (() => { const d = daysDiff(task.dueDate); return <span className="text-[10px] font-medium shrink-0" style={{ color: d < 0 ? '#EF4444' : d === 0 ? '#D97706' : '#94A3B8' }}>{d < 0 ? `${Math.abs(d)}g gecikmiş` : d === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span> })()}
                  {task.assignees?.[0]?.user && <span className="text-[10px] shrink-0" style={{ color: 'var(--todoist-text-tertiary)' }}>{task.assignees[0].user.fullName}</span>}
                </div>
              ))}
              {filteredTodos.map((task: any) => {
                const diff = todoDiff(task.dueDate)
                const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : '#94A3B8') : '#94A3B8'
                return (
                  <div key={task.id} onClick={() => setSelectedTodoId(task.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition overflow-hidden"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--todoist-bg)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold shrink-0">TODO</span>
                    <button onClick={async (e) => { e.stopPropagation(); try { await api.updateTodoistTask(task.id, { todoStatus: "DONE" }); loadData() } catch {} }}
                      className="w-[16px] h-[16px] rounded-full border-2 shrink-0"
                      style={{ borderColor: (task.todoStatus || 'WAITING') === 'DONE' ? '#10B981' : (task.todoStatus || 'WAITING') === 'IN_PROGRESS' ? '#F59E0B' : '#94A3B8' }} />
                    <span className="text-[13px] font-medium flex-1 min-w-0" style={{ color: 'var(--todoist-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.content}</span>
                    {task.dueDate && <span className="text-[10px] font-medium shrink-0" style={{ color: dueDateColor }}>{diff !== null && diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                    {task.project && <span className="text-[10px] shrink-0" style={{ color: 'var(--todoist-text-tertiary)' }}>{task.project.name}</span>}
                  </div>
                )
              })}
              {displayTasks.length === 0 && incompleteTodos.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Tapşırıq yoxdur!</h3>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Aktiv tapşırıq tapılmadı</p>
                </div>
              )}
            </div>
          )}

          {allView === 'table' && (() => {
            const allRows = [
              ...displayTasks.map(t => ({ ...t, _type: 'GÖREV' as const, _title: t.title, _date: t.dueDate, _created: t.createdAt })),
              ...filteredTodos.map(t => ({ ...t, _type: 'TODO' as const, _title: t.content, _date: t.dueDate, _created: t.createdAt })),
            ]
            return (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{allRows.length} sətir</span>
                  <span style={{ color: '#E2E8F0' }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#246FE0' }}>{displayTasks.length} görev</span>
                  <span style={{ color: '#E2E8F0' }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#EB8909' }}>{filteredTodos.length} todo</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44, padding: '11px 8px', textAlign: 'center', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>#</th>
                        <th style={{ width: 65, padding: '11px 8px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>NÖV</th>
                        <th style={{ padding: '11px 14px', textAlign: 'left', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>AD</th>
                        <th style={{ width: 130, padding: '11px 14px', textAlign: 'left', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>STATUS</th>
                        <th style={{ width: 110, padding: '11px 14px', textAlign: 'left', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>PRİORİTET</th>
                        <th style={{ width: 120, padding: '11px 14px', textAlign: 'left', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>SON TARİX</th>
                        <th style={{ width: 140, padding: '11px 14px', textAlign: 'left', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>İŞÇİ / LAYİHƏ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row, i) => {
                        const isGorev = row._type === 'GÖREV'
                        const status = isGorev ? (row.myStatus || row.status) : (row.todoStatus || 'WAITING')
                        const sMap: Record<string, { label: string; color: string; bg: string }> = {
                          PENDING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' }, CREATED: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
                          IN_PROGRESS: { label: 'Davam edir', color: '#3B82F6', bg: '#EFF6FF' },
                          PENDING_APPROVAL: { label: 'Onay gözl.', color: '#F59E0B', bg: '#FFFBEB' },
                          COMPLETED: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' }, APPROVED: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
                          REJECTED: { label: 'Rədd', color: '#EF4444', bg: '#FEF2F2' },
                          WAITING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
                          DONE: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
                          CANCELLED: { label: 'İptal', color: '#EF4444', bg: '#FEF2F2' },
                        }
                        const sc = sMap[status] || sMap.PENDING
                        const pColor = P[row.priority] || '#808080'
                        const diff = row._date ? daysDiff(row._date) : null
                        const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : '#94A3B8') : '#94A3B8'
                        const done = ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED', 'DONE'].includes(status)

                        return (
                          <tr key={row.id}
                            onClick={() => isGorev ? handleTaskClick(row) : setSelectedTodoId(row.id)}
                            style={{ cursor: 'pointer', backgroundColor: i % 2 === 1 ? '#FAFBFC' : 'white', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 1 ? '#FAFBFC' : 'white'}>
                            <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>{i + 1}</td>
                            <td style={{ padding: '10px 8px', borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: isGorev ? '#E8F0FE' : '#FFF3E0', color: isGorev ? '#246FE0' : '#EB8909' }}>{row._type}</span>
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#94A3B8' : '#1E293B', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 350 }}>{row._title}</span>
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, backgroundColor: sc.bg, color: sc.color }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sc.color }} />{sc.label}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, backgroundColor: pColor + '14', color: pColor }}>
                                {row.priority === 'CRITICAL' ? 'Kritik' : row.priority === 'HIGH' ? 'Yüksək' : row.priority === 'MEDIUM' || row.priority === 'P3' ? 'Orta' : row.priority === 'LOW' ? 'Aşağı' : row.priority === 'P1' ? 'Kritik' : row.priority === 'P2' ? 'Yüksək' : 'Normal'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                              {row._date ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: dueDateColor }}>
                                  {diff !== null && diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(row._date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                                </span>
                              ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: 12, color: '#64748B' }}>
                              {isGorev ? (row.assignees?.[0]?.user?.fullName || '—') : (row.project?.name || '—')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* TODO bölməsi */}
      {viewFilter === 'todo' && (viewFilter === 'todo' || incompleteTodos.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
            <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Şəxsi tapşırıqlar</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{filteredTodos.length < incompleteTodos.length ? `${filteredTodos.length}/${incompleteTodos.length}` : incompleteTodos.length}</span>
            <div className="flex rounded-md overflow-hidden border border-[var(--todoist-divider)]">
              <button onClick={() => setTodoView('list')} title="Sürükle-bırak siyahı"
                className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition
                  ${todoView === 'list' ? 'bg-[#EB8909] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                Siyahı
              </button>
              <button onClick={() => setTodoView('board')} title="Kanban board"
                className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition
                  ${todoView === 'board' ? 'bg-[#3B82F6] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
                Board
              </button>
            </div>
          </div>
          {incompleteTodos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[14px] font-semibold" style={{ color: 'var(--todoist-text)' }}>Şəxsi tapşırıq yoxdur</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Todo səhifəsindən tapşırıq əlavə edin</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--todoist-text-secondary)' }}>Bu filtrdə todo tapılmadı</p>
              <button onClick={() => setTodoStatusFilter('ALL')} className="mt-2 text-[11px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--todoist-red-light)', color: 'var(--todoist-red)' }}>Filtr sıfırla</button>
            </div>
          ) : (
          <>
          {todoView === 'list' && <div className="mb-4">
            <DraggableTodoList
              items={filteredTodos}
              disabled={false}
              onReorder={async (reordered) => {
                try { await api.reorderTodoistTasks(reordered); loadData() } catch {}
              }}
              renderItem={(task, dragHandleProps) => {
                const diff = todoDiff(task.dueDate)
                const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : 'var(--todoist-text-tertiary)') : 'var(--todoist-text-tertiary)'
                const dueDateText = diff !== null ? (diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })) : ''
                const hasBadges = (task.subTasks?.length > 0) || (task.attachments?.length > 0) || ((task.notes?.length || 0) + (task.comments?.length || 0)) > 0
                return (
                  <div onClick={() => setSelectedTodoId(task.id)}
                    className="group flex items-start gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition overflow-hidden"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    {/* Drag handle */}
                    <div {...dragHandleProps as any}
                      className="shrink-0 mt-1 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-30 hover:!opacity-70 transition-opacity"
                      style={{ color: 'var(--todoist-text-tertiary)' }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                        <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
                        <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
                        <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
                      </svg>
                    </div>
                    <button onClick={async (e) => { e.stopPropagation(); try { await api.updateTodoistTask(task.id, { todoStatus: "DONE" }); loadData() } catch {} }}
                      className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 shrink-0 hover:bg-gray-50"
                      style={{ borderColor: (task.todoStatus || 'WAITING') === 'CANCELLED' ? '#EF4444' : (task.todoStatus || 'WAITING') === 'DONE' ? '#10B981' : (task.todoStatus || 'WAITING') === 'IN_PROGRESS' ? '#F59E0B' : '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--todoist-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45ch' }}>{task.content}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
                        {task.project && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{task.project.name}</span>}
                        {dueDateText && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: dueDateColor }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {dueDateText}
                          </span>
                        )}
                        {task.duration > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {fmtDuration(task.duration)}
                          </span>
                        )}
                        {task.labels?.map((l: any) => (
                          <span key={l.id || l.labelId} className="text-[9px] px-1.5 py-px rounded-full font-semibold"
                            style={{ backgroundColor: (l.color || l.label?.color || '#808080') + '20', color: l.color || l.label?.color || '#808080' }}>
                            {l.name || l.label?.name}
                          </span>
                        ))}
                      </div>
                      {hasBadges && (
                        <div className="flex items-center gap-2 mt-1">
                          {task.subTasks?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: 'var(--todoist-text-secondary)' }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                              {task.subTasks.length}
                            </span>
                          )}
                          {task.attachments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: 'var(--todoist-text-secondary)' }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {task.attachments.length}
                            </span>
                          )}
                          {((task.notes?.length || 0) + (task.comments?.length || 0)) > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: 'var(--todoist-text-secondary)' }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {(task.notes?.length || 0) + (task.comments?.length || 0)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          </div>}
          {todoView === 'board' && (() => {
            const TODO_COLS = [
              { status: 'WAITING',     label: 'Gözləyir',   color: '#64748B', bg: '#F1F5F9' },
              { status: 'IN_PROGRESS', label: 'Davam edir', color: '#F59E0B', bg: '#FFFBEB' },
              { status: 'DONE',        label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
              { status: 'CANCELLED',   label: 'İptal',      color: '#EF4444', bg: '#FEF2F2' },
            ]
            return (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {TODO_COLS.map(col => {
                    const colTasks = incompleteTodos.filter((t: any) => (t.todoStatus || 'WAITING') === col.status)
                    const isOver = todoDragOverCol === col.status
                    return (
                      <div key={col.status}
                        onDragOver={e => { e.preventDefault(); setTodoDragOverCol(col.status) }}
                        onDragLeave={() => setTodoDragOverCol(null)}
                        onDrop={async e => {
                          e.preventDefault(); setTodoDragOverCol(null)
                          if (!todoDragTaskId) return
                          try { await api.updateTodoistTask(todoDragTaskId, { todoStatus: col.status }); loadData() } catch {}
                          setTodoDragTaskId(null)
                        }}
                        style={{ flex: 1, minWidth: 0, minHeight: 300, borderRadius: 10,
                          backgroundColor: isOver ? col.bg : 'rgba(0,0,0,0.02)',
                          border: `1.5px solid ${isOver ? col.color : 'rgba(0,0,0,0.06)'}`,
                          transition: 'all 0.15s' }}>
                        <div style={{ padding: '8px 10px 7px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col.color }}>{col.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 7, backgroundColor: col.color + '18', color: col.color }}>{colTasks.length}</span>
                        </div>
                        <div style={{ padding: '7px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {colTasks.map((task: any) => {
                            const isDragging = todoDragTaskId === task.id
                            const diff = todoDiff(task.dueDate)
                            const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : '#94A3B8') : '#94A3B8'
                            const dueDateText = diff !== null ? (diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })) : ''
                            return (
                              <div key={task.id} draggable
                                onDragStart={() => setTodoDragTaskId(task.id)}
                                onDragEnd={() => setTodoDragTaskId(null)}
                                onClick={() => setSelectedTodoId(task.id)}
                                style={{ background: isDragging ? '#f0f4ff' : 'white', borderRadius: 7,
                                  boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                                  padding: '8px 9px', cursor: 'grab', opacity: isDragging ? 0.6 : 1,
                                  border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--todoist-text)', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{task.content}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                  {task.project && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, backgroundColor: '#FFF3E0', color: '#EB8909' }}>{task.project.name}</span>}
                                  {dueDateText && <span style={{ fontSize: 9, fontWeight: 600, color: dueDateColor }}>{dueDateText}</span>}
                                </div>
                              </div>
                            )
                          })}
                          {colTasks.length === 0 && <div style={{ textAlign: 'center', padding: '16px 8px', color: '#CBD5E1', fontSize: 11 }}>Boş</div>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })()}
          </>
          )}
        </div>
      )}

      {/* GÖREV — kart grid — yalnız list modunda */}
      {viewFilter === 'gorev' && displayTasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold">GÖREV</span>
            <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Tapşırıqlar</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{displayTasks.length}</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--todoist-divider)' }}>
              <button onClick={() => setGorevView('cards')}
                className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition ${gorevView === 'cards' ? 'bg-[var(--todoist-red)] text-white' : 'text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}
                style={{ backgroundColor: gorevView === 'cards' ? undefined : 'var(--todoist-surface)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                Kartlar
              </button>
              <button onClick={() => setGorevView('table')}
                className={`px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition ${gorevView === 'table' ? 'bg-[#2563EB] text-white' : 'text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}
                style={{ backgroundColor: gorevView === 'table' ? undefined : 'var(--todoist-surface)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                Cədvəl
              </button>
            </div>
          </div>

          {gorevView === 'table' && (
            <TaskTableView
              tasks={displayTasks}
              onTaskClick={handleTaskClick}
              onStatusChange={async (taskId, status) => { try { await api.updateMyTaskStatus(taskId, status); loadData() } catch {} }}
            />
          )}

          {gorevView === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {displayTasks.map((task: any) => (
                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
              ))}
            </div>
          )}

        </div>
      )}

      {/* Boş state */}
      {viewFilter === 'gorev' && displayTasks.length === 0 && incompleteTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--todoist-red-light)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
          </div>
          <p className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Gələnlər qutusu boşdur</p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Aktiv tapşırıq yoxdur</p>
        </div>
      )}


      {/* Modallar */}
      <TaskFormModal open={addOpen} onClose={() => { setAddOpen(false); setEditingTask(null) }} onSaved={() => { setAddOpen(false); setEditingTask(null); loadData() }} editingTask={editingTask} users={assignableUsers.length > 0 ? assignableUsers : users} departments={departments} businesses={businesses} />
      <TaskFormModal open={groupViewModal.open} onClose={() => setGroupViewModal({ open: false, groupId: null })} onSaved={() => {}} editingTask={null} users={users} departments={departments} businesses={businesses} viewMode={true} groupedTasks={groupViewTasks} currentUserId={user?.id} onRefresh={loadData} />
      <ApproverTaskModal open={approverModal.open} onClose={() => setApproverModal({ open: false, task: null, subTask: null })} task={approverModal.task} subTask={approverModal.subTask} currentUserId={user?.id || ''} onRefresh={loadData} onApprove={async (id) => { try { await api.approveTask(id); setApproverModal({ open: false, task: null, subTask: null }); loadData() } catch (e: any) { alert(e.message) } }} />
      <CreatorTaskModal open={creatorModal.open} onClose={() => setCreatorModal({ open: false, task: null, subTask: null })} task={creatorModal.task} subTask={creatorModal.subTask} onEdit={(t: any) => { setEditingTask(t); setAddOpen(true) }} onRefresh={loadData} />
      <AssigneeTaskModal open={assigneeModal.open} onClose={() => setAssigneeModal({ open: false, task: null, subTask: null })} task={assigneeModal.task} subTask={assigneeModal.subTask} currentUserId={user?.id || ''} onRefresh={loadData} onStatusChange={async (id, status, note) => { try { await api.updateMyTaskStatus(id, status, note); setAssigneeModal({ open: false, task: null, subTask: null }); loadData() } catch (e: any) { alert(e.message) } }} />
      <RecurringTrackModal open={recurringTrackModal.open} onClose={() => setRecurringTrackModal({ open: false, task: null })} template={recurringTrackModal.task?.sourceTemplate || recurringTrackModal.task} />
      <WorkerRecurringTaskModal open={workerRecurringModal.open} onClose={() => setWorkerRecurringModal({ open: false, task: null })} task={workerRecurringModal.task} />
      <TaskDetailModal taskId={selectedTodoId} onClose={() => setSelectedTodoId(null)} onRefresh={loadData} />
      <GlobalQuickAdd open={todoQuickAddOpen} onClose={() => setTodoQuickAddOpen(false)} onAdded={loadData} projects={todoProjects} labels={todoLabels} />
    </div>
  )
}
