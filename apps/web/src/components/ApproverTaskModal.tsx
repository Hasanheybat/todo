'use client'

import { useState, useRef, useEffect } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import MessageBubble from '@/components/MessageBubble'
import { api } from '@/lib/api'

const MAX_APPROVER_NOTES = Infinity // Mesaj limiti qaldırıldı
const MAX_BULK_NOTES = Infinity
const MAX_FILE_SIZE = 1.5 * 1024 * 1024 // 1.5 MB
const MAX_CHARS = 200

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Gözləyir',    color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS:      { label: 'Davam edir',  color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED:        { label: 'Tamamladı',   color: '#10B981', bg: '#ECFDF5' },
  DECLINED:         { label: 'Rədd etdi',   color: '#EF4444', bg: '#FEF2F2' },
  FORCE_COMPLETED:  { label: 'Donuq',       color: '#94A3B8', bg: '#F1F5F9' },
}

interface ApproverTaskModalProps {
  open: boolean
  onClose: () => void
  task: any
  subTask: any
  currentUserId: string
  onApprove?: (taskId: string, note?: string) => void
  onRefresh?: () => void
  isCreator?: boolean
  onEdit?: (task: any) => void
}

function getToken() {
  return localStorage.getItem('accessToken')
    || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
    || ''
}
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ApproverTaskModal({ open, onClose, task, subTask, currentUserId, onApprove, onRefresh, isCreator, onEdit }: ApproverTaskModalProps) {
  const [screen, setScreen] = useState<'list' | 'chat' | 'finalize'>('list')
  const [chatUserId, setChatUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  // Mesaj state
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)
  const [localNotes, setLocalNotes] = useState<Record<string, any[]>>({})

  // Fayl state
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toplu not
  const [bulkNoteText, setBulkNoteText] = useState('')
  const [bulkNoteOpen, setBulkNoteOpen] = useState(false)
  const [savingBulk, setSavingBulk] = useState(false)
  const [bulkPendingFile, setBulkPendingFile] = useState<File | null>(null)
  const bulkFileInputRef = useRef<HTMLInputElement>(null)

  // Finalize
  const [finalFiles, setFinalFiles] = useState<File[]>([])
  const [finalNote, setFinalNote] = useState('')
  const [savingFinalize, setSavingFinalize] = useState(false)
  const finalFileInputRef = useRef<HTMLInputElement>(null)

  // Dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [msgMenuIdx, setMsgMenuIdx] = useState<number | null>(null)
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null)
  const [editingMsgText, setEditingMsgText] = useState('')
  const [deletingMsg, setDeletingMsg] = useState<any>(null)
  const [, forceRender] = useState(0)

  // Lokal toplu notlar
  const [localBulkNotes, setLocalBulkNotes] = useState<any[]>([])

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; confirmText: string; onConfirm: () => void }>({
    open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {}
  })

  const chatBodyRef = useRef<HTMLDivElement>(null)
  const bulkChatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setScreen('list')
      setChatUserId(null)
      setFilter('all')
      setLocalNotes({})
      setBulkNoteText('')
      setBulkNoteOpen(false)
      setDropdownOpen(false)
      setPendingFiles({})
      setBulkPendingFile(null)
      setFinalFiles([])
      setSavingFinalize(false)
      setLocalBulkNotes([])
    }
  }, [open])

  useEffect(() => {
    if (chatUserId && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
    if (bulkNoteOpen && bulkChatRef.current) {
      bulkChatRef.current.scrollTop = bulkChatRef.current.scrollHeight
    }
  }, [chatUserId, localNotes, bulkNoteOpen, localBulkNotes])

  if (!open || !task) return null

  const targetTask = subTask || task
  const targetId = targetTask.id
  const assignees: any[] = targetTask.assignees || []
  const totalAssignees = assignees.length
  const completedCount = assignees.filter((a: any) => a.status === 'COMPLETED').length
  const progressPct = totalAssignees > 0 ? Math.round((completedCount / totalAssignees) * 100) : 0
  const isFinalized = targetTask.finalized || false
  const isCreatorApproved = targetTask.creatorApproved || false

  const dueDate = targetTask.dueDate || task.dueDate
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })

  const creatorName = task.creator?.fullName || '—'
  const approverName = targetTask.approver?.fullName || task.approver?.fullName || ''
  const title = subTask ? subTask.title : task.title
  const description = targetTask.description || task.description || ''
  const serverBulkNotes: any[] = Array.isArray(targetTask.bulkNotes) ? targetTask.bulkNotes : []
  const bulkNotes: any[] = [...serverBulkNotes, ...localBulkNotes]

  // Yalnız yaradanın faylları
  const noteFileIds = new Set<string>()
  assignees.forEach((a: any) => {
    ;(Array.isArray(a.notes) ? a.notes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
    ;(Array.isArray(a.approverNotes) ? a.approverNotes : []).forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  })
  bulkNotes.forEach((n: any) => { if (n.fileId) noteFileIds.add(n.fileId) })
  const fFile = targetTask.finalFile as any
  if (fFile?.fileId) noteFileIds.add(fFile.fileId)
  const creatorAttachments = (task.attachments || []).filter((att: any) => !noteFileIds.has(att.id))

  const filteredAssignees = assignees.filter((a: any) => {
    if (filter === 'all') return true
    return a.status === filter
  })

  function countByStatus(st: string) { return assignees.filter((a: any) => a.status === st).length }

  const chatAssignee = assignees.find((a: any) => (a.user?.id || a.userId) === chatUserId)
  const chatUser = chatAssignee?.user || {}

  // ── Mesaj helpers ──
  function getMergedMessages(a: any) {
    const serverWorker: any[] = Array.isArray(a.notes) ? a.notes : []
    const serverApprover: any[] = Array.isArray(a.approverNotes) ? a.approverNotes : []
    const userId = a.user?.id || a.userId
    const localApp = localNotes[userId] || []
    return [
      ...serverWorker.map((n: any, idx: number) => ({ ...n, type: 'worker', origIndex: idx })),
      ...serverApprover.map((n: any, idx: number) => ({ ...n, type: 'approver', origIndex: idx })),
      ...localApp.filter((ln: any) => !serverApprover.some((sn: any) => sn.text === ln.text && sn.date === ln.date)).map((n: any, idx: number) => ({ ...n, type: 'approver', origIndex: serverApprover.length + idx })),
    ].sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
  }

  function getApproverNoteCount(a: any) {
    const serverApprover: any[] = Array.isArray(a.approverNotes) ? a.approverNotes : []
    const userId = a.user?.id || a.userId
    const localApp = localNotes[userId] || []
    const localNew = localApp.filter((ln: any) => !serverApprover.some((sn: any) => sn.text === ln.text && sn.date === ln.date))
    return serverApprover.length + localNew.length
  }

  function getTotalMsgCount(a: any) {
    return getMergedMessages(a).length
  }

  // ── Fayl seç ──
  function handleFileSelect(userId: string) {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.userId = userId
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const userId = e.target.dataset.userId || ''
    if (!file || !userId) return

    if (file.size > MAX_FILE_SIZE) {
      alert(`Fayl böyüklüyü maksimum ${formatFileSize(MAX_FILE_SIZE)} ola bilər. Seçilən fayl: ${formatFileSize(file.size)}`)
      return
    }
    setPendingFiles(prev => ({ ...prev, [userId]: file }))
  }

  function removePendingFile(userId: string) {
    setPendingFiles(prev => ({ ...prev, [userId]: null }))
  }

  // ── API: Fayl yüklə + Mesaj göndər ──
  async function sendApproverNote(userId: string) {
    const noteText = noteInputs[userId] || ''
    const file = pendingFiles[userId]
    if (!noteText?.trim() && !file) return

    setNoteInputs(prev => ({ ...prev, [userId]: '' }))
    setPendingFiles(prev => ({ ...prev, [userId]: null }))
    setSavingNote(userId)

    try {
      let fileId: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined

      // Əvvəlcə faylı yüklə
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch(`${API}/attachments/upload?taskId=${targetId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('Fayl yüklənmədi')
        const att = await uploadRes.json()
        fileId = att.id
        fileName = att.filename
        fileSize = att.size
      }

      // Grouped TASK-da hər assignee fərqli task-dadır
      const assignee = assignees.find((a: any) => (a.user?.id || a.userId) === userId)
      const noteTaskId = assignee?._taskId || targetId

      // Notu göndər
      const res = await fetch(`${API}/tasks/${noteTaskId}/assignee-note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, approverNote: noteText, fileId, fileName, fileSize }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Xəta baş verdi')
      } else {
        // Lokal note-a fileId ilə birlikdə əlavə et
        const newNote: any = { text: noteText, sender: 'approver', date: new Date().toISOString() }
        if (fileId) { newNote.fileId = fileId; newNote.fileName = fileName; newNote.fileSize = fileSize }
        else if (file) { newNote.fileName = file.name; newNote.fileSize = file.size }
        setLocalNotes(prev => ({ ...prev, [userId]: [...(prev[userId] || []), newNote] }))
        onRefresh?.()
      }
    } catch (e: any) {
      alert(e.message || 'Xəta baş verdi')
    } finally {
      setSavingNote(null)
    }
  }

  // ── API: Toplu not ──
  async function sendBulkNote() {
    if ((!bulkNoteText.trim() && !bulkPendingFile) || savingBulk) return
    setSavingBulk(true)
    try {
      let fileId: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined

      if (bulkPendingFile) {
        const formData = new FormData()
        formData.append('file', bulkPendingFile)
        const uploadRes = await fetch(`${API}/attachments/upload?taskId=${targetId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('Fayl yüklənmədi')
        const att = await uploadRes.json()
        fileId = att.id
        fileName = att.filename
        fileSize = att.size
      }

      const res = await fetch(`${API}/tasks/${targetId}/bulk-note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ note: bulkNoteText, fileId, fileName, fileSize }),
      })
      if (res.ok) {
        // Lokal state-ə yeni notu əlavə et
        const newNote: any = { text: bulkNoteText, date: new Date().toISOString(), senderId: currentUserId }
        if (fileId) { newNote.fileId = fileId; newNote.fileName = fileName; newNote.fileSize = fileSize }
        setLocalBulkNotes(prev => [...prev, newNote])
        setBulkNoteText('')
        setBulkPendingFile(null)
        onRefresh?.()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Xəta baş verdi')
      }
    } catch (e: any) {
      alert(e.message || 'Xəta baş verdi')
    } finally {
      setSavingBulk(false)
    }
  }

  function onBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      alert(`Fayl böyüklüyü maksimum ${formatFileSize(MAX_FILE_SIZE)} ola bilər. Seçilən fayl: ${formatFileSize(file.size)}`)
      return
    }
    setBulkPendingFile(file)
  }

  // Helper: grouped task-da assignee-nin taskId-sini tap
  function getAssigneeTaskId(userId: string) {
    const a = assignees.find((x: any) => (x.user?.id || x.userId) === userId)
    return a?._taskId || targetId
  }

  // ── API: Söhbəti bağla/aç ──
  async function toggleChatClosed(userId: string, closed: boolean) {
    try {
      const res = await fetch(`${API}/tasks/${getAssigneeTaskId(userId)}/close-chat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, closed }),
      })
      if (res.ok) { setDropdownOpen(false); onRefresh?.() }
      else { const err = await res.json().catch(() => ({})); alert(err.message || 'Xəta baş verdi') }
    } catch { /* */ }
  }

  // ── API: Status dəyiş ──
  async function changeAssigneeStatus(userId: string, newStatus: string) {
    try {
      const res = await fetch(`${API}/tasks/${getAssigneeTaskId(userId)}/change-assignee-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, status: newStatus }),
      })
      if (res.ok) { setDropdownOpen(false); onRefresh?.() }
      else { const err = await res.json().catch(() => ({})); alert(err.message || 'Xəta baş verdi') }
    } catch { /* */ }
  }

  // ── Finalize screen aç ──
  function handleFinalize() {
    setFinalFiles([])
    setFinalNote('')
    setScreen('finalize')
  }

  function onFinalFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const newFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > MAX_FILE_SIZE) {
        alert(`"${f.name}" faylı çox böyükdür (max ${formatFileSize(MAX_FILE_SIZE)})`)
        continue
      }
      newFiles.push(f)
    }
    if (newFiles.length > 0) setFinalFiles(prev => [...prev, ...newFiles])
    if (finalFileInputRef.current) finalFileInputRef.current.value = ''
  }

  async function submitFinalize() {
    if (savingFinalize) return
    setSavingFinalize(true)
    try {
      // Bütün faylları yüklə
      const uploadedFiles: { fileId: string; fileName: string; fileSize: number }[] = []
      for (const file of finalFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch(`${API}/attachments/upload?taskId=${targetId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        })
        if (!uploadRes.ok) throw new Error(`"${file.name}" yüklənmədi`)
        const att = await uploadRes.json()
        uploadedFiles.push({ fileId: att.id, fileName: att.filename, fileSize: att.size })
      }

      const firstFile = uploadedFiles[0]
      const res = await fetch(`${API}/tasks/${targetId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          note: finalNote || undefined,
          fileId: firstFile?.fileId,
          fileName: firstFile?.fileName,
          fileSize: firstFile?.fileSize,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        }),
      })
      if (res.ok) { onRefresh?.(); onClose() }
      else { const err = await res.json().catch(() => ({})); alert(err.message || 'Xəta baş verdi') }
    } catch (e: any) {
      alert(e.message || 'Xəta baş verdi')
    } finally {
      setSavingFinalize(false)
    }
  }

  // ── @mention render ──
  function renderMentionText(text: string) {
    const regex = /(@[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+\s[A-Za-zÇçƏəĞğIıİiÖöŞşÜüəü]+)/g
    const parts = text.split(regex)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="font-semibold px-1 py-0.5 rounded" style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  // ── Navigate ──
  function openChat(userId: string) { setChatUserId(userId); setBulkNoteOpen(false); setDropdownOpen(false) }
  function goBack() { setChatUserId(null); setBulkNoteOpen(false); setDropdownOpen(false) }

  // ═══ Sağ panel: toplu mesaj chat ═══
  function renderBulkChatPanel() {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <input ref={bulkFileInputRef} type="file" className="hidden" onChange={onBulkFileChange}
          accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <button onClick={() => setBulkNoteOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#64748B' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ color: '#0F172A' }}>Toplu Mesaj</p>
            <p className="text-[9px]" style={{ color: '#94A3B8' }}>Bütün işçilərə göndərilir</p>
          </div>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
        </div>

        {/* Mesaj siyahısı */}
        <div ref={bulkChatRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ backgroundColor: '#F8FAFC' }}>
          {bulkNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#EEF2FF' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <p className="text-[11px] font-medium" style={{ color: '#94A3B8' }}>Hələ toplu mesaj yoxdur</p>
              <p className="text-[9px]" style={{ color: '#CBD5E1' }}>Aşağıdan mesaj yazın</p>
            </div>
          ) : bulkNotes.map((n: any, i: number) => {
            const isMine = n.senderId === currentUserId || (!n.senderId && !n.senderName)
            return (
              <MessageBubble key={i} message={{...n, origIndex: i}} isMe={isMine}
                senderName={isMine ? (isCreator ? 'Siz (Yaradan)' : 'Siz (Yetkili)') : (n.senderName || 'İşçi')}
                senderInitials={isMine ? 'YK' : (n.senderName?.split(' ').map((w: string) => w[0]).join('').slice(0,2) || 'İŞ')}
                taskId={targetId} userId={currentUserId} onRefresh={onRefresh}
                disabled={isFinalized} isBulk />
            )
          })}
        </div>

        {/* Input */}
        {!isFinalized && (
          <div className="px-3 py-2.5 shrink-0" style={{ borderTop: '1px solid #E2E8F0', backgroundColor: '#fff' }}>
            {bulkPendingFile && (
              <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                <span className="text-[9px] font-semibold truncate flex-1" style={{ color: '#4338CA' }}>{bulkPendingFile.name}</span>
                <button onClick={() => setBulkPendingFile(null)} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ color: '#EF4444' }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => bulkFileInputRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#64748B' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input value={bulkNoteText} onChange={e => setBulkNoteText(e.target.value)}
                placeholder="Hamıya mesaj yaz..."
                className="flex-1 text-[12px] outline-none rounded-xl px-3 py-2 transition"
                style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#4F46E5'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                onKeyDown={e => { if (e.key === 'Enter' && (bulkNoteText.trim() || bulkPendingFile)) { e.preventDefault(); sendBulkNote() } }} />
              <button onClick={sendBulkNote} disabled={(!bulkNoteText.trim() && !bulkPendingFile) || savingBulk}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition text-white"
                style={{ backgroundColor: (!bulkNoteText.trim() && !bulkPendingFile) ? '#A5B4FC' : '#4F46E5' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Fayl download URL ──
  function getFileDownloadUrl(fileId: string) {
    return `${API}/attachments/${fileId}/download`
  }

  // ═══════════════════════════════════
  // EKRAN 1: Ümumi baxış
  // ═══════════════════════════════════
  function renderScreen1() {
    return (
      <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(90vh - 4px)' }}>
        {/* Header — CreatorTaskModal ilə eyni layout */}
        <div className="p-4 shrink-0 space-y-3">
          {/* Yaradan + Yetkili + X */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCreator ? (
                <>
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span className="text-[8px]" style={{ color: '#86EFAC' }}>Yaradan:</span> Siz
                  </span>
                  {approverName && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span className="text-[8px]" style={{ color: '#C4B5FD' }}>Yetkili:</span> {approverName}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span className="text-[8px]" style={{ color: '#94A3B8' }}>Yaradan:</span> {creatorName}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span className="text-[8px]" style={{ color: '#C4B5FD' }}>Yetkili:</span> Siz
                  </span>
                </>
              )}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100" style={{ color: '#94A3B8' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Chip sırası: Tarix → Zorluk → Etiketlər → Layihə → Toplu */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {dueDate && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {(() => { const p = dueDate.split('T'); const d = new Date(p[0] || dueDate).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }); return p[1] ? `${d} ${p[1].substring(0,5)}` : d })()}
              </span>
            )}
            {task.priority && (() => {
              const pc: Record<string, { l: string; c: string; bg: string }> = { CRITICAL: { l: 'Kritik', c: '#7C3AED', bg: '#F5F3FF' }, HIGH: { l: 'Yüksək', c: '#EF4444', bg: '#FEF2F2' }, MEDIUM: { l: 'Orta', c: '#F59E0B', bg: '#FFFBEB' }, LOW: { l: 'Aşağı', c: '#10B981', bg: '#ECFDF5' } }
              const p = pc[task.priority] || pc.MEDIUM
              return (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: p.bg, color: p.c }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill={p.c} stroke={p.c} strokeWidth="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  {p.l}
                </span>
              )
            })()}
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

          {/* Başlıq */}
          <h3 className="text-[16px] font-extrabold leading-tight" style={{ color: '#0F172A' }}>{title}</h3>

          {/* Açıqlama */}
          {description && (
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: '#334155' }}>{renderMentionText(description)}</p>
            </div>
          )}

          {/* Dosyalar (kiçik) */}
          {creatorAttachments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {creatorAttachments.map((att: any) => (
                <a key={att.id} href={`${API}/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition hover:shadow-sm"
                  style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', textDecoration: 'none', border: '1px solid #C7D2FE' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  {att.filename?.substring(0, 15) || 'Fayl'}
                </a>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E2E8F0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10B981' : 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />
            </div>
            <span className="text-[11px] font-extrabold shrink-0" style={{ color: progressPct === 100 ? '#10B981' : '#4F46E5' }}>{completedCount}/{totalAssignees}</span>
          </div>
        </div>

        {/* Toplu mesaj — buton */}
        <div className="px-4 shrink-0">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition hover:opacity-90"
            style={{ backgroundColor: bulkNoteOpen ? '#4F46E5' : '#EEF2FF', border: '1px solid #C7D2FE' }}
            onClick={() => { setBulkNoteOpen(!bulkNoteOpen); if (!bulkNoteOpen) setChatUserId(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={bulkNoteOpen ? 'white' : '#4F46E5'} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span className="text-[11px] font-semibold flex-1 text-left" style={{ color: bulkNoteOpen ? 'white' : '#4F46E5' }}>Toplu mesaj {bulkNotes.length > 0 ? `(${bulkNotes.length})` : ''}</span>
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 px-4 py-2 shrink-0 overflow-x-auto" style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
          {[
            { key: 'all', label: 'Hamısı', count: totalAssignees },
            { key: 'PENDING', label: 'Gözləyir', count: countByStatus('PENDING') },
            { key: 'IN_PROGRESS', label: 'Davam edir', count: countByStatus('IN_PROGRESS') },
            { key: 'COMPLETED', label: 'Tamamladı', count: countByStatus('COMPLETED') },
            { key: 'DECLINED', label: 'Rədd etdi', count: countByStatus('DECLINED') },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="text-[9px] font-semibold px-2.5 py-1 rounded-xl shrink-0 transition"
              style={{
                backgroundColor: filter === f.key ? '#4F46E5' : '#fff',
                color: filter === f.key ? '#fff' : '#64748B',
                border: `1px solid ${filter === f.key ? '#4F46E5' : '#E2E8F0'}`,
              }}>
              <b>{f.count}</b> {f.label}
            </button>
          ))}
        </div>

        {/* İşçi siyahısı */}
        <div className="flex-1 overflow-y-auto">
          {filteredAssignees.length === 0 ? (
            <div className="text-center py-8 text-[11px]" style={{ color: '#94A3B8' }}>Nəticə tapılmadı</div>
          ) : filteredAssignees.map((a: any) => {
            const u = a.user || {}
            const sc = statusConfig[a.status] || statusConfig.PENDING
            const mc = getTotalMsgCount(a)
            const ac = getApproverNoteCount(a)
            const userId = u.id || a.userId
            const isClosed = a.chatClosed
            const initials = u.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'

            return (
              <div key={a.id || userId} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition hover:bg-gray-50"
                style={{ borderBottom: '1px solid #F8F8F8' }}
                onClick={() => openChat(userId)}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 relative"
                  style={{ backgroundColor: sc.bg, color: sc.color }}>
                  {initials}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: sc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold block truncate" style={{ color: '#0F172A' }}>{u.fullName || '—'}</span>
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: '#94A3B8' }}>
                    {mc > 0 && <span>💬 {mc}</span>}
                    <span>🛡 {ac}/{MAX_APPROVER_NOTES}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                  {isFinalized ? (
                    <span className="text-[8px] font-semibold" style={{ color: '#10B981' }}>✅ Tamamlandı</span>
                  ) : isClosed ? (
                    <span className="text-[8px] font-semibold" style={{ color: '#EF4444' }}>🔒 Bağlı</span>
                  ) : ac >= MAX_APPROVER_NOTES ? (
                    <span className="text-[8px] font-semibold" style={{ color: '#F59E0B' }}>⚠️ Limit doldu</span>
                  ) : (
                    <span className="text-[8px] font-semibold" style={{ color: '#7C3AED' }}>💬 Yaz →</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-3 shrink-0" style={{ borderTop: '1px solid #E2E8F0' }}>
          {isCreator ? (
            /* ═══ YARADAN FOOTER ═══ */
            isFinalized ? (
              isCreatorApproved ? (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
                  <span className="text-[14px]">✅</span>
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: '#10B981' }}>Görev onaylandı</div>
                    <div className="text-[9px]" style={{ color: '#64748B' }}>Görev tamamlanmış və onaylanmışdır</div>
                  </div>
                </div>
              ) : (
                <button onClick={() => {
                  setConfirmModal({ open: true, type: 'info', title: 'Görevi onayla', message: 'Yetkili kişi görevi tamamladı. Onaylamaq istəyirsiniz?', confirmText: 'Onayla', onConfirm: async () => {
                    setConfirmModal(p => ({...p, open: false}))
                    try {
                      await fetch(`${API}/tasks/${targetId}/creator-approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
                      onRefresh?.()
                    } catch {}
                  }})
                }} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: '#10B981' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Onayla
                </button>
              )
            ) : (
              <button onClick={() => onEdit?.(task)} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: '#4F46E5' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Düzənlə
              </button>
            )
          ) : (
            /* ═══ YETKİLİ FOOTER ═══ */
            isFinalized ? (
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
                <span className="text-[14px]">✅</span>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: '#10B981' }}>
                    {isCreatorApproved ? 'Görev onaylandı' : 'Tamamladınız — yaradan onayı gözlənilir'}
                  </div>
                  <div className="text-[9px]" style={{ color: '#64748B' }}>İşçilər artıq əməliyyat edə bilməz</div>
                </div>
              </div>
            ) : (
              <button onClick={handleFinalize} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: '#4F46E5' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Tamamla
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════
  // EKRAN 2: WhatsApp Söhbət
  // ═══════════════════════════════════
  function renderScreen2() {
    if (!chatAssignee) return null
    const a = chatAssignee
    const u = chatUser
    const sc = statusConfig[a.status] || statusConfig.PENDING
    const isClosed = a.chatClosed || isFinalized
    const allMerged = getMergedMessages(a)
    const approverCount = getApproverNoteCount(a)
    const approverFull = approverCount >= MAX_APPROVER_NOTES
    const userId = u.id || a.userId
    const initials = u.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'
    const pendingFile = pendingFiles[userId]

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange}
          accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <button onClick={goBack} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100"
            style={{ color: '#64748B' }} title="Mesajı bağla">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ backgroundColor: sc.bg, color: sc.color }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold truncate" style={{ color: '#0F172A' }}>{u.fullName || '—'}</div>
            <div className="text-[10px]" style={{ color: '#64748B' }}>🛡 {approverCount}/{MAX_APPROVER_NOTES} yetkili notu</div>
          </div>
          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
          {!isFinalized && (
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100"
                style={{ color: '#64748B', border: '1px solid #E2E8F0' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-9 rounded-xl overflow-hidden z-20 min-w-[190px]"
                  style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                  {a.status === 'PENDING' && (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'info', title: 'Başlat', message: `${u.fullName} üçün tapşırığı "Davam edir" statusuna keçirmək istəyirsiniz?`, confirmText: 'Başlat', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); changeAssigneeStatus(userId, 'IN_PROGRESS') } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#3B82F6' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Başlat
                    </button>
                  )}
                  {(a.status === 'IN_PROGRESS' || a.status === 'COMPLETED') && (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'warning', title: 'Gözləyir-ə qaytar', message: `${u.fullName} üçün statusu "Gözləyir"-ə qaytarmaq istəyirsiniz?`, confirmText: 'Qaytar', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); changeAssigneeStatus(userId, 'PENDING') } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#64748B' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg> Gözləyir-ə qaytar
                    </button>
                  )}
                  {a.status !== 'COMPLETED' && (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'info', title: 'Tamamlandı', message: `${u.fullName} üçün tapşırığı "Tamamlandı" olaraq işarələmək istəyirsiniz?`, confirmText: 'Tamamla', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); changeAssigneeStatus(userId, 'COMPLETED') } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tamamlandı
                    </button>
                  )}
                  {a.status !== 'DECLINED' && (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'danger', title: 'Rədd et', message: `${u.fullName} üçün tapşırığı rədd etmək istəyirsiniz? Bu geri alınmaz.`, confirmText: 'Rədd et', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); changeAssigneeStatus(userId, 'DECLINED') } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#EF4444' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Rədd et
                    </button>
                  )}
                  <div style={{ height: 1, backgroundColor: '#E2E8F0' }} />
                  {a.chatClosed ? (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'info', title: 'Söhbəti aç', message: `${u.fullName} ilə söhbəti yenidən açmaq istəyirsiniz?`, confirmText: 'Aç', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); toggleChatClosed(userId, false) } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#4F46E5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Söhbəti aç
                    </button>
                  ) : (
                    <button onClick={() => { setDropdownOpen(false); setConfirmModal({ open: true, type: 'danger', title: 'Söhbəti bağla', message: `${u.fullName} ilə söhbəti bağlamaq istəyirsiniz? İşçi artıq mesaj yaza bilməyəcək.`, confirmText: 'Bağla', onConfirm: () => { setConfirmModal(p => ({...p, open: false})); toggleChatClosed(userId, true) } }) }}
                      className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-50" style={{ color: '#EF4444' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Söhbəti bağla
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat body */}
        <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5" style={{ backgroundColor: '#F8FAFC' }}>
          {allMerged.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-1.5" style={{ color: '#94A3B8' }}>
              <span className="text-[28px]">💬</span>
              <span className="text-[12px]">Hələ mesaj yoxdur</span>
              <span className="text-[10px]">İlk mesajı göndərin</span>
            </div>
          ) : allMerged.map((m: any, i: number) => {
            const isApp = m.type === 'approver'
            const workerInitials = (u.fullName || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)
            return (
              <MessageBubble key={i} message={m} isMe={isApp}
                senderName={isApp ? (isCreator ? 'Siz (Yaradan)' : 'Siz (Yetkili)') : (u.fullName || 'İşçi')}
                senderInitials={isApp ? (isCreator ? 'YR' : 'YK') : workerInitials}
                taskId={chatAssignee?._taskId || targetId} userId={u.id || chatAssignee.userId}
                onRefresh={onRefresh} disabled={isFinalized} />
            )
          })}
        </div>

        {/* Footer — altda sabit */}
        <div className="px-3 py-2.5 shrink-0 mt-auto" style={{ borderTop: '1px solid #E2E8F0', backgroundColor: '#fff' }}>
          {isFinalized ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
              <span>✅</span>
              <span className="text-[11px] font-semibold" style={{ color: '#10B981' }}>Görev tamamlandı — bütün əməliyyatlar dayandırılıb</span>
            </div>
          ) : isClosed ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF2F2' }}>
              <span>🔒</span>
              <span className="text-[11px] font-semibold" style={{ color: '#EF4444' }}>Söhbət bağlıdır — işçi mesaj yaza bilməz</span>
            </div>
          ) : (
            <>
              {/* Pending file preview */}
              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  <span className="text-[9px] font-semibold truncate flex-1" style={{ color: '#4338CA' }}>{pendingFile.name}</span>
                  <button onClick={() => removePendingFile(userId)} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ color: '#EF4444' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => handleFileSelect(userId)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition hover:bg-gray-100"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  title="Fayl əlavə et (max 1.5 MB)">
                  <span className="text-[13px]">📎</span>
                </button>
                <input type="text" value={noteInputs[userId] || ''} maxLength={MAX_CHARS}
                  onChange={e => setNoteInputs(prev => ({ ...prev, [userId]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && (noteInputs[userId]?.trim() || pendingFile)) { e.preventDefault(); sendApproverNote(userId) } }}
                  placeholder="Mesaj yazın..."
                  className="flex-1 text-[12px] outline-none rounded-xl px-3 py-2 transition"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif' }}
                  onFocus={(e: any) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e: any) => e.target.style.borderColor = '#E2E8F0'} />
                <button onClick={() => sendApproverNote(userId)}
                  disabled={savingNote === userId || (!noteInputs[userId]?.trim() && !pendingFile)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 transition"
                  style={{ backgroundColor: savingNote === userId || (!noteInputs[userId]?.trim() && !pendingFile) ? '#A5B4FC' : '#4F46E5' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════
  // EKRAN 3: Finalize (Onay + Fayl)
  // ═══════════════════════════════════
  function renderFinalizeScreen() {
    return (
      <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(90vh - 4px)' }}>
        <input ref={finalFileInputRef} type="file" className="hidden" onChange={onFinalFileChange}
          accept="image/png,image/jpeg,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-[28px]" style={{ backgroundColor: '#ECFDF5' }}>✅</div>
            <h3 className="text-[16px] font-bold mt-3" style={{ color: '#0F172A' }}>Görevi tamamla</h3>
            <p className="text-[11px] mt-1" style={{ color: '#64748B' }}>Bu əməliyyatdan sonra bütün söhbətlər bağlanacaq, işçilər heç bir əməliyyat edə bilməyəcək.</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E2E8F0' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
            </div>
            <span className="text-[10px] font-bold shrink-0" style={{ color: '#10B981' }}>{completedCount}/{totalAssignees} tamamladı</span>
          </div>

          {/* Not yazma */}
          <div>
            <label className="text-[10px] font-bold block mb-1.5" style={{ color: '#64748B' }}>📝 Tamamlama notu (istəyə bağlı)</label>
            <textarea value={finalNote} onChange={e => setFinalNote(e.target.value)} maxLength={500}
              placeholder="Görev haqqında qeyd yazın..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
              onFocus={e => e.target.style.borderColor = '#4F46E5'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            {finalNote.length > 0 && <span className="text-[8px] float-right mt-0.5" style={{ color: '#94A3B8' }}>{finalNote.length}/500</span>}
          </div>

          {/* Fayl əlavə et */}
          <div>
            <label className="text-[10px] font-bold block mb-1.5" style={{ color: '#64748B' }}>📎 Fayllar (istəyə bağlı)</label>
            <p className="text-[9px] mb-2" style={{ color: '#94A3B8' }}>Fayllar əlavə etsəniz, tapşırığı yaradan kişi bu faylları görəcək.</p>
            {/* Seçilmiş fayllar siyahısı */}
            {finalFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {finalFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '1px solid #C6EFCE' }}>
                    <span className="text-[14px]">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold truncate" style={{ color: '#10B981' }}>{f.name}</div>
                      <div className="text-[8px]" style={{ color: '#64748B' }}>{formatFileSize(f.size)}</div>
                    </div>
                    <button onClick={() => setFinalFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50" style={{ color: '#EF4444' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Fayl əlavə et butonu — həmişə göstərilir */}
            <button onClick={() => finalFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition hover:opacity-90"
              style={{ backgroundColor: '#F8FAFC', border: '2px dashed #E2E8F0' }}>
              <span className="text-[14px]">📎</span>
              <span className="text-[10px] font-semibold" style={{ color: '#64748B' }}>{finalFiles.length > 0 ? 'Daha fayl əlavə et' : 'Fayl seç'} (max 1.5 MB)</span>
            </button>
          </div>

          {/* Düymələr */}
          <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
            <button onClick={() => setScreen('list')} className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold" style={{ color: '#64748B', backgroundColor: '#F8FAFC' }}>
              ← Geri
            </button>
            <button onClick={submitFinalize} disabled={savingFinalize}
              className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-white transition"
              style={{ backgroundColor: savingFinalize ? '#818CF8' : '#4F46E5' }}>
              {savingFinalize ? 'Yüklənir...' : '✓ Tamamla'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl flex" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', maxWidth: (chatUserId || bulkNoteOpen) ? '900px' : '500px', transition: 'max-width 0.3s ease' }} onClick={e => e.stopPropagation()}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8)', zIndex: 1 }} />
          {/* Sol panel — həmişə işçi siyahısı */}
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxWidth: (chatUserId || bulkNoteOpen) ? '50%' : '100%', maxHeight: '80vh', transition: 'max-width 0.3s ease' }}>
            {screen === 'finalize' ? renderFinalizeScreen() : renderScreen1()}
          </div>
          {/* Sağ panel — işçi chat YAXUD toplu mesaj */}
          {(chatUserId || bulkNoteOpen) && screen !== 'finalize' && (
            <div className="flex-1 min-w-0 flex flex-col" style={{ borderLeft: '1px solid #E2E8F0', maxWidth: '50%', height: '80vh', maxHeight: '80vh' }}>
              {chatUserId ? renderScreen2() : renderBulkChatPanel()}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message}
        type={confirmModal.type} confirmText={confirmModal.confirmText} onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))} />

      {/* Mesaj silmə onay */}
      {deletingMsg && (
        <ConfirmModal open={true} title="Mesajı sil" message="Bu mesaj hamıdan silinəcək. Davam edilsin?"
          type="danger" confirmText="Sil" onConfirm={async () => {
            const { noteType, noteIndex, userId, msgRef } = deletingMsg
            const res = await fetch(`${API}/tasks/${targetId}/delete-note`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({ noteType, noteIndex, userId }) })
            if (res.ok && msgRef) { msgRef.deleted = true; msgRef.text = '' }; forceRender(x => x+1)
            onRefresh?.(); setDeletingMsg(null)
          }} onCancel={() => setDeletingMsg(null)} />
      )}
    </>
  )
}
