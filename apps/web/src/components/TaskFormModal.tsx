'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import MentionInput from '@/components/MentionInput'
import ConfirmModal from '@/components/ConfirmModal'
import CustomDatePicker from '@/components/todoist/CustomDatePicker'
import { useAuth } from '@/contexts/AuthContext'

const P = { CRITICAL: '#7C3AED', HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981' } as const

type SubTask = { id?: string; title: string; assigneeIds: string[]; approverId: string; dueDate: string; files: File[] }
type TaskItem = { content: string; assigneeId: string; dueDate: string; priority: string; _prioOpen?: boolean; _taskId?: string; _status?: string; files?: File[] }
type TaskData = {
  title: string; description: string; type: 'TASK' | 'GOREV';
  priority: string; dueDate: string; responsibleId: string;
  departmentIds: string[]; businessIds: string[];
  assigneeIds: string[];
  approverId: string;
  subTasks: SubTask[];
  files: File[];
  taskItems: TaskItem[];
  labelIds: string[];
  projectId: string;
  isRecurring: boolean;
  recurRule: string;
  scheduleType: 'MONTHLY' | 'WEEKLY';
  dayOfMonth: number;
  dayOfWeek: number;
  notificationDay: number;
  deadlineDay: number;
  hasEndDate: boolean;
  endDate: string;
}

interface TaskFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editingTask: any | null
  users: any[]
  departments: any[]
  businesses: { id: string; name: string }[]
  viewMode?: boolean
  groupedTasks?: any[]
  currentUserId?: string
  onRefresh?: () => void
}

const todayDate = new Date().toISOString().split('T')[0]

function emptyTask(): TaskData {
  return {
    title: '', description: '', type: 'TASK',
    priority: 'MEDIUM', dueDate: todayDate, responsibleId: '',
    departmentIds: [], businessIds: [],
    assigneeIds: [],
    approverId: '',
    subTasks: [],
    files: [],
    taskItems: [],
    labelIds: [],
    projectId: '',
    isRecurring: false,
    recurRule: '',
    scheduleType: 'MONTHLY',
    dayOfMonth: 10,
    dayOfWeek: 1,
    notificationDay: 13,
    deadlineDay: 15,
    hasEndDate: false,
    endDate: '',
  }
}

const S: Record<string, string> = { PENDING: '#64748B', IN_PROGRESS: '#3B82F6', COMPLETED: '#10B981', DECLINED: '#EF4444', FORCE_COMPLETED: '#94A3B8' }
const SL: Record<string, string> = { PENDING: 'Gözləyir', IN_PROGRESS: 'Davam edir', COMPLETED: 'Tamamlandı', DECLINED: 'Rədd', FORCE_COMPLETED: 'Donuq' }

export default function TaskFormModal({ open, onClose, onSaved, editingTask, users, departments, businesses, viewMode, groupedTasks, currentUserId, onRefresh }: TaskFormModalProps) {
  const { hasPermission } = useAuth()
  const [newTask, setNewTask] = useState<TaskData>(emptyTask())

  // Yetki yoxlaması — tasks.create və ya gorev.create yetkisi yoxdursa modalı bağla
  useEffect(() => {
    if (open && !viewMode && !editingTask && !hasPermission('tasks.create') && !hasPermission('gorev.create')) {
      onClose()
    }
  }, [open, viewMode, editingTask, hasPermission, onClose])
  const [addLoading, setAddLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; confirmText: string; onConfirm: () => void }>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })

  // Label + Project
  const [availableLabels, setAvailableLabels] = useState<any[]>([])
  const [availableProjects, setAvailableProjects] = useState<any[]>([])
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')

  // Outside click — açıq dropdown-ları bağla
  useEffect(() => {
    if (!labelDropdownOpen && !projectDropdownOpen && !datePickerOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Dropdown içindədirsə bağlama
      if (target.closest('[data-dropdown]')) return
      setLabelDropdownOpen(false)
      setProjectDropdownOpen(false)
      setDatePickerOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [labelDropdownOpen, projectDropdownOpen, datePickerOpen])

  useEffect(() => {
    if (open) {
      api.getTodoistLabels().then(setAvailableLabels).catch(() => {})
      api.getTodoistProjects().then(setAvailableProjects).catch(() => {})
    }
  }, [open])

  // Accordion state-ləri (GOREV bölmələri üçün — bağlı başlayır)
  const [openSection, setOpenSection] = useState<'biz' | 'dept' | 'worker' | null>(null)
  const [bizSearch, setBizSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [workerSearch, setWorkerSearch] = useState('')
  const [approverSearch, setApproverSearch] = useState('')
  const [approverDropdownOpen, setApproverDropdownOpen] = useState(false)
  const approverRef = useRef<HTMLDivElement>(null)

  // TASK items popup
  const [itemPopupOpen, setItemPopupOpen] = useState(false)
  const [newItem, setNewItem] = useState<TaskItem>({ content: '', assigneeId: '', dueDate: todayDate, priority: 'MEDIUM' })
  const [expandedItem, setExpandedItem] = useState<number | null>(null)

  // VIEW mode inline edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editPrio, setEditPrio] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editAssigneeId, setEditAssigneeId] = useState('')
  const [viewLoading, setViewLoading] = useState(false)
  const [viewConfirm, setViewConfirm] = useState<{ open: boolean; type: 'finalize' | 'delete' | null }>({ open: false, type: null })
  const [chatMsg, setChatMsg] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [itemPersonSearch, setItemPersonSearch] = useState('')
  const [itemPersonOpen, setItemPersonOpen] = useState(false)
  const itemPersonRef = useRef<HTMLDivElement>(null)

  // Dropdown-ları kənara klik ilə bağla
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (approverRef.current && !approverRef.current.contains(e.target as Node)) setApproverDropdownOpen(false)
      if (itemPersonRef.current && !itemPersonRef.current.contains(e.target as Node)) setItemPersonOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when open/editingTask changes
  const [lastEditId, setLastEditId] = useState<string | null>(null)
  if (open && editingTask && editingTask.id !== lastEditId) {
    setLastEditId(editingTask.id)
    setNewTask({
      ...emptyTask(),
      title: editingTask.title || '',
      description: editingTask.description || '',
      type: editingTask.type || 'TASK',
      priority: editingTask.priority || 'MEDIUM',
      dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : todayDate,
      responsibleId: '',
      departmentIds: editingTask.department ? [editingTask.department.id] : [],
      businessIds: editingTask.business ? [editingTask.business.id] : [],
      assigneeIds: editingTask.assignees?.map((a: any) => a.user.id) || [],
      approverId: editingTask.approverId || '',
      subTasks: editingTask.subTasks?.map((s: any) => ({
        id: s.id,
        title: s.title || '',
        assigneeIds: s.assignees?.map((a: any) => a.user.id) || [],
        approverId: s.approverId || '',
        dueDate: s.dueDate ? new Date(s.dueDate).toISOString().split('T')[0] : '',
        files: [] as File[],
      })) || [],
      files: [],
      taskItems: editingTask._groupTasks?.length > 0
        ? editingTask._groupTasks.map((gt: any) => ({
            content: gt.description || '',
            assigneeId: gt.assignees?.[0]?.user?.id || '',
            dueDate: gt.dueDate ? new Date(gt.dueDate).toISOString().split('T')[0] : '',
            priority: gt.priority || 'MEDIUM',
            _taskId: gt.id,
            _status: gt.assignees?.[0]?.status || gt.status || 'CREATED',
          }))
        : [],
      labelIds: editingTask.labels?.map((tl: any) => tl.label?.id || tl.labelId) || [],
      projectId: editingTask.projectId || '',
    })
  }
  if (open && !editingTask && lastEditId !== '__new__') {
    setLastEditId('__new__')
    setNewTask(emptyTask())
  }

  // ─── Assignable users-dan filial/şöbə çıxar ───
  const availableBusinesses = useMemo(() => {
    const bizMap = new Map<string, { id: string; name: string }>()
    users.forEach((u: any) => {
      (u.businesses || []).forEach((ub: any) => {
        const b = ub.business || ub
        if (b?.id && b?.name) bizMap.set(b.id, { id: b.id, name: b.name })
      })
    })
    return Array.from(bizMap.values())
  }, [users])

  // ─── Kaskad filtrasiya: Filial → Şöbə → İşçi ───
  const [filteredDepartments, setFilteredDepartments] = useState<any[]>(departments)
  const [filteredUsers, setFilteredUsers] = useState<any[]>(users)

  const bizKey = newTask.businessIds.join(',')
  const deptKey = newTask.departmentIds.join(',')
  const usersKey = users.map((u: any) => u.id).join(',')

  // Filial dəyişəndə → şöbələri users-dan çıxar (assignable users-ın filiallarına əsasən)
  useEffect(() => {
    const deptMap = new Map<string, any>()
    users.forEach((u: any) => {
      (u.businesses || []).forEach((ub: any) => {
        const dept = ub.department
        const bizId = ub.business?.id || ub.businessId
        if (!dept?.id) return
        // Filial seçilibsə, yalnız həmin filialın şöbələrini göstər
        if (newTask.businessIds.length > 0 && !newTask.businessIds.includes(bizId)) return
        deptMap.set(dept.id, dept)
      })
    })
    setFilteredDepartments(Array.from(deptMap.values()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizKey, usersKey])

  // Filial + Şöbə dəyişəndə → işçiləri filtr et
  useEffect(() => {
    if (newTask.businessIds.length === 0 && newTask.departmentIds.length === 0) {
      setFilteredUsers(users)
      return
    }
    // İşçiləri UserBusiness əlaqəsinə görə filtr et
    const filtered = users.filter((u: any) => {
      if (!u.businesses || u.businesses.length === 0) return false
      return u.businesses.some((ub: any) => {
        const bizId = ub.business?.id || ub.businessId
        const deptId = ub.departmentId || ub.department?.id
        const bizMatch = newTask.businessIds.length === 0 || newTask.businessIds.includes(bizId)
        const deptMatch = newTask.departmentIds.length === 0 || newTask.departmentIds.includes(deptId)
        return bizMatch && deptMatch
      })
    })
    setFilteredUsers(filtered)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizKey, deptKey, usersKey])

  // Helpers
  function toggleAssignee(userId: string) {
    setNewTask(prev => ({ ...prev, assigneeIds: prev.assigneeIds.includes(userId) ? prev.assigneeIds.filter(id => id !== userId) : [...prev.assigneeIds, userId] }))
  }
  function toggleBiz(bizId: string) {
    setNewTask(prev => ({
      ...prev,
      businessIds: prev.businessIds.includes(bizId) ? prev.businessIds.filter(id => id !== bizId) : [...prev.businessIds, bizId],
      departmentIds: [], // filial dəyişəndə şöbə sıfırlanır
    }))
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
  function removeSubTaskFile(subIdx: number, fileIdx: number) {
    setNewTask(prev => {
      const subs = [...prev.subTasks]
      subs[subIdx] = { ...subs[subIdx], files: subs[subIdx].files.filter((_, j) => j !== fileIdx) }
      return { ...prev, subTasks: subs }
    })
  }

  // TASK item helpers
  function addTaskItem() {
    if (!newItem.content.trim() || !newItem.assigneeId) return
    setNewTask(prev => ({ ...prev, taskItems: [...prev.taskItems, { ...newItem }] }))
    setNewItem({ content: '', assigneeId: '', dueDate: todayDate, priority: 'MEDIUM' })
    setItemPopupOpen(false)
    setExpandedItem(null)
  }
  function removeTaskItem(i: number) {
    setNewTask(prev => ({ ...prev, taskItems: prev.taskItems.filter((_, idx) => idx !== i) }))
    if (expandedItem === i) setExpandedItem(null)
  }

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

  function handleClose() {
    setLastEditId(null)
    onClose()
  }

  // ─── GOREV: İşçi @tag helpers ───
  function addUserTag(userId: string) {
    const user = filteredUsers.find((u: any) => u.id === userId) || users.find((u: any) => u.id === userId)
    if (!user) return
    setNewTask(prev => {
      const tag = `@${user.fullName}`
      const newIds = prev.assigneeIds.includes(userId) ? prev.assigneeIds : [...prev.assigneeIds, userId]
      const newDesc = prev.description.includes(tag) ? prev.description : (prev.description ? prev.description + ' ' + tag : tag)
      return { ...prev, assigneeIds: newIds, description: newDesc }
    })
  }
  function removeUserTag(userId: string) {
    const user = filteredUsers.find((u: any) => u.id === userId) || users.find((u: any) => u.id === userId)
    if (!user) return
    setNewTask(prev => {
      const tag = `@${user.fullName}`
      return {
        ...prev,
        assigneeIds: prev.assigneeIds.filter(id => id !== userId),
        description: prev.description.replace(tag, '').replace(/\s{2,}/g, ' ').trim(),
      }
    })
  }
  function toggleWorker(userId: string) {
    if (newTask.assigneeIds.includes(userId)) removeUserTag(userId)
    else addUserTag(userId)
  }
  function selectAllWorkers() {
    const allSelected = filteredUsers.length > 0 && filteredUsers.every((u: any) => newTask.assigneeIds.includes(u.id))
    if (allSelected) {
      // Hamısını sil
      setNewTask(prev => {
        let desc = prev.description
        filteredUsers.forEach((u: any) => {
          desc = desc.replace(`@${u.fullName}`, '').replace(/\s{2,}/g, ' ').trim()
        })
        return { ...prev, assigneeIds: prev.assigneeIds.filter(id => !filteredUsers.some((u: any) => u.id === id)), description: desc }
      })
    } else {
      // Hamısını əlavə et
      setNewTask(prev => {
        let desc = prev.description
        const newIds = [...prev.assigneeIds]
        filteredUsers.forEach((u: any) => {
          if (!newIds.includes(u.id)) newIds.push(u.id)
          if (!desc.includes(`@${u.fullName}`)) desc = desc ? desc + ' @' + u.fullName : '@' + u.fullName
        })
        return { ...prev, assigneeIds: newIds, description: desc }
      })
    }
  }
  function selectAllBiz() {
    const allIds = availableBusinesses.map(b => b.id)
    const allSelected = allIds.length > 0 && allIds.every(id => newTask.businessIds.includes(id))
    setNewTask(prev => ({
      ...prev,
      businessIds: allSelected ? [] : allIds,
      departmentIds: [],
    }))
  }
  function selectAllDepts() {
    const allIds = filteredDepartments.map((d: any) => d.id)
    const allSelected = allIds.length > 0 && allIds.every((id: string) => newTask.departmentIds.includes(id))
    setNewTask(prev => ({
      ...prev,
      departmentIds: allSelected ? [] : allIds,
    }))
  }

  const allBizSelected = availableBusinesses.length > 0 && availableBusinesses.every(b => newTask.businessIds.includes(b.id))
  const allDeptsSelected = filteredDepartments.length > 0 && filteredDepartments.every((d: any) => newTask.departmentIds.includes(d.id))
  const allWorkersSelected = filteredUsers.length > 0 && filteredUsers.every((u: any) => newTask.assigneeIds.includes(u.id))

  // Save
  async function doSaveTask(taskData: TaskData) {
    const activeSubs = taskData.subTasks.filter(s => s.title.trim())
    if (activeSubs.length > 0) {
      const subsNoDate = activeSubs.filter(s => !s.dueDate && !taskData.dueDate)
      if (subsNoDate.length > 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'Tarix tələb olunur', message: `${subsNoDate.map(s => `"${s.title}"`).join(', ')} alt-görev(lər)ində tarix yoxdur.`, confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
      const subsNoPerson = activeSubs.filter(s => s.assigneeIds.length === 0)
      if (subsNoPerson.length > 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'Kişi tələb olunur', message: `${subsNoPerson.map(s => `"${s.title}"`).join(', ')} alt-görev(lər)ində heç bir kişi seçilməyib.`, confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
    }

    setAddLoading(true)
    try {
      // TASK type — hər item ayrı task yaradır, groupId ilə qruplanır
      if (taskData.type === 'TASK' && !editingTask && taskData.taskItems.length > 0) {
        const groupId = crypto.randomUUID()
        const createdItems: { taskId: string; itemFiles: File[] }[] = []
        for (const item of taskData.taskItems) {
          const result: any = await api.createTask({
            title: taskData.title,
            description: item.content || undefined,
            type: 'TASK',
            priority: item.priority || taskData.priority,
            dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : (taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined),
            assigneeIds: [item.assigneeId],
            groupId,
          })
          if (result?.id) createdItems.push({ taskId: result.id, itemFiles: item.files || [] })
        }
        // Ümumi faylları hər task-a yüklə
        for (const { taskId } of createdItems) {
          for (const file of taskData.files) {
            await api.uploadFile(file, taskId)
          }
        }
        // Özəl faylları yalnız o task-a yüklə
        for (const { taskId, itemFiles } of createdItems) {
          for (const file of itemFiles) {
            await api.uploadFile(file, taskId)
          }
        }
        handleClose()
        onSaved()
        return
      }

      // TASK type — düzənləmə: sync (yeni yarat, dəyişəni yenilə, silinəni sil)
      if (taskData.type === 'TASK' && editingTask && editingTask._groupTasks?.length > 0) {
        const groupId = editingTask.groupId || editingTask._groupTasks?.[0]?.groupId
        const originalTasks = editingTask._groupTasks as any[]
        const originalIds = new Set(originalTasks.map((t: any) => t.id))
        const currentIds = new Set(taskData.taskItems.filter(i => i._taskId).map(i => i._taskId!))

        // 1. Silinənlər — orijinalda var amma indi yox
        for (const ot of originalTasks) {
          if (!currentIds.has(ot.id)) {
            try {
              await api.deleteTask(ot.id)
            } catch (e: any) {
              console.error('Task silmə xətası:', e.message, ot.id)
            }
          }
        }

        // 2. Mövcud olanları yenilə (assignee dəyişməyibsə göndərmə — notes qorunsun)
        for (const item of taskData.taskItems) {
          if (item._taskId && originalIds.has(item._taskId)) {
            const origTask = originalTasks.find((t: any) => t.id === item._taskId)
            const origAssigneeId = origTask?.assignees?.[0]?.user?.id || origTask?.assignees?.[0]?.userId
            const assigneeChanged = origAssigneeId !== item.assigneeId

            const updatePayload: any = {
              title: taskData.title,
              description: item.content || undefined,
              type: 'TASK',
              priority: item.priority || taskData.priority,
              dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : (taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined),
            }
            // Assignee dəyişibsə yenilə, dəyişməyibsə göndərmə (notes qorunsun)
            if (assigneeChanged) {
              updatePayload.assigneeIds = [item.assigneeId]
            }

            await api.updateTask(item._taskId, updatePayload)
          }
        }

        // 3. Yeni əlavə olunanlar — _taskId olmayan
        const newItems = taskData.taskItems.filter(i => !i._taskId)
        for (const item of newItems) {
          try {
            await api.createTask({
              title: taskData.title,
              description: item.content || undefined,
              type: 'TASK',
              priority: item.priority || taskData.priority,
              dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : (taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined),
              assigneeIds: [item.assigneeId],
              groupId,
            })
          } catch (e: any) {
            console.error('Yeni task yaratma xətası:', e.message, item)
          }
        }

        handleClose()
        onSaved()
        return
      }

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
        assigneeIds: [...new Set([...(taskData.responsibleId ? [taskData.responsibleId] : []), ...taskData.assigneeIds])].filter(id => id !== taskData.approverId),
        approverId: taskData.approverId || undefined,
        subTasks: finalSubTasks.filter(s => s.title.trim()),
        labelIds: taskData.labelIds.length > 0 ? taskData.labelIds : undefined,
        projectId: taskData.projectId || undefined,
        isRecurring: taskData.isRecurring || undefined,
        recurRule: taskData.recurRule || undefined,
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
      // Təkrarlanan — şablon da yarat
      if (taskData.isRecurring && !editingTask) {
        try {
          const allAssigneeIds = [...new Set([...(taskData.responsibleId ? [taskData.responsibleId] : []), ...taskData.assigneeIds])].filter(id => id !== taskData.approverId)
          await api.createTemplate({
            name: taskData.title,
            description: taskData.description || undefined,
            isRecurring: true,
            scheduleType: taskData.scheduleType,
            scheduleTime: '09:00',
            dayOfMonth: taskData.scheduleType === 'MONTHLY' ? taskData.dayOfMonth : undefined,
            dayOfWeek: taskData.scheduleType === 'WEEKLY' ? taskData.dayOfWeek : undefined,
            businessId: taskData.businessIds[0] || undefined,
            departmentId: taskData.departmentIds[0] || undefined,
            notificationDay: taskData.notificationDay,
            deadlineDay: taskData.deadlineDay,
            endDate: taskData.hasEndDate && taskData.endDate ? new Date(taskData.endDate).toISOString() : undefined,
            items: (taskData.type === 'GOREV' ? finalSubTasks : taskData.taskItems.map(i => ({ title: i.content, priority: i.priority || 'MEDIUM' }))).filter((i: any) => i.title?.trim()),
            assigneeIds: allAssigneeIds,
          })
        } catch (e) { console.error('Şablon yaratma xətası:', e) }
      }

      handleClose()
      onSaved()
    } catch (err: any) { alert(err.message) }
    finally { setAddLoading(false) }
  }

  function handleDeleteTask() {
    if (!editingTask) return
    const groupTasks = editingTask._groupTasks as any[] | undefined
    const isGroupTask = groupTasks && groupTasks.length > 0
    setConfirmModal({
      open: true, type: 'danger',
      title: 'Tapşırığı sil',
      message: isGroupTask
        ? `"${editingTask.title}" tapşırığı və ${groupTasks.length} nəfərə aid bütün görevlər silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
        : `"${editingTask.title}" tapşırığı silinəcək. Bu əməliyyat geri qaytarıla bilməz.`,
      confirmText: 'Sil',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        setDeleteLoading(true)
        try {
          if (isGroupTask) {
            // Bütün group task-ları sil
            for (const gt of groupTasks) {
              await api.deleteTask(gt.id)
            }
          } else {
            await api.deleteTask(editingTask.id)
          }
          handleClose()
          onSaved()
        } catch (err: any) { alert(err.message) }
        finally { setDeleteLoading(false) }
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.title.trim()) return

    // TASK items validasiya
    if (newTask.type === 'TASK' && !editingTask) {
      if (newTask.taskItems.length === 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'Tapşırıq yoxdur', message: 'Ən az 1 tapşırıq əlavə edin.', confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
    }

    if (newTask.type === 'GOREV') {
      if (newTask.assigneeIds.length === 0) {
        setConfirmModal({ open: true, type: 'warning', title: 'İşçi seçilməyib', message: 'Ən az 1 işçi seçilməlidir.', confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
      if (!newTask.approverId) {
        setConfirmModal({ open: true, type: 'warning', title: 'Yetkili kişi seçilməyib', message: 'Toplu görev üçün yetkili kişi seçilməlidir.', confirmText: 'Tamam', onConfirm: () => setConfirmModal(prev => ({ ...prev, open: false })) })
        return
      }
    }

    // TASK items — confirm
    if (newTask.type === 'TASK' && !editingTask && newTask.taskItems.length > 0) {
      const names = newTask.taskItems.map(item => {
        const u = users.find(x => x.id === item.assigneeId)
        return u?.fullName?.split(' ')[0] || '?'
      }).join(', ')
      setConfirmModal({
        open: true, type: 'info',
        title: 'Tapşırıqları yarat',
        message: `${newTask.taskItems.length} tapşırıq yaradılacaq: ${names}. Davam edilsin?`,
        confirmText: 'Yarat',
        onConfirm: () => { setConfirmModal(prev => ({ ...prev, open: false })); doSaveTask(newTask) }
      })
      return
    }

    if (editingTask) {
      const subsWithoutDate = newTask.subTasks.filter(s => s.title.trim() && !s.dueDate)
      const hasSubDateIssue = subsWithoutDate.length > 0 && newTask.dueDate
      setConfirmModal({
        open: true, type: 'info',
        title: 'Dəyişiklikləri yadda saxla',
        message: `"${newTask.title}" tapşırığında dəyişikliklər yadda saxlanılsın?${hasSubDateIssue ? ` ${subsWithoutDate.length} alt-görevdə tarix yoxdur — əsas tarix istifadə ediləcək.` : ''}`,
        confirmText: 'Yadda saxla',
        onConfirm: () => { setConfirmModal(prev => ({ ...prev, open: false })); doSaveTask(newTask) }
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

  if (!open) return null

  // ═══ VIEW MODE: qruplanmış tapşırıqları göstər ═══
  if (viewMode && groupedTasks && groupedTasks.length > 0) {
    const firstTask = groupedTasks[0]
    const highestPrio = (['CRITICAL','HIGH','MEDIUM','LOW'] as const).find(p => groupedTasks.some((t: any) => t.priority === p)) || 'MEDIUM'
    const isCreator = currentUserId && firstTask.creatorId === currentUserId
    const allFinalized = groupedTasks.every((t: any) => t.finalized)

    const startEdit = (i: number, task: any) => {
      setEditingIdx(i)
      setEditDesc(task.description || '')
      setEditPrio(task.priority || 'MEDIUM')
      setEditDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
      setEditAssigneeId(task.assignees?.[0]?.user?.id || '')
    }

    const saveEdit = async (task: any) => {
      setViewLoading(true)
      try {
        await api.updateTask(task.id, {
          description: editDesc || undefined,
          priority: editPrio,
          dueDate: editDate ? new Date(editDate).toISOString() : undefined,
          assigneeIds: editAssigneeId ? [editAssigneeId] : [],
        })
        setEditingIdx(null)
        onRefresh?.()
      } catch (err: any) { alert(err.message) }
      finally { setViewLoading(false) }
    }

    const handleFinalize = async () => {
      setViewLoading(true)
      try {
        for (const task of groupedTasks) {
          if (!task.finalized) await api.finalizeTask(task.id)
        }
        setViewConfirm({ open: false, type: null })
        onRefresh?.()
        onClose()
      } catch (err: any) { alert(err.message) }
      finally { setViewLoading(false) }
    }

    const handleDeleteAll = async () => {
      setViewLoading(true)
      try {
        for (const task of groupedTasks) {
          await api.deleteTask(task.id)
        }
        setViewConfirm({ open: false, type: null })
        onRefresh?.()
        onClose()
      } catch (err: any) { alert(err.message) }
      finally { setViewLoading(false) }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative w-full max-w-2xl min-h-[55vh] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 4, backgroundColor: P[highestPrio as keyof typeof P] || '#808080' }} />
          <div className="p-5 flex flex-col" style={{ minHeight: 'calc(55vh - 4px)' }}>
            {/* Başlıq */}
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: '#4F46E5' }}>📋 Tapşırıq</span>
              {firstTask.dueDate && <span className="text-[11px] font-medium" style={{ color: '#10B981' }}>{new Date(firstTask.dueDate).toLocaleDateString('az-AZ')}</span>}
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: P[highestPrio as keyof typeof P], color: '#fff' }}>
                {highestPrio === 'CRITICAL' ? 'Kritik' : highestPrio === 'HIGH' ? 'Yüksək' : highestPrio === 'MEDIUM' ? 'Orta' : 'Aşağı'}
              </span>
              {allFinalized && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>Tamamlanıb</span>}
            </div>
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--todoist-text)' }}>{firstTask.title}</h2>

            {/* Tapşırıqlar başlığı */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                Tapşırıqlar <span className="text-[10px] font-normal" style={{ color: 'var(--todoist-text-secondary)' }}>({groupedTasks.length})</span>
              </span>
              <span className="text-[10px]" style={{ color: 'var(--todoist-text-secondary)' }}>
                {groupedTasks.filter((t: any) => t.assignees?.[0]?.status === 'COMPLETED').length}/{groupedTasks.length} tamamlandı
              </span>
            </div>

            {/* Tapşırıq siyahısı */}
            <div className="space-y-1.5 flex-1">
              {groupedTasks.map((task: any, i: number) => {
                const assignee = task.assignees?.[0]
                const taskUser = assignee?.user
                const status = assignee?.status || 'PENDING'
                const isExpanded = expandedItem === i
                const isEditing = editingIdx === i
                const pColor = P[task.priority as keyof typeof P] || '#B3B3B3'
                return (
                  <div key={task.id || i} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                    <div style={{ height: 3, backgroundColor: isEditing ? P[editPrio as keyof typeof P] || pColor : pColor }} />
                    <div className="px-3 py-2.5 cursor-pointer" onClick={() => { if (!isEditing) setExpandedItem(isExpanded ? null : i) }}>
                      <div className="flex items-center gap-2.5">
                        {/* Content */}
                        <p className="flex-1 min-w-0 text-[11px] truncate" style={{ color: 'var(--todoist-text)' }}>{task.description || '—'}</p>
                        {/* Person */}
                        {taskUser && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: '#7C3AED' }}>
                              {taskUser.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>{taskUser.fullName?.split(' ')[0]}</span>
                          </div>
                        )}
                        {/* Date */}
                        <span className="text-[9px] shrink-0" style={{ color: 'var(--todoist-text-tertiary)' }}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' }) : ''}
                        </span>
                        {/* Status */}
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold shrink-0" style={{ backgroundColor: (S[status] || '#808080') + '18', color: S[status] || '#808080' }}>
                          {SL[status] || status}
                        </span>
                        {/* Edit button — yalnız yaradan üçün */}
                        {isCreator && !allFinalized && (
                          <button type="button" onClick={e => { e.stopPropagation(); isEditing ? setEditingIdx(null) : startEdit(i, task) }}
                            className="text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded"
                            style={{ color: isEditing ? '#4F46E5' : 'var(--todoist-red)', backgroundColor: isEditing ? '#EEF2FF' : 'var(--todoist-red-light)' }}>
                            {isEditing ? '✕' : '✎'}
                          </button>
                        )}
                        {/* Expand icon */}
                        {!isEditing && <span className="text-[8px] shrink-0" style={{ color: 'var(--todoist-text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>}
                      </div>
                    </div>

                    {/* ── İnline düzənləmə formu ── */}
                    {isEditing && (
                      <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          className="w-full text-[11px] rounded-lg p-2 mt-2 outline-none resize-none"
                          style={{ backgroundColor: 'var(--todoist-hover)', minHeight: 48, color: 'var(--todoist-text)' }}
                          placeholder="Açıqlama..." />
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Kişi seç */}
                          <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)}
                            className="rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                            style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}>
                            <option value="">Kişi seç</option>
                            {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                          </select>
                          {/* Prioritet */}
                          <div className="flex gap-0.5">
                            {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(p => (
                              <button key={p} type="button" onClick={() => setEditPrio(p)}
                                className="rounded-md px-1.5 py-0.5 text-[8px] font-bold"
                                style={{ backgroundColor: editPrio === p ? P[p] : 'var(--todoist-hover)', color: editPrio === p ? '#fff' : P[p] }}>
                                {p === 'CRITICAL' ? 'Kritik' : p === 'HIGH' ? 'Yüksək' : p === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                              </button>
                            ))}
                          </div>
                          {/* Tarix */}
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                            className="rounded-md px-2 py-0.5 text-[10px] outline-none"
                            style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', color: '#10B981' }} />
                        </div>
                        <div className="flex justify-end">
                          <button type="button" disabled={viewLoading} onClick={() => saveEdit(task)}
                            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
                            style={{ backgroundColor: 'var(--todoist-red)' }}>
                            {viewLoading ? 'Saxlanılır...' : 'Yadda saxla'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Genişlənmiş detay + chat */}
                    {isExpanded && !isEditing && (() => {
                      const workerNotes: any[] = Array.isArray(assignee?.notes) ? assignee.notes : []
                      const approverNotes: any[] = Array.isArray(assignee?.approverNotes) ? assignee.approverNotes : []
                      const allMessages = [
                        ...workerNotes.map((n: any) => ({ ...n, type: 'worker' })),
                        ...approverNotes.map((n: any) => ({ ...n, type: 'approver' })),
                      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      const totalMsg = allMessages.length
                      const msgRemaining = Infinity // Mesaj limiti qaldırıldı
                      const fmtTime = (d: string) => new Date(d).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })

                      const sendCreatorMsg = async () => {
                        if (!chatMsg.trim() || chatSending || msgRemaining <= 0 || task.finalized) return
                        setChatSending(true)
                        try {
                          const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
                          const token = localStorage.getItem('accessToken') || ''
                          const res = await fetch(`${API}/tasks/${task.id}/assignee-note`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ userId: taskUser?.id, approverNote: chatMsg }),
                          })
                          if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.message || 'Xəta') }
                          else { setChatMsg(''); onRefresh?.() }
                        } catch (e: any) { alert(e.message) }
                        finally { setChatSending(false) }
                      }

                      return (
                        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                          {/* Açıqlama */}
                          {task.description && (
                            <p className="text-[11px] leading-relaxed pt-2 whitespace-pre-wrap" style={{ color: 'var(--todoist-text)' }}>{task.description}</p>
                          )}
                          {/* Status vaxtı */}
                          {assignee?.updatedAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Status dəyişdirildi:</span>
                              <span className="text-[9px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>
                                {new Date(assignee.updatedAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}

                          {/* 💬 Mesajlar (WhatsApp stili) */}
                          <div>
                            <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>💬 Mesajlar</label>
                            <div className="rounded-xl px-3 py-2.5 space-y-1.5" style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', maxHeight: 160, overflowY: 'auto' }}>
                              {allMessages.length === 0 ? (
                                <p className="text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Hələ mesaj yoxdur</p>
                              ) : allMessages.map((n, mi) => (
                                <div key={mi} className={`flex ${n.type === 'approver' ? 'justify-end' : 'justify-start'}`}>
                                  <div className="rounded-xl px-3 py-1.5 max-w-[85%]" style={{
                                    backgroundColor: n.type === 'approver' ? 'var(--todoist-red-light)' : '#F3E8FF',
                                    border: `1px solid ${n.type === 'approver' ? 'var(--todoist-divider)' : '#E9D5FF'}`,
                                  }}>
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span className="text-[8px] font-bold" style={{ color: n.type === 'approver' ? 'var(--todoist-red)' : '#7C3AED' }}>
                                        {n.type === 'approver' ? '📝 Siz' : `🧑 ${taskUser?.fullName?.split(' ')[0] || 'İşçi'}`}
                                      </span>
                                      <span className="text-[8px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{n.date ? fmtTime(n.date) : ''}</span>
                                    </div>
                                    {n.text && <p className="text-[11px] break-words" style={{ color: n.type === 'approver' ? 'var(--todoist-red)' : '#6B21A8' }}>{n.text}</p>}
                                    {n.fileId && (
                                      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/attachments/${n.fileId}/download`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 mt-1 text-[10px] font-medium rounded-lg px-2 py-1 transition hover:opacity-80"
                                        style={{ backgroundColor: n.type === 'approver' ? 'var(--todoist-red-light)' : '#EDE0FF', color: n.type === 'approver' ? 'var(--todoist-red)' : '#6B21A8', textDecoration: 'none' }}>
                                        📎 {n.fileName || 'Fayl'}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Mesaj yazma — yaradan üçün */}
                            {isCreator && !task.finalized && msgRemaining > 0 ? (
                              <>
                                <div className="flex items-center gap-1.5 mt-2 mb-1">
                                  <span className="text-[8px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--todoist-red-light)', color: 'var(--todoist-red)' }}>💬 {totalMsg} mesaj</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input type="text" value={expandedItem === i ? chatMsg : ''} onChange={e => setChatMsg(e.target.value)}
                                    placeholder="Mesaj yazın..." maxLength={200}
                                    className="flex-1 text-[11px] outline-none rounded-lg px-2.5 py-1.5"
                                    style={{ backgroundColor: 'var(--todoist-hover)', color: 'var(--todoist-text)', border: '1px solid var(--todoist-divider)' }}
                                    onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { e.preventDefault(); sendCreatorMsg() } }}
                                  />
                                  <button onClick={sendCreatorMsg} disabled={chatSending || !chatMsg.trim()}
                                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-white shrink-0 transition"
                                    style={{ backgroundColor: chatSending ? 'var(--todoist-text-tertiary)' : !chatMsg.trim() ? 'var(--todoist-text-tertiary)' : 'var(--todoist-red)' }}>
                                    {chatSending ? '...' : 'Göndər'}
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>

            {/* Alt düymələr */}
            <div className="border-t pt-3 mt-auto flex items-center justify-between" style={{ borderColor: 'var(--todoist-divider)' }}>
              {isCreator ? (
                <>
                  <button type="button" disabled={viewLoading} onClick={() => setViewConfirm({ open: true, type: 'delete' })}
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
                    style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>
                    🗑 Sil
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] font-semibold" style={{ color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-hover)' }}>Bağla</button>
                    {!allFinalized && (
                      <button type="button" disabled={viewLoading} onClick={() => setViewConfirm({ open: true, type: 'finalize' })}
                        className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
                        style={{ backgroundColor: '#10B981' }}>
                        {viewLoading ? 'Gözləyin...' : '✓ Tapşırığı bitir'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] font-semibold" style={{ color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-hover)' }}>Bağla</button>
                </div>
              )}
            </div>

            {/* Onay modalı */}
            {viewConfirm.open && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={() => setViewConfirm({ open: false, type: null })}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative rounded-xl p-5 shadow-xl max-w-sm w-full" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
                  <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--todoist-text)' }}>
                    {viewConfirm.type === 'finalize' ? 'Tapşırığı bitir' : 'Tapşırığı sil'}
                  </h3>
                  <p className="text-[12px] mb-4" style={{ color: 'var(--todoist-text-secondary)' }}>
                    {viewConfirm.type === 'finalize'
                      ? `${groupedTasks.length} tapşırıq tamamlanacaq. İşçilər artıq statusu dəyişdirə bilməyəcək. Davam edilsin?`
                      : `"${firstTask.title}" tapşırığı (${groupedTasks.length} ədəd) həm yaradandan, həm də atanan işçilərdən silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                    }
                  </p>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setViewConfirm({ open: false, type: null })}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-hover)' }}>Ləğv et</button>
                    <button type="button" disabled={viewLoading}
                      onClick={viewConfirm.type === 'finalize' ? handleFinalize : handleDeleteAll}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                      style={{ backgroundColor: viewConfirm.type === 'finalize' ? '#10B981' : '#4F46E5' }}>
                      {viewLoading ? 'Gözləyin...' : viewConfirm.type === 'finalize' ? 'Bəli, bitir' : 'Bəli, sil'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (<>
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-2xl min-h-[55vh] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />

        {/* ── Yetkili kişi + X ── */}
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="flex items-center gap-2">
            {newTask.approverId && (() => {
              const approverUser = users.find(u => u.id === newTask.approverId)
              return approverUser ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="text-[8px]" style={{ color: '#C4B5FD' }}>Yetkili:</span> {approverUser.fullName}
                </span>
              ) : null
            })()}
            {editingTask && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="text-[8px]" style={{ color: '#94A3B8' }}>Yaradan:</span> {editingTask.creator?.fullName || '—'}
              </span>
            )}
          </div>
          <button type="button" onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#94A3B8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 flex flex-col" style={{ minHeight: 'calc(55vh - 50px)' }}>
          {/* ── ÜST: Tip + Tarix + Önəmlilik ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md overflow-hidden shrink-0" style={{ border: '1px solid var(--todoist-divider)', opacity: editingTask ? 0.6 : 1 }}>
              {[{ v: 'TASK', l: '📋 Tapşırıq' }, { v: 'GOREV', l: '👥 Toplu Tapşırıq' }].map(t => (
                <button key={t.v} type="button" onClick={() => !editingTask && setNewTask({...newTask, type: t.v as any})}
                  className="px-2.5 py-1 text-[10px] font-semibold"
                  style={{ backgroundColor: newTask.type === t.v ? '#4F46E5' : 'var(--todoist-surface)', color: newTask.type === t.v ? '#fff' : 'var(--todoist-text-secondary)', cursor: editingTask ? 'not-allowed' : 'pointer' }}>{t.l}</button>
              ))}
            </div>
            <div className="relative">
              <button type="button" data-dropdown="date" onClick={() => { setDatePickerOpen(!datePickerOpen); setLabelDropdownOpen(false); setProjectDropdownOpen(false) }}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 outline-none transition"
                style={{ backgroundColor: newTask.dueDate ? '#ECFDF5' : 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', color: newTask.dueDate ? '#10B981' : 'var(--todoist-text-secondary)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {newTask.dueDate ? (() => {
                  const parts = newTask.dueDate.split('T')
                  const dateStr = new Date(parts[0] + 'T00:00').toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  const timeStr = parts[1]?.substring(0, 5)
                  return timeStr ? `${dateStr} ${timeStr}` : dateStr
                })() : 'Tarix'}
              </button>
              {datePickerOpen && (() => {
                const selected = newTask.dueDate?.split('T')[0] || ''
                const selectedTime = newTask.dueDate?.includes('T') ? newTask.dueDate.split('T')[1]?.substring(0, 5) : ''
                const viewDate = selected ? new Date(selected + 'T00:00') : new Date()
                const year = viewDate.getFullYear()
                const month = viewDate.getMonth()
                const firstDay = new Date(year, month, 1).getDay()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const today = new Date(); today.setHours(0,0,0,0)
                const todayStr = today.toISOString().split('T')[0]
                const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
                const dayNames = ['B.e','Ç.a','Ç','C.a','C','Ş','B']
                const days: (number | null)[] = []
                for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null)
                for (let i = 1; i <= daysInMonth; i++) days.push(i)

                return (
                  <div data-dropdown="date" className="absolute top-full left-0 mt-1 z-50 rounded-xl shadow-xl p-3" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', width: 280 }}>
                    {/* Ay başlığı + naviqasiya */}
                    <div className="flex items-center justify-between mb-2">
                      <button type="button" onClick={() => {
                        const prev = new Date(year, month - 1, 1)
                        const d = selected ? new Date(selected) : new Date()
                        d.setMonth(prev.getMonth()); d.setFullYear(prev.getFullYear())
                        handleDateChange(d.toISOString().split('T')[0])
                      }} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-[var(--todoist-hover)]" style={{ color: 'var(--todoist-text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>{monthNames[month]} {year}</span>
                      <button type="button" onClick={() => {
                        const next = new Date(year, month + 1, 1)
                        const d = selected ? new Date(selected) : new Date()
                        d.setMonth(next.getMonth()); d.setFullYear(next.getFullYear())
                        handleDateChange(d.toISOString().split('T')[0])
                      }} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-[var(--todoist-hover)]" style={{ color: 'var(--todoist-text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>

                    {/* Gün adları */}
                    <div className="grid grid-cols-7 gap-0 mb-1">
                      {dayNames.map(d => (
                        <div key={d} className="text-center text-[9px] font-bold py-1" style={{ color: 'var(--todoist-text-tertiary)' }}>{d}</div>
                      ))}
                    </div>

                    {/* Günlər */}
                    <div className="grid grid-cols-7 gap-0">
                      {days.map((day, i) => {
                        if (!day) return <div key={`e${i}`} />
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isSelected = dateStr === selected
                        const isToday = dateStr === todayStr
                        return (
                          <button key={i} type="button"
                            onClick={() => handleDateChange(dateStr)}
                            className="w-full aspect-square rounded-lg text-[12px] font-medium flex items-center justify-center transition"
                            style={{
                              backgroundColor: isSelected ? '#4F46E5' : isToday ? '#EEF2FF' : 'transparent',
                              color: isSelected ? '#fff' : isToday ? '#4F46E5' : 'var(--todoist-text)',
                              fontWeight: isSelected || isToday ? 700 : 400,
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--todoist-hover)' }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? '#EEF2FF' : 'transparent' }}>
                            {day}
                          </button>
                        )
                      })}
                    </div>

                    {/* Saat — custom dropdown */}
                    <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--todoist-text-secondary)' }}>
                          {selectedTime ? `Saat: ${selectedTime}` : 'Saat seç'}
                        </span>
                        {selectedTime && (
                          <button type="button" onClick={() => {
                            const dateStr = newTask.dueDate?.split('T')[0] || newTask.dueDate || todayDate
                            setNewTask(prev => ({ ...prev, dueDate: dateStr }))
                          }} className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>Sil</button>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(t => (
                          <button key={t} type="button" onClick={() => {
                            const dateStr = newTask.dueDate?.split('T')[0] || newTask.dueDate || todayDate
                            setNewTask(prev => ({ ...prev, dueDate: `${dateStr}T${t}` }))
                          }}
                            className="rounded-md px-2 py-1 text-[10px] font-medium transition"
                            style={{
                              backgroundColor: selectedTime === t ? '#4F46E5' : 'var(--todoist-bg)',
                              color: selectedTime === t ? '#fff' : 'var(--todoist-text-secondary)',
                              border: `1px solid ${selectedTime === t ? '#4F46E5' : 'var(--todoist-divider)'}`,
                            }}>{t}</button>
                        ))}
                      </div>
                      {/* Özel saat */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <select value={selectedTime ? selectedTime.split(':')[0] : ''} onChange={e => {
                          const h = e.target.value; const m = selectedTime ? selectedTime.split(':')[1] : '00'
                          if (h) { const dateStr = newTask.dueDate?.split('T')[0] || newTask.dueDate || todayDate; setNewTask(prev => ({ ...prev, dueDate: `${dateStr}T${h}:${m}` })) }
                        }} className="rounded-md px-2 py-1 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}>
                          <option value="">Saat</option>
                          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text-tertiary)' }}>:</span>
                        <select value={selectedTime ? selectedTime.split(':')[1] : ''} onChange={e => {
                          const m = e.target.value; const h = selectedTime ? selectedTime.split(':')[0] : '09'
                          if (m) { const dateStr = newTask.dueDate?.split('T')[0] || newTask.dueDate || todayDate; setNewTask(prev => ({ ...prev, dueDate: `${dateStr}T${h}:${m}` })) }
                        }} className="rounded-md px-2 py-1 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}>
                          <option value="">Dəq</option>
                          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Butonlar */}
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => { handleDateChange(''); setDatePickerOpen(false) }}
                        className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold"
                        style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>Tarixi sil</button>
                      <button type="button" onClick={() => setDatePickerOpen(false)}
                        className="flex-1 rounded-lg py-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: '#4F46E5' }}>Tamam</button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Təkrarlanan seçimi */}
            <button type="button" onClick={() => setNewTask(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
              className="rounded-md px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 outline-none transition"
              style={{
                backgroundColor: newTask.isRecurring ? '#EEF2FF' : 'var(--todoist-hover)',
                border: `1px solid ${newTask.isRecurring ? '#C7D2FE' : 'var(--todoist-divider)'}`,
                color: newTask.isRecurring ? '#4F46E5' : 'var(--todoist-text-secondary)',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              {newTask.isRecurring ? `🔁 ${newTask.scheduleType === 'MONTHLY' ? `Hər ayın ${newTask.dayOfMonth}-i` : `Hər ${['Bazar','B.e.','Ç.a.','Çərşənbə','C.a.','Cümə','Şənbə'][newTask.dayOfWeek]}`}` : 'Təkrarla'}
            </button>

            <div className="flex gap-0.5">
              {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(p => (
                <button key={p} type="button" onClick={() => setNewTask({...newTask, priority: p})}
                  className="rounded-md px-2 py-1 text-[9px] font-bold"
                  style={{ backgroundColor: newTask.priority === p ? P[p] : 'var(--todoist-hover)', color: newTask.priority === p ? '#fff' : P[p] }}>
                  <span className="inline-flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill={newTask.priority === p ? '#fff' : P[p]} stroke={newTask.priority === p ? '#fff' : P[p]} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>{p === 'CRITICAL' ? 'Kritik' : p === 'HIGH' ? 'Yüksək' : p === 'MEDIUM' ? 'Orta' : 'Aşağı'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ETİKET + LAYİHƏ (başlıqdan əvvəl, ayrı sətir) ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* ETİKET SEÇİCİ */}
            <div className="relative">
              <button type="button" data-dropdown="label" onClick={() => { setLabelDropdownOpen(!labelDropdownOpen); setProjectDropdownOpen(false); setDatePickerOpen(false) }}
                className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1.5"
                style={{ backgroundColor: newTask.labelIds.length > 0 ? 'var(--todoist-red-light)' : 'var(--todoist-hover)', color: newTask.labelIds.length > 0 ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                🏷️ {newTask.labelIds.length > 0 ? `${newTask.labelIds.length} etiket` : 'Etiket'}
              </button>
              {labelDropdownOpen && (
                <div data-dropdown="label" className="absolute top-full left-0 mt-1 rounded-xl shadow-lg z-50 py-2 min-w-[220px] max-h-[250px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  <p className="px-3 pb-1.5 text-[10px] font-bold" style={{ color: 'var(--todoist-text-tertiary)' }}>Etiket seçin</p>
                  {availableLabels.map((l: any) => {
                    const selected = newTask.labelIds.includes(l.id)
                    return (
                      <label key={l.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition hover:bg-[var(--todoist-hover)]">
                        <input type="checkbox" checked={selected}
                          onChange={() => setNewTask(prev => ({ ...prev, labelIds: selected ? prev.labelIds.filter(x => x !== l.id) : [...prev.labelIds, l.id] }))}
                          className="w-3.5 h-3.5 rounded accent-[#4F46E5]" />
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color || '#64748B' }} />
                        <span className="text-[12px] font-medium" style={{ color: 'var(--todoist-text)' }}>{l.name}</span>
                      </label>
                    )
                  })}
                  <div className="px-3 py-1.5 border-t" style={{ borderColor: 'var(--todoist-divider)' }}>
                    <div className="flex items-center gap-1">
                      <input type="text" value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
                        placeholder="Yeni etiket adı..."
                        className="flex-1 text-[10px] outline-none px-2 py-1 rounded" style={{ backgroundColor: 'var(--todoist-hover)', color: 'var(--todoist-text)' }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newLabelName.trim()) {
                            e.preventDefault()
                            api.createTodoistLabel({ name: newLabelName.trim(), color: '#808080' }).then((nl: any) => {
                              setAvailableLabels(prev => [...prev, nl])
                              setNewTask(prev => ({ ...prev, labelIds: [...prev.labelIds, nl.id] }))
                              setNewLabelName('')
                            }).catch(() => {})
                          }
                        }} />
                      <button type="button" onClick={() => {
                        if (!newLabelName.trim()) return
                        api.createTodoistLabel({ name: newLabelName.trim(), color: '#808080' }).then((nl: any) => {
                          setAvailableLabels(prev => [...prev, nl])
                          setNewTask(prev => ({ ...prev, labelIds: [...prev.labelIds, nl.id] }))
                          setNewLabelName('')
                        }).catch(() => {})
                      }} className="text-[9px] font-bold px-2 py-1 rounded" style={{ backgroundColor: 'var(--todoist-red)', color: '#fff' }}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LAYİHƏ SEÇİCİ */}
            <div className="relative">
              <button type="button" data-dropdown="project" onClick={() => { setProjectDropdownOpen(!projectDropdownOpen); setLabelDropdownOpen(false); setDatePickerOpen(false) }}
                className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1.5"
                style={{ backgroundColor: newTask.projectId ? 'var(--todoist-red-light)' : 'var(--todoist-hover)', color: newTask.projectId ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                📂 {newTask.projectId ? (availableProjects.find((p: any) => p.id === newTask.projectId)?.name || 'Layihə') : 'Layihə'}
              </button>
              {projectDropdownOpen && (
                <div data-dropdown="project" className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[180px] max-h-[220px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  <button type="button" onClick={() => { setNewTask(prev => ({ ...prev, projectId: '' })); setProjectDropdownOpen(false) }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 text-left transition"
                    style={{ color: 'var(--todoist-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    Layihə yoxdur
                  </button>
                  {availableProjects.map((p: any) => (
                    <button key={p.id} type="button" onClick={() => { setNewTask(prev => ({ ...prev, projectId: p.id })); setProjectDropdownOpen(false) }}
                      className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 text-left transition"
                      style={{ color: 'var(--todoist-text)', backgroundColor: newTask.projectId === p.id ? 'var(--todoist-hover)' : 'transparent' }}
                      onMouseEnter={e => { if (newTask.projectId !== p.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-hover)' }}
                      onMouseLeave={e => { if (newTask.projectId !== p.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#808080' }} />
                      {p.name}
                      {newTask.projectId === p.id && <svg className="ml-auto w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seçilmiş etiket pill-ləri (yanında göstərilir) */}
            {availableLabels.filter((l: any) => newTask.labelIds.includes(l.id)).map((l: any) => (
              <span key={l.id} onClick={() => setNewTask(prev => ({ ...prev, labelIds: prev.labelIds.filter(x => x !== l.id) }))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:opacity-70 transition"
                style={{ backgroundColor: (l.color || '#808080') + '20', color: l.color || '#808080' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color || '#808080' }} />
                {l.name} ✕
              </span>
            ))}
          </div>

          {/* ── BAŞLIQ + YETKİLİ (GOREV-də sağda) ── */}
          <div className="flex items-center gap-2">
            <input type="text" autoFocus value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
              placeholder="Tapşırıq adı..." className="flex-1 text-[15px] font-semibold outline-none" style={{ color: 'var(--todoist-text)', backgroundColor: 'transparent' }} />
            {newTask.type === 'GOREV' && (
              <div ref={approverRef} className="relative shrink-0">
                <button type="button" onClick={() => { setApproverDropdownOpen(!approverDropdownOpen); setApproverSearch('') }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition"
                  style={{ backgroundColor: newTask.approverId ? '#F5F3FF' : 'var(--todoist-hover)', color: newTask.approverId ? '#7C3AED' : 'var(--todoist-text-secondary)', border: `1px solid ${newTask.approverId ? '#DDD6FE' : 'var(--todoist-divider)'}` }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {newTask.approverId ? (users.find(u => u.id === newTask.approverId)?.fullName?.split(' ')[0] || 'Seçildi') : 'Yetkili'}
                  <span style={{ fontSize: 8, color: 'var(--todoist-text-tertiary)' }}>▼</span>
                </button>
                {approverDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-xl overflow-hidden z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                    <div className="p-2">
                      <input type="text" value={approverSearch} onChange={e => setApproverSearch(e.target.value)}
                        placeholder="Axtar..." autoFocus
                        className="w-full rounded-md px-2 py-1.5 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
                    </div>
                    <div className="max-h-36 overflow-y-auto">
                      {filteredUsers.filter((u: any) => {
                        if (!u.fullName.toLowerCase().includes(approverSearch.toLowerCase())) return false
                        // Yetkili kişi yalnız gorev.approve və ya gorev.create yetkisi olan ola bilər
                        const perms: string[] = u.customRole?.permissions || []
                        return perms.includes('gorev.approve') || perms.includes('gorev.create')
                      }).map((u: any) => (
                        <button key={u.id} type="button" onClick={() => { setNewTask(prev => ({...prev, approverId: u.id})); setApproverDropdownOpen(false) }}
                          className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition hover:bg-gray-50"
                          style={{ color: newTask.approverId === u.id ? '#7C3AED' : 'var(--todoist-text)', fontWeight: newTask.approverId === u.id ? 700 : 400 }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: newTask.approverId === u.id ? '#7C3AED' : '#94A3B8' }}>
                            {u.fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                          </div>
                          {u.fullName}
                          {newTask.approverId === u.id && <span className="ml-auto text-[9px]" style={{ color: '#7C3AED' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {newTask.type === 'GOREV' && (
            <div className="rounded-lg px-3 py-2 relative" style={{ backgroundColor: 'var(--todoist-hover)', minHeight: '48px' }}>
              <MentionInput
                value={newTask.description}
                onChange={v => setNewTask(prev => ({...prev, description: v}))}
                users={filteredUsers}
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
          )}

          {/* ── TƏK TAPŞIRIQ: Items table + popup ── */}
          {newTask.type === 'TASK' && (
            <div>
              {/* Header + Əlavə et button */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                  Tapşırıqlar {newTask.taskItems.length > 0 && <span className="text-[10px] font-normal" style={{ color: 'var(--todoist-text-secondary)' }}>({newTask.taskItems.length})</span>}
                </span>
                <button type="button" onClick={() => { setItemPopupOpen(!itemPopupOpen); setNewItem({ content: '', assigneeId: '', dueDate: newTask.dueDate || todayDate, priority: 'MEDIUM' }) }}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#4F46E5' }}>
                  + Əlavə et
                </button>
              </div>

              {/* Add popup — tek sətir layout: Açıqlama | Kişi | Zorluk | Tarix | Əlavə et */}
              {itemPopupOpen && (
                <div className="rounded-xl px-3 py-3 mb-3 -mx-2" style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="flex gap-2 items-start">
                    {/* Açıqlama — uzun olarsa ikinci satıra keçir */}
                    <textarea value={newItem.content} onChange={e => { setNewItem({...newItem, content: e.target.value}); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                      placeholder="Açıqlama..."
                      autoFocus
                      rows={1}
                      className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[11px] outline-none resize-none"
                      style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', minHeight: 36, overflow: 'hidden' }} />
                    {/* Kişi seç */}
                    <div ref={itemPersonRef} className="relative shrink-0" style={{ width: 140 }}>
                      <button type="button" onClick={() => { setItemPersonOpen(!itemPersonOpen); setItemPersonSearch('') }}
                        className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] text-left transition"
                        style={{ backgroundColor: 'var(--todoist-surface)', border: `1px solid ${newItem.assigneeId ? '#7C3AED' : 'var(--todoist-divider)'}`, color: newItem.assigneeId ? 'var(--todoist-text)' : 'var(--todoist-text-tertiary)' }}>
                        {newItem.assigneeId ? (
                          <>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold text-white shrink-0" style={{ backgroundColor: '#7C3AED' }}>
                              {users.find(u => u.id === newItem.assigneeId)?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                            </div>
                            <span className="truncate">{users.find(u => u.id === newItem.assigneeId)?.fullName}</span>
                          </>
                        ) : '👤 Kişi seç'}
                        <span className="ml-auto shrink-0" style={{ fontSize: 7, color: 'var(--todoist-text-tertiary)' }}>▼</span>
                      </button>
                      {itemPersonOpen && (
                        <div className="absolute left-0 top-full mt-1 w-56 rounded-xl shadow-xl overflow-hidden z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                          {users.length > 4 && (
                            <div className="p-2">
                              <input type="text" value={itemPersonSearch} onChange={e => setItemPersonSearch(e.target.value)}
                                placeholder="Axtar..." autoFocus
                                className="w-full rounded-md px-2 py-1.5 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)' }} />
                            </div>
                          )}
                          <div className="max-h-48 overflow-y-auto">
                            {users.filter((u: any) => u.fullName.toLowerCase().includes(itemPersonSearch.toLowerCase())).map((u: any) => (
                              <button key={u.id} type="button" onClick={() => { setNewItem(prev => ({...prev, assigneeId: u.id})); setItemPersonOpen(false) }}
                                className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition"
                                style={{ color: newItem.assigneeId === u.id ? '#7C3AED' : 'var(--todoist-text)', fontWeight: newItem.assigneeId === u.id ? 700 : 400, backgroundColor: newItem.assigneeId === u.id ? '#F3EEFF' : 'transparent' }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: newItem.assigneeId === u.id ? '#7C3AED' : 'var(--todoist-text-tertiary)' }}>
                                  {u.fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                                </div>
                                {u.fullName}
                                {newItem.assigneeId === u.id && <span className="ml-auto" style={{ color: '#7C3AED' }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Zorluk seç */}
                    <div className="relative shrink-0">
                      <button type="button" onClick={() => setNewItem(prev => ({...prev, _prioOpen: !prev._prioOpen}))}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition whitespace-nowrap"
                        style={{ backgroundColor: 'var(--todoist-surface)', border: `1px solid ${P[newItem.priority as keyof typeof P] || 'var(--todoist-divider)'}`, color: P[newItem.priority as keyof typeof P] || 'var(--todoist-text-secondary)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill={P[newItem.priority as keyof typeof P] || '#64748B'} stroke={P[newItem.priority as keyof typeof P] || '#64748B'} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        {newItem.priority === 'CRITICAL' ? 'Kritik' : newItem.priority === 'HIGH' ? 'Yüksək' : newItem.priority === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                        <span style={{ fontSize: 7, color: 'var(--todoist-text-tertiary)' }}>▼</span>
                      </button>
                      {newItem._prioOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl overflow-hidden z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                          {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(p => (
                            <button key={p} type="button"
                              onClick={() => setNewItem(prev => ({ ...prev, priority: p, _prioOpen: false }))}
                              className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition"
                              style={{ color: P[p], fontWeight: newItem.priority === p ? 700 : 400, backgroundColor: newItem.priority === p ? (P[p] + '12') : 'transparent' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill={P[p]} stroke={P[p]} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                              {p === 'CRITICAL' ? 'Kritik' : p === 'HIGH' ? 'Yüksək' : p === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                              {newItem.priority === p && <span className="ml-auto">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Tarix seç */}
                    <input type="date" value={newItem.dueDate} onChange={e => setNewItem({...newItem, dueDate: e.target.value})}
                      min={todayDate}
                      className="rounded-lg px-2.5 py-2 text-[11px] outline-none shrink-0"
                      style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', color: '#10B981' }} />
                    {/* Əlavə et */}
                    <button type="button" onClick={addTaskItem}
                      disabled={!newItem.content.trim() || !newItem.assigneeId}
                      className="rounded-lg px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40 transition shrink-0"
                      style={{ backgroundColor: '#10B981' }}>Əlavə et</button>
                  </div>
                </div>
              )}

              {/* Items list */}
              {newTask.taskItems.length > 0 ? (
                <div className="space-y-1.5">
                  {newTask.taskItems.map((item, i) => {
                    const u = users.find(x => x.id === item.assigneeId)
                    const isExpanded = expandedItem === i
                    const pColor = P[item.priority as keyof typeof P] || '#B3B3B3'
                    const canEdit = !item._status || item._status === 'CREATED' || item._status === 'PENDING'
                    const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
                      CREATED: { label: 'Yaradıldı', color: '#64748B', bg: '#F1F5F9' },
                      PENDING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
                      IN_PROGRESS: { label: 'Davam edir', color: '#3B82F6', bg: '#EFF6FF' },
                      COMPLETED: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
                      DECLINED: { label: 'Rədd', color: '#EF4444', bg: '#FEF2F2' },
                      FORCE_COMPLETED: { label: 'Bağlandı', color: '#94A3B8', bg: '#F1F5F9' },
                    }
                    const st = statusLabels[item._status || 'CREATED'] || statusLabels.CREATED
                    return (
                      <div key={i} className="rounded-lg overflow-hidden transition hover:shadow-sm"
                        style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', opacity: canEdit ? 1 : 0.7 }}>
                        <div style={{ height: 3, backgroundColor: pColor }} />
                        <div className="flex items-center gap-2.5 px-3 py-2">
                          {/* Content */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => canEdit ? setExpandedItem(isExpanded ? null : i) : null}>
                            {canEdit && isExpanded ? (
                              <input type="text" value={item.content}
                                onChange={e => setNewTask(prev => ({ ...prev, taskItems: prev.taskItems.map((ti, idx) => idx === i ? { ...ti, content: e.target.value } : ti) }))}
                                className="w-full text-[11px] outline-none rounded px-1 py-0.5"
                                style={{ backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)' }}
                                autoFocus />
                            ) : (
                              <p className={`text-[11px] leading-snug ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`} style={{ color: 'var(--todoist-text)' }}>
                                {item.content}
                              </p>
                            )}
                          </div>
                          {/* Person */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                              style={{ backgroundColor: '#7C3AED' }}>
                              {u?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0,2) || '?'}
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>
                              {u?.fullName?.split(' ')[0] || '?'}
                            </span>
                          </div>
                          {/* Date — düzənlənə bilən */}
                          {canEdit ? (
                            <input type="date" value={item.dueDate}
                              onChange={e => setNewTask(prev => ({ ...prev, taskItems: prev.taskItems.map((ti, idx) => idx === i ? { ...ti, dueDate: e.target.value } : ti) }))}
                              className="text-[10px] font-medium shrink-0 outline-none rounded px-1 py-0.5"
                              style={{ color: '#10B981', backgroundColor: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', width: 110 }} />
                          ) : (
                            <span className="text-[10px] font-medium shrink-0" style={{ color: '#10B981' }}>
                              {item.dueDate ? new Date(item.dueDate + 'T00:00').toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }) : '—'}
                            </span>
                          )}
                          {/* Priority — düzənlənə bilən */}
                          {canEdit ? (
                            <div className="relative shrink-0">
                              <button type="button" onClick={() => setNewTask(prev => ({ ...prev, taskItems: prev.taskItems.map((ti, idx) => idx === i ? { ...ti, _prioOpen: !ti._prioOpen } : { ...ti, _prioOpen: false }) }))}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pColor + '20', color: pColor }}>
                                {item.priority === 'CRITICAL' ? 'Kritik' : item.priority === 'HIGH' ? 'Yüksək' : item.priority === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                              </button>
                              {item._prioOpen && (
                                <div className="absolute right-0 top-full mt-1 w-28 rounded-lg shadow-xl overflow-hidden z-50" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }}>
                                  {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(p => (
                                    <button key={p} type="button"
                                      onClick={() => setNewTask(prev => ({ ...prev, taskItems: prev.taskItems.map((ti, idx) => idx === i ? { ...ti, priority: p, _prioOpen: false } : ti) }))}
                                      className="w-full text-left px-2.5 py-1.5 text-[10px] flex items-center gap-1.5 hover:bg-gray-50"
                                      style={{ color: P[p], fontWeight: item.priority === p ? 700 : 400 }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill={P[p]} stroke={P[p]} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                      {p === 'CRITICAL' ? 'Kritik' : p === 'HIGH' ? 'Yüksək' : p === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: pColor + '20', color: pColor }}>
                              {item.priority === 'CRITICAL' ? 'Kritik' : item.priority === 'HIGH' ? 'Yüksək' : item.priority === 'MEDIUM' ? 'Orta' : 'Aşağı'}
                            </span>
                          )}
                          {/* Status badge */}
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          {/* Özəl fayl — yalnız bu işçi görəcək */}
                          {canEdit && (
                            <label className="shrink-0 cursor-pointer transition hover:opacity-70" title="Bu işçiyə özəl fayl əlavə et">
                              <span style={{ color: (item.files?.length || 0) > 0 ? '#4F46E5' : '#CBD5E1', fontSize: 14 }}>📎</span>
                              <input type="file" multiple className="hidden" accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e => {
                                if (e.target.files) {
                                  const newFiles = Array.from(e.target.files)
                                  setNewTask(prev => ({
                                    ...prev,
                                    taskItems: prev.taskItems.map((ti, idx) => idx === i
                                      ? { ...ti, files: [...(ti.files || []), ...newFiles] }
                                      : ti)
                                  }))
                                }
                              }} />
                            </label>
                          )}
                          {/* Delete — yalnız PENDING/CREATED */}
                          {canEdit && (
                            <button type="button" onClick={() => removeTaskItem(i)}
                              className="text-[12px] shrink-0 hover:opacity-70 transition" style={{ color: '#4F46E5' }}>✕</button>
                          )}
                        </div>
                        {/* Özəl fayl siyahısı */}
                        {(item.files?.length || 0) > 0 && (
                          <div className="flex gap-1.5 flex-wrap px-3 pb-2">
                            {item.files!.map((f, fi) => (
                              <span key={fi} className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md"
                                style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                                📎 {f.name.substring(0, 15)}{f.name.length > 15 ? '...' : ''}
                                <button type="button" onClick={() => setNewTask(prev => ({
                                  ...prev,
                                  taskItems: prev.taskItems.map((ti, idx) => idx === i
                                    ? { ...ti, files: (ti.files || []).filter((_, fIdx) => fIdx !== fi) }
                                    : ti)
                                }))} className="text-[10px] hover:text-red-500" style={{ color: '#EF4444' }}>✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : !itemPopupOpen ? (
                <div className="flex-1 flex items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--todoist-hover)', minHeight: 120 }}>
                  <div className="text-center">
                    <p className="text-[11px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>Hələ tapşırıq əlavə edilməyib</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--todoist-text-tertiary)' }}>Yuxarıdakı "+ Əlavə et" düyməsinə basın</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── TOPLU TAPŞIRIQ ── */}
          {newTask.type === 'GOREV' && (<>
            {/* Filial — accordion */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--todoist-hover)', border: openSection === 'biz' ? '1px solid #D4BBFF' : '1px solid transparent' }}>
              <button type="button" onClick={() => { setOpenSection(openSection === 'biz' ? null : 'biz'); setBizSearch('') }}
                className="w-full flex items-center justify-between px-3 py-2.5 transition">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold" style={{ color: '#7C3AED' }}>🏢 Filial</span>
                  {newTask.businessIds.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: '#7C3AED', color: '#fff' }}>{newTask.businessIds.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {newTask.businessIds.length > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: '#7C3AED' }}>
                      {allBizSelected ? 'Hamısı' : availableBusinesses.filter(b => newTask.businessIds.includes(b.id)).map(b => b.name.split(' ')[0]).join(', ')}
                    </span>
                  )}
                  <span className="text-[9px] transition-transform" style={{ color: 'var(--todoist-text-tertiary)', transform: openSection === 'biz' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              </button>
              {openSection === 'biz' && (
                <div className="px-3 pb-3">
                  {availableBusinesses.length > 3 && (
                    <input type="text" value={bizSearch} onChange={e => setBizSearch(e.target.value)} placeholder="Filial axtar..."
                      className="w-full rounded-md px-2 py-1.5 text-[10px] outline-none mb-2" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }} />
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    <button type="button" onClick={selectAllBiz}
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                      style={{ backgroundColor: allBizSelected ? '#7C3AED' : 'var(--todoist-surface)', color: allBizSelected ? '#fff' : 'var(--todoist-text-secondary)' }}>
                      Hamısı{allBizSelected && ' ✓'}
                    </button>
                    {availableBusinesses.filter(b => b.name.toLowerCase().includes(bizSearch.toLowerCase())).map(b => (
                      <button key={b.id} type="button" onClick={() => toggleBiz(b.id)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                        style={{ backgroundColor: newTask.businessIds.includes(b.id) ? '#7C3AED' : 'var(--todoist-surface)', color: newTask.businessIds.includes(b.id) ? '#fff' : 'var(--todoist-text)' }}>
                        {b.name}{newTask.businessIds.includes(b.id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Şöbə — accordion */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--todoist-hover)', border: openSection === 'dept' ? '1px solid #93C5FD' : '1px solid transparent' }}>
              <button type="button" onClick={() => { setOpenSection(openSection === 'dept' ? null : 'dept'); setDeptSearch('') }}
                className="w-full flex items-center justify-between px-3 py-2.5 transition">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--todoist-red)' }}>🏷️ Şöbə</span>
                  {newTask.departmentIds.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: 'var(--todoist-red)', color: '#fff' }}>{newTask.departmentIds.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {newTask.departmentIds.length > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: 'var(--todoist-red)' }}>
                      {allDeptsSelected ? 'Hamısı' : filteredDepartments.filter((d: any) => newTask.departmentIds.includes(d.id)).map((d: any) => d.name).join(', ')}
                    </span>
                  )}
                  <span className="text-[9px] transition-transform" style={{ color: 'var(--todoist-text-tertiary)', transform: openSection === 'dept' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              </button>
              {openSection === 'dept' && (
                <div className="px-3 pb-3">
                  {filteredDepartments.length > 3 && (
                    <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Şöbə axtar..."
                      className="w-full rounded-md px-2 py-1.5 text-[10px] outline-none mb-2" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }} />
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    <button type="button" onClick={selectAllDepts}
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                      style={{ backgroundColor: allDeptsSelected ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: allDeptsSelected ? '#fff' : 'var(--todoist-text-secondary)' }}>
                      Hamısı{allDeptsSelected && ' ✓'}
                    </button>
                    {filteredDepartments.filter((d: any) => d.name.toLowerCase().includes(deptSearch.toLowerCase())).map((d: any) => (
                      <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                        style={{ backgroundColor: newTask.departmentIds.includes(d.id) ? (d.color || 'var(--todoist-red)') : 'var(--todoist-surface)', color: newTask.departmentIds.includes(d.id) ? '#fff' : 'var(--todoist-text)' }}>
                        {d.name}{newTask.departmentIds.includes(d.id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* İşçi — accordion */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--todoist-hover)', border: openSection === 'worker' ? '1px solid #6EE7B7' : '1px solid transparent' }}>
              <button type="button" onClick={() => { setOpenSection(openSection === 'worker' ? null : 'worker'); setWorkerSearch('') }}
                className="w-full flex items-center justify-between px-3 py-2.5 transition">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>👤 İşçilər</span>
                  {newTask.assigneeIds.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: '#10B981', color: '#fff' }}>{newTask.assigneeIds.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {newTask.assigneeIds.length > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: '#10B981' }}>
                      {allWorkersSelected ? 'Hamısı' : newTask.assigneeIds.length + ' nəfər'}
                    </span>
                  )}
                  <span className="text-[9px] transition-transform" style={{ color: 'var(--todoist-text-tertiary)', transform: openSection === 'worker' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              </button>
              {openSection === 'worker' && (
                <div className="px-3 pb-3">
                  {filteredUsers.length === 0 ? (
                    <p className="text-[10px] text-center py-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Filial və ya şöbə seçin</p>
                  ) : (<>
                    {filteredUsers.length > 4 && (
                      <input type="text" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} placeholder="İşçi axtar..."
                        className="w-full rounded-md px-2 py-1.5 text-[10px] outline-none mb-2" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }} />
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      <button type="button" onClick={selectAllWorkers}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                        style={{ backgroundColor: allWorkersSelected ? '#10B981' : 'var(--todoist-surface)', color: allWorkersSelected ? '#fff' : 'var(--todoist-text-secondary)' }}>
                        Hamısı{allWorkersSelected && ' ✓'}
                      </button>
                      {filteredUsers.filter((u: any) => u.fullName.toLowerCase().includes(workerSearch.toLowerCase())).map((u: any) => {
                        const sel = newTask.assigneeIds.includes(u.id)
                        return (
                          <button key={u.id} type="button" onClick={() => toggleWorker(u.id)}
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition"
                            style={{ backgroundColor: sel ? '#10B981' : 'var(--todoist-surface)', color: sel ? '#fff' : 'var(--todoist-text)' }}>
                            {u.fullName}{sel && ' ✓'}
                          </button>
                        )
                      })}
                    </div>
                  </>)}
                </div>
              )}
            </div>

            {/* Fayl əlavə et */}
            <div>
              <label className="flex items-center justify-center gap-2 rounded-lg p-2.5 cursor-pointer transition" style={{ backgroundColor: 'var(--todoist-hover)', border: '1px dashed var(--todoist-text-tertiary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--todoist-text-secondary)' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span className="text-[11px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>📎 Fayl əlavə et (hamıya göndəriləcək)</span>
                <input type="file" multiple className="hidden" accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} />
              </label>
              {newTask.files.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {newTask.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1" style={{ backgroundColor: 'var(--todoist-red-light)' }}>
                      <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--todoist-red)' }}>{f.name}</span>
                      <span className="text-[8px]" style={{ color: 'var(--todoist-text-secondary)' }}>{(f.size/1024).toFixed(0)}KB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-[10px]" style={{ color: '#4F46E5' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>)}

          {/* ═══ Təkrarlanan Bölmə ═══ */}
          {newTask.isRecurring && !viewMode && (
            <div className="px-5 pb-3 space-y-3">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <div className="text-[10px] font-bold mb-2" style={{ color: '#4F46E5' }}>🔁 Təkrarlama qaydası — sistem avtomatik göndərəcək</div>
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ backgroundColor: '#fff', border: '1px solid #C7D2FE' }}>
                  <span className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>Hər</span>
                  <select value={newTask.scheduleType} onChange={e => setNewTask(prev => ({ ...prev, scheduleType: e.target.value as any }))}
                    className="rounded px-2 py-1 text-[11px] font-semibold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5', backgroundColor: '#F5F3FF' }}>
                    <option value="MONTHLY">ayın</option>
                    <option value="WEEKLY">həftənin</option>
                  </select>
                  {newTask.scheduleType === 'MONTHLY' ? (
                    <input type="number" value={newTask.dayOfMonth} onChange={e => setNewTask(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))} min={1} max={31}
                      className="w-[42px] text-center rounded px-1 py-1 text-[11px] font-bold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5' }} />
                  ) : (
                    <select value={newTask.dayOfWeek} onChange={e => setNewTask(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                      className="rounded px-2 py-1 text-[11px] font-semibold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5', backgroundColor: '#F5F3FF' }}>
                      {['Bazar','B.e.','Ç.a.','Çərşənbə','C.a.','Cümə','Şənbə'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  )}
                  {newTask.scheduleType === 'MONTHLY' && <span className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>-u/ı/si</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg p-2" style={{ border: '1.5px solid #C7D2FE', backgroundColor: '#F5F3FF' }}>
                    <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>📅 ATANMA</div>
                    <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Nə vaxt göndərilsin?</div>
                    <div className="text-[12px] font-bold" style={{ color: '#4F46E5' }}>{newTask.scheduleType === 'MONTHLY' ? `Ayın ${newTask.dayOfMonth}-i` : ['Bazar','B.e.','Ç.a.','Çərşənbə','C.a.','Cümə','Şənbə'][newTask.dayOfWeek]}</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ border: '1.5px solid #FFE0B2', backgroundColor: '#FFF8F0' }}>
                    <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>🔔 BİLDİRİM</div>
                    <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Xatırlatma günü</div>
                    <input type="number" value={newTask.notificationDay} onChange={e => setNewTask(prev => ({ ...prev, notificationDay: Number(e.target.value) }))} min={1} max={31}
                      className="w-[50px] text-center rounded px-1 py-0.5 text-[12px] font-bold outline-none" style={{ border: '1.5px solid #FFE0B2' }} />
                  </div>
                  <div className="rounded-lg p-2" style={{ border: '1.5px solid #FFCDD2', backgroundColor: '#FFF5F5' }}>
                    <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>⏰ SON TARİX</div>
                    <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Nə vaxta tamamlanmalı?</div>
                    <input type="number" value={newTask.deadlineDay} onChange={e => setNewTask(prev => ({ ...prev, deadlineDay: Number(e.target.value) }))} min={1} max={31}
                      className="w-[50px] text-center rounded px-1 py-0.5 text-[12px] font-bold outline-none" style={{ border: '1.5px solid #FFCDD2' }} />
                  </div>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newTask.hasEndDate} onChange={e => setNewTask(prev => ({ ...prev, hasEndDate: e.target.checked }))} />
                    <span className="text-[10px] font-semibold" style={{ color: '#64748B' }}>Bitiş tarixi qoy</span>
                  </label>
                  {newTask.hasEndDate && (
                    <input type="date" value={newTask.endDate} onChange={e => setNewTask(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 rounded px-2 py-1 text-[11px] outline-none" style={{ border: '1.5px solid #E2E8F0' }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── DÜYMƏLƏR ── */}
          <div className="border-t pt-3 mt-auto flex items-center justify-between" style={{ borderColor: 'var(--todoist-divider)' }}>
            {editingTask ? (
              <button type="button" onClick={handleDeleteTask} disabled={deleteLoading}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
                style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>
                {deleteLoading ? 'Silinir...' : '🗑 Sil'}
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={handleClose} className="rounded-lg px-4 py-2 text-[12px] font-semibold" style={{ color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-hover)' }}>Ləğv et</button>
              <button type="submit" disabled={addLoading || !newTask.title.trim() || (newTask.type === 'TASK' && !editingTask && newTask.taskItems.length === 0)} className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#4F46E5' }}>
                {addLoading ? (editingTask ? 'Yenilənir...' : 'Yaradılır...') : editingTask ? 'Yadda saxla' : newTask.type === 'GOREV' ? 'Toplu tapşırıq yarat' : `Tapşırıqları yarat (${newTask.taskItems.length})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      open={confirmModal.open}
      title={confirmModal.title}
      message={confirmModal.message}
      type={confirmModal.type}
      confirmText={confirmModal.confirmText}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
    />
  </>)
}
