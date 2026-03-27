'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import ConfirmModal from '@/components/ConfirmModal'
import MentionInput from '@/components/MentionInput'
import TaskFormModal from '@/components/TaskFormModal'
import AssigneeTaskModal from '@/components/AssigneeTaskModal'
import ApproverTaskModal from '@/components/ApproverTaskModal'
import CreatorTaskModal from '@/components/CreatorTaskModal'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import RecurringTrackModal from '@/components/templates/RecurringTrackModal'
import WorkerRecurringTaskModal from '@/components/templates/WorkerRecurringTaskModal'
import PageGuard from '@/components/PageGuard'

// FocusFlow branding rəngləri
const P = { CRITICAL: '#7C3AED', HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', INFO: '#64748B' }
const PrioFlag = ({ color, size = 14 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
)
const S: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Yaradıldı', color: '#64748B', bg: '#F1F5F9' },
  PENDING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS: { label: 'Davam edir', color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
  PENDING_APPROVAL: { label: 'Onay gözləyir', color: '#F59E0B', bg: '#FFFBEB' },
  APPROVED: { label: 'Onaylandı', color: '#10B981', bg: '#ECFDF5' },
  REJECTED: { label: 'Rədd', color: '#EF4444', bg: '#FEF2F2' },
  DECLINED: { label: 'Rədd edildi', color: '#EF4444', bg: '#FEF2F2' },
  FORCE_COMPLETED: { label: 'Bağlandı (donuq)', color: '#94A3B8', bg: '#F1F5F9' },
}

function daysDiff(d: string) {
  const now = new Date(); now.setHours(0,0,0,0)
  const due = new Date(d); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

// Zaman qrupları — kəskin rənglər
const timeGroups = [
  { key: 'overdue', label: 'Gecikmiş', color: '#DC4C3E', bg: '#FDECEA', icon: '🔴', filter: (d: number) => d < 0 },
  { key: 'today', label: 'Bugün', color: '#EB8909', bg: '#FFF3E0', icon: '🟠', filter: (d: number) => d === 0 },
  { key: '3days', label: '3 gün ərzində', color: '#F59E0B', bg: '#FFFBEB', icon: '🟡', filter: (d: number) => d >= 1 && d <= 3 },
  { key: '5days', label: '5 gün ərzində', color: '#246FE0', bg: '#E8F0FE', icon: '🔵', filter: (d: number) => d >= 4 && d <= 5 },
  { key: '1week', label: '1 həftə ərzində', color: '#6366F1', bg: '#EEF2FF', icon: '🟣', filter: (d: number) => d >= 6 && d <= 7 },
  { key: 'long', label: 'Uzun müddətli', color: '#808080', bg: '#F5F5F5', icon: '⬜', filter: (d: number) => d > 7 },
  { key: 'nodate', label: 'Tarixsiz', color: '#B3B3B3', bg: '#FAFAFA', icon: '⚪', filter: (_: number) => false },
]

export default function TasksPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const openTaskId = searchParams.get('openTask')
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtrlər
  const [selectedBiz, setSelectedBiz] = useState<string>('ALL')
  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')
  const [activeTimeGroup, setActiveTimeGroup] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const todayDate = new Date().toISOString().split('T')[0]
  const emptyTask = {
    title: '', description: '', type: 'TASK' as 'TASK' | 'GOREV',
    priority: 'MEDIUM', dueDate: todayDate, responsibleId: '',
    departmentIds: [] as string[], businessIds: [] as string[],
    assigneeIds: [] as string[],
    subTasks: [] as { title: string; assigneeIds: string[]; approverId: string; dueDate: string; files: File[] }[],
    files: [] as File[],
  }
  const [newTask, setNewTask] = useState({ ...emptyTask })
  const [addLoading, setAddLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; confirmText: string; onConfirm: () => void }>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })
  const [assigneeModal, setAssigneeModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [approverModal, setApproverModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [creatorModal, setCreatorModal] = useState<{ open: boolean; task: any; subTask: any }>({ open: false, task: null, subTask: null })
  const [groupViewModal, setGroupViewModal] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null })
  const [recurringTrackModal, setRecurringTrackModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })
  const [workerRecurringModal, setWorkerRecurringModal] = useState<{ open: boolean; task: any }>({ open: false, task: null })
  const groupViewTasks = groupViewModal.groupId ? tasks.filter((t: any) => t.groupId === groupViewModal.groupId) : []

  const [todoQuickAddOpen, setTodoQuickAddOpen] = useState(false)
  const [todoProjects, setTodoProjects] = useState<any[]>([])
  const [todoLabels, setTodoLabels] = useState<any[]>([])

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
    Promise.all([api.getTasks().catch(() => []), api.getUsers().catch(() => []), api.getDepartments().catch(() => []), api.getTodoistProjects().catch(() => []), api.getTodoistLabels().catch(() => []), api.getAssignableUsers().catch(() => [])])
      .then(([t, u, d, projects, lbls, assignable]) => {
        setTasks(t); setUsers(u); setDepartments(d); setTodoProjects(projects); setTodoLabels(lbls); setAssignableUsers(assignable)
        // URL-dən openTask parametri varsa, həmin tapşırığın modalını aç
        if (openTaskId) {
          setTimeout(() => {
            const found = t.find((tk: any) => tk.id === openTaskId)
            if (found) handleTaskClick(found)
          }, 300)
        }
      })
      .catch(() => {}).finally(() => setLoading(false))
  }

  // Task kartına basanda — routing məntiqi
  function handleTaskClick(task: any) {
    // Təkrarlanan görevdən dispatch olunmuşsa
    if (task.sourceTemplateId && user) {
      const isCreator = task.creatorId === user.id
      if (isCreator) {
        setRecurringTrackModal({ open: true, task })
      } else {
        setWorkerRecurringModal({ open: true, task })
      }
      return
    }
    // TASK tipi + groupId varsa
    if (task.type === 'TASK' && task.groupId && user) {
      // İşçi (assignee) → AssigneeTaskModal (status dəyiş, not yaz)
      const isAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
      if (isAssignee && task.creatorId !== user.id) {
        setAssigneeModal({ open: true, task, subTask: null })
        return
      }
      // Yaradan → ApproverTaskModal (isCreator mode) — bütün group assignee-lərini birləşdir
      if (task.creatorId === user.id) {
        const groupTasks = tasks.filter((t: any) => t.groupId === task.groupId)
        // Virtual task: bütün group-un assignee-lərini birləşdir
        const mergedAssignees = groupTasks.flatMap((t: any) =>
          (t.assignees || []).map((a: any) => ({ ...a, _taskId: t.id, _taskTitle: t.description || t.title }))
        )
        const virtualTask = { ...task, assignees: mergedAssignees, _groupTasks: groupTasks }
        setApproverModal({ open: true, task: virtualTask, subTask: null })
        return
      }
      setGroupViewModal({ open: true, groupId: task.groupId })
      return
    }
    if (task.type === 'GOREV' && user) {
      // Yol 2: Sub-tasklar var
      if (task.subTasks?.length > 0) {
        // 1. Yetkili kişi (sub-task approverId) → ApproverTaskModal
        for (const sub of task.subTasks) {
          if (sub.approverId === user.id) {
            setApproverModal({ open: true, task, subTask: sub })
            return
          }
        }
        // 2. Assignee (sub-task) → AssigneeTaskModal
        for (const sub of task.subTasks) {
          const isAssignee = sub.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
          if (isAssignee) {
            setAssigneeModal({ open: true, task, subTask: sub })
            return
          }
        }
      }

      // Yol 1: Üst-səviyyə approverId + assignees (description @mention ilə)
      if (task.approverId) {
        // Yetkili kişi → ApproverTaskModal (subTask=null)
        if (task.approverId === user.id) {
          setApproverModal({ open: true, task, subTask: null })
          return
        }
        // Assignee → AssigneeTaskModal (subTask=null)
        const isAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
        if (isAssignee) {
          setAssigneeModal({ open: true, task, subTask: null })
          return
        }
      }

      // 3. Üst-səviyyə assignee (approverId olmadan, @mention ilə əlavə edilən)
      const isDirectAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user.id)
      if (isDirectAssignee && task.creatorId !== user.id) {
        setAssigneeModal({ open: true, task, subTask: null })
        return
      }

      // 4. Yaradan → CreatorTaskModal
      if (task.creatorId === user.id) {
        setCreatorModal({ open: true, task, subTask: task.subTasks?.[0] || null })
        return
      }
    }
    // Normal tapşırıq və ya digər hallar — əgər assignee-dirsə yalnız oxu modalı
    const isAnyAssignee = task.assignees?.some((a: any) => (a.user?.id || a.userId) === user?.id)
      || task.subTasks?.some((st: any) => st.assignees?.some((a: any) => (a.user?.id || a.userId) === user?.id))
    if (isAnyAssignee && task.creatorId !== user?.id) {
      setAssigneeModal({ open: true, task, subTask: null })
      return
    }
    // Yaradıcı — edit modalı aça bilər
    if (task.creatorId === user?.id) {
      openEditModal(task)
      return
    }
    // Digər — read-only (assignee modal)
    setAssigneeModal({ open: true, task, subTask: null })
  }

  function openEditModal(task: any) {
    setEditingTask(task)
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      type: task.type || 'TASK',
      priority: task.priority || 'MEDIUM',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : todayDate,
      responsibleId: '',
      departmentIds: task.department ? [task.department.id] : [],
      businessIds: task.business ? [task.business.id] : [],
      assigneeIds: task.assignees?.map((a: any) => a.user.id) || [],
      subTasks: task.subTasks?.map((s: any) => ({
        title: s.title || '',
        assigneeIds: s.assignees?.map((a: any) => a.user.id) || [],
        approverId: s.approverId || '',
        dueDate: s.dueDate ? new Date(s.dueDate).toISOString().split('T')[0] : '',
        files: [] as File[],
      })) || [],
      files: [],
    })
    setAddOpen(true)
  }

  function openCreateModal() {
    setEditingTask(null)
    setNewTask({ ...emptyTask })
    setAddOpen(true)
  }

  function handleDeleteTask() {
    if (!editingTask) return
    setConfirmModal({
      open: true, type: 'danger',
      title: 'Tapşırığı sil',
      message: `"${editingTask.title}" tapşırığı silinəcək. Bu əməliyyat geri qaytarıla bilməz.`,
      confirmText: 'Sil',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        setDeleteLoading(true)
        try {
          await api.deleteTask(editingTask.id)
          setAddOpen(false)
          setEditingTask(null)
          setNewTask({ ...emptyTask })
          loadData()
        } catch (err: any) { alert(err.message) }
        finally { setDeleteLoading(false) }
      }
    })
  }

  async function doSaveTask(taskData: typeof newTask) {
    // Alt-görevlər üçün validasiya
    const activeSubs = taskData.subTasks.filter(s => s.title.trim())
    if (activeSubs.length > 0) {
      const subsNoDate = activeSubs.filter(s => !s.dueDate && !taskData.dueDate)
      if (subsNoDate.length > 0) {
        setConfirmModal({
          open: true, type: 'warning',
          title: 'Tarix tələb olunur',
          message: `${subsNoDate.map(s => `"${s.title}"`).join(', ')} alt-görev(lər)ində tarix yoxdur. Əsas tapşırığa da tarix atanmayıb. Zəhmət olmasa tarix seçin.`,
          confirmText: 'Tamam',
          onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false }))
        })
        return
      }
      const subsNoPerson = activeSubs.filter(s => s.assigneeIds.length === 0)
      if (subsNoPerson.length > 0) {
        setConfirmModal({
          open: true, type: 'warning',
          title: 'Kişi tələb olunur',
          message: `${subsNoPerson.map(s => `"${s.title}"`).join(', ')} alt-görev(lər)ində heç bir kişi seçilməyib. Zəhmət olmasa kişi seçin.`,
          confirmText: 'Tamam',
          onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false }))
        })
        return
      }
    }

    setAddLoading(true)
    try {
      let finalSubTasks = taskData.subTasks
      const subsWithoutDate = finalSubTasks.filter(s => s.title.trim() && !s.dueDate)
      if (subsWithoutDate.length > 0 && taskData.dueDate) {
        finalSubTasks = finalSubTasks.map(s => s.title.trim() && !s.dueDate ? { ...s, dueDate: taskData.dueDate } : s)
      }

      const payload = {
        title: taskData.title,
        description: taskData.description || undefined,
        type: taskData.type,
        priority: taskData.priority,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined,
        departmentId: taskData.departmentIds[0] || undefined,
        businessId: taskData.businessIds[0] || undefined,
        assigneeIds: [...new Set([...(taskData.responsibleId ? [taskData.responsibleId] : []), ...taskData.assigneeIds])],
        subTasks: finalSubTasks.filter(s => s.title.trim()),
      }

      let result: any
      if (editingTask) {
        result = await api.updateTask(editingTask.id, payload)
      } else {
        result = await api.createTask(payload)
      }
      if (taskData.files.length > 0 && result?.id) {
        for (const file of taskData.files) {
          await api.uploadFile(file, result.id)
        }
      }
      setAddOpen(false)
      setEditingTask(null)
      setNewTask({ ...emptyTask })
      loadData()
    } catch (err: any) { alert(err.message) }
    finally { setAddLoading(false) }
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.title.trim()) return

    // GOREV validasiyası
    if (newTask.type === 'GOREV') {
      if (newTask.businessIds.length === 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'Filial seçilməyib', message: 'Toplu tapşırıq üçün ən az 1 filial seçməlisiniz.', confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
      const validSubs = newTask.subTasks.filter(s => s.title.trim())
      if (validSubs.length === 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'Alt-görev yoxdur', message: 'Toplu tapşırıqda ən az 1 alt-görev olmalıdır.', confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
      const subsWithoutPeople = validSubs.filter(s => s.assigneeIds.length === 0)
      if (subsWithoutPeople.length > 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'İşçi atanmayıb', message: `${subsWithoutPeople.length} alt-görevdə işçi seçilməyib. Hər alt-görevə ən az 1 işçi atanmalıdır.`, confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
    }

    if (editingTask) {
      const subsWithoutDate = newTask.subTasks.filter(s => s.title.trim() && !s.dueDate)
      const hasSubDateIssue = subsWithoutDate.length > 0 && newTask.dueDate

      setConfirmModal({
        open: true, type: 'info',
        title: 'Dəyişiklikləri yadda saxla',
        message: `"${newTask.title}" tapşırığında dəyişikliklər yadda saxlanılsın?${hasSubDateIssue ? ` ${subsWithoutDate.length} alt-görevdə tarix yoxdur — əsas tarix istifadə ediləcək.` : ''}`,
        confirmText: 'Yadda saxla',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, open: false }))
          doSaveTask(newTask)
        }
      })
    } else {
      const subsWithoutDate = newTask.subTasks.filter(s => s.title.trim() && !s.dueDate)
      if (subsWithoutDate.length > 0 && newTask.dueDate) {
        const names = subsWithoutDate.map((s, i) => `${i + 1}. ${s.title || '(adsız)'}`).join(', ')
        setConfirmModal({
          open: true, type: 'warning',
          title: 'Tarixsiz alt-görevlər',
          message: `Bu alt-görevlərdə tarix seçilməyib: ${names}. Görevin tarixini (${newTask.dueDate}) əlavə edək mi?`,
          confirmText: 'Bəli, əlavə et',
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, open: false }))
            const updated = { ...newTask, subTasks: newTask.subTasks.map(s => s.title.trim() && !s.dueDate ? { ...s, dueDate: newTask.dueDate } : s) }
            doSaveTask(updated)
          }
        })
      } else {
        doSaveTask(newTask)
      }
    }
  }

  function toggleAssignee(userId: string) {
    setNewTask(prev => ({ ...prev, assigneeIds: prev.assigneeIds.includes(userId) ? prev.assigneeIds.filter(id => id !== userId) : [...prev.assigneeIds, userId] }))
  }
  function toggleBiz(bizId: string) {
    setNewTask(prev => ({ ...prev, businessIds: prev.businessIds.includes(bizId) ? prev.businessIds.filter(id => id !== bizId) : [...prev.businessIds, bizId] }))
  }
  function toggleDept(deptId: string) {
    setNewTask(prev => ({ ...prev, departmentIds: prev.departmentIds.includes(deptId) ? prev.departmentIds.filter(id => id !== deptId) : [...prev.departmentIds, deptId] }))
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setNewTask(prev => ({ ...prev, files: [...prev.files, ...Array.from(e.target.files!)] }))
  }
  function removeFile(i: number) {
    setNewTask(prev => ({ ...prev, files: prev.files.filter((_, idx) => idx !== i) }))
  }

  function addSubTask() {
    setNewTask(prev => ({ ...prev, subTasks: [...prev.subTasks, { title: '', assigneeIds: [], approverId: '', dueDate: '', files: [] }] }))
  }

  function updateSubTask(i: number, field: string, value: string) {
    setNewTask(prev => {
      const subs = [...prev.subTasks]; subs[i] = { ...subs[i], [field]: value }; return { ...prev, subTasks: subs }
    })
  }

  function toggleSubAssignee(subIdx: number, userId: string) {
    setNewTask(prev => {
      const subs = [...prev.subTasks]
      const cur = subs[subIdx].assigneeIds
      subs[subIdx] = { ...subs[subIdx], assigneeIds: cur.includes(userId) ? cur.filter(id => id !== userId) : [...cur, userId] }
      return { ...prev, subTasks: subs }
    })
  }
  function removeSubTask(i: number) {
    setNewTask(prev => ({ ...prev, subTasks: prev.subTasks.filter((_, idx) => idx !== i) }))
  }
  function addSubTaskFile(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    setNewTask(prev => {
      const subs = [...prev.subTasks]
      subs[i] = { ...subs[i], files: [...subs[i].files, ...Array.from(e.target.files!)] }
      return { ...prev, subTasks: subs }
    })
  }
  // Düzənləmə zamanı tarix: əsli saxlanır, dəyişdirsə yalnız bugün+ seçə bilər
  const originalDate = editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''
  function handleDateChange(newDate: string) {
    if (editingTask && newDate < todayDate && newDate !== originalDate) {
      alert('Yalnız bugün və ya gələcək tarix seçə bilərsiniz!')
      return
    }
    setNewTask(prev => ({ ...prev, dueDate: newDate }))
  }
  function handleSubDateChange(i: number, newDate: string) {
    if (editingTask && newDate < todayDate) {
      alert('Yalnız bugün və ya gələcək tarix seçə bilərsiniz!')
      return
    }
    updateSubTask(i, 'dueDate', newDate)
  }

  function removeSubTaskFile(subIdx: number, fileIdx: number) {
    setNewTask(prev => {
      const subs = [...prev.subTasks]
      subs[subIdx] = { ...subs[subIdx], files: subs[subIdx].files.filter((_, j) => j !== fileIdx) }
      return { ...prev, subTasks: subs }
    })
  }

  // İşletmələr
  const businesses = useMemo(() => {
    const bizMap = new Map<string, string>()
    // Tasks-dan
    tasks.forEach(t => { if (t.business) bizMap.set(t.business.id, t.business.name) })
    // Users-dan (əsas mənbə)
    users.forEach((u: any) => {
      u.businesses?.forEach((ub: any) => {
        const b = ub.business || ub
        if (b?.id && b?.name) bizMap.set(b.id, b.name)
      })
    })
    return Array.from(bizMap, ([id, name]) => ({ id, name }))
  }, [tasks, users])

  // Hər task-a istifadəçinin öz assignee statusunu əlavə et
  const tasksWithMyStatus = useMemo(() => {
    if (!user?.id) return tasks
    return tasks.map(t => {
      // Alt-görevlər daxil bütün assignee-lər arasında özümü tap
      const myAssignee = t.assignees?.find((a: any) => a.user?.id === user.id)
        || t.subTasks?.flatMap((st: any) => st.assignees || []).find((a: any) => a.user?.id === user.id)
      const isCreator = t.creatorId === user.id
      let myStatus = myAssignee?.status || t.status
      // Yaradan üçün: yetkili tamamladı amma yaradan onaylamayıb → "Onay gözləyir"
      if (isCreator && t.finalized && !t.creatorApproved) {
        myStatus = 'PENDING_APPROVAL'
      }
      return { ...t, myStatus, isCreator }
    })
  }, [tasks, user?.id])

  // Filtr tətbiqi — istifadəçinin öz statusuna görə
  const filtered = useMemo(() => {
    return tasksWithMyStatus.filter(t => {
      if (selectedBiz !== 'ALL' && t.business?.id !== selectedBiz) return false
      if (selectedUser !== 'ALL' && !t.assignees?.some((a: any) => a.user.id === selectedUser)) return false
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false
      // İstifadəçinin öz statusuna görə filtr
      const status = t.myStatus
      if (selectedStatus === 'COMPLETED') {
        if (!['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(status)) return false
      } else if (selectedStatus === 'PENDING') {
        if (!['PENDING', 'CREATED'].includes(status)) return false
      } else if (selectedStatus === 'REJECTED') {
        if (!['REJECTED', 'DECLINED'].includes(status)) return false
      } else if (selectedStatus === 'IN_PROGRESS') {
        if (status !== 'IN_PROGRESS') return false
      } else if (selectedStatus === 'PENDING_APPROVAL') {
        if (status !== 'PENDING_APPROVAL') return false
      } else {
        if (status !== selectedStatus) return false
      }
      return true
    })
  }, [tasksWithMyStatus, selectedBiz, selectedUser, selectedPriority, selectedStatus])

  // groupId deduplikasiya — eyni groupId olan taskları bir kart olaraq göstər
  const displayTasks = useMemo(() => {
    const seenGroups = new Set<string>()
    const result: any[] = []
    for (const t of filtered) {
      if (t.groupId) {
        if (seenGroups.has(t.groupId)) continue
        seenGroups.add(t.groupId)
        // Qrup üçün bütün taskları tap
        const groupTasks = filtered.filter((x: any) => x.groupId === t.groupId)
        result.push({ ...t, _groupTasks: groupTasks, _groupCount: groupTasks.length })
      } else {
        result.push(t)
      }
    }
    return result
  }, [filtered])

  // Bugündə zaman qrupları lazım deyil — düz siyahı
  const grouped = useMemo(() => {
    const result: Record<string, any[]> = {}
    timeGroups.forEach(g => { result[g.key] = [] })
    result['today'] = displayTasks
    return result
  }, [displayTasks])

  // Statistika
  const stats = useMemo(() => ({
    total: filtered.length,
    overdue: grouped['overdue']?.length || 0,
    today: grouped['today']?.length || 0,
    pending: filtered.filter(t => t.status === 'PENDING_APPROVAL').length,
    inProgress: filtered.filter(t => t.status === 'IN_PROGRESS').length,
    completed: filtered.filter(t => ['COMPLETED', 'APPROVED'].includes(t.status)).length,
  }), [filtered, grouped])

  const todayStr = new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })

  if (loading) return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-6 w-6" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>

  return (
    <PageGuard requires={['tasks.read']}>
    <div className="pb-10">
      {/* Başlıq */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Tapşırıqlar</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Bütün tapşırıqlar — {filtered.length} ədəd</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: 'var(--todoist-red)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Tapşırıq əlavə et
        </button>
      </div>

      {/* ───── STATUS TAB FİLTRLƏRİ ───── */}
      <div className="flex gap-0 mb-3 border-b-2 border-[var(--todoist-divider)] overflow-x-auto">
        {[
          { key: 'PENDING', label: 'Gözləyir', dot: '#64748B' },
          { key: 'IN_PROGRESS', label: 'Davam edir', dot: '#3B82F6' },
          { key: 'PENDING_APPROVAL', label: 'Onay gözləyir', dot: '#F59E0B' },
          { key: 'COMPLETED', label: 'Tamamlandı', dot: '#10B981' },
          { key: 'REJECTED', label: 'Rədd', dot: '#EF4444' },
        ].map(tab => {
          const allWithMyStatus = tasksWithMyStatus.filter(t => {
            if (selectedBiz !== 'ALL' && t.business?.id !== selectedBiz) return false
            if (selectedUser !== 'ALL' && !t.assignees?.some((a: any) => a.user.id === selectedUser)) return false
            if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false
            return true
          })
          const count = tab.key === 'COMPLETED' ? allWithMyStatus.filter(t => ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(t.myStatus)).length
            : tab.key === 'PENDING' ? allWithMyStatus.filter(t => ['PENDING', 'CREATED'].includes(t.myStatus)).length
            : tab.key === 'REJECTED' ? allWithMyStatus.filter(t => ['REJECTED', 'DECLINED'].includes(t.myStatus)).length
            : allWithMyStatus.filter(t => t.myStatus === tab.key).length
          return (
            <button key={tab.key} onClick={() => setSelectedStatus(tab.key)}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5 whitespace-nowrap
                ${selectedStatus === tab.key ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
              {tab.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tab.dot }} />}
              {tab.label}
              <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${selectedStatus === tab.key ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* ───── CHİP FİLTRLƏR (filial + prioritet + işçi) ───── */}
      <div className="flex gap-1.5 mb-5 flex-wrap items-center">
        {/* Filial chips */}
        <button onClick={() => setSelectedBiz('ALL')}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border-[1.5px]"
          style={{ backgroundColor: selectedBiz === 'ALL' ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: selectedBiz === 'ALL' ? 'var(--todoist-surface)' : 'var(--todoist-text)', borderColor: selectedBiz === 'ALL' ? 'var(--todoist-red)' : 'var(--todoist-divider)' }}>
          Bütün filiallar
        </button>
        {businesses.map(b => (
          <button key={b.id} onClick={() => setSelectedBiz(b.id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition border-[1.5px]"
            style={{ backgroundColor: selectedBiz === b.id ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: selectedBiz === b.id ? 'var(--todoist-surface)' : 'var(--todoist-text)', borderColor: selectedBiz === b.id ? 'var(--todoist-red)' : 'var(--todoist-divider)' }}>
            {b.name}
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--todoist-divider)] mx-1" />

        {/* Prioritet chips */}
        {[
          { key: 'ALL', label: 'Hamısı', dot: '#94A3B8' },
          { key: 'CRITICAL', label: 'Kritik', dot: '#7C3AED' },
          { key: 'HIGH', label: 'Yüksək', dot: '#EF4444' },
          { key: 'MEDIUM', label: 'Orta', dot: '#F59E0B' },
          { key: 'LOW', label: 'Aşağı', dot: '#10B981' },
        ].map(p => (
          <button key={p.key} onClick={() => setSelectedPriority(p.key)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition border-[1.5px] flex items-center gap-1.5"
            style={{ backgroundColor: selectedPriority === p.key ? '#4F46E5' : 'var(--todoist-surface)', color: selectedPriority === p.key ? '#fff' : 'var(--todoist-text)', borderColor: selectedPriority === p.key ? '#4F46E5' : 'var(--todoist-divider)' }}>
            {p.key !== 'ALL' ? <PrioFlag color={selectedPriority === p.key ? '#fff' : p.dot} size={12} /> : selectedPriority !== p.key && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.dot }} />}
            {p.label}
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--todoist-divider)] mx-1" />

        {/* İşçi dropdown */}
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold outline-none cursor-pointer border-[1.5px] border-[var(--todoist-divider)] bg-white text-[var(--todoist-text)]">
          <option value="ALL">👤 Bütün işçilər</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>

        {(selectedBiz !== 'ALL' || selectedUser !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'PENDING') && (
          <button onClick={() => { setSelectedBiz('ALL'); setSelectedUser('ALL'); setSelectedPriority('ALL'); setSelectedStatus('PENDING') }}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] border-[var(--todoist-red-light)]"
            style={{ color: 'var(--todoist-red)', backgroundColor: 'var(--todoist-red-light)' }}>
            ✕ Sıfırla
          </button>
        )}
      </div>

      {/* ───── TAPŞIRIQ KARTLARI — 4-lü grid ───── */}
      {displayTasks.length > 0 && (
        <div className="mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {displayTasks.map((task: any) => {
                const pColor = P[task.priority as keyof typeof P] || '#808080'
                // İstifadəçinin öz statusu (myStatus) — yaradıcıda görevin ümumi statusu
                const effectiveStatus = task.myStatus || task.status
                const sConfig = S[effectiveStatus] || S.CREATED
                const diff = task.dueDate ? daysDiff(task.dueDate) : null
                const done = ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(effectiveStatus)
                const timeText = diff !== null ? (diff < 0 ? `${Math.abs(diff)} gün gecikmiş` : diff === 0 ? 'Bugün' : `${diff} gün qalıb`) : ''
                const timeColor = diff !== null && diff < 0 ? '#EF4444' : diff === 0 ? '#F59E0B' : '#64748B'
                const isGroup = !!task._groupCount && task._groupCount > 1

                return (
                  <div key={task.id} onClick={() => handleTaskClick(task)} className="rounded-xl hover:shadow-md transition cursor-pointer overflow-hidden"
                    style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-border)' }}>

                    {/* Üst rəng xətti */}
                    <div style={{ height: 3, backgroundColor: pColor }} />

                    {/* Yaradıcı/Approver badge */}
                    {task.isCreator && (
                      <div className="px-3 pt-1.5 flex items-center gap-1">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>Yaradıcı</span>
                        {task.status !== effectiveStatus && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ backgroundColor: S[task.status]?.bg || '#F0F0F0', color: S[task.status]?.color || '#808080' }}>Görev: {S[task.status]?.label || task.status}</span>}
                      </div>
                    )}

                    {/* Görev ismi + bayrak + qrup badge */}
                    <div className={`px-3 ${task.isCreator ? 'pt-1' : 'pt-2.5'} pb-2 flex items-start justify-between gap-2`}>
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <div className="shrink-0 mt-0.5"><PrioFlag color={pColor} size={14} /></div>
                        <p className={`text-[13px] font-semibold leading-snug`}
                          style={{ color: done ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)' }}>
                          {task.title}
                        </p>
                      </div>
                      {task.sourceTemplateId && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                          🔁 Təkrarlanan
                        </span>
                      )}
                      {isGroup && !task.sourceTemplateId && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                          {task._groupCount} nəfər
                        </span>
                      )}
                    </div>

                    {/* Etiketlər + Layihə */}
                    {(task.labels?.length > 0 || task.project) && (
                      <div className="px-3 pb-1 flex items-center gap-1 flex-wrap">
                        {task.project && (
                          <span className="text-[8px] font-semibold px-1.5 py-px rounded" style={{ backgroundColor: (task.project.color || '#808080') + '18', color: task.project.color || '#808080' }}>
                            📂 {task.project.name}
                          </span>
                        )}
                        {task.labels?.map((tl: any) => (
                          <span key={tl.label?.id || tl.id} className="text-[8px] font-semibold px-1.5 py-px rounded-full" style={{ backgroundColor: ((tl.label?.color || tl.color || '#808080') + '20'), color: tl.label?.color || tl.color || '#808080' }}>
                            {tl.label?.name || tl.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Kişi + filial */}
                    <div className="px-3 pb-2 flex items-center gap-2">
                      {isGroup ? (
                        <div className="flex items-center gap-1">
                          {task._groupTasks.slice(0, 3).map((gt: any, i: number) => (
                            <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: pColor + '18', color: pColor, marginLeft: i > 0 ? -4 : 0 }}>
                              {gt.assignees?.[0]?.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </div>
                          ))}
                          {task._groupCount > 3 && (
                            <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--todoist-text-secondary)' }}>+{task._groupCount - 3}</span>
                          )}
                        </div>
                      ) : task.assignees?.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                            style={{ backgroundColor: pColor + '18', color: pColor }}>
                            {task.assignees[0].user.fullName.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-[11px]" style={{ color: 'var(--todoist-text)' }}>
                            {task.assignees[0].user.fullName}{task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
                          </span>
                        </div>
                      ) : null}
                      {task.business && (
                        <>
                          <span style={{ color: 'var(--todoist-divider)' }}>·</span>
                          <span className="text-[10px] font-medium" style={{ color: '#7C3AED' }}>{task.business.name}</span>
                        </>
                      )}
                    </div>

                    {/* Durum + gün sayısı */}
                    <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
                      {isGroup ? (() => {
                        const completed = task._groupTasks.filter((gt: any) => gt.assignees?.[0]?.status === 'COMPLETED' || gt.status === 'COMPLETED' || gt.status === 'APPROVED').length
                        const total = task._groupCount
                        const pct = total > 0 ? (completed / total) * 100 : 0
                        return (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E8E8' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#058527' : '#246FE0' }} />
                            </div>
                            <span className="text-[10px] font-bold shrink-0" style={{ color: pct === 100 ? '#058527' : '#246FE0' }}>
                              {completed}/{total}
                            </span>
                          </div>
                        )
                      })() : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: sConfig.bg, color: sConfig.color }}>
                          {sConfig.label}
                        </span>
                      )}
                      {timeText && (
                        <span className="text-[10px] font-bold" style={{ color: timeColor }}>
                          {timeText}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
        </div>
      )}

      {/* Boş state */}
      {displayTasks.length === 0 && (
        <div className="text-center mt-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--todoist-red-light)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Tapşırıq tapılmadı!</h3>
          <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Bu filtrə uyğun tapşırıq yoxdur</p>
        </div>
      )}

      {/* ───── TAPŞIRIQ ƏLAVƏ / DÜZƏNLƏ MODAL ───── */}
      <TaskFormModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingTask(null) }}
        onSaved={() => { setAddOpen(false); setEditingTask(null); loadData() }}
        editingTask={editingTask}
        users={assignableUsers.length > 0 ? assignableUsers : users}
        departments={departments}
        businesses={businesses}
      />

      {/* ───── QRUP GÖRÜNTÜLƏMƏ MODALI ───── */}
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

      {false && addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => { setAddOpen(false); setEditingTask(null) }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, backgroundColor: editingTask ? (P[newTask.priority as keyof typeof P] || '#808080') : 'var(--todoist-red)' }} />

            <form onSubmit={handleAddTask} className="p-5 space-y-3">
              {/* ── ÜST: Tip + Tarix + Önəmlilik ── */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-md overflow-hidden shrink-0" style={{ border: '1px solid var(--todoist-divider)', opacity: editingTask ? 0.6 : 1 }}>
                  {[{ v: 'TASK', l: '📋 Tapşırıq' }, { v: 'GOREV', l: '👥 Toplu Tapşırıq' }].map(t => (
                    <button key={t.v} type="button" onClick={() => !editingTask && setNewTask({...newTask, type: t.v as any})}
                      className="px-2.5 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: newTask.type === t.v ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: newTask.type === t.v ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)', cursor: editingTask ? 'not-allowed' : 'pointer' }}>{t.l}</button>
                  ))}
                </div>
                <input type="date" value={newTask.dueDate} min={editingTask ? undefined : todayDate} onChange={e => handleDateChange(e.target.value)}
                  className="rounded-md px-2 py-1 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-sidebar-hover)', border: '1px solid var(--todoist-divider)', color: '#058527' }} />
                <div className="flex gap-0.5">
                  {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setNewTask({...newTask, priority: p})}
                      className="rounded-md px-2 py-1 text-[9px] font-bold"
                      style={{ backgroundColor: newTask.priority === p ? P[p] : 'var(--todoist-sidebar-hover)', color: newTask.priority === p ? 'var(--todoist-surface)' : P[p] }}>
                      {p === 'CRITICAL' ? '🔴 Kritik' : p === 'HIGH' ? '🟠 Yüksək' : p === 'MEDIUM' ? '🔵 Orta' : '⚪ Aşağı'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── BAŞLIQ + TƏSVİR ── */}
              <input type="text" autoFocus value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                placeholder="Tapşırıq adı..." className="w-full text-[15px] font-semibold outline-none" style={{ color: 'var(--todoist-text)' }} />
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--todoist-sidebar-hover)', minHeight: '48px' }}>
                <MentionInput
                  value={newTask.description}
                  onChange={v => setNewTask({...newTask, description: v})}
                  users={newTask.type === 'GOREV' ? (newTask.businessIds.length > 0 ? users.filter((u: any) => u.businesses?.some((ub: any) => newTask.businessIds.includes(ub.business?.id || ub.businessId))) : users) : users}
                  selectedIds={newTask.assigneeIds}
                  onToggleUser={id => {
                    setNewTask(prev => ({
                      ...prev,
                      assigneeIds: prev.assigneeIds.includes(id)
                        ? prev.assigneeIds.filter(x => x !== id)
                        : [...prev.assigneeIds, id]
                    }))
                  }}
                  placeholder="Detallı təsvir... (@işçi adı ilə mention edin)"
                  multiline
                />
              </div>

              {/* ── TƏK TAPŞIRIQ: Filial + Şöbə + İşçi (açılır) ── */}
              {newTask.type === 'TASK' && (<>
                <details className="rounded-lg" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                  <summary className="px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between" style={{ color: '#7C3AED' }}>
                    <span>🏢 Filial {newTask.businessIds.length > 0 ? `(${newTask.businessIds.length})` : ''}</span>
                    <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>basın</span>
                  </summary>
                  <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                    <button type="button" onClick={() => setNewTask({...newTask, businessIds: []})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.businessIds.length === 0 ? '#7C3AED' : 'var(--todoist-surface)', color: newTask.businessIds.length === 0 ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)' }}>Hamısı</button>
                    {businesses.map(b => (
                      <button key={b.id} type="button" onClick={() => setNewTask({...newTask, businessIds: [b.id]})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.businessIds.includes(b.id) ? '#7C3AED' : 'var(--todoist-surface)', color: newTask.businessIds.includes(b.id) ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                        {b.name}{newTask.businessIds.includes(b.id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                </details>
                <details className="rounded-lg" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                  <summary className="px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between" style={{ color: '#246FE0' }}>
                    <span>🏷️ Şöbə {newTask.departmentIds.length > 0 ? `(${newTask.departmentIds.length})` : ''}</span>
                    <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>basın</span>
                  </summary>
                  <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                    <button type="button" onClick={() => setNewTask({...newTask, departmentIds: []})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.departmentIds.length === 0 ? '#246FE0' : 'var(--todoist-surface)', color: newTask.departmentIds.length === 0 ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)' }}>Hamısı</button>
                    {departments.map((d: any) => (
                      <button key={d.id} type="button" onClick={() => setNewTask({...newTask, departmentIds: [d.id]})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.departmentIds.includes(d.id) ? d.color : 'var(--todoist-surface)', color: newTask.departmentIds.includes(d.id) ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                        {d.name}{newTask.departmentIds.includes(d.id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                </details>
                <details className="rounded-lg" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                  <summary className="px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between" style={{ color: '#058527' }}>
                    <span>👤 İşçi {newTask.assigneeIds.length > 0 ? `(1)` : ''}</span>
                    <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>basın</span>
                  </summary>
                  <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                    {users.filter(u => {
                      if (newTask.businessIds.length === 0) return true
                      return u.businesses?.some((b: any) => newTask.businessIds.includes(b.business?.id || b.businessId))
                    }).map(u => {
                      const sel = newTask.assigneeIds[0] === u.id
                      return (
                        <button key={u.id} type="button" onClick={() => setNewTask({...newTask, assigneeIds: sel ? [] : [u.id]})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: sel ? '#058527' : 'var(--todoist-surface)', color: sel ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                          {u.fullName.split(' ')[0]}{sel && ' ✓'}
                        </button>
                      )
                    })}
                  </div>
                </details>
              </>)}

              {/* ── TOPLU TAPŞIRIQ ── */}
              {newTask.type === 'GOREV' && (<>

              {/* ── 1. FİLİAL (əvvəlcə seçilir) ── */}
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                <div className="text-[11px] font-bold mb-2" style={{ color: '#7C3AED' }}>🏢 Filial seçin {newTask.businessIds.length > 0 ? `(${newTask.businessIds.length})` : ''}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => setNewTask({...newTask, businessIds: []})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.businessIds.length === 0 ? '#7C3AED' : 'var(--todoist-surface)', color: newTask.businessIds.length === 0 ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)' }}>Hamısı</button>
                  {businesses.map(b => (
                    <button key={b.id} type="button" onClick={() => toggleBiz(b.id)} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.businessIds.includes(b.id) ? '#7C3AED' : 'var(--todoist-surface)', color: newTask.businessIds.includes(b.id) ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                      {b.name}{newTask.businessIds.includes(b.id) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 2. ŞÖBƏ ── */}
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                <div className="text-[11px] font-bold mb-2" style={{ color: '#246FE0' }}>🏷️ Şöbə seçin {newTask.departmentIds.length > 0 ? `(${newTask.departmentIds.length})` : ''}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => setNewTask({...newTask, departmentIds: []})} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.departmentIds.length === 0 ? '#246FE0' : 'var(--todoist-surface)', color: newTask.departmentIds.length === 0 ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)' }}>Hamısı</button>
                  {departments.map((d: any) => (
                    <button key={d.id} type="button" onClick={() => toggleDept(d.id)} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: newTask.departmentIds.includes(d.id) ? d.color : 'var(--todoist-surface)', color: newTask.departmentIds.includes(d.id) ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                      {d.name}{newTask.departmentIds.includes(d.id) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 3. ALT-GÖREVLƏR (filial/şöbə seçildikdən sonra) ── */}
              <div className="rounded-lg p-3" style={{ backgroundColor: '#FFF8F0', border: '1px solid #FFE0B2' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: '#EB8909' }}>📝 Alt-görevlər {newTask.subTasks.length > 0 ? `(${newTask.subTasks.length}) — toplu görev` : ''}</span>
                  <button type="button" onClick={addSubTask} className="text-[10px] font-bold" style={{ color: 'var(--todoist-red)' }}>+ Əlavə et</button>
                </div>
                {newTask.businessIds.length === 0 && newTask.subTasks.length === 0 && (
                  <p className="text-[10px] text-center py-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Əvvəlcə filial seçin, sonra alt-görev əlavə edin</p>
                )}
                {newTask.subTasks.map((sub, i) => {
                  // Filial seçiminə görə işçilər filtr olunur
                  const filteredUsers = newTask.businessIds.length > 0
                    ? users.filter(u => (u as any).businesses?.some((b: any) => newTask.businessIds.includes(b.business?.id || b.id)))
                    : users
                  return (
                  <div key={i} className="rounded-md mb-1.5" style={{ backgroundColor: 'var(--todoist-surface)' }}>
                    <div className="flex items-center gap-2 p-1.5">
                      <span className="text-[9px] font-bold w-3" style={{ color: 'var(--todoist-text-tertiary)' }}>{i+1}</span>
                      <MentionInput
                        value={sub.title}
                        onChange={v => updateSubTask(i, 'title', v)}
                        users={filteredUsers}
                        selectedIds={sub.assigneeIds}
                        onToggleUser={uid => toggleSubAssignee(i, uid)}
                        placeholder="Görev adı... (@kişi)"
                      />
                      {/* Yetkili kişi dropdown */}
                      <div className="relative shrink-0">
                        <select
                          value={sub.approverId || ''}
                          onChange={e => updateSubTask(i, 'approverId', e.target.value)}
                          className="text-[9px] outline-none bg-transparent appearance-none cursor-pointer pr-3 w-24 truncate"
                          style={{ color: sub.approverId ? '#7C3AED' : 'var(--todoist-text-tertiary)' }}
                          title="Yetkili kişi seç"
                        >
                          <option value="">👤 Yetkili...</option>
                          {filteredUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.fullName}</option>
                          ))}
                        </select>
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[7px] pointer-events-none" style={{ color: 'var(--todoist-text-tertiary)' }}>▼</span>
                      </div>
                      <input type="date" value={sub.dueDate || ''} min={editingTask ? undefined : todayDate} onChange={e => handleSubDateChange(i, e.target.value)} className="text-[10px] outline-none bg-transparent w-28" style={{ color: sub.dueDate ? '#058527' : 'var(--todoist-text-tertiary)' }} title="Boş = ümumi tarix" />
                      <label className="cursor-pointer" title="Fayl əlavə et">
                        <span className="text-[10px]" style={{ color: 'var(--todoist-text-secondary)' }}>📎</span>
                        <input type="file" multiple className="hidden" onChange={e => addSubTaskFile(i, e)} />
                      </label>
                      <button type="button" onClick={() => removeSubTask(i)} className="text-[10px]" style={{ color: 'var(--todoist-red)' }}>✕</button>
                    </div>
                    {sub.files.length > 0 && (
                      <div className="px-6 pb-1.5 flex gap-1 flex-wrap">
                        {sub.files.map((f, fi) => (
                          <span key={fi} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                            📎 {f.name.length > 15 ? f.name.slice(0, 12) + '...' : f.name}
                            <button type="button" onClick={() => removeSubTaskFile(i, fi)} style={{ color: 'var(--todoist-red)' }}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>

              {/* ── İŞÇİLƏR (açılır, çoxlu) ── */}
              <details className="rounded-lg" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                <summary className="px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between" style={{ color: '#058527' }}>
                  <span>👥 İşçilər {newTask.assigneeIds.length > 0 ? `(${newTask.assigneeIds.length})` : ''}</span>
                  <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>basın</span>
                </summary>
                <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                  {users.filter(u => {
                    // Filial seçilibsə — o filialın işçilərini göstər
                    if (newTask.businessIds.length === 0) return true
                    return u.businesses?.some((b: any) => newTask.businessIds.includes(b.business?.id || b.businessId))
                  }).map(u => {
                    const sel = newTask.assigneeIds.includes(u.id)
                    return (
                      <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: sel ? '#058527' : 'var(--todoist-surface)', color: sel ? 'var(--todoist-surface)' : 'var(--todoist-text)' }}>
                        {u.fullName.split(' ')[0]}{sel && ' ✓'}
                      </button>
                    )
                  })}
                </div>
              </details>
              </>)}

              {/* ── FAYL ── */}
              {newTask.type === 'TASK' && (
                <div>
                  <label className="flex items-center justify-center gap-2 rounded-lg p-2.5 cursor-pointer transition hover:bg-[var(--todoist-divider)]" style={{ backgroundColor: 'var(--todoist-sidebar-hover)', border: '1px dashed #CDCDCD' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>📎 Fayl əlavə et</span>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  {newTask.files.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {newTask.files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1" style={{ backgroundColor: '#E8F0FE' }}>
                          <span className="text-[10px] flex-1 truncate" style={{ color: '#246FE0' }}>{f.name}</span>
                          <span className="text-[8px]" style={{ color: 'var(--todoist-text-secondary)' }}>{(f.size/1024).toFixed(0)}KB</span>
                          <button type="button" onClick={() => removeFile(i)} className="text-[10px]" style={{ color: 'var(--todoist-red)' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── DÜYMƏLƏR ── */}
              <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: 'var(--todoist-border)' }}>
                {editingTask ? (
                  <button type="button" onClick={handleDeleteTask} disabled={deleteLoading}
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
                    style={{ color: 'var(--todoist-red)', backgroundColor: 'var(--todoist-red-light)' }}>
                    {deleteLoading ? 'Silinir...' : '🗑 Sil'}
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAddOpen(false); setEditingTask(null) }} className="rounded-lg px-4 py-2 text-[12px] font-semibold" style={{ color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-sidebar-hover)' }}>Ləğv et</button>
                  <button type="submit" disabled={addLoading || !newTask.title.trim()} className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: 'var(--todoist-red)' }}>
                    {addLoading ? (editingTask ? 'Yenilənir...' : 'Yaradılır...') : editingTask ? 'Yadda saxla' : newTask.type === 'GOREV' ? 'Toplu tapşırıq yarat' : 'Tapşırıq yarat'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── YETKİLİ TAPŞIRIQ MODALI ───── */}
      <ApproverTaskModal
        open={approverModal.open}
        onClose={() => setApproverModal({ open: false, task: null, subTask: null })}
        task={approverModal.task}
        subTask={approverModal.subTask}
        currentUserId={user?.id || ''}
        onRefresh={loadData}
        isCreator={approverModal.task?.creatorId === user?.id && approverModal.task?.approverId !== user?.id}
        onEdit={(task) => { setApproverModal({ open: false, task: null, subTask: null }); setEditingTask(task); setFormOpen(true) }}
        onApprove={async (subTaskId, note) => {
          try {
            await api.approveTask(subTaskId)
            setApproverModal({ open: false, task: null, subTask: null })
            loadData()
          } catch (err: any) {
            alert(err.message || 'Xəta baş verdi')
          }
        }}
      />

      {/* ───── YARADAN TAPŞIRIQ MODALI ───── */}
      <CreatorTaskModal
        open={creatorModal.open}
        onClose={() => setCreatorModal({ open: false, task: null, subTask: null })}
        task={creatorModal.task}
        subTask={creatorModal.subTask}
        onEdit={(t: any) => openEditModal(t)}
        onRefresh={loadData}
      />

      {/* ───── İŞÇİ TAPŞIRIQ MODALI ───── */}
      <AssigneeTaskModal
        open={assigneeModal.open}
        onClose={() => setAssigneeModal({ open: false, task: null, subTask: null })}
        task={assigneeModal.task}
        subTask={assigneeModal.subTask}
        currentUserId={user?.id || ''}
        onRefresh={loadData}
        onStatusChange={async (subTaskId, status, note) => {
          try {
            await api.updateMyTaskStatus(subTaskId, status, note)
            setAssigneeModal({ open: false, task: null, subTask: null })
            loadData()
          } catch (err: any) {
            alert(err.message || 'Xəta baş verdi')
          }
        }}
      />

      {/* ───── ONAYLAMA MODAL ───── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* ───── TODO QUICK ADD ───── */}
      <GlobalQuickAdd open={todoQuickAddOpen} onClose={() => setTodoQuickAddOpen(false)} onAdded={loadData} projects={todoProjects} labels={todoLabels} />

      {/* ───── TƏKRARLANAN GÖREV MODALLARI ───── */}
      <RecurringTrackModal
        open={recurringTrackModal.open}
        template={recurringTrackModal.task?.sourceTemplate || recurringTrackModal.task}
        onClose={() => setRecurringTrackModal({ open: false, task: null })}
      />
      <WorkerRecurringTaskModal
        open={workerRecurringModal.open}
        task={workerRecurringModal.task}
        onClose={() => setWorkerRecurringModal({ open: false, task: null })}
        onComplete={() => { setWorkerRecurringModal({ open: false, task: null }); loadData() }}
      />
    </div>
    </PageGuard>
  )
}
