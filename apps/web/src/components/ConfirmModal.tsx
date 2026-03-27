'use client'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, type = 'info', confirmText = 'Təsdiq et', cancelText = 'Ləğv et', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null

  const colors = {
    danger:  { bg: '#FEF2F2', color: '#EF4444', btnBg: '#EF4444' },
    warning: { bg: '#FFFBEB', color: '#F59E0B', btnBg: '#F59E0B' },
    info:    { bg: '#EEF2FF', color: '#4F46E5', btnBg: '#4F46E5' },
  }
  const c = colors[type]

  const icons = {
    danger: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}80)` }} />

        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
              {icons[type]}
            </div>
            <div>
              <h3 className="text-[15px] font-bold" style={{ color: '#0F172A' }}>{title}</h3>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#64748B' }}>{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
            <button onClick={onCancel}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold transition hover:bg-gray-100"
              style={{ color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              {cancelText}
            </button>
            <button onClick={onConfirm}
              className="rounded-xl px-4 py-2 text-[12px] font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: c.btnBg }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
