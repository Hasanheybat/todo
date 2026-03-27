'use client'

import { useState } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskItem from './TaskItem'
import TaskQuickAdd from './TaskQuickAdd'

interface Section { id: string; name: string }

interface BoardViewProps {
  sections: Section[]
  tasks: any[]
  unsectionedTasks: any[]
  onToggleTask: (id: string) => void
  onClickTask: (id: string) => void
  onAddTask: (data: any) => void
  onAddSection: () => void
  onMoveTask?: (taskId: string, targetSectionId: string | null) => void
  onReorderSections?: (orderedIds: string[]) => void
}

// ═══ Sürüklənə bilən kart ═══
function DraggableCard({ task, onToggle, onClick }: { task: any; onToggle: (id: string) => void; onClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', sectionId: task.sectionId || null }
  })

  return (
    <div ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes} {...listeners}
      className="rounded-lg cursor-grab active:cursor-grabbing"
    >
      <div style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', borderRadius: '8px' }}>
        <TaskItem task={task} onToggle={onToggle} onClick={onClick} />
      </div>
    </div>
  )
}

// ═══ Drop edilə bilən + sürüklənə bilən sütun ═══
function DroppableColumn({ sectionId, sectionName, tasks, completedCount, onToggle, onClick, onAdd, placeholder, draggable }: {
  sectionId: string | null; sectionName: string; tasks: any[]; completedCount: number
  onToggle: (id: string) => void; onClick: (id: string) => void
  onAdd: (data: any) => void; placeholder: string; draggable?: boolean
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `board-col-${sectionId || 'unsectioned'}`,
    data: { type: 'column', sectionId }
  })

  const sortable = useSortable({
    id: `section-${sectionId || 'unsectioned'}`,
    data: { type: 'section', sectionId },
    disabled: !draggable,
  })

  const combinedRef = (node: HTMLDivElement | null) => {
    setDropRef(node)
    sortable.setNodeRef(node)
  }

  return (
    <div ref={combinedRef} className="shrink-0 w-[280px]"
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }}>
      <div className="flex items-center justify-between px-2 py-2 mb-2"
        {...(draggable ? { ...sortable.attributes, ...sortable.listeners, style: { cursor: 'grab' } } : {})}>
        <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
          {draggable && <span className="mr-1 text-[var(--todoist-text-tertiary)]">⠿</span>}
          {sectionName}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>{tasks.length}</span>
      </div>

      <div
        className="space-y-1.5 min-h-[60px] rounded-lg p-1 transition-all duration-200"
        style={{
          backgroundColor: isOver ? 'var(--todoist-sidebar-hover)' : 'transparent',
          outline: isOver ? '2px dashed var(--todoist-red)' : 'none',
          outlineOffset: '-2px'
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <DraggableCard key={task.id} task={task} onToggle={onToggle} onClick={onClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="py-6 text-center text-[11px] rounded-lg" style={{ color: 'var(--todoist-text-tertiary)', border: '1.5px dashed var(--todoist-divider)' }}>
            Buraya sürükləyin
          </div>
        )}
      </div>

      <div className="mt-2">
        <TaskQuickAdd onAdd={onAdd} placeholder={placeholder} />
      </div>
    </div>
  )
}

export default function BoardView({ sections, tasks, unsectionedTasks, onToggleTask, onClickTask, onAddTask, onAddSection, onMoveTask, onReorderSections }: BoardViewProps) {
  const [activeTask, setActiveTask] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getTasksForSection = (sectionId: string) => tasks.filter(t => t.sectionId === sectionId && !t.isCompleted)

  const handleDragStart = (event: any) => {
    const activeData = event.active.data?.current
    if (activeData?.type === 'section') {
      setActiveSection(activeData.sectionId)
      return
    }
    const taskId = event.active.id
    const allTasks = [...unsectionedTasks, ...tasks]
    const task = allTasks.find(t => t.id === taskId)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Seksiya sıralaması
    if (active.data?.current?.type === 'section') {
      setActiveSection(null)
      if (!over || !onReorderSections) return
      const overData = over.data?.current
      if (overData?.type === 'section' && active.id !== over.id) {
        const oldIndex = sections.findIndex(s => `section-${s.id}` === active.id)
        const newIndex = sections.findIndex(s => `section-${s.id}` === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(sections, oldIndex, newIndex)
          onReorderSections(reordered.map(s => s.id))
        }
      }
      return
    }

    // Task sürükləmə
    setActiveTask(null)
    if (!over || !onMoveTask) return

    const taskId = active.id as string
    const overData = over.data?.current

    if (overData?.type === 'column') {
      const targetSectionId = overData.sectionId
      const sourceData = active.data?.current
      if (sourceData?.sectionId !== targetSectionId) {
        onMoveTask(taskId, targetSectionId)
      }
      return
    }

    if (overData?.type === 'task') {
      const targetSectionId = overData.sectionId
      const sourceData = active.data?.current
      if (sourceData?.sectionId !== targetSectionId) {
        onMoveTask(taskId, targetSectionId)
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {/* Seksiyasız tapşırıqlar */}
        {unsectionedTasks.length > 0 && (
          <DroppableColumn
            sectionId={null} sectionName="Seksiyasız"
            tasks={unsectionedTasks.filter(t => !t.isCompleted)} completedCount={0}
            onToggle={onToggleTask} onClick={onClickTask}
            onAdd={(data) => onAddTask({ ...data })} placeholder="Əlavə et..."
            draggable={false}
          />
        )}

        {/* Seksiya sütunları — sürüklənə bilən */}
        <SortableContext items={sections.map(s => `section-${s.id}`)} strategy={horizontalListSortingStrategy}>
          {sections.map(section => (
            <DroppableColumn
              key={section.id}
              sectionId={section.id} sectionName={section.name}
              tasks={getTasksForSection(section.id)} completedCount={tasks.filter(t => t.sectionId === section.id && t.isCompleted).length}
              onToggle={onToggleTask} onClick={onClickTask}
              onAdd={(data) => onAddTask({ ...data, sectionId: section.id })} placeholder="Əlavə et..."
              draggable
            />
          ))}
        </SortableContext>

        {/* Yeni seksiya */}
        <div className="shrink-0 w-[280px]">
          <button onClick={onAddSection}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[12px] font-medium transition hover:bg-[var(--todoist-sidebar-hover)]"
            style={{ border: '2px dashed var(--todoist-divider)', color: 'var(--todoist-text-tertiary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Seksiya əlavə et
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="rounded-lg shadow-xl opacity-90" style={{ backgroundColor: 'var(--todoist-surface)', border: '2px solid var(--todoist-red)', width: '260px' }}>
            <TaskItem task={activeTask} onToggle={() => {}} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
