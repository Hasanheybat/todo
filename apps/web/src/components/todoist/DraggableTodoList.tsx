'use client'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React from 'react'

interface DraggableTodoListProps {
  items: any[]
  disabled?: boolean
  onReorder: (reordered: { id: string; sortOrder: number }[]) => void
  renderItem: (item: any, dragHandleProps: React.HTMLAttributes<HTMLElement>, isDragging: boolean) => React.ReactNode
}

function SortableItem({ item, renderItem, disabled }: {
  item: any
  renderItem: DraggableTodoListProps['renderItem']
  disabled?: boolean
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !!disabled
  })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, overflow: 'hidden' }}>
      {renderItem(item, disabled ? {} : (listeners || {}), isDragging)}
    </div>
  )
}

export default function DraggableTodoList({ items, onReorder, renderItem, disabled }: DraggableTodoListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(t => t.id === active.id)
    const newIndex = items.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove([...items], oldIndex, newIndex)
    onReorder(reordered.map((t, i) => ({ id: t.id, sortOrder: i })))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {items.map(item => (
            <SortableItem key={item.id} item={item} renderItem={renderItem} disabled={disabled} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
