'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import CustomDatePicker from './CustomDatePicker'

const PRIO_COLORS: Record<string, string> = { P1: 'var(--todoist-red)', P2: '#EB8909', P3: '#246FE0', P4: 'var(--todoist-text-tertiary)' }
const PRIO_LABELS: Record<string, string> = { P1: 'Təcili', P2: 'Yüksək', P3: 'Orta', P4: 'Normal' }

interface GlobalQuickAddProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  projects: { id: string; name: string; color: string; isInbox: boolean }[]
  labels?: { id: string; name: string; color: string }[]
}

export default function GlobalQuickAdd({ open, onClose, onAdded, projects, labels = [] }: GlobalQuickAddProps) {
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('P4')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [prioOpen, setPrioOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setProjectId('') // layihə seçimi boş başlasın
    }
  }, [open])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await api.createTodoistTask({
        content: content.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        labelIds: selectedLabels.length > 0 ? selectedLabels : undefined,
      })
      setContent('')
      setDescription('')
      setPriority('P4')
      setDueDate('')
      setSelectedLabels([])
      onAdded()
      onClose()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const selectedProject = projects.find(p => p.id === projectId)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative rounded-xl shadow-2xl w-[500px] animate-in" style={{ backgroundColor: 'var(--todoist-surface)', animation: 'slideDown 0.15s ease-out' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="px-4 pt-4 pb-2">
          <input ref={inputRef} value={content} onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            className="w-full text-[14px] font-medium outline-none placeholder-[var(--todoist-text-tertiary)]"
            style={{ color: 'var(--todoist-text)' }}
            placeholder="Tapşırıq adı yazın..." />
          <input value={description} onChange={e => setDescription(e.target.value)}
            className="w-full text-[12px] outline-none placeholder-[var(--todoist-text-tertiary)] mt-1"
            style={{ color: 'var(--todoist-text-secondary)' }}
            placeholder="Açıqlama (istəyə bağlı)" />
        </div>

        {/* Action row */}
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {/* Due Date */}
          <div className="relative">
            <button onClick={() => { setDateOpen(!dateOpen); setPrioOpen(false); setProjectOpen(false) }}
              className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
              style={{ backgroundColor: dueDate ? '#E8F0FE' : 'var(--todoist-sidebar-hover)', color: dueDate ? '#246FE0' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {dueDate ? formatDateLabel(dueDate) : 'Tarix'}
            </button>
            {dateOpen && (
              <CustomDatePicker
                value={dueDate}
                onChange={(d) => { setDueDate(d); setDateOpen(false) }}
                onClear={() => { setDueDate(''); setDateOpen(false) }}
                onClose={() => setDateOpen(false)}
                position="bottom"
              />
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <button onClick={() => { setPrioOpen(!prioOpen); setDateOpen(false); setProjectOpen(false) }}
              className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
              style={{ backgroundColor: priority !== 'P4' ? PRIO_COLORS[priority] + '15' : 'var(--todoist-sidebar-hover)', color: PRIO_COLORS[priority], border: '1px solid var(--todoist-divider)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[priority]} stroke={PRIO_COLORS[priority]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              {PRIO_LABELS[priority]}
            </button>
            {prioOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[100px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                {(['P1','P2','P3','P4'] as const).map(p => (
                  <button key={p} onClick={() => { setPriority(p); setPrioOpen(false) }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] text-left"
                    style={{ color: PRIO_COLORS[p] }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[p]} stroke={PRIO_COLORS[p]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    {PRIO_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project selector */}
          <div className="relative">
            <button onClick={() => { setProjectOpen(!projectOpen); setPrioOpen(false); setDateOpen(false) }}
              className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
              style={{ backgroundColor: 'var(--todoist-sidebar-hover)', color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
              {selectedProject && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProject.color }} />}
              {selectedProject?.name || 'Layihə'}
            </button>
            {projectOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[140px] max-h-[200px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                {projects.map(p => (
                  <button key={p.id} onClick={() => { setProjectId(p.id); setProjectOpen(false) }}
                    className={`w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] text-left ${projectId === p.id ? 'bg-[var(--todoist-sidebar-hover)]' : ''}`}
                    style={{ color: 'var(--todoist-text)' }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Label selector */}
          {labels.length > 0 && (
            <div className="relative">
              <button onClick={() => { setLabelOpen(!labelOpen); setPrioOpen(false); setDateOpen(false); setProjectOpen(false) }}
                className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                style={{ backgroundColor: selectedLabels.length > 0 ? 'var(--todoist-red-light)' : 'var(--todoist-sidebar-hover)', color: selectedLabels.length > 0 ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                {selectedLabels.length > 0 ? `${selectedLabels.length} etiket` : 'Etiket'}
              </button>
              {labelOpen && (
                <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[140px] max-h-[180px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  {labels.map(l => (
                    <button key={l.id} onClick={() => toggleLabel(l.id)}
                      className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left"
                      style={{ color: 'var(--todoist-text)' }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color || '#808080' }} />
                      {l.name}
                      {selectedLabels.includes(l.id) && <svg className="ml-auto w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seçilmiş etiket pill-ləri */}
          {selectedLabels.length > 0 && labels.filter(l => selectedLabels.includes(l.id)).map(l => (
            <span key={l.id} onClick={() => toggleLabel(l.id)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:opacity-70 transition"
              style={{ backgroundColor: (l.color || '#808080') + '20', color: l.color || '#808080' }}>
              {l.name} ✕
            </span>
          ))}

          <div className="flex-1" />

          {/* Submit */}
          <button onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--todoist-border)] transition" style={{ color: 'var(--todoist-text-secondary)' }}>
            Ləğv et
          </button>
          <button onClick={handleSubmit} disabled={!content.trim() || saving}
            className="rounded-md px-4 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-30"
            style={{ backgroundColor: 'var(--todoist-red)' }}>
            {saving ? '...' : 'Əlavə et'}
          </button>
        </div>

        {/* Shortcut hint */}
        <div className="px-4 pb-2 flex items-center gap-3 border-t" style={{ borderColor: 'var(--todoist-divider)' }}>
          <span className="text-[9px] py-1.5" style={{ color: 'var(--todoist-text-tertiary)' }}>
            <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ backgroundColor: 'var(--todoist-border)', border: '1px solid var(--todoist-divider)' }}>Enter</kbd> əlavə et
            <span className="mx-2">·</span>
            <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ backgroundColor: 'var(--todoist-border)', border: '1px solid var(--todoist-divider)' }}>Esc</kbd> bağla
          </span>
        </div>
      </div>
    </div>
  )
}

function toDateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Bugün'
  const tom = new Date(now); tom.setDate(tom.getDate() + 1)
  if (d.toDateString() === tom.toDateString()) return 'Sabah'
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
}
