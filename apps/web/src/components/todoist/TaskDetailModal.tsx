'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import CustomDatePicker from './CustomDatePicker'
import ReminderPicker from './ReminderPicker'
import toast from 'react-hot-toast'

const PRIO_COLORS: Record<string, string> = { P1: '#DC4C3E', P2: '#EB8909', P3: '#246FE0', P4: '#B3B3B3' }
const PRIO_LABELS: Record<string, string> = { P1: 'Təcili', P2: 'Yüksək', P3: 'Orta', P4: 'Normal' }

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  onRefresh: () => void
}

export default function TaskDetailModal({ taskId, onClose, onRefresh }: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingContent, setEditingContent] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [contentValue, setContentValue] = useState('')
  const [descValue, setDescValue] = useState('')
  const [prioOpen, setPrioOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [subTaskInput, setSubTaskInput] = useState('')
  const [subTaskDueDate, setSubTaskDueDate] = useState('')
  const [subTaskPriority, setSubTaskPriority] = useState('P4')
  const [subTaskReminder, setSubTaskReminder] = useState('')
  const [showSubAdd, setShowSubAdd] = useState(false)
  const [subFileInput, setSubFileInput] = useState<File | null>(null)
  const subFileRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [durationOpen, setDurationOpen] = useState(false)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [allLabels, setAllLabels] = useState<any[]>([])
  const [subLabelPickerOpen, setSubLabelPickerOpen] = useState(false)
  const [subTaskLabels, setSubTaskLabels] = useState<string[]>([])
  const [subTaskFiles, setSubTaskFiles] = useState<File[]>([])
  const [subTaskLocation, setSubTaskLocation] = useState('')
  const [subDatePickerOpen, setSubDatePickerOpen] = useState(false)
  const [subReminderOpen, setSubReminderOpen] = useState(false)
  const [editSubId, setEditSubId] = useState<string | null>(null)
  const [editingSubInline, setEditingSubInline] = useState<string | null>(null)
  const [editSubContent, setEditSubContent] = useState('')
  const [editSubPriority, setEditSubPriority] = useState('P4')
  const [editSubDueDate, setEditSubDueDate] = useState('')
  const [editSubReminder, setEditSubReminder] = useState('')
  const [editSubLabels, setEditSubLabels] = useState<string[]>([])
  const [editSubLocation, setEditSubLocation] = useState('')
  const [subLocationOpen, setSubLocationOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({})
  const [subPrioOpen, setSubPrioOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bir popup açılanda digərlərini bağla
  const closeAllPopups = (except?: string) => {
    if (except !== 'prio') setPrioOpen(false)
    if (except !== 'date') setDatePickerOpen(false)
    if (except !== 'reminder') setReminderOpen(false)
    if (except !== 'duration') setDurationOpen(false)
    if (except !== 'label') setLabelPickerOpen(false)
    if (except !== 'subDate') setSubDatePickerOpen(false)
    if (except !== 'subReminder') setSubReminderOpen(false)
    if (except !== 'subPrio') setSubPrioOpen(false)
    if (except !== 'subLabel') setSubLabelPickerOpen(false)
    if (except !== 'subLoc') setSubLocationOpen(false)
  }
  const commentInputRef = useRef<HTMLInputElement>(null)
  const contentInputRef = useRef<HTMLInputElement>(null)
  const subTaskInputRef = useRef<HTMLInputElement>(null)

  const loadTask = useCallback(async () => {
    if (!taskId) return
    // State sıfırla
    setShowSubAdd(false)
    setSubTaskInput('')
    setSubTaskDueDate('')
    setSubTaskPriority('P4')
    setSubTaskReminder('')
    setSubFileInput(null)
    setSubTaskLabels([])
    closeAllPopups()
    try {
      setLoading(true)
      const [found, commentsData, attachmentsData, labelsData] = await Promise.all([
        api.getTodoistTaskById(taskId),
        api.getTodoistComments(taskId),
        api.getTodoistAttachments(taskId).catch(() => []),
        api.getTodoistLabels().catch(() => []),
      ])
      setAllLabels(labelsData)
      if (found) {
        setTask(found)
        setContentValue(found.content)
        setDescValue(found.description || '')
      }
      setComments(commentsData)
      setAttachments(attachmentsData)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [taskId])

  useEffect(() => { loadTask() }, [loadTask])

  if (!taskId) return null

  // ═══ Lokal dəyişiklik — API çağırmır, yalnız pending-ə yazır ═══
  const addPending = (changes: Record<string, any>) => {
    setPendingChanges(prev => ({ ...prev, ...changes }))
    setTask((prev: any) => prev ? { ...prev, ...changes } : prev)
    setHasUnsavedChanges(true)
  }

  // ═══ ONAY — bütün dəyişiklikləri birlikdə göndər ═══
  const handleSaveAll = async () => {
    if (Object.keys(pendingChanges).length === 0 && !editingContent && !editingDesc) {
      setHasUnsavedChanges(false); return
    }
    setSaving(true)
    try {
      const data: any = { ...pendingChanges }
      if (editingContent && contentValue.trim() && contentValue !== task?.content) data.content = contentValue.trim()
      if (editingDesc && descValue !== (task?.description || '')) data.description = descValue.trim() || null
      if (Object.keys(data).length > 0) {
        await api.updateTodoistTask(taskId!, data)
      }
      setPendingChanges({})
      setHasUnsavedChanges(false)
      setEditingContent(false)
      setEditingDesc(false)
      toast.success('Saxlanıldı')
      loadTask()
      onRefresh()
    } catch (err: any) { toast.error(err.message || 'Xəta') }
    finally { setSaving(false) }
  }

  // ═══ Ləğv — bütün dəyişiklikləri geri qaytar ═══
  const handleDiscardAll = () => {
    setPendingChanges({})
    setHasUnsavedChanges(false)
    setEditingContent(false)
    setEditingDesc(false)
    loadTask() // orijinal datanı yenidən yüklə
  }

  const handleSaveContent = () => {
    if (!contentValue.trim() || contentValue === task?.content) { setEditingContent(false); return }
    addPending({ content: contentValue.trim() })
    setEditingContent(false)
  }

  const handleSaveDesc = () => {
    if (descValue === (task?.description || '')) { setEditingDesc(false); return }
    addPending({ description: descValue.trim() || null })
    setEditingDesc(false)
  }

  const handlePriority = (p: string) => {
    setPrioOpen(false)
    addPending({ priority: p })
  }

  const handleDueDate = (date: string | null) => {
    setDatePickerOpen(false)
    addPending({ dueDate: date })
  }

  const handleToggle = async () => {
    try {
      if (task.isCompleted) {
        await api.uncompleteTodoistTask(taskId)
      } else {
        await api.completeTodoistTask(taskId)
      }
      loadTask()
      onRefresh()
    } catch (err: any) { alert(err.message) }
  }

  const handleDelete = async () => {
    try {
      await api.deleteTodoistTask(taskId)
      toast('Tapşırıq silindi', { icon: '🗑️' })
      onRefresh()
      onClose()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      await api.createTodoistComment(taskId, newComment.trim())
      setNewComment('')
      const data = await api.getTodoistComments(taskId)
      setComments(data)
    } catch (err: any) { alert(err.message) }
  }

  const handleDeleteComment = async (id: string) => {
    try {
      await api.deleteTodoistComment(id)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  const resetSubTaskForm = () => { setSubTaskInput(''); setSubTaskDueDate(''); setSubTaskPriority('P4'); setSubTaskReminder(''); setSubFileInput(null); setSubTaskLabels([]); setSubTaskFiles([]); setSubTaskLocation('') }

  const handleAddSubTask = async () => {
    if (!subTaskInput.trim()) return
    try {
      // Dosya limit yoxla — toplam 1.5MB
      if (subTaskFiles.length > 0) {
        const existingSize = (task?.attachments || []).reduce((s: number, a: any) => s + (a.size || 0), 0)
          + (task?.children || []).reduce((s: number, c: any) => s + (c.attachments || []).reduce((s2: number, a: any) => s2 + (a.size || 0), 0), 0)
        const newSize = subTaskFiles.reduce((s, f) => s + f.size, 0)
        if (existingSize + newSize > 1.5 * 1024 * 1024) {
          toast.error('Toplam dosya limiti 1.5MB-ı keçir!'); return
        }
      }

      const data: any = {
        content: subTaskInput.trim(),
        priority: subTaskPriority,
        parentId: taskId,
        projectId: task?.projectId,
      }
      if (subTaskDueDate) data.dueDate = subTaskDueDate
      if (subTaskReminder) data.reminder = subTaskReminder
      if (subTaskLabels.length) data.labelIds = subTaskLabels
      if (subTaskLocation) data.location = subTaskLocation
      const created: any = await api.createTodoistTask(data)

      // Dosyaları yüklə
      if (subTaskFiles.length > 0 && created?.id) {
        for (const file of subTaskFiles) {
          await api.uploadTodoistAttachment(created.id, file)
        }
      }

      resetSubTaskForm()
      subTaskInputRef.current?.focus()
      loadTask()
    } catch (err: any) { toast.error(err.message || 'Xəta') }
  }

  const handleToggleSubTask = async (subId: string) => {
    const sub = task?.children?.find((s: any) => s.id === subId)
    if (!sub) return
    try {
      if (sub.isCompleted) {
        await api.uncompleteTodoistTask(subId)
      } else {
        await api.completeTodoistTask(subId)
      }
      loadTask()
    } catch (err: any) { alert(err.message) }
  }

  const color = PRIO_COLORS[task?.priority] || 'var(--todoist-text-tertiary)'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative rounded-xl shadow-2xl w-[600px] max-h-[75vh] flex flex-col" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>

        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-48 rounded bg-[var(--todoist-border)]" />
              <div className="h-4 w-64 rounded bg-[var(--todoist-border)]" />
              <div className="h-20 w-full rounded bg-[var(--todoist-border)]" />
            </div>
          </div>
        ) : !task ? (
          <div className="p-8 text-center">
            <p className="text-[14px]" style={{ color: 'var(--todoist-text-secondary)' }}>Tapşırıq tapılmadı</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                {task.project && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: task.project.color + '15', color: task.project.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                    {task.project.name}
                  </span>
                )}
                {task.section && (
                  <span className="text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>/ {task.section.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setDeleteConfirm(true)} className="p-1 rounded hover:bg-[var(--todoist-red-light)] transition" title="Sil">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
                {hasUnsavedChanges && (
                  <button onClick={handleSaveAll} disabled={saving}
                    className="p-1.5 rounded-lg transition hover:opacity-80 animate-pulse disabled:opacity-50" style={{ backgroundColor: 'var(--todoist-red)' }} title="Dəyişiklikləri saxla">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                )}
                <button onClick={() => { handleDiscardAll(); onClose() }} className="p-1 rounded hover:bg-[var(--todoist-border)] transition" title="Bağla">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Checkbox + Content */}
              <div className="flex items-start gap-3 mb-3">
                <button onClick={handleToggle}
                  className="mt-1 shrink-0 w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition hover:scale-110"
                  style={{ borderColor: color, backgroundColor: task.isCompleted ? color : 'transparent' }}>
                  {task.isCompleted && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingContent ? (
                    <input ref={contentInputRef} value={contentValue}
                      onChange={e => { setContentValue(e.target.value); setHasUnsavedChanges(true) }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveContent(); if (e.key === 'Escape') { setContentValue(task.content); setEditingContent(false) } }}
                      onBlur={handleSaveContent}
                      className="w-full text-[16px] font-semibold outline-none border-b-2 pb-1" style={{ color: 'var(--todoist-text)', borderColor: 'var(--todoist-red)' }}
                      autoFocus />
                  ) : (
                    <h2 onClick={() => { setEditingContent(true); setTimeout(() => contentInputRef.current?.focus(), 50) }}
                      className={`text-[16px] font-semibold cursor-text hover:bg-[var(--todoist-sidebar-hover)] rounded px-1 -mx-1 py-0.5 transition ${task.isCompleted ? 'line-through text-[var(--todoist-text-tertiary)]' : ''}`}
                      style={{ color: task.isCompleted ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)' }}>
                      {task.content}
                    </h2>
                  )}

                  {/* Description */}
                  {editingDesc ? (
                    <textarea value={descValue}
                      onChange={e => { setDescValue(e.target.value); setHasUnsavedChanges(true) }}
                      onKeyDown={e => { if (e.key === 'Escape') { setDescValue(task.description || ''); setEditingDesc(false) } }}
                      onBlur={handleSaveDesc}
                      className="w-full text-[12px] outline-none border rounded-lg p-2 mt-1 resize-none" style={{ color: 'var(--todoist-text)', borderColor: 'var(--todoist-divider)', minHeight: 60 }}
                      placeholder="Təsvir əlavə et..."
                      autoFocus />
                  ) : (
                    <p onClick={() => setEditingDesc(true)}
                      className="text-[12px] mt-1 cursor-text hover:bg-[var(--todoist-sidebar-hover)] rounded px-1 -mx-1 py-1 transition min-h-[24px]"
                      style={{ color: task.description ? 'var(--todoist-text-secondary)' : 'var(--todoist-text-tertiary)' }}>
                      {task.description || 'Təsvir əlavə et...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Row — Önəmlilik | Xatırlatma | Son tarix | Etiket | Konum | Kopyala | Link */}
              <div className="flex items-center gap-1.5 flex-wrap mb-4 pl-8">
                {/* 1. Önəmlilik */}
                <div className="relative">
                  <button onClick={() => { closeAllPopups('prio'); setPrioOpen(!prioOpen) }}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: task.priority !== 'P4' ? PRIO_COLORS[task.priority] + '15' : 'var(--todoist-sidebar-hover)', color: PRIO_COLORS[task.priority], border: '1px solid var(--todoist-divider)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[task.priority]} stroke={PRIO_COLORS[task.priority]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    {PRIO_LABELS[task.priority]}
                  </button>
                  {prioOpen && (
                    <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[100px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                      {(['P1','P2','P3','P4'] as const).map(p => (
                        <button key={p} onClick={() => handlePriority(p)}
                          className={`w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left ${task.priority === p ? 'bg-[var(--todoist-sidebar-hover)]' : ''}`}
                          style={{ color: PRIO_COLORS[p] }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[p]} stroke={PRIO_COLORS[p]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                          {PRIO_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Xatırlatma */}
                <div className="relative">
                  <button onClick={() => { closeAllPopups('reminder'); setReminderOpen(!reminderOpen) }}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: task.reminder ? '#EEF2FF' : 'var(--todoist-sidebar-hover)', color: task.reminder ? '#6366F1' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                    {task.reminder ? new Date(task.reminder).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Xatırlat'}
                  </button>
                  {reminderOpen && (
                    <ReminderPicker
                      value={task.reminder || null}
                      onChange={(val) => { addPending({ reminder: val }); setReminderOpen(false) }}
                      onClose={() => setReminderOpen(false)}
                    />
                  )}
                </div>

                {/* 3. Son tarix */}
                <div className="relative">
                  <button onClick={() => { closeAllPopups('date'); setDatePickerOpen(!datePickerOpen) }}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: task.dueDate ? '#E8F0FE' : 'var(--todoist-sidebar-hover)', color: task.dueDate ? '#246FE0' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {task.dueDate ? formatDue(task.dueDate) : 'Son tarix'}
                  </button>
                  {datePickerOpen && (
                    <CustomDatePicker
                      value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                      onChange={(d) => handleDueDate(d)}
                      onClear={() => handleDueDate(null)}
                      onClose={() => setDatePickerOpen(false)}
                      onRecurring={(rule) => { addPending({ isRecurring: true, recurRule: rule }) }}
                      position="bottom"
                    />
                  )}
                </div>

                {/* 4. Etiket */}
                <div className="relative">
                  <button onClick={() => { closeAllPopups('label'); setLabelPickerOpen(!labelPickerOpen) }}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: task.labels?.length ? '#FFF7ED' : 'var(--todoist-sidebar-hover)', color: task.labels?.length ? '#EB8909' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    {task.labels?.length ? `${task.labels.length} etiket` : 'Etiket'}
                  </button>
                  {labelPickerOpen && (
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                      {allLabels.map((l: any) => {
                        const isSelected = task.labels?.some((tl: any) => tl.label?.id === l.id || tl.labelId === l.id)
                        return (
                          <label key={l.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] hover:opacity-80" style={{ color: 'var(--todoist-text)' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => {
                              const currentIds = (task.labels || []).map((tl: any) => tl.label?.id || tl.labelId).filter(Boolean)
                              const newIds = isSelected ? currentIds.filter((id: string) => id !== l.id) : [...currentIds, l.id]
                              // Lokal labels array-ını da yenilə ki checkbox düzgün görsənsin
                              const newLabels = newIds.map((id: string) => {
                                const found = allLabels.find((al: any) => al.id === id)
                                return found ? { label: found, labelId: id } : { labelId: id }
                              })
                              setPendingChanges(prev => ({ ...prev, labelIds: newIds }))
                              setTask((prev: any) => prev ? { ...prev, labels: newLabels } : prev)
                              setHasUnsavedChanges(true)
                            }} className="rounded" />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color || '#999' }} />{l.name}
                          </label>
                        )
                      })}
                      {allLabels.length === 0 && <p className="px-3 py-2 text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Etiket yoxdur</p>}
                    </div>
                  )}
                </div>

                {/* 5. Konum */}
                <button onClick={() => {
                    closeAllPopups()
                    const loc = prompt('Konum daxil edin:', task.location || '')
                    if (loc !== null) addPending({ location: loc || null })
                  }}
                  className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                  style={{ backgroundColor: task.location ? '#ECFDF5' : 'var(--todoist-sidebar-hover)', color: task.location ? '#059669' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {task.location || 'Konum'}
                </button>

                {/* 6. Kopyala — API ilə yeni TODO yaradır */}
                <button onClick={async () => {
                  closeAllPopups()
                  try {
                    const copyData: any = {
                      content: task.content + ' (copy)',
                      description: task.description || undefined,
                      priority: task.priority,
                      projectId: task.projectId,
                      sectionId: task.sectionId || undefined,
                      dueDate: task.dueDate || undefined,
                      duration: task.duration || undefined,
                      reminder: task.reminder || undefined,
                      isRecurring: task.isRecurring || false,
                      recurRule: task.recurRule || undefined,
                    }
                    // Label ID-lər varsa əlavə et
                    const labelIds = task.labels?.map((l: any) => l.label?.id || l.labelId || l.id).filter(Boolean) || []
                    if (labelIds.length > 0) copyData.labelIds = labelIds

                    const newTask: any = await api.createTodoistTask(copyData)
                    // Alt-görevləri də kopyala
                    if (task.children?.length > 0) {
                      for (const child of task.children) {
                        await api.createTodoistTask({
                          content: child.content,
                          priority: child.priority,
                          parentId: newTask.id,
                          projectId: task.projectId,
                          dueDate: child.dueDate || undefined,
                        })
                      }
                    }
                    toast.success('TODO kopyalandı')
                  } catch (err) { console.error('Copy error:', err); toast.error('Kopyalama xətası') }
                }}
                  className="rounded-md px-2 py-1 text-[10px] font-medium flex items-center gap-1 hover:bg-[var(--todoist-sidebar-hover)] transition"
                  style={{ color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }} title="Görevi kopyala">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Kopyala
                </button>

                {/* 7. Link kopyala */}
                <button onClick={() => { closeAllPopups(); navigator.clipboard.writeText(window.location.origin + '/todo?taskId=' + task.id); toast.success('Bağlantı kopyalandı') }}
                  className="rounded-md px-2 py-1 text-[10px] font-medium flex items-center gap-1 hover:bg-[var(--todoist-sidebar-hover)] transition"
                  style={{ color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }} title="Bağlantını kopyala">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  Link
                </button>

                <div className="flex-1" />
              </div>

              {/* Divider */}
              <div className="border-t mb-4" style={{ borderColor: 'var(--todoist-divider)' }} />

              {/* Sub-tasks */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>Alt tapşırıqlar</h3>
                  {!showSubAdd && (
                    <button onClick={() => { setShowSubAdd(true); setTimeout(() => subTaskInputRef.current?.focus(), 50) }}
                      className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--todoist-sidebar-hover)] transition" style={{ color: 'var(--todoist-red)' }}>
                      <span style={{ fontSize: 12 }}>+</span> Əlavə et
                    </button>
                  )}
                </div>

                {/* Sub-task list */}
                {task.children?.length > 0 && (
                  <div className="space-y-0.5 mb-2">
                    {task.children.map((sub: any) => {
                      const isEditing = editingSubInline === sub.id
                      return (
                        <div key={sub.id} className="group/sub flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[var(--todoist-sidebar-hover)] transition">
                          <button onClick={() => handleToggleSubTask(sub.id)}
                            className="mt-0.5 shrink-0 w-[15px] h-[15px] rounded-full border-[1.5px] flex items-center justify-center transition hover:scale-110"
                            style={{ borderColor: PRIO_COLORS[sub.priority] || 'var(--todoist-text-tertiary)', backgroundColor: sub.isCompleted ? PRIO_COLORS[sub.priority] : 'transparent' }}>
                            {sub.isCompleted && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                          </button>

                          {isEditing ? (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <input value={editSubContent} onChange={e => setEditSubContent(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Escape') setEditingSubInline(null) }}
                                  className="flex-1 text-[12px] outline-none border-b pb-0.5" style={{ color: 'var(--todoist-text)', borderColor: 'var(--todoist-red)', backgroundColor: 'transparent' }} autoFocus />
                                <button onClick={async () => {
                                  try { await api.updateTodoistTask(sub.id, { content: editSubContent, priority: editSubPriority, dueDate: editSubDueDate || null, reminder: editSubReminder || null, labelIds: editSubLabels, location: editSubLocation || null }); setEditingSubInline(null); toast.success('Saxlanıldı'); loadTask() }
                                  catch { toast.error('Saxlama xətası') }
                                }} className="shrink-0 px-2 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Saxla</button>
                                <button onClick={() => setEditingSubInline(null)} className="shrink-0 p-0.5 rounded" style={{ color: 'var(--todoist-text-tertiary)' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                              {/* Chip-lər — alt-görev əlavə edərkənki ilə EYNİ görünüş */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Önəmlilik */}
                                <div className="relative">
                                  <button onClick={() => setSubPrioOpen(!subPrioOpen)}
                                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: editSubPriority !== 'P4' ? PRIO_COLORS[editSubPriority] + '15' : 'var(--todoist-sidebar-hover)', color: PRIO_COLORS[editSubPriority], border: '1px solid var(--todoist-divider)' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[editSubPriority]} stroke={PRIO_COLORS[editSubPriority]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                    {PRIO_LABELS[editSubPriority]}
                                  </button>
                                  {subPrioOpen && (
                                    <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[100px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                                      {(['P1','P2','P3','P4'] as const).map(p => (
                                        <button key={p} onClick={() => { setEditSubPriority(p); setSubPrioOpen(false) }}
                                          className="w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left"
                                          style={{ color: PRIO_COLORS[p] }}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[p]} stroke={PRIO_COLORS[p]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                          {PRIO_LABELS[p]}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Xatırlatma */}
                                <div className="relative">
                                  <button onClick={() => setSubReminderOpen(!subReminderOpen)}
                                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: editSubReminder ? '#EEF2FF' : 'var(--todoist-sidebar-hover)', color: editSubReminder ? '#6366F1' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                                    {editSubReminder ? new Date(editSubReminder).toLocaleString('az', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Xatırlat'}
                                  </button>
                                  {subReminderOpen && (
                                    <ReminderPicker value={editSubReminder || null} onChange={(val) => { setEditSubReminder(val || ''); setSubReminderOpen(false) }} onClose={() => setSubReminderOpen(false)} />
                                  )}
                                </div>
                                {/* Son tarix */}
                                <div className="relative">
                                  <button onClick={() => setSubDatePickerOpen(!subDatePickerOpen)}
                                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: editSubDueDate ? '#E8F0FE' : 'var(--todoist-sidebar-hover)', color: editSubDueDate ? '#246FE0' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                    {editSubDueDate ? new Date(editSubDueDate).toLocaleDateString('az', { day: 'numeric', month: 'short' }) : 'Son tarix'}
                                  </button>
                                  {subDatePickerOpen && (
                                    <CustomDatePicker value={editSubDueDate} onChange={(d) => { setEditSubDueDate(d || ''); setSubDatePickerOpen(false) }} onClear={() => { setEditSubDueDate(''); setSubDatePickerOpen(false) }} onClose={() => setSubDatePickerOpen(false)} position="bottom" />
                                  )}
                                </div>
                                {/* Etiket */}
                                <div className="relative">
                                  <button onClick={() => setSubLabelPickerOpen(!subLabelPickerOpen)}
                                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: editSubLabels.length ? '#FFF7ED' : 'var(--todoist-sidebar-hover)', color: editSubLabels.length ? '#EB8909' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    {editSubLabels.length ? `${editSubLabels.length} etiket` : 'Etiket'}
                                  </button>
                                  {subLabelPickerOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-44 rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                                      {allLabels.map((l: any) => (
                                        <label key={l.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] hover:opacity-80" style={{ color: 'var(--todoist-text)' }}>
                                          <input type="checkbox" checked={editSubLabels.includes(l.id)} onChange={() => setEditSubLabels(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id])} className="rounded" />
                                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color || '#999' }} />{l.name}
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Konum */}
                                <div className="relative">
                                  <button onClick={() => setSubLocationOpen(!subLocationOpen)}
                                    className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: editSubLocation ? '#ECFDF5' : 'var(--todoist-sidebar-hover)', color: editSubLocation ? '#10B981' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    {editSubLocation || 'Konum'}
                                  </button>
                                  {subLocationOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg p-2 z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                                      <input value={editSubLocation} onChange={e => setEditSubLocation(e.target.value)} placeholder="Konum yazın..." autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') setSubLocationOpen(false) }}
                                        className="w-full rounded px-2 py-1.5 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
                                      <div className="flex gap-1 mt-1.5">
                                        <button onClick={() => setSubLocationOpen(false)} className="flex-1 rounded px-2 py-1 text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Tamam</button>
                                        <button onClick={() => { setEditSubLocation(''); setSubLocationOpen(false) }} className="flex-1 rounded px-2 py-1 text-[9px]" style={{ color: 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-divider)' }}>Sil</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Dosya */}
                                <label className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                  style={{ backgroundColor: 'var(--todoist-sidebar-hover)', color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                  Dosya
                                  <input type="file" className="hidden" multiple accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={async (e) => {
                                    const files = e.target.files; if (!files?.length) return
                                    // 1.5MB limit
                                    const existingSize = (task?.attachments || []).reduce((s: number, a: any) => s + (a.size || 0), 0)
                                      + (task?.children || []).reduce((s: number, c: any) => s + (c.attachments || []).reduce((s2: number, a: any) => s2 + (a.size || 0), 0), 0)
                                    const newSize = Array.from(files).reduce((s, f) => s + f.size, 0)
                                    if (existingSize + newSize > 1.5 * 1024 * 1024) {
                                      toast.error('Toplam dosya limiti 1.5MB-ı keçir!'); e.target.value = ''; return
                                    }
                                    try {
                                      for (let i = 0; i < files.length; i++) await api.uploadTodoistAttachment(sub.id, files[i])
                                      toast.success(`${files.length} dosya əlavə edildi`); loadTask()
                                    } catch { toast.error('Dosya xətası') }
                                    e.target.value = ''
                                  }} />
                                </label>
                              </div>
                              {/* Düzənlə zamanı mövcud dosyalar — x ilə silmək */}
                              {sub.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {sub.attachments.map((att: any) => (
                                    <div key={att.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--todoist-sidebar-hover)', border: '1px solid var(--todoist-divider)' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                      <span className="text-[9px] max-w-[80px] truncate" style={{ color: 'var(--todoist-text-secondary)' }}>{att.filename}</span>
                                      <button onClick={async () => {
                                        try { await api.deleteTodoistAttachment(att.id); toast.success('Silindi'); loadTask() }
                                        catch { toast.error('Silmə xətası') }
                                      }} className="p-0.5 rounded hover:bg-red-50 transition">
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#DC4C3E" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <div className="flex-1 min-w-0">
                                <span className={`text-[12px] ${sub.isCompleted ? 'line-through text-[var(--todoist-text-tertiary)]' : 'text-[var(--todoist-text)]'}`}>{sub.content}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {sub.dueDate && (
                                    <span className="text-[9px] flex items-center gap-0.5" style={{ color: new Date(sub.dueDate) < new Date() ? '#DC4C3E' : 'var(--todoist-text-tertiary)' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                      {new Date(sub.dueDate).toLocaleDateString('az', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  {sub.priority && sub.priority !== 'P4' && (
                                    <span className="text-[8px] font-bold px-1 py-px rounded" style={{ backgroundColor: (PRIO_COLORS[sub.priority] || '#B3B3B3') + '20', color: PRIO_COLORS[sub.priority] }}>{sub.priority}</span>
                                  )}
                                  {sub.reminder && (
                                    <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#6366F1' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
                                      {new Date(sub.reminder).toLocaleString('az', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                  {sub.duration && <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>⏱ {sub.duration}d</span>}
                                  {sub.labels?.map((tl: any) => (
                                    <span key={tl.label?.id || tl.labelId} className="text-[8px] font-medium px-1 py-px rounded" style={{ backgroundColor: (tl.label?.color || '#999') + '20', color: tl.label?.color || '#999' }}>{tl.label?.name}</span>
                                  ))}
                                  {sub.location && (
                                    <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#10B981' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                      {sub.location}
                                    </span>
                                  )}
                                </div>
                                {/* Dosyalar — tıkla yüklə */}
                                {sub.attachments?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sub.attachments.map((att: any) => (
                                      <a key={att.id} href={`http://localhost:4000/uploads/${att.storagePath?.split('/').pop() || att.storagePath}`}
                                        target="_blank" rel="noopener noreferrer" download={att.filename}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:opacity-80 transition" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                        <span className="text-[9px] max-w-[80px] truncate" style={{ color: 'var(--todoist-text-secondary)' }}>{att.filename}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => { setEditingSubInline(sub.id); setEditSubContent(sub.content); setEditSubPriority(sub.priority || 'P4'); setEditSubDueDate(sub.dueDate ? new Date(sub.dueDate).toISOString().split('T')[0] : ''); setEditSubReminder(sub.reminder ? new Date(sub.reminder).toISOString().slice(0,16) : ''); setEditSubLabels((sub.labels || []).map((tl: any) => tl.label?.id || tl.labelId).filter(Boolean)); setEditSubLocation(sub.location || '') }}
                                className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded transition" style={{ color: 'var(--todoist-text-tertiary)' }} title="Düzənlə">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                              </button>
                              <button onClick={async () => { try { await api.createTodoistTask({ content: sub.content + ' (copy)', priority: sub.priority, parentId: task.id, projectId: task.projectId, dueDate: sub.dueDate || undefined }); toast.success('Kopyalandı'); loadTask() } catch {} }}
                                className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded transition" style={{ color: 'var(--todoist-text-tertiary)' }} title="Kopyala">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Sub-task progress */}
                {task.children?.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--todoist-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        backgroundColor: '#44BE6C',
                        width: `${(task.children.filter((s: any) => s.isCompleted).length / task.children.length) * 100}%`
                      }} />
                    </div>
                    <span className="text-[9px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>
                      {task.children.filter((s: any) => s.isCompleted).length}/{task.children.length}
                    </span>
                  </div>
                )}

                {/* Add sub-task input + options */}
                {showSubAdd && (
                  <div className="px-2 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 w-[15px] h-[15px] rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: PRIO_COLORS[subTaskPriority] || 'var(--todoist-text-tertiary)', fontSize: 9, color: 'var(--todoist-text-tertiary)' }}>+</span>
                      <input ref={subTaskInputRef} value={subTaskInput}
                        onChange={e => setSubTaskInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSubTask(); if (e.key === 'Escape') { setShowSubAdd(false); resetSubTaskForm() } }}
                        className="flex-1 text-[12px] outline-none py-1" style={{ color: 'var(--todoist-text)' }}
                        placeholder="Alt tapşırıq adı..." />
                      <button onClick={handleAddSubTask} disabled={!subTaskInput.trim()}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded text-white disabled:opacity-30" style={{ backgroundColor: 'var(--todoist-red)' }}>
                        Əlavə et
                      </button>
                      <button onClick={() => { setShowSubAdd(false); resetSubTaskForm() }}
                        className="text-[10px] font-medium px-1 py-0.5 rounded hover:bg-[var(--todoist-border)]" style={{ color: 'var(--todoist-text-secondary)' }}>
                        Ləğv
                      </button>
                    </div>
                    {/* Alt-görev seçimləri — TODO ilə eyni sıra, eyni ikon, eyni rəng */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
                      {/* 1. Önəmlilik (TODO ilə eyni) */}
                      <div className="relative">
                        <button onClick={() => { closeAllPopups('subPrio'); setSubPrioOpen(!subPrioOpen) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                          style={{ backgroundColor: subTaskPriority !== 'P4' ? PRIO_COLORS[subTaskPriority] + '15' : 'var(--todoist-sidebar-hover)', color: PRIO_COLORS[subTaskPriority], border: '1px solid var(--todoist-divider)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[subTaskPriority]} stroke={PRIO_COLORS[subTaskPriority]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                          {PRIO_LABELS[subTaskPriority]}
                        </button>
                        {subPrioOpen && (
                          <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[100px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                            {(['P1','P2','P3','P4'] as const).map(p => (
                              <button key={p} onClick={() => { setSubTaskPriority(p); setSubPrioOpen(false) }}
                                className={`w-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left ${subTaskPriority === p ? 'bg-[var(--todoist-sidebar-hover)]' : ''}`}
                                style={{ color: PRIO_COLORS[p] }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill={PRIO_COLORS[p]} stroke={PRIO_COLORS[p]} strokeWidth="1"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                {PRIO_LABELS[p]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Xatırlatma (TODO ilə eyni ReminderPicker) */}
                      <div className="relative">
                        <button onClick={() => { closeAllPopups('subReminder'); setSubReminderOpen(!subReminderOpen) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                          style={{ backgroundColor: subTaskReminder ? '#EEF2FF' : 'var(--todoist-sidebar-hover)', color: subTaskReminder ? '#6366F1' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                          {subTaskReminder ? new Date(subTaskReminder).toLocaleString('az', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Xatırlat'}
                        </button>
                        {subReminderOpen && (
                          <ReminderPicker value={subTaskReminder || null} onChange={(val) => { setSubTaskReminder(val || ''); setSubReminderOpen(false) }} onClose={() => setSubReminderOpen(false)} />
                        )}
                      </div>

                      {/* 3. Son tarix (TODO ilə eyni CustomDatePicker) */}
                      <div className="relative">
                        <button onClick={() => { closeAllPopups('subDate'); setSubDatePickerOpen(!subDatePickerOpen) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                          style={{ backgroundColor: subTaskDueDate ? '#E8F0FE' : 'var(--todoist-sidebar-hover)', color: subTaskDueDate ? '#246FE0' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                          {subTaskDueDate ? new Date(subTaskDueDate).toLocaleDateString('az', { day: 'numeric', month: 'short' }) : 'Son tarix'}
                        </button>
                        {subDatePickerOpen && (
                          <CustomDatePicker value={subTaskDueDate} onChange={(d) => { setSubTaskDueDate(d || ''); setSubDatePickerOpen(false) }} onClear={() => { setSubTaskDueDate(''); setSubDatePickerOpen(false) }} onClose={() => setSubDatePickerOpen(false)} position="bottom" />
                        )}
                      </div>

                      {/* 4. Etiket (TODO ilə eyni dropdown) */}
                      <div className="relative">
                        <button onClick={() => { closeAllPopups('subLabel'); setSubLabelPickerOpen(!subLabelPickerOpen) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                          style={{ backgroundColor: subTaskLabels.length ? '#FFF7ED' : 'var(--todoist-sidebar-hover)', color: subTaskLabels.length ? '#EB8909' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                          {subTaskLabels.length ? `${subTaskLabels.length} etiket` : 'Etiket'}
                        </button>
                        {subLabelPickerOpen && (
                          <div className="absolute top-full left-0 mt-1 w-44 rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                            {allLabels.map((l: any) => (
                              <label key={l.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] hover:opacity-80" style={{ color: 'var(--todoist-text)' }}>
                                <input type="checkbox" checked={subTaskLabels.includes(l.id)} onChange={() => setSubTaskLabels(prev => prev.includes(l.id) ? prev.filter((id: string) => id !== l.id) : [...prev, l.id])} className="rounded" />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color || '#999' }} />{l.name}
                              </label>
                            ))}
                            {allLabels.length === 0 && <p className="px-3 py-2 text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Etiket yoxdur</p>}
                          </div>
                        )}
                      </div>

                      {/* 5. Konum (TODO ilə eyni popup) */}
                      <div className="relative">
                        <button onClick={() => { closeAllPopups('subLoc'); setSubLocationOpen(!subLocationOpen) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                          style={{ backgroundColor: subTaskLocation ? '#ECFDF5' : 'var(--todoist-sidebar-hover)', color: subTaskLocation ? '#10B981' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {subTaskLocation || 'Konum'}
                        </button>
                        {subLocationOpen && (
                          <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg p-2 z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                            <input value={subTaskLocation} onChange={e => setSubTaskLocation(e.target.value)} placeholder="Konum yazın..." autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') setSubLocationOpen(false) }}
                              className="w-full rounded px-2 py-1.5 text-[11px] outline-none" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
                            <div className="flex gap-1 mt-1.5">
                              <button onClick={() => setSubLocationOpen(false)} className="flex-1 rounded px-2 py-1 text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Tamam</button>
                              <button onClick={() => { setSubTaskLocation(''); setSubLocationOpen(false) }} className="flex-1 rounded px-2 py-1 text-[9px]" style={{ color: 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-divider)' }}>Sil</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 6. Dosya (birdən çox) */}
                      <button onClick={() => subFileRef.current?.click()}
                        className="rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1"
                        style={{ backgroundColor: subTaskFiles.length ? '#ECFDF5' : 'var(--todoist-sidebar-hover)', color: subTaskFiles.length ? '#059669' : 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                        {subTaskFiles.length ? `${subTaskFiles.length} dosya` : 'Dosya'}
                      </button>
                      <input ref={subFileRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e => {
                        const files = e.target.files
                        console.log('SUB FILE CHANGE:', files?.length, files?.[0]?.name, files?.[0]?.size)
                        if (files && files.length > 0) {
                          const fileArr = Array.from(files)
                          const totalNew = fileArr.reduce((s, f) => s + f.size, 0)
                          const existingSize = (task?.attachments || []).reduce((s: number, a: any) => s + (a.size || 0), 0)
                            + (task?.children || []).reduce((s: number, c: any) => s + (c.attachments || []).reduce((s2: number, a: any) => s2 + (a.size || 0), 0), 0)
                          if (existingSize + totalNew > 1.5 * 1024 * 1024) {
                            toast.error('Toplam dosya limiti 1.5MB-ı keçir!')
                          } else {
                            setSubTaskFiles(prev => {
                              const next = [...prev, ...fileArr]
                              console.log('SUB FILES UPDATED:', next.length, next.map(f => f.name))
                              return next
                            })
                            toast.success(`${fileArr.length} dosya seçildi`)
                          }
                        }
                        if (e.target) e.target.value = ''
                      }} />

                      {/* 7. Kopyala (TODO ilə eyni) */}
                      <button onClick={() => { navigator.clipboard.writeText(subTaskInput); toast.success('Kopyalandı') }}
                        className="rounded-md px-2 py-1 text-[10px] font-medium flex items-center gap-1 hover:bg-[var(--todoist-sidebar-hover)] transition"
                        style={{ color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        Kopyala
                      </button>
                    </div>

                    {/* Seçilən xüsusiyyətlər — badge olaraq görsənir */}
                    {(subTaskPriority !== 'P4' || subTaskDueDate || subTaskReminder || subTaskLabels.length > 0 || subTaskLocation || subTaskFiles.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
                        {subTaskPriority !== 'P4' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: PRIO_COLORS[subTaskPriority] + '15', color: PRIO_COLORS[subTaskPriority] }}>
                            {PRIO_LABELS[subTaskPriority]}
                          </span>
                        )}
                        {subTaskDueDate && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {new Date(subTaskDueDate).toLocaleDateString('az', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {subTaskReminder && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
                            🔔 {new Date(subTaskReminder).toLocaleString('az', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {subTaskLabels.length > 0 && subTaskLabels.map(lid => {
                          const lbl = allLabels.find((l: any) => l.id === lid)
                          return lbl ? <span key={lid} className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: (lbl.color || '#999') + '20', color: lbl.color || '#999' }}>{lbl.name}</span> : null
                        })}
                        {subTaskLocation && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {subTaskLocation}
                          </span>
                        )}
                        {subTaskFiles.map((f, i) => (
                          <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: '#F0FDF4', color: '#059669' }}>
                            📎 {f.name.length > 12 ? f.name.slice(0, 12) + '...' : f.name}
                            <button onClick={() => setSubTaskFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 hover:text-red-500">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {task.children?.length === 0 && !showSubAdd && (
                  <p className="text-[11px] px-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Alt tapşırıq yoxdur</p>
                )}
              </div>

              {/* Konum */}
              {task.location && (
                <div className="mb-3 px-2 flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="text-[11px] font-medium" style={{ color: '#059669' }}>{task.location}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t mb-4" style={{ borderColor: 'var(--todoist-divider)' }} />

              {/* Fayllar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>Fayllar</h3>
                  <button onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--todoist-sidebar-hover)] transition disabled:opacity-40" style={{ color: 'var(--todoist-red)' }}>
                    {uploading ? (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-[var(--todoist-red)] border-t-transparent rounded-full" />
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    )}
                    {uploading ? 'Yüklənir...' : 'Fayl əlavə et'}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" multiple accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files?.length) return
                      // 1.5MB limit yoxla
                      const existingSize = attachments.reduce((s: number, a: any) => s + (a.size || 0), 0)
                        + (task?.children || []).reduce((s: number, c: any) => s + (c.attachments || []).reduce((s2: number, a: any) => s2 + (a.size || 0), 0), 0)
                      const newSize = Array.from(files).reduce((s, f) => s + f.size, 0)
                      if (existingSize + newSize > 1.5 * 1024 * 1024) {
                        toast.error('Toplam dosya limiti 1.5MB-ı keçir!'); e.target.value = ''; return
                      }
                      setUploading(true)
                      try {
                        for (let i = 0; i < files.length; i++) {
                          await api.uploadTodoistAttachment(taskId, files[i])
                        }
                        const data = await api.getTodoistAttachments(taskId)
                        setAttachments(data)
                        toast.success(`${files.length} dosya əlavə edildi`)
                      } catch (err: any) { toast.error(err.message || 'Dosya xətası') }
                      finally { setUploading(false); e.target.value = '' }
                    }}
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((att: any) => (
                      <div key={att.id} className="group/file flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--todoist-sidebar-hover)] transition">
                        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-[9px] font-bold"
                          style={{ backgroundColor: getFileColor(att.mimeType) + '15', color: getFileColor(att.mimeType) }}>
                          {getFileIcon(att.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={`http://localhost:4000/uploads/${att.storagePath?.split('/').pop() || att.storagePath}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[12px] font-medium truncate block hover:underline" style={{ color: 'var(--todoist-text)' }}>
                            {att.filename}
                          </a>
                          <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>
                            {formatFileSize(att.size)} · {new Date(att.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <button onClick={() => setDeleteFileId(att.id)}
                          className="opacity-0 group-hover/file:opacity-60 hover:!opacity-100 p-1 rounded hover:bg-[var(--todoist-red-light)] transition" title="Sil">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length === 0 && (
                  <p className="text-[11px] px-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Əlavə edilmiş fayl yoxdur</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t mb-4" style={{ borderColor: 'var(--todoist-divider)' }} />

              {/* Comments */}
              <div>
                <h3 className="text-[12px] font-bold mb-2" style={{ color: 'var(--todoist-text)' }}>Şərhlər</h3>

                {comments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {comments.map(c => (
                      <div key={c.id} className="group/comment flex gap-2 px-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>
                          {c.user?.fullName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--todoist-text)' }}>{c.user?.fullName}</span>
                            <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>
                              {new Date(c.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover/comment:opacity-60 hover:!opacity-100 transition p-0.5 rounded hover:bg-[var(--todoist-red-light)]" title="Sil">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {comments.length === 0 && (
                  <p className="text-[11px] px-2 mb-2" style={{ color: 'var(--todoist-text-tertiary)' }}>Hələ şərh yoxdur</p>
                )}

                {/* Add comment */}
                <div className="flex items-center gap-2 px-2">
                  <input ref={commentInputRef} value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment() }}
                    className="flex-1 text-[12px] outline-none rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--todoist-sidebar-hover)', color: 'var(--todoist-text)' }}
                    placeholder="Şərh yaz..." />
                  <button onClick={handleAddComment} disabled={!newComment.trim()}
                    className="shrink-0 p-2 rounded-lg transition disabled:opacity-30 hover:bg-[var(--todoist-red-light)]" style={{ color: 'var(--todoist-red)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  </button>
                </div>
              </div>

              {/* Meta info */}
              <div className="mt-4 pt-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--todoist-divider)' }}>
                <span className="text-[9px]" style={{ color: 'var(--todoist-text-tertiary)' }}>
                  Yaradılıb: {new Date(task.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {task.completedAt && (
                  <span className="text-[9px]" style={{ color: '#44BE6C' }}>
                    Tamamlanıb: {new Date(task.completedAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <div className="text-center px-8">
              <h3 className="text-[15px] font-bold mb-2" style={{ color: 'var(--todoist-text)' }}>Tapşırığı silmək istəyirsiniz?</h3>
              <p className="text-[12px] mb-4" style={{ color: 'var(--todoist-text-secondary)' }}>Bu əməliyyat geri alına bilməz.</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-[var(--todoist-border)] transition" style={{ color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
                <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition" style={{ backgroundColor: 'var(--todoist-red)' }}>Sil</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dosya silmə onay popup */}
      {deleteFileId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteFileId(null)}>
          <div className="rounded-xl p-6 shadow-2xl max-w-xs w-full mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-3" style={{ backgroundColor: 'rgba(220,76,62,0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC4C3E" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </div>
            <h3 className="text-[14px] font-bold text-center mb-1" style={{ color: 'var(--todoist-text)' }}>Dosya silinsin?</h3>
            <p className="text-[12px] text-center mb-4" style={{ color: 'var(--todoist-text-tertiary)' }}>Bu əməliyyat geri alına bilməz</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteFileId(null)} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-[var(--todoist-border)] transition" style={{ color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
              <button onClick={async () => {
                try { await api.deleteTodoistAttachment(deleteFileId); setAttachments(prev => prev.filter(a => a.id !== deleteFileId)); toast.success('Dosya silindi') }
                catch { toast.error('Silmə xətası') }
                setDeleteFileId(null)
              }} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition" style={{ backgroundColor: 'var(--todoist-red)' }}>Sil</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function toDateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDue(d: string) {
  const dd = new Date(d); const now = new Date()
  if (dd.toDateString() === now.toDateString()) return 'Bugün'
  const tom = new Date(now); tom.setDate(tom.getDate() + 1)
  if (dd.toDateString() === tom.toDateString()) return 'Sabah'
  if (dd < new Date(now.toDateString())) return dd.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
  return dd.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function getFileColor(mimeType: string): string {
  if (mimeType?.startsWith('image/')) return '#44BE6C'
  if (mimeType?.includes('pdf')) return 'var(--todoist-red)'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '#246FE0'
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '#058527'
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '#EB8909'
  return 'var(--todoist-text-secondary)'
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.startsWith('image/')) return '🖼'
  if (mimeType?.includes('pdf')) return 'PDF'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'DOC'
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'XLS'
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'ZIP'
  return '📎'
}
