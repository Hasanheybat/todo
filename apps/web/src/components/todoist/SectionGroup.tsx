'use client'

import { useState, useRef, useEffect } from 'react'
import TaskItem from './TaskItem'
import TaskQuickAdd from './TaskQuickAdd'
import DraggableTaskList from './DraggableTaskList'
import { useDroppable } from '@dnd-kit/core'

interface Section {
  id: string
  name: string
}

interface SectionGroupProps {
  section: Section
  tasks: any[]
  onToggleTask: (id: string) => void
  onClickTask: (id: string) => void
  onAddTask: (data: any) => void
  onRenameSection: (id: string, name: string) => void
  onDeleteSection: (id: string) => void
  onDeleteTask?: (id: string) => void
  onReorder?: (items: { id: string; sortOrder: number }[]) => void
  labels?: any[]
}

export default function SectionGroup({ section, tasks, onToggleTask, onClickTask, onAddTask, onRenameSection, onDeleteSection, onDeleteTask, onReorder, labels }: SectionGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${section.id}`,
    data: { type: 'section', sectionId: section.id }
  })

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== section.name) {
      onRenameSection(section.id, editName.trim())
    }
    setEditing(false)
  }

  const activeTasks = tasks.filter(t => !t.isCompleted)
  const completedTasks = tasks.filter(t => t.isCompleted)

  return (
    <div ref={setNodeRef} className="mb-4 rounded-lg transition-all duration-200"
      style={{
        backgroundColor: isOver ? 'var(--todoist-sidebar-hover)' : 'transparent',
        outline: isOver ? '2px dashed var(--todoist-red)' : 'none',
        outlineOffset: '2px',
        padding: isOver ? '4px' : '0'
      }}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-1 py-2 group">
        <button onClick={() => setCollapsed(!collapsed)} className="shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2.5"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 text-[13px] font-bold outline-none px-1 py-0.5 rounded"
            style={{ color: 'var(--todoist-text)', border: '1px solid var(--todoist-red)' }}
          />
        ) : (
          <span className="flex-1 text-[13px] font-bold cursor-pointer" style={{ color: 'var(--todoist-text)' }}
            onClick={() => setCollapsed(!collapsed)}>
            {section.name}
          </span>
        )}

        <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>
          {activeTasks.length}
        </span>

        {/* Menü */}
        <div className="relative opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--todoist-border)] transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--todoist-text-secondary)"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-20 py-1 w-[140px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                <button onClick={() => { setMenuOpen(false); setEditing(true); setEditName(section.name) }}
                  className="w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-[var(--todoist-sidebar-hover)] transition" style={{ color: 'var(--todoist-text)' }}>
                  Adını dəyiş
                </button>
                <button onClick={() => { setMenuOpen(false); onDeleteSection(section.id) }}
                  className="w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-[#FEE2E2] transition" style={{ color: 'var(--todoist-red)' }}>
                  Sil
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] mx-1 mb-1" style={{ backgroundColor: 'var(--todoist-divider)' }} />

      {/* Tasks */}
      {!collapsed && (
        <>
          {onReorder ? (
            <DraggableTaskList
              tasks={activeTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
              onDelete={onDeleteTask}
              onReorder={onReorder}
              sectionId={section.id}
            />
          ) : (
            <div className="space-y-0.5">
              {activeTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={onToggleTask} onClick={onClickTask} onDelete={onDeleteTask} />
              ))}
            </div>
          )}

          {activeTasks.length === 0 && isOver && (
            <div className="py-4 text-center text-[11px] rounded-lg" style={{ color: 'var(--todoist-text-tertiary)' }}>
              Buraya buraxın
            </div>
          )}

          <div className="mt-1">
            <TaskQuickAdd onAdd={(data) => onAddTask({ ...data, sectionId: section.id })} placeholder="Bu seksiyaya əlavə et..." labels={labels} />
          </div>

          {completedTasks.length > 0 && (
            <div className="mt-2 opacity-50">
              {completedTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={onToggleTask} onClick={onClickTask} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
