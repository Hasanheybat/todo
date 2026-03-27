'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'

interface TemplateManagerProps {
  open: boolean
  onClose: () => void
  onProjectCreated: () => void
}

export default function TemplateManager({ open, onClose, onProjectCreated }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) loadTemplates()
  }, [open])

  useEffect(() => {
    if (useTemplateId) setTimeout(() => nameRef.current?.focus(), 100)
  }, [useTemplateId])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await api.getTodoistTemplates()
      setTemplates(data)
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  const handleUse = async () => {
    if (!useTemplateId || !projectName.trim()) return
    setSaving(true)
    try {
      await api.useTodoistTemplate(useTemplateId, projectName.trim())
      setUseTemplateId(null)
      setProjectName('')
      onProjectCreated()
      onClose()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Şablon silinsin?')) return
    try {
      await api.deleteTodoistTemplate(id)
      loadTemplates()
    } catch (err: any) { alert(err.message) }
  }

  const getTaskCount = (tasksJson: string) => {
    try { return JSON.parse(tasksJson).length } catch { return 0 }
  }

  const getTaskPreview = (tasksJson: string) => {
    try { return JSON.parse(tasksJson).slice(0, 5) } catch { return [] }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--todoist-divider)] dark:border-[#333]">
          <h3 className="text-[16px] font-bold text-[var(--todoist-text)] dark:text-[#E8E8E8]">Şablonlar</h3>
          <button onClick={onClose} className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text-secondary)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[420px] overflow-y-auto">
          {loading ? (
            <p className="text-center text-[12px] text-[var(--todoist-text-tertiary)] py-8">Yüklənir...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-10">
              <svg className="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
              </svg>
              <p className="text-[13px] text-[var(--todoist-text-tertiary)]">Hələ şablon yoxdur</p>
              <p className="text-[11px] text-[var(--todoist-text-tertiary)] mt-1">Todo layihəsindən şablon yarada bilərsiniz</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl: any) => (
                <div key={tpl.id} className="group border border-[var(--todoist-divider)] dark:border-[#333] rounded-lg p-3 hover:bg-[var(--todoist-sidebar-hover)] dark:hover:bg-[#2A2A2A] transition">
                  {useTemplateId === tpl.id ? (
                    /* İstifadə et — layihə adı input */
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-[var(--todoist-text-secondary)]">Yeni layihə adı:</p>
                      <input
                        ref={nameRef}
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUse(); if (e.key === 'Escape') { setUseTemplateId(null); setProjectName('') } }}
                        placeholder={tpl.name}
                        className="w-full px-3 py-2 text-[13px] rounded-lg border border-[var(--todoist-divider)] dark:border-[#444] dark:bg-[#2A2A2A] dark:text-[#E8E8E8] outline-none focus:border-[var(--todoist-red)]"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setUseTemplateId(null); setProjectName('') }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--todoist-text-secondary)] hover:bg-[var(--todoist-divider)] dark:hover:bg-[#333]">
                          Ləğv et
                        </button>
                        <button onClick={handleUse} disabled={saving || !projectName.trim()}
                          className="px-3 py-1.5 rounded-lg bg-[var(--todoist-red)] text-white text-[11px] font-bold disabled:opacity-50">
                          {saving ? 'Yaradılır...' : 'Layihə yarat'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Şablon kartı */
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tpl.color || 'var(--todoist-text-secondary)' }} />
                        <span className="flex-1 text-[13px] font-semibold text-[var(--todoist-text)] dark:text-[#E8E8E8]">{tpl.name}</span>
                        <span className="text-[10px] text-[var(--todoist-text-tertiary)]">{getTaskCount(tpl.tasks)} tapşırıq</span>
                      </div>

                      {tpl.description && (
                        <p className="text-[11px] text-[var(--todoist-text-secondary)] mt-1 ml-5">{tpl.description}</p>
                      )}

                      {/* Tapşırıq preview */}
                      <div className="mt-2 ml-5 space-y-0.5">
                        {getTaskPreview(tpl.tasks).map((task: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--todoist-text-tertiary)]" />
                            <span className="text-[11px] text-[var(--todoist-text-secondary)]">{task.content}</span>
                            {task.priority && task.priority !== 'P4' && (
                              <span className={`text-[9px] font-bold ${
                                task.priority === 'P1' ? 'text-[#DC4C3E]' :
                                task.priority === 'P2' ? 'text-[#EB8909]' :
                                'text-[#246FE0]'
                              }`}>{task.priority}</span>
                            )}
                          </div>
                        ))}
                        {getTaskCount(tpl.tasks) > 5 && (
                          <p className="text-[10px] text-[var(--todoist-text-tertiary)]">+{getTaskCount(tpl.tasks) - 5} daha...</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2 ml-5 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => { setUseTemplateId(tpl.id); setProjectName(tpl.name) }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#246FE0] hover:bg-[#246FE0]/10 transition">
                          İstifadə et
                        </button>
                        <button onClick={() => handleDelete(tpl.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--todoist-red)] hover:bg-[var(--todoist-red)]/10 transition">
                          Sil
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
