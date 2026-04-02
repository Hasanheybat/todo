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
  const [sectionId, setSectionId] = useState('')
  const [sectionOpen, setSectionOpen] = useState(false)
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [recurOpen, setRecurOpen] = useState(false)
  const [recurRule, setRecurRule] = useState('')
  const [recurScheduleType, setRecurScheduleType] = useState<'MONTHLY' | 'WEEKLY'>('WEEKLY')
  const [recurDayOfWeek, setRecurDayOfWeek] = useState(1) // B.e.
  const [recurDayOfMonth, setRecurDayOfMonth] = useState(1)
  const [recurNotifDay, setRecurNotifDay] = useState(1)
  const [recurDeadlineDay, setRecurDeadlineDay] = useState(5)
  const [subTasks, setSubTasks] = useState<string[]>([])
  const [subTaskOpen, setSubTaskOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setProjectId('')
      setSectionId('')
      setSections([])
    }
  }, [open])

  // Layihə seçiləndə seksiyaları yüklə
  useEffect(() => {
    setSectionId('')
    setSections([])
    if (!projectId) return
    api.getTodoistSections(projectId).then(data => setSections(data || [])).catch(() => {})
  }, [projectId])

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
      const created: any = await api.createTodoistTask({
        content: content.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        sectionId: sectionId || undefined,
        labelIds: selectedLabels.length > 0 ? selectedLabels : undefined,
        ...(recurRule ? { isRecurring: true, recurRule: recurScheduleType === 'WEEKLY' ? 'weekly' : 'monthly' } : {}),
      })
      // Alt görevləri yarat
      const validSubs = subTasks.filter(s => s.trim())
      if (validSubs.length > 0 && created?.id) {
        for (const sub of validSubs) {
          await api.createTodoistTask({ content: sub.trim(), parentId: created.id }).catch(() => {})
        }
      }
      setContent('')
      setDescription('')
      setPriority('P4')
      setDueDate('')
      setSelectedLabels([])
      setSectionId('')
      setRecurRule('')
      setRecurOpen(false)
      setSubTasks([])
      setSubTaskOpen(false)
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
          <div className="flex items-center gap-2 mt-1">
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="flex-1 text-[12px] outline-none placeholder-[var(--todoist-text-tertiary)]"
              style={{ color: 'var(--todoist-text-secondary)' }}
              placeholder="Açıqlama (istəyə bağlı)" />
            <button type="button" onClick={() => { setSubTaskOpen(!subTaskOpen); if (!subTaskOpen && subTasks.length === 0) setSubTasks(['']) }}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition hover:opacity-90"
              style={{ backgroundColor: subTasks.filter(s => s.trim()).length > 0 ? 'var(--todoist-red)' : 'var(--todoist-border)', color: subTasks.filter(s => s.trim()).length > 0 ? 'white' : 'var(--todoist-text-secondary)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Alt görev {subTasks.filter(s => s.trim()).length > 0 ? `(${subTasks.filter(s => s.trim()).length})` : ''}
            </button>
          </div>

          {/* Alt görev siyahısı */}
          {subTaskOpen && (
            <div className="mt-2 pl-4 border-l-2" style={{ borderColor: '#C7D2FE' }}>
              {subTasks.map((sub, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ border: '1.5px solid #CBD5E1' }} />
                  <input value={sub}
                    onChange={e => { const ns = [...subTasks]; ns[i] = e.target.value; setSubTasks(ns) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSubTasks([...subTasks, '']); setTimeout(() => { const inputs = document.querySelectorAll('[data-subtask-input]'); (inputs[inputs.length - 1] as HTMLInputElement)?.focus() }, 50) } }}
                    data-subtask-input
                    className="flex-1 text-[12px] outline-none py-1 placeholder-[var(--todoist-text-tertiary)]"
                    style={{ color: 'var(--todoist-text)' }}
                    placeholder={`Alt görev ${i + 1}...`}
                    autoFocus={i === subTasks.length - 1} />
                  <button onClick={() => { const ns = subTasks.filter((_, idx) => idx !== i); setSubTasks(ns.length === 0 ? [''] : ns) }}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-red-50 transition"
                    style={{ color: '#CBD5E1' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => setSubTasks([...subTasks, ''])}
                className="flex items-center gap-1 mt-1 text-[10px] font-semibold transition hover:opacity-70"
                style={{ color: '#4F46E5' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Əlavə et
              </button>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {/* Due Date */}
          <div className="relative">
            <button onClick={() => { setDateOpen(!dateOpen); setPrioOpen(false); setProjectOpen(false); setRecurOpen(false) }}
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
                showQuickButtons={true}
              />
            )}
          </div>

          {/* Təkrarla */}
          <button onClick={() => { setRecurOpen(!recurOpen); if (!recurRule) setRecurRule('weekly'); setDateOpen(false); setPrioOpen(false); setProjectOpen(false) }}
            className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: recurRule ? '#EEF2FF' : 'var(--todoist-sidebar-hover)', color: recurRule ? '#4F46E5' : 'var(--todoist-text-secondary)', border: `1px solid ${recurRule ? '#C7D2FE' : 'var(--todoist-divider)'}` }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            {recurRule ? `🔁 ${recurScheduleType === 'MONTHLY' ? `Ayın ${recurDayOfMonth}-i` : `${['Baz','B.e','Ç.a','Çər','C.a','Cü','Şə'][recurDayOfWeek]}`}` : 'Təkrarla'}
          </button>

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

          {/* Section selector — yalnız layihə seçilib və seksiyaları varsa */}
          {projectId && sections.length > 0 && (
            <div className="relative">
              <button onClick={() => { setSectionOpen(!sectionOpen); setPrioOpen(false); setDateOpen(false); setProjectOpen(false); setLabelOpen(false) }}
                className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                style={{ backgroundColor: sectionId ? '#F0FDF4' : 'var(--todoist-sidebar-hover)', color: sectionId ? '#16A34A' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                {sectionId ? (sections.find(s => s.id === sectionId)?.name || 'Seksiya') : 'Seksiya'}
              </button>
              {sectionOpen && (
                <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[160px] max-h-[200px] overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  <button onClick={() => { setSectionId(''); setSectionOpen(false) }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] text-left"
                    style={{ color: 'var(--todoist-text-secondary)' }}>
                    — Seksiyasız
                  </button>
                  {sections.map(s => (
                    <button key={s.id} onClick={() => { setSectionId(s.id); setSectionOpen(false) }}
                      className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center justify-between hover:bg-[var(--todoist-sidebar-hover)] text-left"
                      style={{ color: 'var(--todoist-text)', backgroundColor: sectionId === s.id ? 'var(--todoist-sidebar-hover)' : undefined }}>
                      {s.name}
                      {sectionId === s.id && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recurring ləğv et */}
          {recurRule && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer hover:opacity-70"
              style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
              onClick={() => { setRecurRule(''); setRecurOpen(false) }}>
              ✕ Ləğv
            </span>
          )}

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

        {/* ═══ Təkrarlanan panel — tapşırıqdakı kimi ═══ */}
        {recurOpen && recurRule && (
          <div className="px-4 pb-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <div className="text-[10px] font-bold mb-2" style={{ color: '#4F46E5' }}>🔁 Təkrarlama qaydası — sistem avtomatik təkrarlayacaq</div>
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ backgroundColor: '#fff', border: '1px solid #C7D2FE' }}>
                <span className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>Hər</span>
                <select value={recurScheduleType} onChange={e => setRecurScheduleType(e.target.value as any)}
                  className="rounded px-2 py-1 text-[11px] font-semibold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5', backgroundColor: '#F5F3FF' }}>
                  <option value="MONTHLY">ayın</option>
                  <option value="WEEKLY">həftənin</option>
                </select>
                {recurScheduleType === 'MONTHLY' ? (
                  <input type="number" value={recurDayOfMonth} onChange={e => setRecurDayOfMonth(Number(e.target.value))} min={1} max={31}
                    className="w-[42px] text-center rounded px-1 py-1 text-[11px] font-bold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5' }} />
                ) : (
                  <select value={recurDayOfWeek} onChange={e => setRecurDayOfWeek(Number(e.target.value))}
                    className="rounded px-2 py-1 text-[11px] font-semibold outline-none" style={{ border: '1px solid #C7D2FE', color: '#4F46E5', backgroundColor: '#F5F3FF' }}>
                    {['Bazar','B.e.','Ç.a.','Çərşənbə','C.a.','Cümə','Şənbə'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                )}
                {recurScheduleType === 'MONTHLY' && <span className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>-u/ı/si</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2" style={{ border: '1.5px solid #C7D2FE', backgroundColor: '#F5F3FF' }}>
                  <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>📅 ATANMA</div>
                  <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Nə vaxt yaransın?</div>
                  <div className="text-[12px] font-bold" style={{ color: '#4F46E5' }}>{recurScheduleType === 'MONTHLY' ? `Ayın ${recurDayOfMonth}-i` : ['Bazar','B.e.','Ç.a.','Çərşənbə','C.a.','Cümə','Şənbə'][recurDayOfWeek]}</div>
                </div>
                <div className="rounded-lg p-2" style={{ border: '1.5px solid #FFE0B2', backgroundColor: '#FFF8F0' }}>
                  <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>🔔 BİLDİRİM</div>
                  <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Xatırlatma günü</div>
                  <input type="number" value={recurNotifDay} onChange={e => setRecurNotifDay(Number(e.target.value))} min={1} max={31}
                    className="w-[50px] text-center rounded px-1 py-0.5 text-[12px] font-bold outline-none" style={{ border: '1.5px solid #FFE0B2' }} />
                </div>
                <div className="rounded-lg p-2" style={{ border: '1.5px solid #FFCDD2', backgroundColor: '#FFF5F5' }}>
                  <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>⏰ SON TARİX</div>
                  <div className="text-[8px] mb-1" style={{ color: '#94A3B8' }}>Nə vaxta qədər?</div>
                  <input type="number" value={recurDeadlineDay} onChange={e => setRecurDeadlineDay(Number(e.target.value))} min={1} max={31}
                    className="w-[50px] text-center rounded px-1 py-0.5 text-[12px] font-bold outline-none" style={{ border: '1.5px solid #FFCDD2' }} />
                </div>
              </div>
            </div>
          </div>
        )}

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
