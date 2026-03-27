'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'

const COLORS = [
  '#DC4C3E', '#EB8909', '#FAD000', '#44BE6C', '#246FE0',
  '#8F4DC6', '#EB4899', '#808080', '#A8742C', '#1DB5BE',
  '#E05555', '#4CAF50', '#FF7043', '#5C6BC0', '#78909C',
]

interface SaveAsTemplateModalProps {
  open: boolean
  onClose: () => void
  projectName: string
  projectColor?: string
  tasks: any[]
}

export default function SaveAsTemplateModal({ open, onClose, projectName, projectColor, tasks }: SaveAsTemplateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#246FE0')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(projectName ? `${projectName} şablonu` : '')
      setColor(projectColor || '#246FE0')
      setDescription('')
      // Bütün tapşırıqları seç (default)
      setSelectedIds(new Set(tasks.filter(t => !t.isCompleted).map(t => t.id)))
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, projectName, projectColor, tasks])

  if (!open) return null

  const activeTasks = tasks.filter(t => !t.isCompleted)
  const selectedTasks = activeTasks.filter(t => selectedIds.has(t.id))

  const toggleTask = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === activeTasks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(activeTasks.map(t => t.id)))
    }
  }

  const handleSave = async () => {
    if (!name.trim() || selectedTasks.length === 0) return
    setSaving(true)
    try {
      const tasksData = selectedTasks.map(t => ({
        content: t.content,
        priority: t.priority || 'P4',
      }))
      await api.createTodoistTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        tasks: JSON.stringify(tasksData),
        color,
      })
      onClose()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const priorityColor = (p: string) => {
    if (p === 'P1') return '#DC4C3E'
    if (p === 'P2') return '#EB8909'
    if (p === 'P3') return '#246FE0'
    return '#B3B3B3'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative rounded-xl shadow-xl w-[460px] bg-white dark:bg-[#1E1E1E] mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[16px] font-bold text-[var(--todoist-text)] dark:text-[#E8E8E8]">Şablon kimi saxla</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--todoist-border)] dark:hover:bg-[#333] transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 space-y-4">
          {/* Ad */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-[var(--todoist-text-secondary)]">Şablon adı</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSave() }}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none border border-[var(--todoist-divider)] dark:border-[#444] dark:bg-[#2A2A2A] dark:text-[#E8E8E8] focus:border-[var(--todoist-red)] transition"
              placeholder="Şablon adı"
            />
          </div>

          {/* Təsvir */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-[var(--todoist-text-secondary)]">Təsvir (ixtiyari)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none border border-[var(--todoist-divider)] dark:border-[#444] dark:bg-[#2A2A2A] dark:text-[#E8E8E8] focus:border-[var(--todoist-red)] transition"
              placeholder="Qısa təsvir..."
            />
          </div>

          {/* Rəng */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-[var(--todoist-text-secondary)]">Rəng</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c, border: color === c ? '3px solid var(--todoist-text)' : '2px solid transparent' }}
                >
                  {color === c && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tapşırıqlar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[var(--todoist-text-secondary)]">
                Tapşırıqlar ({selectedIds.size}/{activeTasks.length})
              </label>
              <button onClick={toggleAll} className="text-[10px] font-medium text-[#246FE0] hover:underline">
                {selectedIds.size === activeTasks.length ? 'Heç birini seçmə' : 'Hamısını seç'}
              </button>
            </div>
            <div className="border border-[var(--todoist-divider)] dark:border-[#444] rounded-lg max-h-[200px] overflow-y-auto">
              {activeTasks.length === 0 ? (
                <p className="text-center text-[11px] text-[var(--todoist-text-tertiary)] py-6">Aktiv tapşırıq yoxdur</p>
              ) : (
                activeTasks.map((task: any) => (
                  <label key={task.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--todoist-sidebar-hover)] dark:hover:bg-[#2A2A2A] cursor-pointer border-b border-[var(--todoist-divider)] dark:border-[#333] last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="w-3.5 h-3.5 rounded accent-[var(--todoist-red)] shrink-0"
                    />
                    <span className="flex-1 text-[12px] text-[var(--todoist-text)] dark:text-[#E8E8E8]">{task.content}</span>
                    {task.priority && task.priority !== 'P4' && (
                      <span className="text-[9px] font-bold" style={{ color: priorityColor(task.priority) }}>{task.priority}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--todoist-divider)] dark:border-[#333]">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12px] font-medium text-[var(--todoist-text-secondary)] hover:bg-[var(--todoist-border)] dark:hover:bg-[#333] transition">
            Ləğv et
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || selectedTasks.length === 0}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--todoist-red)' }}>
            {saving ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </div>
    </div>
  )
}
