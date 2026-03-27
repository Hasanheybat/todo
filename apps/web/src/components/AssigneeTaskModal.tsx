'use client'

import { useState, useRef, useEffect } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import MessageBubble from '@/components/MessageBubble'
import { api } from '@/lib/api'

const MAX_MESSAGES = Infinity // Mesaj limiti qaldırıldı
const MAX_CHARS = 500
const MAX_FILE_SIZE = 1.5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const SC: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Gözləyir',    color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS:      { label: 'Davam edir',  color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED:        { label: 'Tamamladı',   color: '#10B981', bg: '#ECFDF5' },
  DECLINED:         { label: 'Rədd etdi',   color: '#EF4444', bg: '#FEF2F2' },
  FORCE_COMPLETED:  { label: 'Donuq',       color: '#94A3B8', bg: '#F1F5F9' },
}

const PC: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Kritik', color: '#7C3AED', bg: '#F5F3FF' },
  HIGH: { label: 'Yüksək', color: '#EF4444', bg: '#FEF2F2' },
  MEDIUM: { label: 'Orta', color: '#F59E0B', bg: '#FFFBEB' },
  LOW: { label: 'Aşağı', color: '#10B981', bg: '#ECFDF5' },
}

interface Props {
  open: boolean; onClose: () => void; task: any; subTask: any; currentUserId: string
  onStatusChange?: (taskId: string, status: string, note?: string) => void; onRefresh?: () => void
}

function fmtSize(b: number) { return b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB' }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) }
function Flag({ color }: { color: string }) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}

export default function AssigneeTaskModal({ open, onClose, task, subTask, currentUserId, onStatusChange, onRefresh }: Props) {
  const [note, setNote] = useState('')
  const [chatTab, setChatTab] = useState<'mine' | 'bulk'>('mine')
  const [, forceRender] = useState(0)
  const [msgMenu, setMsgMenu] = useState<number | null>(null)
  const [editingMsg, setEditingMsg] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkFileInputRef = useRef<HTMLInputElement>(null)
  const [localNotes, setLocalNotes] = useState<any[]>([])
  const [descExpanded, setDescExpanded] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })
  const [bulkNote, setBulkNote] = useState('')
  const [bulkPendingFile, setBulkPendingFile] = useState<File | null>(null)
  const [savingBulk, setSavingBulk] = useState(false)
  const [localBulkNotes, setLocalBulkNotes] = useState<any[]>([])

  if (!open || !task) return null

  const tt = subTask || task
  const targetId = tt.id
  const myA = tt.assignees?.find((a: any) => a.user?.id === currentUserId || a.userId === currentUserId)
  const myStatus = myA?.status || 'PENDING'
  const isFinished = myStatus === 'COMPLETED' || myStatus === 'DECLINED' || myStatus === 'FORCE_COMPLETED'
  const isChatClosed = myA?.chatClosed || false
  const isTaskFinalized = tt.finalized || false
  const isLocked = isTaskFinalized || isChatClosed || isFinished

  const serverBulkNotes: any[] = Array.isArray(tt.bulkNotes) ? tt.bulkNotes : []
  const bulkNotes: any[] = [...serverBulkNotes, ...localBulkNotes]
  const noteFileIds = new Set<string>()
  ;(tt.assignees || []).forEach((a: any) => {
    ;(Array.isArray(a.notes) ? a.notes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
    ;(Array.isArray(a.approverNotes) ? a.approverNotes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  })
  bulkNotes.forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  if ((tt.finalFile as any)?.fileId) noteFileIds.add((tt.finalFile as any).fileId)
  const files = (task.attachments || []).filter((att: any) => !noteFileIds.has(att.id))

  const serverWorker: any[] = Array.isArray(myA?.notes) ? myA.notes : []
  const serverApprover: any[] = Array.isArray(myA?.approverNotes) ? myA.approverNotes : []
  const allMerged = [
    ...serverWorker.map((n, idx) => ({ ...n, type: 'worker', origIndex: idx })),
    ...serverApprover.map((n, idx) => ({ ...n, type: 'approver', origIndex: idx })),
    ...localNotes.filter(ln => !serverWorker.some(sn => sn.text === ln.text && sn.date === ln.date)).map((n, idx) => ({ ...n, type: 'worker', origIndex: serverWorker.length + idx })),
  ].sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
  const msgRemaining = Math.max(0, MAX_MESSAGES - allMerged.length)

  const dueDate = tt.dueDate || task.dueDate
  const prio = PC[task.priority] || PC.MEDIUM
  const desc = tt.description || task.description || ''
  const creatorName = task.creator?.fullName || '—'
  const approverName = subTask ? (subTask.approver?.fullName || '—') : (task.approver?.fullName || task.creator?.fullName || '—')
  const sc = SC[myStatus] || SC.PENDING

  function mention(text: string) {
    return text.split(/(@[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+\s[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+)/g).map((p, i) =>
      p.startsWith('@') ? <span key={i} className="font-semibold px-1 py-0.5 rounded" style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>{p}</span> : <span key={i}>{p}</span>
    )
  }

  function getToken() {
    return localStorage.getItem('accessToken') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || ''
  }

  async function sendNote() {
    if ((!note.trim() && !pendingFile) || msgRemaining <= 0 || isLocked) return
    const noteText = note; setNote('')
    const fileToUpload = pendingFile; setPendingFile(null)
    setSavingNote(true)
    try {
      let fileId: string | undefined, fileName: string | undefined, fileSize: number | undefined
      if (fileToUpload) {
        const form = new FormData(); form.append('file', fileToUpload)
        const uploadRes = await fetch(`${API}/attachments/upload?taskId=${targetId}`, {
          method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form })
        if (uploadRes.ok) { const d = await uploadRes.json(); fileId = d.id; fileName = d.filename; fileSize = d.size }
      }
      const res = await fetch(`${API}/tasks/${targetId}/worker-note`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText || '', fileId, fileName, fileSize }),
      })
      if (res.ok) {
        const newNote: any = { text: noteText, sender: 'worker', date: new Date().toISOString() }
        if (fileId) { newNote.fileId = fileId; newNote.fileName = fileName; newNote.fileSize = fileSize }
        else if (fileToUpload) { newNote.fileName = fileToUpload.name; newNote.fileSize = fileToUpload.size }
        setLocalNotes(prev => [...prev, newNote])
        onRefresh?.()
      } else { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Xəta') }
    } catch (e: any) { alert(e.message) }
    finally { setSavingNote(false) }
  }

  async function sendBulkReply() {
    if ((!bulkNote.trim() && !bulkPendingFile) || savingBulk || isLocked) return
    setSavingBulk(true)
    try {
      let fileId: string | undefined, fileName: string | undefined, fileSize: number | undefined
      if (bulkPendingFile) {
        const form = new FormData(); form.append('file', bulkPendingFile)
        const uploadRes = await fetch(`${API}/attachments/upload?taskId=${targetId}`, {
          method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form })
        if (uploadRes.ok) { const d = await uploadRes.json(); fileId = d.id; fileName = d.filename; fileSize = d.size }
      }
      const res = await fetch(`${API}/tasks/${targetId}/bulk-note`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: bulkNote || '', fileId, fileName, fileSize }),
      })
      if (res.ok) {
        const newNote: any = { text: bulkNote, date: new Date().toISOString(), senderId: currentUserId, senderName: 'Siz' }
        if (fileId) { newNote.fileId = fileId; newNote.fileName = fileName; newNote.fileSize = fileSize }
        setLocalBulkNotes(prev => [...prev, newNote])
        setBulkNote(''); setBulkPendingFile(null)
        onRefresh?.()
      } else { const err = await res.json().catch(() => ({})); alert(err.message || 'Xəta') }
    } catch (e: any) { alert(e.message) }
    finally { setSavingBulk(false) }
  }

  function handleStatusChange(newStatus: string) {
    const cfg: Record<string, any> = {
      IN_PROGRESS: { title: 'Tapşırığa başla', message: 'Tapşırığa başlamaq istəyirsiniz?', type: 'info', confirmText: 'Başla' },
      COMPLETED: { title: 'Tamamla', message: 'Tapşırığı tamamladığınızı təsdiq edirsiniz? Geri alınmaz.', type: 'warning', confirmText: 'Tamamla' },
      DECLINED: { title: 'Rədd et', message: 'Tapşırığı rədd etmək istəyirsiniz? Geri alınmaz.', type: 'danger', confirmText: 'Rədd et' },
    }
    const c = cfg[newStatus]; if (!c) return
    setConfirmModal({ open: true, ...c, onConfirm: () => { setConfirmModal((p: any) => ({ ...p, open: false })); onStatusChange?.(targetId, newStatus) } })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }} onClick={e => e.stopPropagation()}>

          <div style={{ height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />

          <div className="p-5 space-y-3">

            {/* ═══ 1. Yaradan + Yetkili + X ═══ */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span className="text-[8px]" style={{ color: '#94A3B8' }}>Yaradan:</span> {creatorName}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="text-[8px]" style={{ color: '#C4B5FD' }}>Yetkili:</span> {approverName}
                </span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#94A3B8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* ═══ 2. Tarix → Zorluk → Etiketlər → Layihə → Yetkili ═══ */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {dueDate && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {(() => { const p = dueDate.split('T'); return p[1] ? `${fmtDate(p[0])} ${p[1].substring(0,5)}` : fmtDate(dueDate) })()}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: prio.bg, color: prio.color }}>
                <Flag color={prio.color} /> {prio.label}
              </span>
              {(task.labels || []).map((tl: any) => {
                const lbl = tl.label || tl
                return (
                  <span key={lbl.id || lbl.name} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lbl.color || '#64748B' }} />
                    {lbl.name}
                  </span>
                )
              })}
              {task.project && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  {task.project.name}
                </span>
              )}
              {task.type === 'GOREV' && <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>Toplu</span>}
            </div>

            {/* ═══ 3. Başlıq ═══ */}
            <h3 className="text-[16px] font-extrabold leading-tight" style={{ color: '#0F172A' }}>{subTask ? subTask.title : task.title}</h3>

            {/* ═══ 4. Açıqlama ═══ */}
            {desc && (
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', cursor: desc.length > 100 ? 'pointer' : 'default' }}
                onClick={() => desc.length > 100 && setDescExpanded(!descExpanded)}>
                <p className={`text-[12px] leading-relaxed ${!descExpanded && desc.length > 100 ? 'line-clamp-2' : ''}`} style={{ color: '#334155' }}>
                  {mention(desc)}
                </p>
                {desc.length > 100 && <span className="text-[9px] font-semibold mt-0.5 block" style={{ color: '#4F46E5' }}>{descExpanded ? 'Daha az' : 'Daha çox...'}</span>}
              </div>
            )}

            {/* ═══ 5. Dosyalar (kiçik) ═══ */}
            {files.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {files.map((f: any) => (
                  <a key={f.id} href={`${API}/attachments/${f.id}/download`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition hover:shadow-sm"
                    style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', textDecoration: 'none', border: '1px solid #C7D2FE' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    {f.filename?.substring(0, 15) || 'Fayl'}
                  </a>
                ))}
              </div>
            )}

            {/* ═══ 6. Banners ═══ */}
            {tt.creatorApproved && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>Görev onaylandı</span>
              </div>
            )}
            {isTaskFinalized && !tt.creatorApproved && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span className="text-[11px] font-bold" style={{ color: '#4F46E5' }}>Yetkili tamamladı — onay gözlənilir</span>
              </div>
            )}
            {!isTaskFinalized && isChatClosed && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <span className="text-[11px] font-bold" style={{ color: '#EF4444' }}>Söhbət bağlıdır</span>
              </div>
            )}

            {/* ═══ 7. Mesajlar + Toplu notlar — WhatsApp stilində ═══ */}
            <div>
              <div className="flex items-center gap-1 mb-1.5 p-0.5 rounded-lg" style={{ backgroundColor: '#F1F5F9' }}>
                <button onClick={() => setChatTab('mine')} className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition" style={{ backgroundColor: chatTab === 'mine' ? '#fff' : 'transparent', color: chatTab === 'mine' ? '#4F46E5' : '#94A3B8', boxShadow: chatTab === 'mine' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Mesajlarım</button>
                <button onClick={() => setChatTab('bulk')} className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition" style={{ backgroundColor: chatTab === 'bulk' ? '#fff' : 'transparent', color: chatTab === 'bulk' ? '#4F46E5' : '#94A3B8', boxShadow: chatTab === 'bulk' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                  Toplu mesajlar {bulkNotes.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{bulkNotes.length}</span>}
                </button>
              </div>
              <div className="rounded-xl px-3 py-2.5 space-y-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', maxHeight: 250, overflowY: 'auto' }}>
                {/* ═══ TOPLU MESAJLAR TAB ═══ */}
                {chatTab === 'bulk' && (
                  <>
                    {bulkNotes.length === 0 ? (
                      <p className="text-[11px] text-center py-4" style={{ color: '#94A3B8' }}>Toplu mesaj yoxdur</p>
                    ) : bulkNotes.map((n: any, i: number) => {
                      const isMine = n.senderId === currentUserId
                      return (
                        <MessageBubble key={`bulk-${i}`} message={{...n, origIndex: i}} isMe={isMine}
                          senderName={isMine ? 'Siz' : (n.senderName || `${approverName} (hamıya)`)}
                          senderInitials={isMine ? 'ME' : 'YK'} taskId={targetId} userId={currentUserId} onRefresh={onRefresh} disabled={isFinished || isTaskFinalized} isBulk />
                      )
                    })}
                  </>
                )}

                {/* ═══ MESAJLARIM TAB — MessageBubble ilə ═══ */}
                {chatTab === 'mine' && (
                  <>
                    {allMerged.length === 0 ? (
                      <p className="text-[11px] text-center py-4" style={{ color: '#94A3B8' }}>Hələ mesaj yoxdur</p>
                    ) : allMerged.map((n, i) => {
                      const isMe = n.type === 'worker'
                      const myInitials = (tt.assignees?.find((a: any) => a.userId === currentUserId)?.user?.fullName || 'S').split(' ').map((w: string) => w[0]).join('').slice(0, 2)
                      return (
                        <MessageBubble key={i} message={n} isMe={isMe}
                          senderName={isMe ? 'Siz' : approverName}
                          senderInitials={isMe ? myInitials : 'YK'}
                          taskId={targetId} userId={currentUserId}
                          onRefresh={onRefresh}
                          disabled={isFinished || isTaskFinalized} />
                      )
                    })}
                  </>
                )}
              </div>

              {/* Toplu mesaj cavab yazma */}
              {chatTab === 'bulk' && !isFinished && !isLocked && (
                <div className="mt-2">
                  <input ref={bulkFileInputRef} type="file" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return
                    if (f.size > MAX_FILE_SIZE) { alert(`Dosya limiti ${fmtSize(MAX_FILE_SIZE)}`); return }
                    if (!ALLOWED_FILE_TYPES.includes(f.type)) { alert('Yalnız şəkil, PDF və MS Office dosyaları yüklənə bilər'); return }
                    setBulkPendingFile(f)
                  }} accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                  {bulkPendingFile && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                      <span className="text-[9px] font-semibold truncate flex-1" style={{ color: '#4F46E5' }}>{bulkPendingFile.name}</span>
                      <button onClick={() => setBulkPendingFile(null)} className="text-[10px] shrink-0" style={{ color: '#EF4444' }}>✕</button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => bulkFileInputRef.current?.click()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-indigo-50"
                      style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <input type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="Toplu cavab yazın..." maxLength={MAX_CHARS}
                      className="flex-1 text-[11px] outline-none rounded-lg px-2.5 py-1.5"
                      style={{ backgroundColor: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0' }}
                      onKeyDown={e => { if (e.key === 'Enter' && (bulkNote.trim() || bulkPendingFile)) { e.preventDefault(); sendBulkReply() } }} />
                    <button onClick={sendBulkReply} disabled={savingBulk || (!bulkNote.trim() && !bulkPendingFile)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white transition disabled:opacity-30"
                      style={{ backgroundColor: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Şəxsi mesaj yazma */}
              {chatTab === 'mine' && !isFinished && !isLocked && msgRemaining > 0 && (
                <div className="mt-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return
                    if (f.size > MAX_FILE_SIZE) { alert(`Dosya limiti ${fmtSize(MAX_FILE_SIZE)}`); return }
                    if (!ALLOWED_FILE_TYPES.includes(f.type)) { alert('Yalnız şəkil, PDF və MS Office dosyaları yüklənə bilər'); return }
                    setPendingFile(f)
                  }} accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                  {pendingFile && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                      <span className="text-[9px] font-semibold truncate flex-1" style={{ color: '#4F46E5' }}>{pendingFile.name}</span>
                      <button onClick={() => setPendingFile(null)} className="text-[10px] shrink-0" style={{ color: '#EF4444' }}>✕</button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-indigo-50"
                      style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Mesaj yazın..." maxLength={MAX_CHARS}
                      className="flex-1 text-[11px] outline-none rounded-lg px-2.5 py-1.5"
                      style={{ backgroundColor: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0' }}
                      onKeyDown={e => { if (e.key === 'Enter' && (note.trim() || pendingFile)) { e.preventDefault(); sendNote() } }} />
                    <button onClick={sendNote} disabled={savingNote || (!note.trim() && !pendingFile)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white transition disabled:opacity-30"
                      style={{ backgroundColor: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ 8. Status butonları ═══ */}
            {!isFinished && !isTaskFinalized && (
              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
                {/* PENDING: Başlat + Rədd */}
                {myStatus === 'PENDING' && (
                  <>
                    <button onClick={() => handleStatusChange('IN_PROGRESS')}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition hover:opacity-90"
                      style={{ backgroundColor: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Başlat
                    </button>
                    <button onClick={() => handleStatusChange('DECLINED')}
                      className="py-2.5 px-4 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90"
                      style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Rədd
                    </button>
                  </>
                )}
                {/* IN_PROGRESS: Tamamla + Rədd */}
                {myStatus === 'IN_PROGRESS' && (
                  <>
                    <button onClick={() => handleStatusChange('COMPLETED')}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition hover:opacity-90"
                      style={{ backgroundColor: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Tamamla
                    </button>
                    <button onClick={() => handleStatusChange('DECLINED')}
                      className="py-2.5 px-4 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition hover:opacity-90"
                      style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Rədd
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message}
        type={confirmModal.type} confirmText={confirmModal.confirmText} onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p: any) => ({ ...p, open: false }))} />
    </>
  )
}
