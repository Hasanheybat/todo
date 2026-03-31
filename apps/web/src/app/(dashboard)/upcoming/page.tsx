'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'
import RecurringTrackModal from '@/components/templates/RecurringTrackModal'
import WorkerRecurringTaskModal from '@/components/templates/WorkerRecurringTaskModal'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import TaskCard, { daysDiff } from '@/components/TaskCard'
import FilterBar from '@/components/FilterBar'

type ViewType = 'list' | 'calendar'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

const dayNames = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə']
const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

export default function UpcomingPage() {
  const { user } = useAuth()
  const [view, setView] = useState<ViewType>('list')
  const [viewFilter, setViewFilter] = useState<'all' | 'gorev' | 'todo'>('all')
  const [tasks, setTasks] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [todoProjects, setTodoProjects] = useState<any[]>([])
  const [todoLabels, setTodoLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })

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

  function loadData() {
    Promise.all([
      api.getTasks().catch(() => []),
      api.getTodoistTasksUpcoming().catch(() => []),
      api.getUsers().catch(() => []),
      api.getDepartments().catch(() => []),
      api.getTodoistProjects().catch(() => []),
      api.getTodoistLabels().catch(() => []),
      api.getAssignableUsers().catch(() => []),
    ]).then(([t, todos, u, d, projects, lbls, assignable]) => {
      // Gələcək GÖREV-lər (dueDate > bugün)
      setTasks(t.filter((tk: any) => tk.dueDate && daysDiff(tk.dueDate) > 0))
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
        const grpTasks = tasks.filter((t: any) => t.groupId === task.groupId)
        const mergedAssignees = grpTasks.flatMap((t: any) =>
          (t.assignees || []).map((a: any) => ({ ...a, _taskId: t.id, _taskTitle: t.description || t.title }))
        )
        const allBulkNotes: any[] = []
        const seenNotes = new Set<string>()
        for (const gt of grpTasks) {
          for (const bn of (gt.bulkNotes || [])) {
            const key = `${bn.date}_${bn.text}_${bn.senderId || ''}`
            if (!seenNotes.has(key)) { seenNotes.add(key); allBulkNotes.push(bn) }
          }
        }
        allBulkNotes.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setApproverModal({ open: true, task: { ...task, assignees: mergedAssignees, _groupTasks: grpTasks, bulkNotes: allBulkNotes }, subTask: null })
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

  // 14 gün
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i + 1) // sabahdan başla
      return {
        date: d, dateStr: toDateStr(d),
        label: i === 0 ? 'Sabah' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthShort: monthNames[d.getMonth()].slice(0, 3),
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
      const d = new Date(firstDay); d.setDate(d.getDate() - (startDow - i))
      cells.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calMonth.year, calMonth.month, d)
      cells.push({ date, dateStr: toDateStr(date), isCurrentMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(lastDay); d.setDate(d.getDate() + (cells.length - lastDay.getDate() - startDow + 2))
      cells.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false })
    }
    return cells
  }, [calMonth])

  const todayStr = toDateStr(new Date())

  // Təqvim üçün birləşmiş TODO+GÖREV data
  const calendarTasks = useMemo(() => {
    const gorevItems = displayTasks.map(t => ({
      id: t.id, type: 'gorev' as const, title: t.title, priority: t.priority,
      dueDate: t.dueDate?.split('T')[0] || '', raw: t,
    }))
    const todoItems = incompleteTodos.map(t => ({
      id: t.id, type: 'todo' as const, title: t.content || 'Todo', priority: t.priority,
      dueDate: t.dueDate?.split('T')[0] || '', raw: t,
    }))
    return [...gorevItems, ...todoItems]
  }, [displayTasks, incompleteTodos])

  if (loading) return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-6 w-6" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Gələcək</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>{view === 'list' ? 'Qarşıdakı 14 gün' : 'Aylıq təqvim'} · {displayTasks.length + incompleteTodos.length} tapşırıq</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingTask(null); setAddOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--todoist-red)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Əlavə et
          </button>
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
      </div>

      {/* GÖREV/TODO filtr tabları */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid var(--todoist-divider)' }}>
        {[
          { key: 'all', label: 'Hamısı', count: displayTasks.length + incompleteTodos.length },
          { key: 'gorev', label: 'Tapşırıqlar', badge: 'GÖREV', badgeBg: '#E8F0FE', badgeColor: '#246FE0', count: displayTasks.length },
          { key: 'todo', label: 'Şəxsi', badge: 'TODO', badgeBg: '#FFF3E0', badgeColor: '#EB8909', count: incompleteTodos.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setViewFilter(tab.key as any)}
            className="px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5"
            style={{ borderColor: viewFilter === tab.key ? 'var(--todoist-red)' : 'transparent', color: viewFilter === tab.key ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)' }}>
            {tab.badge && <span className="text-[9px] px-1.5 py-px rounded font-bold" style={{ backgroundColor: tab.badgeBg, color: tab.badgeColor }}>{tab.badge}</span>}
            {tab.label}
            <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${viewFilter === tab.key ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Status tab + Chip filtrlər (GÖREV tab-larında) */}
      {viewFilter !== 'todo' && view === 'list' && (
        <FilterBar
          statusTabs={[
            { key: 'PENDING', label: 'Gözləyir', dot: '#64748B', count: statusTabCounts.PENDING },
            { key: 'IN_PROGRESS', label: 'Davam edir', dot: '#3B82F6', count: statusTabCounts.IN_PROGRESS },
            { key: 'PENDING_APPROVAL', label: 'Onay gözləyir', dot: '#F59E0B', count: statusTabCounts.PENDING_APPROVAL },
            { key: 'COMPLETED', label: 'Tamamlandı', dot: '#10B981', count: statusTabCounts.COMPLETED },
            { key: 'REJECTED', label: 'Rədd', dot: '#EF4444', count: statusTabCounts.REJECTED },
          ]}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          businesses={businesses}
          selectedBiz={selectedBiz}
          onBizChange={setSelectedBiz}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          users={users}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          onReset={() => { setSelectedBiz('ALL'); setSelectedUser('ALL'); setSelectedPriority('ALL'); setSelectedStatus('PENDING') }}
          showReset={selectedBiz !== 'ALL' || selectedUser !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'PENDING'}
        />
      )}

      {/* SİYAHI GÖRÜNÜŞÜ — tarix qrupları + kart grid */}
      {view === 'list' && (
        <div className="space-y-6">
          {/* TODO bölməsi (əgər todo tab aktiv və ya all) */}
          {viewFilter !== 'gorev' && incompleteTodos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Gələcək şəxsi tapşırıqlar</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{incompleteTodos.length}</span>
              </div>
              <div className="space-y-0.5 mb-4">
                {incompleteTodos.map((task: any) => (
                  <div key={task.id} onClick={() => setSelectedTodoId(task.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <button onClick={async (e) => { e.stopPropagation(); try { await api.completeTodoistTask(task.id); loadData() } catch {} }}
                      className="w-[18px] h-[18px] rounded-full border-2 shrink-0 hover:bg-gray-50"
                      style={{ borderColor: task.priority === 'P1' ? '#EF4444' : task.priority === 'P2' ? '#F59E0B' : task.priority === 'P3' ? '#3B82F6' : '#64748B' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--todoist-text)' }}>{task.content}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
                        {task.project && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{task.project.name}</span>}
                        {task.dueDate && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GÖREV kart grid — gün qrupları ilə */}
          {viewFilter !== 'todo' && (
            <>
              {viewFilter === 'all' && displayTasks.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold">GÖREV</span>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Gələcək tapşırıqlar</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{displayTasks.length}</span>
                </div>
              )}

              {days.map(day => {
                const dayTasks = displayTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === day.dateStr)
                if (dayTasks.length === 0) return null
                return (
                  <div key={day.dateStr}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${day.isWeekend ? 'text-[#3B82F6]' : 'text-[var(--todoist-text)]'}`}>
                        {day.dayNum}
                      </div>
                      <span className={`text-[13px] font-bold ${day.isWeekend ? 'text-[#3B82F6]' : 'text-[var(--todoist-text)]'}`}>{day.label}</span>
                      <span className="text-[10px] text-[var(--todoist-text-tertiary)]">{day.dayNum} {day.monthShort}</span>
                      <div className="flex-1 h-px bg-[var(--todoist-divider)]" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]">{dayTasks.length}</span>
                    </div>
                    <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mb-2">
                      {dayTasks.map((task: any) => (
                        <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Tarixsiz GÖREV-lər */}
              {(() => {
                const noDateTasks = displayTasks.filter(t => !t.dueDate)
                if (noDateTasks.length === 0) return null
                return (
                  <div>
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 text-[var(--todoist-text-tertiary)]">—</div>
                      <span className="text-[13px] font-bold text-[var(--todoist-text-tertiary)]">Tarixsiz</span>
                      <div className="flex-1 h-px bg-[var(--todoist-divider)]" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]">{noDateTasks.length}</span>
                    </div>
                    <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {noDateTasks.map((task: any) => (
                        <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                      ))}
                    </div>
                  </div>
                )
              })()}

              {displayTasks.length === 0 && viewFilter !== 'all' && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--todoist-red-light)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <p className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Gələcək tapşırıq yoxdur</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Qarşıdakı 14 gündə tapşırıq planlanmayıb</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TƏQVİM GÖRÜNÜŞÜ */}
      {view === 'calendar' && (
        <div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">‹</button>
            <span className="text-[16px] font-bold text-[var(--todoist-text)]">{monthNames[calMonth.month]} {calMonth.year}</span>
            <button onClick={() => setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">›</button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-[var(--todoist-divider)] border border-[var(--todoist-divider)] rounded-xl overflow-hidden">
            {['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'].map((d, i) => (
              <div key={d} className="bg-[var(--todoist-bg)] px-2 py-2 text-center text-[10px] font-bold" style={{ color: i >= 5 ? '#3B82F6' : 'var(--todoist-text-tertiary)' }}>{d}</div>
            ))}
            {calendarDays.map((cell, i) => {
              const cellTasks = calendarTasks.filter(t => t.dueDate === cell.dateStr)
              const isToday = cell.dateStr === todayStr
              return (
                <div key={i} className={`min-h-[72px] p-1.5 ${cell.isCurrentMonth ? (isToday ? 'bg-[#FFF5F3]' : 'bg-white') : 'bg-[var(--todoist-bg)]'}`}>
                  <span className={`text-[11px] font-semibold inline-flex items-center justify-center
                    ${isToday ? 'w-[22px] h-[22px] rounded-full bg-[var(--todoist-red)] text-white' : cell.isCurrentMonth ? 'text-[var(--todoist-text)]' : 'text-[#D4D4D4]'}`}>
                    {cell.date?.getDate()}
                  </span>
                  {cellTasks.slice(0, 2).map(task => (
                    <div key={`${task.type}-${task.id}`}
                      onClick={() => task.type === 'todo' ? setSelectedTodoId(task.id) : handleTaskClick(task.raw)}
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
