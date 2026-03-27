'use client'

import { useState, useRef, useEffect } from 'react'

const COLORS = [
  '#DC4C3E', '#EB8909', '#FAD000', '#44BE6C', '#246FE0',
  '#8F4DC6', '#EB4899', '#808080', '#A8742C', '#1DB5BE',
  '#E05555', '#4CAF50', '#FF7043', '#5C6BC0', '#78909C',
]

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; color: string; isFavorite: boolean }) => void
  initialData?: { name: string; color: string; isFavorite: boolean }
  title?: string
}

export default function CreateProjectModal({ open, onClose, onSubmit, initialData, title }: CreateProjectModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || '#246FE0')
  const [isFavorite, setIsFavorite] = useState(initialData?.isFavorite || false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '')
      setColor(initialData?.color || '#246FE0')
      setIsFavorite(initialData?.isFavorite || false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, initialData])

  if (!open) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({ name: name.trim(), color, isFavorite })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative rounded-xl shadow-xl w-[420px]" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>
            {title || 'Layihə yarat'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--todoist-border)] transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4">
          {/* Ad */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--todoist-text-secondary)' }}>Ad</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition"
              style={{ border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}
              placeholder="Layihə adı"
            />
          </div>

          {/* Rəng */}
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--todoist-text-secondary)' }}>Rəng</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c, border: color === c ? '3px solid var(--todoist-text)' : '2px solid transparent' }}
                >
                  {color === c && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Önizlənmə */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--todoist-sidebar-hover)' }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[13px] font-medium" style={{ color: name.trim() ? 'var(--todoist-text)' : 'var(--todoist-text-tertiary)' }}>
              {name.trim() || 'Layihə adı'}
            </span>
          </div>

          {/* Favorit */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isFavorite} onChange={e => setIsFavorite(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--todoist-red)]" />
            <span className="text-[12px] font-medium" style={{ color: 'var(--todoist-text-secondary)' }}>Favoritlərə əlavə et</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--todoist-divider)' }}>
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12px] font-medium transition hover:bg-[var(--todoist-border)]"
            style={{ color: 'var(--todoist-text-secondary)' }}>
            Ləğv et
          </button>
          <button onClick={handleSubmit} disabled={!name.trim()}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--todoist-red)' }}>
            {initialData ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </div>
    </div>
  )
}
