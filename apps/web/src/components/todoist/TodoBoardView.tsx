'use client'

import { useState } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface TodoBoardViewProps {
  todos: any[]
  projects: any[]
  onRefresh: () => void
  onClickTodo: (todoId: string) => void
  onCompleteTodo: (todoId: string) => void
}

// ─── Status konfiqurasiyası ───
const STATUS_COLUMNS = [
  { id: 'WAITING',     label: 'Gözləyir',      color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' },
  { id: 'IN_PROGRESS', label: 'Davam edir',    color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { id: 'DONE',        label: 'Tamamlandı',    color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  { id: 'CANCELLED',   label: 'İptal edilib',  color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
]

// ─── Sürüklənə bilən TODO kartı ───
function DraggableTodoCard({ task, onComplete, onClick }: {
  task: any
  onComplete: (id: string) => void
  onClick: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'todo', status: task.todoStatus || 'WAITING' }
  })

  const statusColor = (task.todoStatus || 'WAITING') === 'CANCELLED' ? '#EF4444' : (task.todoStatus || 'WAITING') === 'DONE' ? '#10B981' : (task.todoStatus || 'WAITING') === 'IN_PROGRESS' ? '#F59E0B' : '#94A3B8'
  const pColor = statusColor

  const diff = task.dueDate ? (() => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - now.getTime()) / 86400000)
  })() : null
  const dueDateText = diff !== null ? (diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })) : ''
  const dueDateColor = diff !== null && diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : 'var(--todoist-text-tertiary)'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      {...attributes} {...listeners}
      onClick={() => onClick(task.id)}
      className="rounded-lg cursor-grab active:cursor-grabbing hover:shadow-sm transition"
    >
      <div className="p-2.5 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
        <div className="flex items-start gap-2">
          <button
            onClick={e => { e.stopPropagation(); onComplete(task.id) }}
            className="mt-0.5 w-[16px] h-[16px] rounded-full border-2 shrink-0 hover:opacity-70 transition cursor-pointer"
            style={{ borderColor: pColor }}
          />
          <p className="text-[12px] font-medium leading-snug flex-1" style={{ color: 'var(--todoist-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
            {task.content}
          </p>
        </div>
        {(dueDateText || task.labels?.length > 0) && (
          <div className="flex items-center flex-wrap gap-1 mt-1.5 ml-[22px]">
            {dueDateText && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: dueDateColor }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {dueDateText}
              </span>
            )}
            {task.labels?.map((l: any) => (
              <span key={l.id || l.labelId} className="text-[9px] px-1 py-px rounded-full font-semibold"
                style={{ backgroundColor: (l.color || l.label?.color || '#808080') + '20', color: l.color || l.label?.color || '#808080' }}>
                {l.name || l.label?.name}
              </span>
            ))}
          </div>
        )}
        {(task.subTasks?.length > 0 || task.attachments?.length > 0) && (
          <div className="flex items-center gap-2 mt-1 ml-[22px]">
            {task.subTasks?.length > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: 'var(--todoist-text-tertiary)' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                {task.subTasks.length}
              </span>
            )}
            {task.attachments?.length > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: 'var(--todoist-text-tertiary)' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                {task.attachments.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status sütunu ───
function StatusColumn({ statusId, statusLabel, statusColor, statusBg, statusDot, tasks, onComplete, onClick }: {
  statusId: string
  statusLabel: string
  statusColor: string
  statusBg: string
  statusDot: string
  tasks: any[]
  onComplete: (id: string) => void
  onClick: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `todo-col-${statusId}`,
    data: { type: 'column', status: statusId }
  })

  return (
    <div className="shrink-0 w-[260px] flex flex-col">
      {/* Sütun başlığı */}
      <div className="flex items-center justify-between px-1 py-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusDot }} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>{statusLabel}</span>
        </div>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: statusBg, color: statusColor }}>{tasks.length}</span>
      </div>

      {/* Kart sahəsi */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-1.5 min-h-[80px] rounded-xl p-1.5 transition-all"
        style={{
          backgroundColor: isOver ? statusBg : 'transparent',
          outline: isOver ? `2px dashed ${statusDot}` : 'none',
          outlineOffset: '-2px'
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <DraggableTodoCard key={task.id} task={task} onComplete={onComplete} onClick={onClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isOver && (
          <div className="py-8 text-center text-[11px] rounded-lg" style={{ color: 'var(--todoist-text-tertiary)', border: '1.5px dashed var(--todoist-divider)' }}>
            Buraya sürükləyin
          </div>
        )}
      </div>
    </div>
  )
}

export default function TodoBoardView({ todos, projects, onRefresh, onClickTodo, onCompleteTodo }: TodoBoardViewProps) {
  const [activeTask, setActiveTask] = useState<any>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getStatusTodos = (statusId: string) =>
    todos.filter(t => (t.todoStatus || 'WAITING') === statusId)

  const handleDragStart = (event: any) => {
    const task = todos.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const overData = over.data?.current
    const activeData = active.data?.current

    // Target status-u tap: əvvəl data-dan, sonra over.id-dən (todo-col-CANCELLED formatı)
    let targetStatus: string = overData?.status ?? ''
    if (!targetStatus && typeof over.id === 'string' && over.id.startsWith('todo-col-')) {
      targetStatus = over.id.replace('todo-col-', '')
    }
    // Əgər başqa bir kartın üstünə düşübsə, o kartın statusunu götür
    if (!targetStatus && overData?.type === 'todo') {
      targetStatus = overData.status || 'WAITING'
    }
    if (!targetStatus) {
      // over.id başqa bir todo ID-sidir — o todo-nun statusunu tap
      const overTodo = todos.find(t => t.id === over.id)
      if (overTodo) targetStatus = overTodo.todoStatus || 'WAITING'
    }
    if (!targetStatus) targetStatus = 'WAITING'

    const sourceStatus: string = activeData?.status ?? 'WAITING'

    if (targetStatus === sourceStatus) return

    try {
      await api.updateTodoistTask(active.id as string, { todoStatus: targetStatus })
      const col = STATUS_COLUMNS.find(c => c.id === targetStatus)
      toast.success(`"${col?.label}" sütununa köçürüldü`)
      onRefresh()
    } catch {
      toast.error('Xəta baş verdi')
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[200px]">
        {STATUS_COLUMNS.map(col => (
          <StatusColumn
            key={col.id}
            statusId={col.id}
            statusLabel={col.label}
            statusColor={col.color}
            statusBg={col.bg}
            statusDot={col.dot}
            tasks={getStatusTodos(col.id)}
            onComplete={onCompleteTodo}
            onClick={onClickTodo}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="rounded-lg shadow-xl opacity-90 p-2.5 w-[250px]"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '2px solid var(--todoist-red)' }}>
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--todoist-text)' }}>{activeTask.content}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
