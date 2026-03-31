'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import ConfirmModal from '@/components/ConfirmModal'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import ActivityWidget from '@/components/todoist/ActivityWidget'
import RecurringTrackModal from '@/components/templates/RecurringTrackModal'
import WorkerRecurringTaskModal from '@/components/templates/WorkerRecurringTaskModal'
import TaskCard, { P, S, daysDiff } from '@/components/TaskCard'
import FilterBar from '@/components/FilterBar'

export default function DashboardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewFilter, setViewFilter] = useState<'all' | 'gorev' | 'todo'>('all')
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [todoQuickAddOpen, setTodoQuickAddOpen] = useState(false)
  const [todoProjects, setTodoProjects] = useState<any[]>([])
  const [todoLabels, setTodoLabels] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  // Filtrlər
  const [selectedBiz, setSelectedBiz] = useState<string>('ALL')
  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')

  // Modallar
  const [addOpen, setAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [pendingReopenTask, setPendingReopenTask] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; confirmText: string; onConfirm: () => void }>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })
  const [assigneeModal, setAssigneeModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [approverModal, setApproverModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [creatorModal, setCreatorModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [groupViewModal, setGroupViewModal] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null })
  const groupViewTasks = groupViewModal.groupId ? tasks.filter((t: any) => t.groupId === groupViewModal.groupId) : []
  const [recurringTrackModal, setRecurringTrackModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })
  const [workerRecurringModal, setWorkerRecurringModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })

  useEffect(() => {
    const openTask = searchParams.get('openTask')
    if (openTask) setSelectedTodoId(openTask)
  }, [searchParams])

  useEffect(() => {
    loadData()
    const gorevHandler = () => openCreateModal()
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
      api.getUsers().catch(() => []),
      api.getDepartments().catch(() => []),
      api.getTodoistTasksToday().catch(() => []),
      api.getTodoistProjects().catch(() => []),
      api.getTodoistLabels().catch(() => []),
      api.getAssignableUsers().catch(() => []),
    ]).then(([t, u, d, todos, projects, lbls, assignable]) => {
      setTasks(t); setUsers(u); setDepartments(d); setTodoTasks(todos)
      setTodoProjects(projects); setTodoLabels(lbls); setAssignableUsers(assignable)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  // Task click routing — /tasks ilə eyni
  const handleTaskClick = useCallback((task: any) => {
    if (task.sourceTemplateId && user) {
      if (task.creatorId === user.id) setRecurringTrackModal({ open: true, task })
      else setWorkerRecurringModal({ open: true, task })
      return
    }
    if (task.type === 'TASK' && task.groupId && user) {
      const isAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
      if (isAssignee && task.creatorId !== user.id) {
        setAssigneeModal({ open: true, task, subTask: null }); return
      }
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
    if (task.creatorId === user?.id) { openEditModal(task); return }
    setAssigneeModal({ open: true, task, subTask: null })
  }, [user, tasks])

  function openEditModal(task: any) {
    setEditingTask(task)
    setAddOpen(true)
  }

  function openCreateModal() {
    setEditingTask(null)
    setAddOpen(true)
  }

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

  // Bugünkü GÖREV-lər
  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false
      const diff = daysDiff(t.dueDate)
      return diff <= 0 // bugün + gecikmiş
    })
  }, [tasks])

  // myStatus əlavə et
  const tasksWithMyStatus = useMemo(() => {
    if (!user?.id) return todayTasks
    return todayTasks.map(t => {
      const myAssignee = t.assignees?.find((a: any) => a.user?.id === user.id)
        || t.subTasks?.flatMap((st: any) => st.assignees || []).find((a: any) => a.user?.id === user.id)
      const isCreator = t.creatorId === user.id
      let myStatus = myAssignee?.status || t.status
      if (isCreator && t.finalized && !t.creatorApproved) myStatus = 'PENDING_APPROVAL'
      return { ...t, myStatus, isCreator }
    })
  }, [todayTasks, user?.id])

  // Filtr tətbiqi
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

  // Status tab sayları
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

  // approverModal yeniləmə
  useEffect(() => {
    if (!approverModal.open || !approverModal.task) return
    const t = approverModal.task
    if (t.groupId && t._groupTasks) {
      const groupTasks = tasks.filter((x: any) => x.groupId === t.groupId)
      if (groupTasks.length > 0) {
        const mergedAssignees = groupTasks.flatMap((gt: any) =>
          (gt.assignees || []).map((a: any) => ({ ...a, _taskId: gt.id, _taskTitle: gt.description || gt.title }))
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
        setApproverModal(prev => ({ ...prev, task: { ...groupTasks[0], assignees: mergedAssignees, _groupTasks: groupTasks, bulkNotes: allBulkNotes } }))
      }
    } else if (!t.groupId) {
      const updated = tasks.find((x: any) => x.id === t.id)
      if (updated) setApproverModal(prev => ({ ...prev, task: { ...updated, _groupTasks: t._groupTasks } }))
    }
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!assigneeModal.open || !assigneeModal.task) return
    const t = assigneeModal.task
    const updated = tasks.find((x: any) => x.id === t.id)
    if (updated) setAssigneeModal(prev => ({ ...prev, task: updated, subTask: prev.subTask ? updated.subTasks?.find((s: any) => s.id === prev.subTask.id) || prev.subTask : null }))
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
  const incompleteTodos = todoTasks.filter(t => !t.isCompleted)

  if (loading) return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-6 w-6" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>

  return (
    <div className="pb-10">
      {/* Başlıq */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Bugün</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>{todayStr} · {filtered.length + incompleteTodos.length} tapşırıq</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: 'var(--todoist-red)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Tapşırıq əlavə et
        </button>
      </div>

      {/* Gözləyən onaylar widget */}
      {statusTabCounts.PENDING_APPROVAL > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FED7AA' }}>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">⏳</span>
            <div>
              <p className="text-[13px] font-bold" style={{ color: '#92400E' }}>Gözləyən onaylar</p>
              <p className="text-[11px]" style={{ color: '#B45309' }}>{statusTabCounts.PENDING_APPROVAL} tapşırıq onayınızı gözləyir</p>
            </div>
          </div>
          <button onClick={() => setSelectedStatus('PENDING_APPROVAL')} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90" style={{ backgroundColor: '#F59E0B' }}>
            Baxış keç
          </button>
        </div>
      )}

      {/* GÖREV / TODO filtr tabları */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid var(--todoist-divider)' }}>
        {[
          { key: 'all', label: 'Hamısı', count: filtered.length + incompleteTodos.length },
          { key: 'gorev', label: 'Tapşırıqlar', badge: 'GÖREV', badgeBg: '#E8F0FE', badgeColor: '#246FE0', count: filtered.length },
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
      {viewFilter !== 'todo' && (
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

      {/* TODO bölməsi */}
      {viewFilter !== 'gorev' && incompleteTodos.length > 0 && (
        <div className={viewFilter === 'all' ? 'mb-6' : ''}>
          {viewFilter === 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] px-1.5 py-px rounded bg-[#FFF3E0] text-[#EB8909] font-bold">TODO</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Şəxsi tapşırıqlar</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{incompleteTodos.length}</span>
            </div>
          )}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GÖREV kart grid */}
      {viewFilter !== 'todo' && displayTasks.length > 0 && (
        <div className="mb-5">
          {viewFilter === 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] px-1.5 py-px rounded bg-[#E8F0FE] text-[#246FE0] font-bold">GÖREV</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Tapşırıqlar</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-border)' }}>{displayTasks.length}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {displayTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Boş state */}
      {viewFilter !== 'todo' && displayTasks.length === 0 && (
        <div className="text-center mt-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--todoist-red-light)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Bugün tapşırıq yoxdur!</h3>
          <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Bugünə tapşırıq planlanmayıb</p>
        </div>
      )}

      {viewFilter === 'todo' && incompleteTodos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--todoist-text)' }}>Bugün şəxsi tapşırıq yoxdur</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Todo səhifəsindən tapşırıq əlavə edin</p>
        </div>
      )}

      {/* Son fəaliyyətlər */}
      <div className="mt-8">
        <ActivityWidget limit={10} />
      </div>

      {/* ───── MODALLAR ───── */}
      <TaskFormModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false); setEditingTask(null)
          if (pendingReopenTask) { setTimeout(() => { handleTaskClick(pendingReopenTask); setPendingReopenTask(null) }, 100) }
        }}
        onSaved={() => { setAddOpen(false); setEditingTask(null); loadData() }}
        editingTask={editingTask}
        users={assignableUsers.length > 0 ? assignableUsers : users}
        departments={departments}
        businesses={businesses}
      />

      <TaskFormModal
        open={groupViewModal.open}
        onClose={() => setGroupViewModal({ open: false, groupId: null })}
        onSaved={() => {}}
        editingTask={null}
        users={users}
        departments={departments}
        businesses={businesses}
        viewMode={true}
        groupedTasks={groupViewTasks}
        currentUserId={user?.id}
        onRefresh={loadData}
      />

      <ApproverTaskModal
        open={approverModal.open}
        onClose={() => setApproverModal({ open: false, task: null, subTask: null })}
        task={approverModal.task}
        subTask={approverModal.subTask}
        currentUserId={user?.id || ''}
        onRefresh={loadData}
        onApprove={async (subTaskId) => {
          try { await api.approveTask(subTaskId); setApproverModal({ open: false, task: null, subTask: null }); loadData() }
          catch (err: any) { alert(err.message || 'Xəta baş verdi') }
        }}
      />

      <CreatorTaskModal
        open={creatorModal.open}
        onClose={() => setCreatorModal({ open: false, task: null, subTask: null })}
        task={creatorModal.task}
        subTask={creatorModal.subTask}
        onEdit={(t: any) => openEditModal(t)}
        onRefresh={loadData}
      />

      <AssigneeTaskModal
        open={assigneeModal.open}
        onClose={() => setAssigneeModal({ open: false, task: null, subTask: null })}
        task={assigneeModal.task}
        subTask={assigneeModal.subTask}
        currentUserId={user?.id || ''}
        onRefresh={loadData}
        onStatusChange={async (subTaskId, status, note) => {
          try { await api.updateMyTaskStatus(subTaskId, status, note); setAssigneeModal({ open: false, task: null, subTask: null }); loadData() }
          catch (err: any) { alert(err.message || 'Xəta baş verdi') }
        }}
      />

      <RecurringTrackModal open={recurringTrackModal.open} onClose={() => setRecurringTrackModal({ open: false, task: null })} template={recurringTrackModal.task?.sourceTemplate || recurringTrackModal.task} />
      <WorkerRecurringTaskModal open={workerRecurringModal.open} onClose={() => setWorkerRecurringModal({ open: false, task: null })} task={workerRecurringModal.task} />

      <TaskDetailModal taskId={selectedTodoId} onClose={() => setSelectedTodoId(null)} onRefresh={loadData} />
      <GlobalQuickAdd open={todoQuickAddOpen} onClose={() => setTodoQuickAddOpen(false)} onAdded={loadData} projects={todoProjects} labels={todoLabels} />
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
    </div>
  )
}
