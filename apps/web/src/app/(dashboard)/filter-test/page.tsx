'use client'

/**
 * GLASS FILTER TEST SƏHİFƏSİ
 * Variant 4 dizaynının canlı sınağı — real API data + tam interaktiv filterlər
 */

import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import GlassFilterBar, { GlassStatusTab } from '@/components/GlassFilterBar'
import { P, S, PrioFlag, daysDiff } from '@/components/TaskCard'
import { useAuth } from '@/contexts/AuthContext'

// ─── Status tab konfiqurasiyaları ─────────────────────────────────────────
const GOREV_STATUS_TABS = [
  { key: 'ALL',              label: 'Hamısı',       dot: '#94A3B8' },
  { key: 'PENDING',          label: 'Gözləyir',     dot: '#64748B' },
  { key: 'IN_PROGRESS',      label: 'Davam edir',   dot: '#3B82F6' },
  { key: 'PENDING_APPROVAL', label: 'Onay gözləyir',dot: '#F59E0B' },
  { key: 'COMPLETED',        label: 'Tamamlandı',   dot: '#10B981' },
  { key: 'REJECTED',         label: 'Rədd',         dot: '#EF4444' },
]

const TODO_STATUS_TABS = [
  { key: 'ALL',        label: 'Hamısı',    dot: '#94A3B8' },
  { key: 'WAITING',    label: 'Gözləyir',  dot: '#64748B' },
  { key: 'IN_PROGRESS',label: 'Davam edir',dot: '#3B82F6' },
  { key: 'DONE',       label: 'Tamamlandı',dot: '#10B981' },
  { key: 'CANCELLED',  label: 'İptal',     dot: '#EF4444' },
]

// ─── Köməkçilər ──────────────────────────────────────────────────────────
function Badge({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={style}>{label}</span>
  )
}

function TaskRow({ task, isGorev }: { task: any; isGorev: boolean }) {
  const status = isGorev ? S[task.status] : null
  const prioColor = isGorev ? P[task.priority] : P[task.priority]
  const diff = task.dueDate ? daysDiff(task.dueDate) : null

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-[rgba(0,0,0,0.02)] group">
      {/* Checkbox */}
      <div className="w-[18px] h-[18px] rounded-[5px] border-2 shrink-0 transition-all group-hover:border-[var(--todoist-red)]"
        style={{ borderColor: task.status === 'COMPLETED' || task.status === 'DONE' ? '#10B981' : 'rgba(0,0,0,0.15)',
          background: task.status === 'COMPLETED' || task.status === 'DONE' ? '#10B981' : 'transparent' }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-[500] truncate ${
          task.status === 'COMPLETED' || task.status === 'DONE'
            ? 'line-through text-[var(--todoist-text-tertiary)]'
            : 'text-[var(--todoist-text)]'
        }`}>
          {isGorev
            ? (task.subTasks?.[0]?.title || task.title)
            : task.title
          }
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {isGorev && task.assignees?.[0]?.fullName && (
            <span className="text-[11px] text-[var(--todoist-text-tertiary)]">{task.assignees[0].fullName}</span>
          )}
          {(task.project?.name || task.projectName) && (
            <span className="text-[11px] text-[var(--todoist-text-tertiary)]">
              # {task.project?.name || task.projectName}
            </span>
          )}
          {diff !== null && (
            <span className={`text-[11px] font-[500] ${
              diff < 0 ? 'text-red-500' : diff === 0 ? 'text-amber-500' : 'text-[var(--todoist-text-tertiary)]'
            }`}>
              {diff < 0 ? `${-diff} gün gecikdi` : diff === 0 ? 'Bu gün' : `${diff} gün sonra`}
            </span>
          )}
        </div>
      </div>

      {/* Right badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isGorev && task.priority && task.priority !== 'INFO' && (
          <PrioFlag color={prioColor} size={13} />
        )}
        {isGorev && status && (
          <Badge label={status.label} style={{ background: status.bg, color: status.color }} />
        )}
        {!isGorev && task.todoStatus && task.todoStatus !== 'WAITING' && (
          <Badge
            label={task.todoStatus === 'IN_PROGRESS' ? 'Davam edir' : task.todoStatus === 'DONE' ? 'Tamamlandı' : 'İptal'}
            style={{
              background: task.todoStatus === 'DONE' ? '#ECFDF5' : task.todoStatus === 'IN_PROGRESS' ? '#EFF6FF' : '#FEF2F2',
              color: task.todoStatus === 'DONE' ? '#059669' : task.todoStatus === 'IN_PROGRESS' ? '#2563EB' : '#DC2626',
            }}
          />
        )}
        <Badge
          label={isGorev ? 'GÖREV' : 'TODO'}
          style={{
            background: isGorev ? 'rgba(79,70,229,0.08)' : 'rgba(99,102,241,0.06)',
            color: isGorev ? '#4F46E5' : '#6366F1',
          }}
        />
      </div>
    </div>
  )
}

// ─── ANA SƏHIFƏ ────────────────────────────────────────────────────────────
export default function FilterTestPage() {
  const { user } = useAuth()

  // Data
  const [gorevTasks, setGorevTasks]   = useState<any[]>([])
  const [todoTasks, setTodoTasks]     = useState<any[]>([])
  const [businesses, setBusinesses]   = useState<any[]>([])
  const [users, setUsers]             = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  // Filterlər
  const [viewFilter, setViewFilter]   = useState<'all' | 'gorev' | 'todo'>('all')
  const [selectedBiz, setSelectedBiz] = useState('ALL')
  const [selectedPrio, setSelectedPrio] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState('ALL')

  // Ayrı-ayrı status
  const [gorevStatus, setGorevStatus] = useState('ALL')
  const [todoStatus, setTodoStatus]   = useState('ALL')

  // ── Data yükləmə ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [tasks, todoTasks, departments, userList] = await Promise.all([
          api.getTasks().catch(() => []),
          api.getTodoistTasks().catch(() => []),
          api.getDepartments().catch(() => []),
          api.getUsers().catch(() => []),
        ])
        setGorevTasks(Array.isArray(tasks) ? tasks : [])
        setTodoTasks(Array.isArray(todoTasks) ? todoTasks : [])
        setBusinesses(Array.isArray(departments) ? departments : [])
        setUsers(Array.isArray(userList) ? userList : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Filtrləmə məntiqləri ─────────────────────────────────────────────────
  const filteredGorev = useMemo(() => {
    return gorevTasks.filter(t => {
      if (selectedBiz !== 'ALL' && t.departmentId !== selectedBiz && t.businessId !== selectedBiz) return false
      if (selectedPrio !== 'ALL' && t.priority !== selectedPrio) return false
      if (selectedUser !== 'ALL') {
        const isAssignee = t.assignees?.some((a: any) => a.id === selectedUser)
        const isCreator  = t.createdBy === selectedUser
        if (!isAssignee && !isCreator) return false
      }
      if (gorevStatus !== 'ALL' && t.status !== gorevStatus) return false
      return true
    })
  }, [gorevTasks, selectedBiz, selectedPrio, selectedUser, gorevStatus])

  const filteredTodo = useMemo(() => {
    return todoTasks.filter(t => {
      if (selectedPrio !== 'ALL' && t.priority !== selectedPrio) return false
      if (todoStatus !== 'ALL' && t.todoStatus !== todoStatus) return false
      return true
    })
  }, [todoTasks, selectedPrio, todoStatus])

  // ── Göstəriləcək siyahı ─────────────────────────────────────────────────
  const visibleGorev = viewFilter !== 'todo' ? filteredGorev : []
  const visibleTodo  = viewFilter !== 'gorev' ? filteredTodo  : []
  const totalVisible = visibleGorev.length + visibleTodo.length

  // ── Status tab sayları ────────────────────────────────────────────────────
  const gorevStatusTabs: GlassStatusTab[] = useMemo(() => {
    const base = gorevTasks.filter(t => {
      if (selectedBiz !== 'ALL' && t.departmentId !== selectedBiz && t.businessId !== selectedBiz) return false
      if (selectedPrio !== 'ALL' && t.priority !== selectedPrio) return false
      if (selectedUser !== 'ALL') {
        const isAssignee = t.assignees?.some((a: any) => a.id === selectedUser)
        if (!isAssignee && t.createdBy !== selectedUser) return false
      }
      return true
    })
    return GOREV_STATUS_TABS.map(tab => ({
      ...tab,
      count: tab.key === 'ALL' ? base.length : base.filter(t => t.status === tab.key).length,
    }))
  }, [gorevTasks, selectedBiz, selectedPrio, selectedUser])

  const todoStatusTabs: GlassStatusTab[] = useMemo(() => {
    const base = todoTasks.filter(t => {
      if (selectedPrio !== 'ALL' && t.priority !== selectedPrio) return false
      return true
    })
    return TODO_STATUS_TABS.map(tab => ({
      ...tab,
      count: tab.key === 'ALL' ? base.length : base.filter(t => t.todoStatus === tab.key).length,
    }))
  }, [todoTasks, selectedPrio])

  // Aktiv filter varmı?
  const showReset = selectedBiz !== 'ALL' || selectedPrio !== 'ALL' || selectedUser !== 'ALL'
  const showGorevReset = gorevStatus !== 'ALL'
  const showTodoReset  = todoStatus !== 'ALL'

  function resetAll() {
    setSelectedBiz('ALL'); setSelectedPrio('ALL'); setSelectedUser('ALL')
    setGorevStatus('ALL'); setTodoStatus('ALL')
  }

  // Aktiv status filter (combined üçün)
  const activeStatus = viewFilter === 'todo' ? todoStatus : gorevStatus
  const activeStatusTabs = viewFilter === 'todo' ? todoStatusTabs : gorevStatusTabs
  function handleStatusChange(key: string) {
    if (viewFilter === 'todo') setTodoStatus(key)
    else setGorevStatus(key)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Başlıq */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--todoist-text)]">Glass Filter — Canlı Test</h1>
          <p className="text-[12px] text-[var(--todoist-text-tertiary)] mt-0.5">
            Variant 4 dizaynı · Real API data · Tam interaktiv
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: 'rgba(79,70,229,0.08)', color: '#4F46E5' }}>
            {totalVisible} tapşırıq
          </span>
        </div>
      </div>

      {/* ── Glass Filter Bar ─────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl h-28 animate-pulse mb-5" style={{ background: 'rgba(0,0,0,0.04)' }} />
      ) : (
        <GlassFilterBar
          viewFilter={viewFilter}
          onViewFilter={v => { setViewFilter(v); setGorevStatus('ALL'); setTodoStatus('ALL') }}
          gorevCount={filteredGorev.length}
          todoCount={filteredTodo.length}
          businesses={businesses}
          selectedBiz={selectedBiz}
          onBizChange={setSelectedBiz}
          selectedPriority={selectedPrio}
          onPriorityChange={setSelectedPrio}
          users={users}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          statusTabs={activeStatusTabs}
          selectedStatus={activeStatus}
          onStatusChange={handleStatusChange}
          showReset={showReset || showGorevReset || showTodoReset}
          onReset={resetAll}
        />
      )}

      {/* ── Tapşırıq siyahıları ─────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />
          ))}
        </div>
      ) : totalVisible === 0 ? (
        <div className="text-center py-16 text-[var(--todoist-text-tertiary)]">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[14px] font-[500]">Filter şərtlərinə uyğun tapşırıq yoxdur</p>
          <button onClick={resetAll} className="mt-3 text-[12px] font-bold" style={{ color: '#4F46E5' }}>
            Filterləri sıfırla
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {/* GÖREV başlıq */}
          {visibleGorev.length > 0 && viewFilter !== 'todo' && (
            <>
              {viewFilter === 'all' && (
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--todoist-text-tertiary)] px-2 pb-1 pt-2">
                  GÖREV — {visibleGorev.length} tapşırıq
                </p>
              )}
              <div className="rounded-2xl overflow-hidden mb-3"
                style={{ border: '1.5px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.7)' }}>
                {visibleGorev.map(t => (
                  <TaskRow key={t.id} task={t} isGorev={true} />
                ))}
              </div>
            </>
          )}

          {/* TODO başlıq */}
          {visibleTodo.length > 0 && viewFilter !== 'gorev' && (
            <>
              {viewFilter === 'all' && (
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--todoist-text-tertiary)] px-2 pb-1 pt-2">
                  TODO — {visibleTodo.length} tapşırıq
                </p>
              )}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.7)' }}>
                {visibleTodo.map(t => (
                  <TaskRow key={t.id} task={t} isGorev={false} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
