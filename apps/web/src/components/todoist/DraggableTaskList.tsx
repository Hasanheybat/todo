'use client'

import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskItem from './TaskItem'

interface DraggableTaskListProps {
  tasks: any[]
  onToggle: (id: string) => void
  onClick: (id: string) => void
  onDelete?: (id: string) => void
  onReorder: (items: { id: string; sortOrder: number }[]) => void
  onMoveToSection?: (taskId: string, sectionId: string | null) => void
  showProject?: boolean
  sectionId?: string | null // Bu seksiya ID-si (null = unsectioned)
}

function SortableTask({ task, onToggle, onClick, onDelete, showProject }: {
  task: any; onToggle: (id: string) => void; onClick: (id: string) => void; onDelete?: (id: string) => void; showProject?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', sectionId: task.sectionId || null, task }
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem task={task} onToggle={onToggle} onClick={onClick} onDelete={onDelete} showProject={showProject}
        dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

export default function DraggableTaskList({ tasks, onToggle, onClick, onDelete, onReorder, onMoveToSection, showProject, sectionId }: DraggableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Yeni sıralama hesabla
    const reordered = [...tasks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Reorder API call
    const items = reordered.map((t, i) => ({ id: t.id, sortOrder: i }))
    onReorder(items)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} onToggle={onToggle} onClick={onClick} onDelete={onDelete} showProject={showProject} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ═══ Droppable Section Wrapper ═══
// Seksiyalar arası drag üçün section-u drop zone edir
export function DroppableSection({ sectionId, children, isOver }: { sectionId: string | null; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef, isOver: dropping } = useDroppable({
    id: `section-${sectionId || 'unsectioned'}`,
    data: { type: 'section', sectionId }
  })

  const active = isOver || dropping

  return (
    <div ref={setNodeRef}
      className="transition-all duration-200 rounded-lg"
      style={{
        backgroundColor: active ? 'var(--todoist-sidebar-hover)' : 'transparent',
        outline: active ? '2px dashed var(--todoist-red)' : 'none',
        outlineOffset: '2px',
        minHeight: '30px'
      }}>
      {children}
    </div>
  )
}
