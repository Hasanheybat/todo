'use client'

import { useState, useRef, useEffect } from 'react'
import CustomDatePicker from './CustomDatePicker'

const PRIO_COLORS: Record<string, string> = { P1: 'var(--todoist-red)', P2: '#EB8909', P3: '#246FE0', P4: 'var(--todoist-text-tertiary)' }
const PRIO_LABELS: Record<string, string> = { P1: 'Təcili', P2: 'Yüksək', P3: 'Orta', P4: 'Normal' }

interface TaskQuickAddProps {
  onAdd: (data: { content: string; priority: string; dueDate?: string; description?: string; labelIds?: string[] }) => void
  placeholder?: string
  defaultDueDate?: string
  labels?: { id: string; name: string; color: string }[]
}

export default function TaskQuickAdd({ onAdd, placeholder = 'Tapşırıq əlavə et...', defaultDueDate, labels = [] }: TaskQuickAddProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('P4')
  const [dueDate, setDueDate] = useState(defaultDueDate || '')
  const [prioOpen, setPrioOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [recurRule, setRecurRule] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  const handleSubmit = () => {
    if (!content.trim()) return
    onAdd({
      content: content.trim(), priority, dueDate: dueDate || undefined,
      labelIds: selectedLabels.length > 0 ? selectedLabels : undefined,
      isRecurring: !!recurRule, recurRule: recurRule || undefined,
    } as any)
    setContent('')
    setPriority('P4')
    setDueDate(defaultDueDate || '')
    setSelectedLabels([])
    setRecurRule('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { setOpen(false); setContent(''); setPriority('P4'); setDueDate(defaultDueDate || ''); setSelectedLabels([]) }
  }

  const dueDateLabel = (() => {
    if (!dueDate) return null
    const d = new Date(dueDate)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Bugün'
    const tom = new Date(now); tom.setDate(tom.getDate() + 1)
    if (d.toDateString() === tom.toDateString()) return 'Sabah'
    return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
  })()

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium transition hover:bg-[var(--todoist-red-light)] group"
        style={{ color: 'var(--todoist-red)' }}>
        <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center transition group-hover:bg-[var(--todoist-red)] group-hover:text-white"
          style={{ border: '2px solid var(--todoist-red)', fontSize: 12, lineHeight: 1 }}>+</span>
        {placeholder}
      </button>
    )
  }

  return (
    <div className="mx-1 rounded-xl" style={{ border: '1px solid var(--todoist-divider)', backgroundColor: 'var(--todoist-surface)' }}>
      <div className="px-3 pt-3 pb-2">
        <input ref={inputRef} value={content} onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[13px] font-medium outline-none placeholder-[var(--todoist-text-tertiary)]"
          style={{ color: 'var(--todoist-text)' }}
          placeholder="Tapşırıq adı" />
      </div>

      {/* Altdakı butonlar */}
      <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
        {/* Tarix seçici */}
        <div className="relative">
          <button onClick={() => { setDatePickerOpen(!datePickerOpen); setPrioOpen(false) }}
            className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: dueDate ? '#E8F0FE' : 'var(--todoist-sidebar-hover)', color: dueDate ? '#246FE0' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {recurRule ? `🔁 ${recurRule === 'daily' ? 'Hər gün' : recurRule === 'weekly' ? 'Hər həftə' : 'Hər ay'}` : dueDateLabel || 'Tarix'}
          </button>

          {datePickerOpen && (
            <CustomDatePicker
              value={dueDate}
              onChange={(d) => { setDueDate(d); setDatePickerOpen(false) }}
              onClear={() => { setDueDate(''); setRecurRule(''); setDatePickerOpen(false) }}
              onRecurring={(rule) => setRecurRule(rule)}
              onClose={() => setDatePickerOpen(false)}
              position="top"
            />
          )}
        </div>

        {/* Prioritet */}
        <div className="relative">
          <button onClick={() => { setPrioOpen(!prioOpen); setDatePickerOpen(false) }}
            className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: priority !== 'P4' ? PRIO_COLORS[priority] + '15' : 'var(--todoist-sidebar-hover)', color: PRIO_COLORS[priority], border: '1px solid var(--todoist-divider)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[priority]} stroke={PRIO_COLORS[priority]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            {PRIO_LABELS[priority]}
          </button>
          {prioOpen && (
            <div className="absolute bottom-full left-0 mb-1 rounded-lg shadow-lg z-10 py-1 min-w-[100px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              {(['P1','P2','P3','P4'] as const).map(p => (
                <button key={p} onClick={() => { setPriority(p); setPrioOpen(false) }}
                  className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left"
                  style={{ color: PRIO_COLORS[p] }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[p]} stroke={PRIO_COLORS[p]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  {PRIO_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Etiket */}
        {labels.length > 0 && (
          <div className="relative">
            <button onClick={() => { setLabelOpen(!labelOpen); setPrioOpen(false); setDatePickerOpen(false) }}
              className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
              style={{ backgroundColor: selectedLabels.length > 0 ? 'var(--todoist-red-light)' : 'var(--todoist-sidebar-hover)', color: selectedLabels.length > 0 ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              {selectedLabels.length > 0 ? `${selectedLabels.length} etiket` : 'Etiket'}
            </button>
            {labelOpen && (
              <div className="absolute bottom-full left-0 mb-1 rounded-lg shadow-lg z-10 py-1 min-w-[140px] max-h-[180px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
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

        {/* Ləğv / Əlavə et */}
        <button onClick={() => { setOpen(false); setContent(''); setPriority('P4'); setDueDate(defaultDueDate || ''); setSelectedLabels([]) }}
          className="rounded-md px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--todoist-sidebar-hover)]"
          style={{ color: 'var(--todoist-text-secondary)' }}>
          Ləğv et
        </button>
        <button onClick={handleSubmit} disabled={!content.trim()}
          className="rounded-md px-3 py-1 text-[11px] font-semibold text-white transition disabled:opacity-30"
          style={{ backgroundColor: 'var(--todoist-red)' }}>
          Əlavə et
        </button>
      </div>
    </div>
  )
}

function toDateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
