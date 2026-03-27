'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

const LABEL_COLORS = ['#DC4C3E', '#EB8909', '#FAD000', '#44BE6C', '#246FE0', '#8F4DC6', '#EB4899', '#808080', '#A8742C', '#1DB5BE']

interface LabelManagerProps {
  open: boolean
  onClose: () => void
  labels: any[]
  onRefresh: () => void
}

export default function LabelManager({ open, onClose, labels, onRefresh }: LabelManagerProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#246FE0')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await api.createTodoistLabel({ name: newName.trim(), color: newColor })
      setNewName('')
      onRefresh()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return
    try {
      await api.updateTodoistLabel(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
      onRefresh()
    } catch (err: any) { alert(err.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Etiket silinsin?')) return
    try {
      await api.deleteTodoistLabel(id)
      onRefresh()
    } catch (err: any) { alert(err.message) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--todoist-divider)]">
          <h3 className="text-[16px] font-bold text-[var(--todoist-text)]">Etiketlər</h3>
          <button onClick={onClose} className="text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text-secondary)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Yeni etiket */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              {LABEL_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full transition"
                  style={{ backgroundColor: c, outline: newColor === c ? '2px solid var(--todoist-text)' : 'none', outlineOffset: 1 }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: newColor }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder="Yeni etiket adı..."
              className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-[var(--todoist-divider)] outline-none focus:border-[var(--todoist-red)]" />
            <button onClick={handleCreate} disabled={saving || !newName.trim()}
              className="px-3 py-2 rounded-lg bg-[var(--todoist-red)] text-white text-[11px] font-bold disabled:opacity-50">
              Əlavə et
            </button>
          </div>

          {/* Mövcud etiketlər */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {labels.length === 0 && (
              <p className="text-center text-[12px] text-[var(--todoist-text-tertiary)] py-8">Hələ etiket yoxdur</p>
            )}
            {labels.map((label: any) => (
              <div key={label.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--todoist-sidebar-hover)] group">
                {editingId === label.id ? (
                  <>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(label.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 px-2 py-1 text-[12px] rounded border border-[var(--todoist-red)] outline-none" autoFocus />
                    <button onClick={() => handleUpdate(label.id)} className="text-[10px] font-bold text-[#058527]">✓</button>
                    <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-[var(--todoist-text-secondary)]">✕</button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color || 'var(--todoist-text-secondary)' }} />
                    <span className="flex-1 text-[13px] font-medium text-[var(--todoist-text)]">{label.name}</span>
                    <button onClick={() => { setEditingId(label.id); setEditName(label.name); setEditColor(label.color || 'var(--todoist-text-secondary)') }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-text-secondary)] p-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(label.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--todoist-text-tertiary)] hover:text-[var(--todoist-red)] p-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
