'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import TaskItem from '@/components/todoist/TaskItem'
import TaskQuickAdd from '@/components/todoist/TaskQuickAdd'
import TaskDetailModal from '@/components/todoist/TaskDetailModal'
import SectionGroup from '@/components/todoist/SectionGroup'
import DraggableTaskList from '@/components/todoist/DraggableTaskList'
import DraggableTodoList from '@/components/todoist/DraggableTodoList'
import TodoBoardView from '@/components/todoist/TodoBoardView'
import BoardView from '@/components/todoist/BoardView'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { api } from '@/lib/api'
import { useTodoContext } from '@/contexts/TodoContext'
import SaveAsTemplateModal from '@/components/todoist/SaveAsTemplateModal'
import PageGuard from '@/components/PageGuard'
import toast from 'react-hot-toast'

type StatusFilter = 'active' | 'completed' | 'all'
type ViewType = 'list' | 'board' | 'calendar'

const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const DAY_HEADERS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B']

function toCalDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function TodoPage() {
  const { projects, refreshProjects, inboxId, openQuickAdd } = useTodoContext()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')
  const labelIdFromUrl = searchParams.get('labelId')

  const [tasks, setTasks] = useState<any[]>([])
  const [gorevTasks, setGorevTasks] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [labels, setLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [viewType, setViewType] = useState<ViewType>('list')
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [showTodoInline, setShowTodoInline] = useState(false)
  const [todoInlineValue, setTodoInlineValue] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'gorev' | 'todo'>('all')
  const [todoStatusFilter, setTodoStatusFilter] = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'>('ALL')
  const [selectedGorev, setSelectedGorev] = useState<any>(null)
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  // Calendar drag-drop
  const [calDragTaskId, setCalDragTaskId] = useState<string | null>(null)
  const [calDragOverDate, setCalDragOverDate] = useState<string | null>(null)

  // Bulk move modal
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveProjectId, setBulkMoveProjectId] = useState('')
  // Calendar quick add
  const [calAddDate, setCalAddDate] = useState<string | null>(null)
  const [calAddContent, setCalAddContent] = useState('')
  // Shortcuts modal
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const activeProjectId = projectIdFromUrl || null
  const activeProject = activeProjectId ? projects.find((p: any) => p.id === activeProjectId) : null
  const isInbox = !activeProjectId && !labelIdFromUrl

  // Data yüklə
  const loadData = useCallback(async () => {
    try {
      const params: any = { includeCompleted: 'true' }
      if (activeProjectId) params.projectId = activeProjectId
      if (labelIdFromUrl) params.labelId = labelIdFromUrl
      const [tasksData, labelsData] = await Promise.all([
        api.getTodoistTasks(params),
        api.getTodoistLabels().catch(() => []),
      ])
      setTasks(tasksData)
      setLabels(labelsData)

      if (activeProjectId) {
        // Layihə — seksiyalar + GÖREV-lər
        const sectionsData = await api.getTodoistSections(activeProjectId)
        setSections(sectionsData)
        const gorevData = await api.getTasks({ projectId: activeProjectId }).catch(() => [])
        setGorevTasks(gorevData)
      } else if (labelIdFromUrl) {
        // Etiket — seksiya yox, GÖREV-lər etiketə görə
        setSections([])
        const gorevData = await api.getTasks({ labelId: labelIdFromUrl }).catch(() => [])
        setGorevTasks(gorevData)
      } else {
        setSections([])
        setGorevTasks([])
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [activeProjectId, labelIdFromUrl])

  useEffect(() => {
    setLoading(true)
    setStatusFilter('active')
    setLabelFilter(null)
    setTypeFilter('all')
    loadData()
  }, [activeProjectId, labelIdFromUrl, loadData])

  // Klaviatura qısayolları
  useEffect(() => {
    const onViewChange = (e: Event) => {
      const view = (e as CustomEvent).detail as ViewType
      setViewType(view)
    }
    const onShowShortcuts = () => setShortcutsOpen(true)
    const onEscape = () => {
      setSelectedTaskId(null)
      setSelectedGorev(null)
      setBulkMoveOpen(false)
      setCalAddDate(null)
      setShortcutsOpen(false)
    }
    const onTaskAdded = () => loadData()
    window.addEventListener('todo-view-change', onViewChange)
    window.addEventListener('todo-show-shortcuts', onShowShortcuts)
    window.addEventListener('todo-escape', onEscape)
    window.addEventListener('todo-task-added', onTaskAdded)
    return () => {
      window.removeEventListener('todo-view-change', onViewChange)
      window.removeEventListener('todo-show-shortcuts', onShowShortcuts)
      window.removeEventListener('todo-escape', onEscape)
      window.removeEventListener('todo-task-added', onTaskAdded)
    }
  }, [loadData])

  // Tapşırıq əməliyyatları
  const handleAdd = async (data: any, sectionId?: string) => {
    // Optimistik: anında siyahıya əlavə et
    const tempId = `temp-${Date.now()}`
    const tempTask = {
      id: tempId, content: data.content, priority: data.priority || 'P4',
      dueDate: data.dueDate || null, isCompleted: false, todoStatus: 'WAITING',
      sectionId: sectionId || null, labels: [], subTasks: [], attachments: [],
      _isTemp: true,
    }
    setTasks(prev => [tempTask, ...prev])
    try {
      await api.createTodoistTask({
        content: data.content, priority: data.priority, dueDate: data.dueDate,
        projectId: activeProjectId || undefined, sectionId: sectionId || undefined,
        labelIds: data.labelIds,
        isRecurring: data.isRecurring || false,
        recurRule: data.recurRule || undefined,
      })
      loadData(); refreshProjects()
    } catch (err: any) {
      setTasks(prev => prev.filter(t => t.id !== tempId))
      alert(err.message)
    }
  }

  const handleAddTodoInline = async () => {
    if (!todoInlineValue.trim()) return
    setShowTodoInline(false)
    setTodoInlineValue('')
    await handleAdd({ content: todoInlineValue.trim(), priority: 'P4' })
  }

  const handleToggle = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    try {
      if (isInbox) {
        // Inbox-da TODO: status dəyişir (yox olmur)
        const newStatus = (task.todoStatus || 'WAITING') === 'DONE' ? 'WAITING' : 'DONE'
        // Optimistik yeniləmə
        setTasks(prev => prev.map(t => t.id === id ? { ...t, todoStatus: newStatus } : t))
        await api.updateTodoistTask(id, { todoStatus: newStatus })
        toast(newStatus === 'DONE' ? '✅ Tamamlandı' : '↩️ Geri açıldı')
        loadData()
      } else if (task.isCompleted) {
        await api.uncompleteTodoistTask(id)
        toast('Tapşırıq geri açıldı', { icon: '↩️' })
        loadData(); refreshProjects()
      } else {
        await api.completeTodoistTask(id)
        toast((t) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✅ Tamamlandı</span>
            <button onClick={() => { api.uncompleteTodoistTask(id).then(() => { loadData(); refreshProjects() }); toast.dismiss(t.id) }}
              style={{ marginLeft: 8, padding: '2px 8px', fontSize: 12, borderRadius: 4, backgroundColor: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Geri al
            </button>
          </div>
        ), { duration: 5000 })
        loadData(); refreshProjects()
      }
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    // Silmədən əvvəl toast ilə təsdiq
    toast((t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🗑️ "{task?.content?.slice(0, 20) || 'Tapşırıq'}..." silinsin?</span>
        <button onClick={async () => {
          toast.dismiss(t.id)
          try {
            await api.deleteTodoistTask(id)
            toast('Silindi', { icon: '✅', duration: 2000 })
            loadData(); refreshProjects()
          } catch (err: any) { toast.error(err.message) }
        }} style={{ padding: '2px 10px', fontSize: 12, borderRadius: 4, backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Sil
        </button>
        <button onClick={() => toast.dismiss(t.id)} style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4, backgroundColor: '#6B7280', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Ləğv
        </button>
      </div>
    ), { duration: 6000 })
  }

  const handleReorder = async (items: { id: string; sortOrder: number }[]) => {
    try { await api.reorderTodoistTasks(items); loadData() } catch (err: any) { console.error(err) }
  }

  // Seksiyalar arası köçürmə (drag-drop)
  const handleMoveToSection = async (taskId: string, sectionId: string | null) => {
    try {
      await api.updateTodoistTask(taskId, { sectionId: sectionId || null })
      loadData()
    } catch (err: any) { console.error(err) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.size === 0) return
    try {
      await api.bulkTodoistAction([...selectedIds], action, payload)
      setSelectedIds(new Set())
      setBulkMode(false)
      loadData(); refreshProjects()
    } catch (err: any) { alert(err.message) }
  }

  // Seksiya əməliyyatları
  const handleAddSection = async () => {
    if (!newSectionName.trim() || !activeProjectId) return
    try {
      await api.createTodoistSection({ name: newSectionName.trim(), projectId: activeProjectId })
      setNewSectionName('')
      setAddSectionOpen(false)
      loadData()
    } catch (err: any) { alert(err.message) }
  }

  const handleRenameSection = async (id: string, name: string) => {
    try { await api.updateTodoistSection(id, { name }); loadData() } catch (err: any) { alert(err.message) }
  }

  const handleDeleteSection = async (id: string) => {
    toast((t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🗑️ Seksiya silinsin?</span>
        <button onClick={async () => {
          toast.dismiss(t.id)
          try { await api.deleteTodoistSection(id); loadData() } catch (err: any) { toast.error(String(err)) }
        }} style={{ padding: '2px 10px', fontSize: 12, borderRadius: 4, backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sil</button>
        <button onClick={() => toast.dismiss(t.id)} style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4, backgroundColor: '#6B7280', color: '#fff', border: 'none', cursor: 'pointer' }}>Ləğv</button>
      </div>
    ), { duration: 8000 })
  }

  // Search state (layout.tsx / klaviatura ilə fokuslanır)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrləmə
  let filteredTasks = tasks.filter(t => !t.isCompleted)
  if (labelFilter) filteredTasks = filteredTasks.filter(t => t.labels?.some((l: any) => l.label?.id === labelFilter || l.labelId === labelFilter))
  if (todoStatusFilter !== 'ALL') filteredTasks = filteredTasks.filter(t => (t.todoStatus || 'WAITING') === todoStatusFilter)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filteredTasks = filteredTasks.filter(t =>
      t.content?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.labels?.some((l: any) => (l.label?.name || l.name)?.toLowerCase().includes(q))
    )
  }

  const activeTasks = tasks.filter(t => !t.isCompleted)
  const completedTasks = tasks.filter(t => t.isCompleted)

  // Seksiya bazalı qruplaşdırma (list görünüşü üçün)
  // Inbox-da sectionId fərqi olmadan bütün tapşırıqlar göstərilir
  const unsectionedTasks = isInbox ? filteredTasks : filteredTasks.filter(t => !t.sectionId)
  const sectionedGroups = sections.map(s => ({
    section: s,
    tasks: filteredTasks.filter(t => t.sectionId === s.id),
  }))

  // Calendar grid hesablama
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calMonth.year, calMonth.month, 1)
    const lastDay = new Date(calMonth.year, calMonth.month + 1, 0)
    let startDow = firstDay.getDay()
    if (startDow === 0) startDow = 7

    const cells: { date: Date | null; dateStr: string; isCurrentMonth: boolean }[] = []
    for (let i = 1; i < startDow; i++) {
      const d = new Date(firstDay)
      d.setDate(d.getDate() - (startDow - i))
      cells.push({ date: d, dateStr: toCalDateStr(d), isCurrentMonth: false })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calMonth.year, calMonth.month, d)
      cells.push({ date, dateStr: toCalDateStr(date), isCurrentMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(lastDay)
      d.setDate(d.getDate() + (cells.length - lastDay.getDate() - startDow + 2))
      cells.push({ date: d, dateStr: toCalDateStr(d), isCurrentMonth: false })
    }
    return cells
  }, [calMonth])

  const todayStr = toCalDateStr(new Date())

  const activeLabel = labelIdFromUrl ? labels.find((l: any) => l.id === labelIdFromUrl) : null
  const viewTitle = activeProject ? activeProject.name : activeLabel ? activeLabel.name : 'Bütün Tapşırıqlar'
  const viewColor = activeProject?.color || activeLabel?.color || undefined

  return (
    <PageGuard requires={[]}>
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <div className="flex items-center gap-3">
            {viewColor && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: viewColor }} />}
            <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>{viewTitle}</h1>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>
            {activeLabel ? `"${activeLabel.name}" etiketli tapşırıqlar` : activeProject ? 'Layihə tapşırıqları' : 'Şəxsi tapşırıqlar'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TODO / Tapşırıq əlavə et */}
          <button onClick={openQuickAdd}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--todoist-red)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            {isInbox ? 'TODO əlavə et' : 'Tapşırıq əlavə et'}
          </button>

          {/* Şablon kimi saxla — yalnız layihələrdə */}
          {!isInbox && tasks.length > 0 && (
            <button onClick={() => setSaveTemplateOpen(true)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
              style={{ border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)', backgroundColor: 'var(--todoist-surface)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
              Şablon kimi saxla
            </button>
          )}

          {/* Bulk mode toggle */}
          <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition ${bulkMode ? 'bg-[var(--todoist-red)] text-white border-[var(--todoist-red)]' : 'bg-white text-[var(--todoist-text-secondary)] border-[var(--todoist-divider)] hover:bg-gray-50'}`}>
            {bulkMode ? '✕ Ləğv et' : '☑ Seç'}
          </button>

        {/* List/Board/Calendar toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--todoist-divider)]">
          <button onClick={() => setViewType('list')}
            className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition
              ${viewType === 'list' ? 'bg-[var(--todoist-red)] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            Siyahı
          </button>
          <button onClick={() => setViewType('board')}
            className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition
              ${viewType === 'board' ? 'bg-[var(--todoist-red)] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/></svg>
            Board
          </button>
          {!isInbox && (
            <button onClick={() => setViewType('calendar')}
              className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition
                ${viewType === 'calendar' ? 'bg-[var(--todoist-red)] text-white' : 'bg-white text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Təqvim
            </button>
          )}
        </div>
        </div>
      </div>
      {/* Axtarış + hint */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            data-search
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); (e.target as HTMLInputElement).blur() } }}
            placeholder="Tapşırıqlarda axtar..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none transition"
            style={{ background: 'var(--todoist-sidebar-hover)', border: '1px solid var(--todoist-border)', color: 'var(--todoist-text)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-[var(--todoist-border)]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <span className="text-[11px] hidden sm:flex items-center gap-1" style={{ color: 'var(--todoist-text-tertiary)' }}>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>/</kbd> axtar
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono ml-2" style={{ background: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>?</kbd> kömək
        </span>
      </div>

      {/* Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-[#FFF5F3] border border-[var(--todoist-red-light)]">
          <span className="text-[12px] font-bold text-[var(--todoist-red)]">{selectedIds.size} seçildi</span>
          <div className="flex-1" />
          <button onClick={() => handleBulkAction('complete')}
            className="px-3 py-1.5 rounded-lg bg-[#058527] text-white text-[11px] font-bold">✓ Tamamla</button>
          <button onClick={() => setBulkMoveOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#246FE0] text-white text-[11px] font-bold">↗ Köçür</button>
          <button onClick={() => {
            toast((t) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🗑️ {selectedIds.size} tapşırıq silinsin?</span>
                <button onClick={async () => { toast.dismiss(t.id); handleBulkAction('delete') }}
                  style={{ padding: '2px 10px', fontSize: 12, borderRadius: 4, backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sil</button>
                <button onClick={() => toast.dismiss(t.id)}
                  style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4, backgroundColor: '#6B7280', color: '#fff', border: 'none', cursor: 'pointer' }}>Ləğv</button>
              </div>
            ), { duration: 8000 })
          }}
            className="px-3 py-1.5 rounded-lg bg-[var(--todoist-red)] text-white text-[11px] font-bold">🗑 Sil</button>
          <button onClick={() => { setSelectedIds(new Set()); setBulkMode(false) }}
            className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-[var(--todoist-text-secondary)] hover:bg-[var(--todoist-border)]">Ləğv et</button>
        </div>
      )}

      {/* Tip filtr — Hamısı / GÖREV / TODO (yalnız layihə/etiket açıq olanda) */}
      {(activeProjectId || labelIdFromUrl) && gorevTasks.length > 0 && (
        <div className="flex gap-0 mb-3 border-b-2 border-[var(--todoist-divider)] overflow-x-auto">
          {([
            { key: 'all' as const, label: 'Hamısı', count: tasks.length + gorevTasks.length },
            { key: 'gorev' as const, label: 'GÖREV', count: gorevTasks.length, color: '#246FE0' },
            { key: 'todo' as const, label: 'TODO', count: tasks.length, color: '#EB8909' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5 whitespace-nowrap
                ${typeFilter === tab.key ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
              {tab.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: tab.color }} />}
              {tab.label}
              <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${typeFilter === tab.key ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      {typeFilter !== 'gorev' && (
        <div className="flex gap-0 mb-3 border-b-2 border-[var(--todoist-divider)] overflow-x-auto">
          {([
            { key: 'ALL' as const,        label: 'Hamısı',        dot: null },
            { key: 'WAITING' as const,    label: 'Gözləyir',      dot: '#94A3B8' },
            { key: 'IN_PROGRESS' as const,label: 'Davam edir',    dot: '#F59E0B' },
            { key: 'DONE' as const,       label: 'Tamamlandı',    dot: '#10B981' },
            { key: 'CANCELLED' as const,  label: 'İptal edilib',  dot: '#EF4444' },
          ]).map(s => (
            <button key={s.key} onClick={() => setTodoStatusFilter(s.key)}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5 whitespace-nowrap
                ${todoStatusFilter === s.key ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
              {s.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />}
              {s.label}
              <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${todoStatusFilter === s.key ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>
                {s.key === 'ALL'
                  ? tasks.filter(t => !t.isCompleted).length
                  : tasks.filter(t => !t.isCompleted && (t.todoStatus || 'WAITING') === s.key).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Label chip filtrləri */}
      {labels.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap items-center">
          <span className="text-[10px] font-bold text-[var(--todoist-text-tertiary)] uppercase mr-1">Etiketlər:</span>
          <button onClick={() => setLabelFilter(null)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold transition border-[1.5px]"
            style={{ backgroundColor: !labelFilter ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: !labelFilter ? 'var(--todoist-surface)' : 'var(--todoist-text-secondary)', borderColor: !labelFilter ? 'var(--todoist-red)' : 'var(--todoist-divider)' }}>
            Hamısı
          </button>
          {labels.map((label: any) => (
            <button key={label.id} onClick={() => setLabelFilter(labelFilter === label.id ? null : label.id)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition border-[1.5px] flex items-center gap-1"
              style={{
                backgroundColor: labelFilter === label.id ? (label.color || 'var(--todoist-text-secondary)') : 'var(--todoist-surface)',
                color: labelFilter === label.id ? 'var(--todoist-surface)' : (label.color || 'var(--todoist-text-secondary)'),
                borderColor: labelFilter === label.id ? (label.color || 'var(--todoist-text-secondary)') : 'var(--todoist-divider)',
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: labelFilter === label.id ? 'var(--todoist-surface)' : (label.color || 'var(--todoist-text-secondary)') }} />
              {label.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-full rounded bg-[var(--todoist-border)]" />
          <div className="h-10 w-full rounded bg-[var(--todoist-border)]" />
          <div className="h-10 w-full rounded bg-[var(--todoist-border)]" />
        </div>
      ) : typeFilter === 'gorev' ? (
        /* ═══ YALNIZ GÖREV GÖRÜNÜŞü ═══ */
        <div>
          {gorevTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-[14px] font-semibold mb-1 text-[var(--todoist-text)]">Bu layihəyə aid görev yoxdur</p>
              <p className="text-[12px] text-[var(--todoist-text-secondary)]">Görev yaradarkən layihə seçin</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {gorevTasks.map((gt: any) => (
                <div key={gt.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--todoist-sidebar-hover)] transition"
                  onClick={() => setSelectedGorev(gt)}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: gt.priority === 'CRITICAL' ? '#DC4C3E' : gt.priority === 'HIGH' ? '#EB8909' : gt.priority === 'MEDIUM' ? '#246FE0' : '#B3B3B3'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--todoist-text)' }}>{gt.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: gt.status === 'COMPLETED' ? '#058527' : gt.status === 'IN_PROGRESS' ? '#EB8909' : 'var(--todoist-text-tertiary)' }}>
                        {gt.status === 'CREATED' ? '⏳ Gözləyir' : gt.status === 'IN_PROGRESS' ? '🔄 Davam edir' : gt.status === 'COMPLETED' ? '✅ Tamamlandı' : gt.status === 'PENDING_APPROVAL' ? '📋 Onay gözləyir' : gt.status}
                      </span>
                      {gt.business && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>📍 {gt.business.name}</span>}
                      {gt.assignees?.length > 0 && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>👥 {gt.assignees.length} nəfər</span>}
                      {gt.dueDate && <span className="text-[10px]" style={{ color: new Date(gt.dueDate) < new Date() ? '#DC4C3E' : 'var(--todoist-text-tertiary)' }}>📅 {new Date(gt.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                      {gt.labels?.map((tl: any) => (
                        <span key={tl.label.id} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: tl.label.color + '20', color: tl.label.color }}>{tl.label.name}</span>
                      ))}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : viewType === 'board' && (isInbox || typeFilter === 'todo') ? (
        /* ═══ TODO STATUS BOARD (Gözləyir / Davam edir / Tamamlandı) ═══ */
        <TodoBoardView
          todos={filteredTasks}
          projects={projects}
          onRefresh={loadData}
          onClickTodo={setSelectedTaskId}
          onCompleteTodo={async (id) => { await api.updateTodoistTask(id, { todoStatus: "DONE" }); loadData() }}
        />
      ) : viewType === 'board' && !isInbox ? (
        /* ═══ BOARD GÖRÜNÜŞü ═══ */
        <BoardView
          sections={sections}
          tasks={filteredTasks}
          unsectionedTasks={unsectionedTasks}
          onToggleTask={handleToggle}
          onClickTask={setSelectedTaskId}
          onAddTask={(data) => handleAdd(data, data.sectionId)}
          onAddSection={() => setAddSectionOpen(true)}
          onMoveTask={handleMoveToSection}
          onReorderSections={async (orderedIds) => {
            // Lokal sıranı dərhal yenilə
            const reordered = orderedIds.map(id => sections.find(s => s.id === id)!).filter(Boolean)
            setSections(reordered)
            // Backend-ə sortOrder göndər
            for (let i = 0; i < orderedIds.length; i++) {
              await api.updateTodoistSection(orderedIds[i], { sortOrder: i })
            }
          }}
        />
      ) : viewType === 'calendar' && !isInbox ? (
        /* ═══ TƏQVİM GÖRÜNÜŞü ═══ */
        <div>
          {/* Ay naviqasiyası */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">‹</button>
            <span className="text-[16px] font-bold text-[var(--todoist-text)]">{MONTH_NAMES[calMonth.month]} {calMonth.year}</span>
            <button onClick={() => setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}
              className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text)] text-lg px-2">›</button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-[var(--todoist-divider)] border border-[var(--todoist-divider)] rounded-xl overflow-hidden">
            {DAY_HEADERS.map((d, i) => (
              <div key={d} className="bg-[var(--todoist-bg)] px-2 py-2 text-center text-[10px] font-bold" style={{ color: i >= 5 ? '#246FE0' : 'var(--todoist-text-tertiary)' }}>{d}</div>
            ))}

            {calendarDays.map((cell, i) => {
              const cellTasks = filteredTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === cell.dateStr)
              const isToday = cell.dateStr === todayStr
              const isDragOver = calDragOverDate === cell.dateStr && calDragTaskId !== null
              return (
                <div key={i}
                  className={`min-h-[80px] p-1.5 cursor-pointer transition ${cell.isCurrentMonth ? (isToday ? 'bg-[#FFF5F3]' : 'bg-white') : 'bg-[var(--todoist-bg)]'}`}
                  style={{ outline: isDragOver ? '2px dashed var(--todoist-red)' : undefined, backgroundColor: isDragOver ? 'var(--todoist-red-light)' : undefined }}
                  onClick={() => {
                    if (cell.dateStr) {
                      setCalAddDate(cell.dateStr)
                      setCalAddContent('')
                    }
                  }}
                  onDragOver={e => { e.preventDefault(); if (cell.dateStr) setCalDragOverDate(cell.dateStr) }}
                  onDragLeave={() => setCalDragOverDate(null)}
                  onDrop={async (e) => {
                    e.preventDefault()
                    setCalDragOverDate(null)
                    if (calDragTaskId && cell.dateStr) {
                      try {
                        await api.updateTodoistTask(calDragTaskId, { dueDate: cell.dateStr })
                        toast('📅 Tarix dəyişdirildi', { duration: 2000 })
                        loadData()
                      } catch { toast.error('Xəta') }
                      setCalDragTaskId(null)
                    }
                  }}>
                  <span className={`text-[11px] font-semibold inline-flex items-center justify-center
                    ${isToday ? 'w-[22px] h-[22px] rounded-full bg-[var(--todoist-red)] text-white' : cell.isCurrentMonth ? 'text-[var(--todoist-text)]' : 'text-[#D4D4D4]'}`}>
                    {cell.date?.getDate()}
                  </span>
                  {cellTasks.slice(0, 3).map((task: any) => (
                    <div key={task.id}
                      draggable
                      onDragStart={e => { e.stopPropagation(); setCalDragTaskId(task.id) }}
                      onDragEnd={() => setCalDragTaskId(null)}
                      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id) }}
                      className="mt-0.5 text-[8px] px-1 py-px rounded font-semibold truncate cursor-grab active:cursor-grabbing hover:opacity-80"
                      style={{
                        backgroundColor: (task.priority === 'P1' ? 'var(--todoist-red)' : task.priority === 'P2' ? '#EB8909' : task.priority === 'P3' ? '#246FE0' : 'var(--todoist-text-secondary)') + '18',
                        color: task.priority === 'P1' ? 'var(--todoist-red)' : task.priority === 'P2' ? '#EB8909' : task.priority === 'P3' ? '#246FE0' : 'var(--todoist-text-secondary)',
                      }}>
                      {task.isCompleted ? '✓ ' : ''}{task.content}
                    </div>
                  ))}
                  {cellTasks.length > 3 && (
                    <div className="text-[7px] text-[var(--todoist-text-tertiary)] font-semibold mt-0.5">+{cellTasks.length - 3} daha</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ═══ SİYAHI GÖRÜNÜŞü ═══ */
        <>
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event
            if (!over) return
            const overData = over.data?.current
            if (overData?.type === 'section' && overData.sectionId) {
              const activeData = active.data?.current
              if (activeData?.sectionId !== overData.sectionId) {
                handleMoveToSection(active.id as string, overData.sectionId)
              }
            }
          }}
        >
          {/* Seksiyasız tapşırıqlar */}
          {unsectionedTasks.length > 0 && (
            <div className={`mb-4 ${statusFilter === 'completed' ? 'opacity-60' : ''}`}>
              {bulkMode ? (
                <div className="space-y-0.5">
                  {unsectionedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-1">
                      <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)}
                        className="w-4 h-4 rounded border-[var(--todoist-divider)] text-[var(--todoist-red)] shrink-0 cursor-pointer" />
                      <div className="flex-1">
                        <TaskItem task={task} onToggle={handleToggle} onClick={() => toggleSelect(task.id)} onDelete={handleDelete} showProject={isInbox} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DraggableTaskList tasks={unsectionedTasks} onToggle={handleToggle} onClick={setSelectedTaskId} onDelete={handleDelete} onReorder={handleReorder} showProject={isInbox} />
              )}
            </div>
          )}


          {/* Seksiyalar — yalnız layihələrdə */}
          {!isInbox && sectionedGroups.map(({ section, tasks: sTasks }) => (
            <SectionGroup
              key={section.id}
              section={section}
              tasks={sTasks}
              onToggleTask={handleToggle}
              onClickTask={setSelectedTaskId}
              onAddTask={(data) => handleAdd(data, data.sectionId)}
              onRenameSection={handleRenameSection}
              onDeleteSection={handleDeleteSection}
              onDeleteTask={handleDelete}
              onReorder={handleReorder}
            />
          ))}

          {/* Seksiya əlavə et */}
          {!isInbox && statusFilter !== 'completed' && (
            <div className="mt-2">
              {addSectionOpen ? (
                <div className="flex items-center gap-2">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') { setAddSectionOpen(false); setNewSectionName('') } }}
                    placeholder="Seksiya adı..."
                    className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-[var(--todoist-divider)] outline-none focus:border-[var(--todoist-red)]"
                    autoFocus />
                  <button onClick={handleAddSection} className="px-3 py-2 rounded-lg bg-[var(--todoist-red)] text-white text-[11px] font-bold">Əlavə et</button>
                  <button onClick={() => { setAddSectionOpen(false); setNewSectionName('') }} className="px-3 py-2 rounded-lg text-[11px] font-medium text-[var(--todoist-text-secondary)] hover:bg-[var(--todoist-border)]">Ləğv et</button>
                </div>
              ) : (
                <button onClick={() => setAddSectionOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-red)] transition rounded-lg hover:bg-[var(--todoist-red-light)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Seksiya əlavə et
                </button>
              )}
            </div>
          )}

          {/* ═══ Bu layihəyə/etiketə aid GÖREV-lər ═══ */}
          {(activeProjectId || labelIdFromUrl) && gorevTasks.length > 0 && typeFilter === 'all' && (
            <div className="mt-6 pt-4" style={{ borderTop: '2px solid var(--todoist-divider)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#E8F0FE', color: '#246FE0' }}>GÖREV</span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Bu layihəyə aid görevlər</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--todoist-border)', color: 'var(--todoist-text-tertiary)' }}>{gorevTasks.length}</span>
              </div>
              <div className="space-y-1.5">
                {gorevTasks.map((gt: any) => (
                  <div key={gt.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--todoist-sidebar-hover)] transition"
                    onClick={() => setSelectedGorev(gt)}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      background: gt.priority === 'CRITICAL' ? '#DC4C3E' : gt.priority === 'HIGH' ? '#EB8909' : gt.priority === 'MEDIUM' ? '#246FE0' : '#B3B3B3'
                    }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--todoist-text)' }}>{gt.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>
                          {gt.status === 'CREATED' ? '⏳ Gözləyir' : gt.status === 'IN_PROGRESS' ? '🔄 Davam edir' : gt.status === 'COMPLETED' ? '✅ Tamamlandı' : gt.status}
                        </span>
                        {gt.business && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>📍 {gt.business.name}</span>}
                        {gt.assignees?.length > 0 && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>👥 {gt.assignees.length} nəfər</span>}
                        {gt.dueDate && <span className="text-[10px]" style={{ color: new Date(gt.dueDate) < new Date() ? '#DC4C3E' : 'var(--todoist-text-tertiary)' }}>📅 {new Date(gt.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                        {gt.labels?.map((tl: any) => (
                          <span key={tl.label.id} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: tl.label.color + '20', color: tl.label.color }}>{tl.label.name}</span>
                        ))}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boş state */}
          {filteredTasks.length === 0 && gorevTasks.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[var(--todoist-sidebar-hover)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="1.5">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              </div>
              <p className="text-[14px] font-semibold mb-1 text-[var(--todoist-text)]">
                {statusFilter === 'completed' ? 'Tamamlanmış tapşırıq yoxdur' : labelFilter ? 'Bu etiketdə tapşırıq yoxdur' : 'Tapşırıq yoxdur'}
              </p>
              <p className="text-[12px] text-[var(--todoist-text-secondary)]">
                {statusFilter === 'completed' ? 'Hələ heç bir tapşırıq tamamlanmayıb' : 'Tapşırıq əlavə edin'}
              </p>
            </div>
          )}
        </DndContext>
        </>
      )}

      <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onRefresh={loadData} />

      {/* GÖREV Detalı Modal */}
      {selectedGorev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedGorev(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--todoist-divider)' }}>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#E8F0FE', color: '#246FE0' }}>GÖREV</span>
              <h3 className="text-[16px] font-bold flex-1" style={{ color: 'var(--todoist-text)' }}>{selectedGorev.title}</h3>
              <button onClick={() => setSelectedGorev(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--todoist-border)] transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {selectedGorev.description && (
                <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>{selectedGorev.description}</p>
              )}
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg px-3 py-2" style={{ background: 'var(--todoist-sidebar-hover)' }}>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Status</div>
                  <div className="text-[12px] font-semibold mt-0.5" style={{ color: selectedGorev.status === 'COMPLETED' ? '#058527' : selectedGorev.status === 'IN_PROGRESS' ? '#EB8909' : 'var(--todoist-text)' }}>
                    {selectedGorev.status === 'CREATED' ? '⏳ Gözləyir' : selectedGorev.status === 'IN_PROGRESS' ? '🔄 Davam edir' : selectedGorev.status === 'COMPLETED' ? '✅ Tamamlandı' : selectedGorev.status === 'PENDING_APPROVAL' ? '📋 Onay gözləyir' : selectedGorev.status}
                  </div>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'var(--todoist-sidebar-hover)' }}>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Prioritet</div>
                  <div className="text-[12px] font-semibold mt-0.5" style={{ color: selectedGorev.priority === 'CRITICAL' ? '#DC4C3E' : selectedGorev.priority === 'HIGH' ? '#EB8909' : '#246FE0' }}>
                    {selectedGorev.priority === 'CRITICAL' ? '🔴 Kritik' : selectedGorev.priority === 'HIGH' ? '🟠 Yüksək' : selectedGorev.priority === 'MEDIUM' ? '🔵 Orta' : '⚪ Aşağı'}
                  </div>
                </div>
                {selectedGorev.business && (
                  <div className="rounded-lg px-3 py-2" style={{ background: 'var(--todoist-sidebar-hover)' }}>
                    <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Filial</div>
                    <div className="text-[12px] font-semibold mt-0.5" style={{ color: 'var(--todoist-text)' }}>📍 {selectedGorev.business.name}</div>
                  </div>
                )}
                {selectedGorev.dueDate && (
                  <div className="rounded-lg px-3 py-2" style={{ background: 'var(--todoist-sidebar-hover)' }}>
                    <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Son tarix</div>
                    <div className="text-[12px] font-semibold mt-0.5" style={{ color: new Date(selectedGorev.dueDate) < new Date() ? '#DC4C3E' : 'var(--todoist-text)' }}>
                      📅 {new Date(selectedGorev.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>
              {/* Assignees */}
              {selectedGorev.assignees?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Atanan işçilər</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedGorev.assignees.map((a: any) => (
                      <div key={a.user.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{ background: 'var(--todoist-sidebar-hover)', color: 'var(--todoist-text)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: '#246FE0' }}>
                          {a.user.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        {a.user.fullName}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                          background: a.status === 'COMPLETED' ? '#ECFDF5' : a.status === 'IN_PROGRESS' ? '#FFF8F0' : '#F5F3F0',
                          color: a.status === 'COMPLETED' ? '#058527' : a.status === 'IN_PROGRESS' ? '#EB8909' : '#808080',
                        }}>
                          {a.status === 'COMPLETED' ? '✓' : a.status === 'IN_PROGRESS' ? '◉' : '○'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Sub-tasks */}
              {selectedGorev.subTasks?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Alt görevlər</div>
                  <div className="space-y-1">
                    {selectedGorev.subTasks.map((st: any) => (
                      <div key={st.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
                        style={{ background: st.status === 'COMPLETED' ? '#ECFDF5' : st.status === 'IN_PROGRESS' ? '#FFF8F0' : 'var(--todoist-sidebar-hover)',
                          border: `1px solid ${st.status === 'COMPLETED' ? '#A7F3D0' : st.status === 'IN_PROGRESS' ? '#FFE0B2' : 'var(--todoist-divider)'}` }}>
                        <span style={{ color: st.status === 'COMPLETED' ? '#058527' : st.status === 'IN_PROGRESS' ? '#EB8909' : '#808080' }}>
                          {st.status === 'COMPLETED' ? '✅' : st.status === 'IN_PROGRESS' ? '🔄' : '⏳'}
                        </span>
                        <span className="flex-1" style={{ color: 'var(--todoist-text)' }}>{st.title}</span>
                        <span className="text-[10px] font-medium" style={{ color: st.status === 'COMPLETED' ? '#058527' : st.status === 'IN_PROGRESS' ? '#EB8909' : '#808080' }}>
                          {st.status === 'CREATED' ? 'Gözləyir' : st.status === 'IN_PROGRESS' ? 'Davam edir' : st.status === 'COMPLETED' ? 'Tamamlandı' : st.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Labels */}
              {selectedGorev.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedGorev.labels.map((tl: any) => (
                    <span key={tl.label.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: tl.label.color + '20', color: tl.label.color }}>
                      {tl.label.name}
                    </span>
                  ))}
                </div>
              )}
              {/* Tam detala keçid */}
              <button onClick={() => { setSelectedGorev(null); window.location.href = `/tasks?openTask=${selectedGorev.id}` }}
                className="w-full py-2.5 rounded-lg text-[12px] font-semibold transition hover:opacity-80"
                style={{ background: '#E8F0FE', color: '#246FE0' }}>
                📋 Tam detala keç (Tapşırıqlar səhifəsi)
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveAsTemplateModal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        projectName={activeProject?.name || ''}
        projectColor={activeProject?.color}
        tasks={tasks}
      />

      {/* ═══ BULK MOVE MODAL ═══ */}
      {bulkMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setBulkMoveOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-[380px] p-5"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--todoist-text)' }}>Layihəyə köçür ({selectedIds.size} tapşırıq)</h3>
              <button onClick={() => setBulkMoveOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--todoist-border)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              {projects.filter((p: any) => !p.isInbox).map((p: any) => (
                <button key={p.id} onClick={() => setBulkMoveProjectId(p.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition hover:bg-[var(--todoist-sidebar-hover)]"
                  style={{ background: bulkMoveProjectId === p.id ? (p.color || '#808080') + '18' : undefined, border: `1px solid ${bulkMoveProjectId === p.id ? (p.color || '#808080') : 'transparent'}` }}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color || '#808080' }} />
                  <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--todoist-text)' }}>{p.name}</span>
                  {bulkMoveProjectId === p.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color || '#808080'} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setBulkMoveOpen(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition hover:opacity-80"
                style={{ background: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
              <button onClick={() => {
                if (bulkMoveProjectId) {
                  handleBulkAction('move', { projectId: bulkMoveProjectId })
                  setBulkMoveOpen(false)
                  setBulkMoveProjectId('')
                }
              }} disabled={!bulkMoveProjectId}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition disabled:opacity-40"
                style={{ background: '#246FE0', color: '#fff' }}>↗ Köçür</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CALENDAR QUICK ADD ═══ */}
      {calAddDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCalAddDate(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-[360px] p-5"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                📅 {new Date(calAddDate + 'T00:00:00').toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })} — Yeni tapşırıq
              </h3>
              <button onClick={() => setCalAddDate(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--todoist-border)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <input
              autoFocus
              value={calAddContent}
              onChange={e => setCalAddContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && calAddContent.trim()) {
                  handleAdd({ content: calAddContent.trim(), priority: 'P4', dueDate: calAddDate })
                  setCalAddDate(null)
                  setCalAddContent('')
                }
                if (e.key === 'Escape') setCalAddDate(null)
              }}
              placeholder="Tapşırıq adını yazın..."
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none mb-3"
              style={{ background: 'var(--todoist-sidebar-hover)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setCalAddDate(null)}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition hover:opacity-80"
                style={{ background: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
              <button onClick={() => {
                if (calAddContent.trim()) {
                  handleAdd({ content: calAddContent.trim(), priority: 'P4', dueDate: calAddDate })
                  setCalAddDate(null)
                  setCalAddContent('')
                }
              }} disabled={!calAddContent.trim()}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition disabled:opacity-40"
                style={{ background: 'var(--todoist-red)', color: '#fff' }}>+ Əlavə et</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SHORTCUTS MODAL (?) ═══ */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShortcutsOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-[420px] p-6"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>⌨️ Klaviatura qısayolları</h3>
              <button onClick={() => setShortcutsOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--todoist-border)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { key: 'Q / N', desc: 'Yeni tapşırıq əlavə et' },
                { key: '/', desc: 'Axtarışa fokuslan' },
                { key: 'B', desc: 'Board (Lövhə) görünüşü' },
                { key: 'L', desc: 'List (Siyahı) görünüşü' },
                { key: '?', desc: 'Bu yardım pəncərəsini aç' },
                { key: 'Esc', desc: 'Pəncərəni / paneli bağla' },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--todoist-sidebar-hover)' }}>
                  <span className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>{s.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono"
                    style={{ background: 'var(--todoist-surface)', color: 'var(--todoist-text)', border: '1px solid var(--todoist-divider)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </PageGuard>
  )
}
