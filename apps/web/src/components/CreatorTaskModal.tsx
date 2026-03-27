'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import ConfirmModal from '@/components/ConfirmModal'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const SC: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Gözləyir',    color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS:      { label: 'Davam edir',  color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED:        { label: 'Tamamladı',   color: '#10B981', bg: '#ECFDF5' },
  DECLINED:         { label: 'Rədd etdi',   color: '#EF4444', bg: '#FEF2F2' },
  FORCE_COMPLETED:  { label: 'Donuq',       color: '#94A3B8', bg: '#F1F5F9' },
}

const PC: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Kritik',  color: '#7C3AED', bg: '#F5F3FF' },
  HIGH:     { label: 'Yüksək',  color: '#EF4444', bg: '#FEF2F2' },
  MEDIUM:   { label: 'Orta',    color: '#F59E0B', bg: '#FFFBEB' },
  LOW:      { label: 'Aşağı',   color: '#10B981', bg: '#ECFDF5' },
}

interface Props {
  open: boolean; onClose: () => void; task: any; subTask: any
  onEdit?: (task: any) => void; onRefresh?: () => void; onUpdate?: () => void; currentUserId?: string
}

function fmtSize(b: number) { return b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB' }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
function Flag({ color }: { color: string }) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}

export default function CreatorTaskModal({ open, onClose, task, subTask, onEdit, onRefresh, onUpdate }: Props) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [approvingCreator, setApprovingCreator] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })

  if (!open || !task) return null

  const tt = subTask || task
  const assignees: any[] = tt.assignees || []
  const allSubA: any[] = (task.subTasks || []).flatMap((st: any) => (st.assignees || []).map((a: any) => ({ ...a, subTitle: st.title })))
  const workers = assignees.length > 0 ? assignees : allSubA
  const total = workers.length
  const done = workers.filter((a: any) => ['COMPLETED','FORCE_COMPLETED'].includes(a.status)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isFinalized = tt.finalized || false
  const isCreatorApproved = tt.creatorApproved || false
  const finalFileData = tt.finalFile as any
  const dueDate = tt.dueDate || task.dueDate
  const prio = PC[task.priority] || PC.MEDIUM
  const title = subTask ? subTask.title : task.title
  const desc = tt.description || task.description || ''
  const approver = subTask ? (subTask.approver?.fullName || '—') : (task.approver?.fullName || '—')
  const anyUpdated = workers.some((a: any) => a.status !== 'PENDING')

  // Dosyalar
  const noteFileIds = new Set<string>()
  workers.forEach((a: any) => {
    ;(Array.isArray(a.notes) ? a.notes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
    ;(Array.isArray(a.approverNotes) ? a.approverNotes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  })
  const bulkNotes: any[] = Array.isArray(tt.bulkNotes) ? tt.bulkNotes : []
  bulkNotes.forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  const ff = tt.finalFile as any
  if (ff?.fileId) noteFileIds.add(ff.fileId)
  const files = (task.attachments || []).filter((a: any) => !noteFileIds.has(a.id))

  function mention(text: string) {
    return text.split(/(@[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+\s[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+)/g).map((p, i) =>
      p.startsWith('@') ? <span key={i} className="font-semibold px-1 py-0.5 rounded" style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>{p}</span> : <span key={i}>{p}</span>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }} onClick={e => e.stopPropagation()}>

          {/* Gradient xətt */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />

          <div className="p-5 space-y-3">

            {/* ═══ 1. Yaradan + Yetkili + X ═══ */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span className="text-[8px]" style={{ color: '#94A3B8' }}>Yaradan:</span> {task.creator?.fullName || '—'}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="text-[8px]" style={{ color: '#C4B5FD' }}>Yetkili:</span> {approver}
                </span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#94A3B8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* ═══ 2. Tarix → Zorluk → Etiketlər → Layihə → Yetkili — görev form kimi ═══ */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tarix + saat */}
              {dueDate && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {(() => {
                    const parts = dueDate.split('T')
                    const d = fmtDate(parts[0] || dueDate)
                    const t = parts[1]?.substring(0, 5)
                    return t ? `${d} ${t}` : d
                  })()}
                </span>
              )}
              {/* Zorluk */}
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: prio.bg, color: prio.color }}>
                <Flag color={prio.color} /> {prio.label}
              </span>
              {/* Etiketlər */}
              {(task.labels || []).map((tl: any) => {
                const lbl = tl.label || tl
                return (
                  <span key={lbl.id || lbl.name} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lbl.color || '#64748B' }} />
                    {lbl.name}
                  </span>
                )
              })}
              {/* Layihə */}
              {task.project && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  {task.project.name}
                </span>
              )}
              {/* Tip */}
              {task.type === 'GOREV' && <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>Toplu</span>}
            </div>

            {/* ═══ 3. Başlıq ═══ */}
            <h3 className="text-[16px] font-extrabold leading-tight" style={{ color: '#0F172A' }}>{title}</h3>

            {/* ═══ 4. Açıqlama (truncate, toxununca açılsın) ═══ */}
            {desc && (
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', cursor: desc.length > 100 ? 'pointer' : 'default' }}
                onClick={() => desc.length > 100 && setDescExpanded(!descExpanded)}>
                <p className={`text-[12px] leading-relaxed ${!descExpanded && desc.length > 100 ? 'line-clamp-2' : ''}`} style={{ color: '#334155' }}>
                  {mention(desc)}
                </p>
                {desc.length > 100 && <span className="text-[9px] font-semibold mt-0.5 block" style={{ color: '#4F46E5' }}>{descExpanded ? 'Daha az' : 'Daha çox...'}</span>}
              </div>
            )}

            {/* ═══ 4. Dosyalar (kiçik) ═══ */}
            {files.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {files.map((f: any) => (
                  <a key={f.id} href={`${API}/attachments/${f.id}/download`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition hover:shadow-sm"
                    style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', textDecoration: 'none', border: '1px solid #C7D2FE' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    {f.filename?.substring(0, 15) || 'Fayl'}{f.size ? ` (${fmtSize(f.size)})` : ''}
                  </a>
                ))}
              </div>
            )}

            {/* ═══ 5. İşçilər + statusları ═══ */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
              {workers.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px]" style={{ color: '#94A3B8' }}>İşçi tapılmadı</div>
              ) : workers.map((a: any, i: number) => {
                const u = a.user || {}
                const sc = SC[a.status] || SC.PENDING
                const initials = u.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'
                return (
                  <div key={a.id} className="flex items-center gap-2.5 px-3 py-2"
                    style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: i < workers.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.color }}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-semibold block truncate" style={{ color: '#0F172A' }}>{u.fullName || '—'}</span>
                      {a.subTitle && <span className="text-[9px] block truncate" style={{ color: '#94A3B8' }}>{a.subTitle}</span>}
                    </div>
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                )
              })}
            </div>

            {/* ═══ 6. Ümumi progress ═══ */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E2E8F0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />
              </div>
              <span className="text-[12px] font-extrabold shrink-0" style={{ color: pct === 100 ? '#10B981' : '#4F46E5' }}>{pct}%</span>
            </div>

            {/* Finalized banner — yetkili tamamladı */}
            {isFinalized && !isCreatorApproved && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #C7D2FE' }}>
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: '#EEF2FF' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[11px] font-bold" style={{ color: '#4F46E5' }}>Yetkili tamamladı — onayınız gözlənilir</span>
                </div>
                {/* Not */}
                {finalFileData?.note && (
                  <div className="px-3 py-2" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                    <span className="text-[9px] font-bold block mb-0.5" style={{ color: '#64748B' }}>Yetkili notu:</span>
                    <p className="text-[12px] whitespace-pre-wrap" style={{ color: '#0F172A', maxHeight: 120, overflowY: 'auto' }}>{finalFileData.note}</p>
                  </div>
                )}
                {/* Fayllar */}
                {(finalFileData?.files || (finalFileData?.fileId ? [finalFileData] : [])).map((f: any, i: number) => (
                  <a key={i} href={`${API}/attachments/${f.fileId}/download`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 transition hover:opacity-80"
                    style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', textDecoration: 'none' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    <span className="text-[10px] font-semibold" style={{ color: '#4338CA' }}>{f.fileName || 'Fayl'}</span>
                    {f.fileSize && <span className="text-[9px] ml-auto" style={{ color: '#94A3B8' }}>{fmtSize(f.fileSize)}</span>}
                  </a>
                ))}
              </div>
            )}

            {/* Creator approved banner */}
            {isCreatorApproved && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>Görev onaylandı</span>
                {finalFileData?.fileId && (
                  <a href={`${API}/attachments/${finalFileData.fileId}/download`} target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: '#10B981', textDecoration: 'none' }}>Onay faylı</a>
                )}
              </div>
            )}

            {/* ═══ 7. Alt butonlar ═══ */}
            <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              {/* Düzənlə — yalnız hələ tamamlanmayıb */}
              {!isFinalized && !isCreatorApproved && (
                <button onClick={() => { onClose(); onEdit?.(task) }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition hover:opacity-80"
                  style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}

              {/* Onayla — yetkili tamamladı amma yaradan hələ onaylamayıb */}
              {isFinalized && !isCreatorApproved && !approvingCreator && (
                <button onClick={() => {
                  setConfirmModal({ open: true, type: 'info', title: 'Görevi onayla',
                    message: 'Görevi onaylayırsınız? Bu əməliyyatdan sonra görev tamamilə bitmiş sayılacaq. Bütün işçilər və yetkili kişi bildiriş alacaq.',
                    confirmText: 'Onayla',
                    onConfirm: async () => {
                      setConfirmModal((p: any) => ({ ...p, open: false }))
                      setApprovingCreator(true)
                      try {
                        await api.creatorApproveTask(task.id)
                        onClose()
                        onRefresh?.()
                        onUpdate?.()
                      } catch (err: any) { alert(err.message || 'Xəta') }
                      finally { setApprovingCreator(false) }
                    }
                  })
                }}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition hover:opacity-90"
                  style={{ backgroundColor: '#10B981' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Onayla
                </button>
              )}
              {approvingCreator && (
                <div className="flex-1 py-2 rounded-lg text-[12px] font-bold text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: '#86EFAC' }}>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Onaylanır...
                </div>
              )}

              {/* Onaylandıqdan sonra bağla */}
              {isCreatorApproved && (
                <button onClick={onClose} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ color: '#64748B', backgroundColor: '#F8FAFC' }}>Bağla</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message}
        type={confirmModal.type} confirmText={confirmModal.confirmText} onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p: any) => ({ ...p, open: false }))} />
    </>
  )
}
