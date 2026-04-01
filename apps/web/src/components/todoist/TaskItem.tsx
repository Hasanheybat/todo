'use client'

const PRIO_COLORS: Record<string, string> = {
  P1: 'var(--todoist-red)',
  P2: '#EB8909',
  P3: '#246FE0',
  P4: 'var(--todoist-text-tertiary)',
}

const STATUS_COLORS: Record<string, string> = {
  WAITING:     '#94A3B8',
  IN_PROGRESS: '#F59E0B',
  DONE:        '#10B981',
  CANCELLED:   '#EF4444',
}

const PRIO_LABELS: Record<string, string> = {
  P1: 'Təcili',
  P2: 'Yüksək',
  P3: 'Orta',
  P4: 'Normal',
}

interface TaskItemProps {
  task: {
    id: string
    content: string
    description?: string
    priority: string
    isCompleted: boolean
    dueDate?: string
    isRecurring?: boolean
    recurRule?: string
    todoStatus?: string
    labels?: { label: { name: string; color: string } }[]
    project?: { id: string; name: string; color: string }
    _count?: { children?: number; comments?: number }
    children?: any[]
    comments?: any[]
    attachments?: any[]
  }
  onToggle: (id: string) => void
  onClick: (id: string) => void
  onDelete?: (id: string) => void
  showProject?: boolean
  showDueDate?: boolean
  dragHandleProps?: any
}

export default function TaskItem({ task, onToggle, onClick, onDelete, showProject = false, showDueDate = true, dragHandleProps }: TaskItemProps) {
  const color = STATUS_COLORS[task.todoStatus || 'WAITING'] || '#94A3B8'

  // Badge hesablamaları
  const subtaskTotal = task._count?.children || task.children?.length || 0
  const subtaskDone = task.children?.filter((c: any) => c.isCompleted)?.length || 0
  const commentCount = task._count?.comments || task.comments?.length || 0
  const hasAttachments = (task.attachments?.length || 0) > 0
  const recurLabel = task.recurRule === 'daily' ? 'Hər gün' : task.recurRule === 'weekly' ? 'Hər həftə' : task.recurRule === 'monthly' ? 'Hər ay' : task.recurRule

  return (
    <div className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--todoist-sidebar-hover)] cursor-pointer transition-all duration-200 overflow-hidden ${task.isCompleted ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => onClick(task.id)}>

      {/* Drag Handle */}
      {dragHandleProps && (
        <button {...dragHandleProps} className="mt-1 shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing transition touch-none"
          onClick={e => e.stopPropagation()}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--todoist-text-secondary)"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>
        </button>
      )}

      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(task.id) }}
        className="mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition hover:scale-110"
        style={{ borderColor: color, backgroundColor: task.isCompleted ? color : 'transparent' }}
      >
        {task.isCompleted && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug ${task.isCompleted ? 'line-through text-[var(--todoist-text-tertiary)]' : 'text-[var(--todoist-text)]'}`}
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45ch' }}>
          {task.content}
        </p>
        {task.description && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--todoist-text-secondary)' }}>{task.description}</p>
        )}
        {/* Meta row: date + badges + labels */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Tarix */}
          {showDueDate && task.dueDate && (
            <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: isDueToday(task.dueDate) ? '#058527' : isOverdue(task.dueDate) ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {formatDue(task.dueDate)}
            </span>
          )}

          {/* 🔁 Recurring badge */}
          {task.isRecurring && task.recurRule && (
            <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: '#9333EA' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              {recurLabel}
            </span>
          )}

          {/* 🔲 Subtask badge */}
          {subtaskTotal > 0 && (
            <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: subtaskDone === subtaskTotal ? '#058527' : 'var(--todoist-text-secondary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              {subtaskDone}/{subtaskTotal}
            </span>
          )}

          {/* 💬 Comment badge */}
          {commentCount > 0 && (
            <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--todoist-text-secondary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {commentCount}
            </span>
          )}

          {/* 📎 Attachment badge */}
          {hasAttachments && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </span>
          )}

          {/* Layihə adı */}
          {showProject && task.project && (
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
              {task.project.name}
            </span>
          )}

          {/* Etiketlər */}
          {task.labels?.map(tl => (
            <span key={tl.label.name} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: tl.label.color + '20', color: tl.label.color }}>
              {tl.label.name}
            </span>
          ))}
        </div>
      </div>

      {/* Action butonları — hover-da görünür */}
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition">
        {/* Tarix dəyiş */}
        <button
          onClick={e => { e.stopPropagation(); onClick(task.id) }}
          className="w-6 h-6 rounded flex items-center justify-center transition hover:bg-[var(--todoist-border)]"
          title="Redaktə et"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>

        {/* Tarix */}
        <button
          onClick={e => { e.stopPropagation(); onClick(task.id) }}
          className="w-6 h-6 rounded flex items-center justify-center transition hover:bg-[var(--todoist-border)]"
          title="Tarix"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </button>

        {/* Şərh */}
        <button
          onClick={e => { e.stopPropagation(); onClick(task.id) }}
          className="w-6 h-6 rounded flex items-center justify-center transition hover:bg-[var(--todoist-border)]"
          title="Şərh"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </button>

        {/* Sil */}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            className="w-6 h-6 rounded flex items-center justify-center transition hover:bg-[var(--todoist-red-light)]"
            title="Sil"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        )}

        {/* Prioritet flag */}
        {task.priority !== 'P4' && (
          <span className="w-6 h-6 flex items-center justify-center" title={PRIO_LABELS[task.priority]}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </span>
        )}
      </div>
    </div>
  )
}

function isDueToday(d: string) {
  const t = new Date(); const dd = new Date(d)
  return t.toDateString() === dd.toDateString()
}

function isOverdue(d: string) {
  return new Date(d) < new Date(new Date().toDateString())
}

function formatDue(d: string) {
  const dd = new Date(d); const now = new Date()
  if (dd.toDateString() === now.toDateString()) return 'Bugün'
  const tom = new Date(now); tom.setDate(tom.getDate() + 1)
  if (dd.toDateString() === tom.toDateString()) return 'Sabah'
  if (dd < new Date(now.toDateString())) return `Gecikmiş`
  return dd.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
}
