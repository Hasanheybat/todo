'use client'

import { useState, useRef, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface MessageBubbleProps {
  message: any
  isMe: boolean
  senderName: string
  senderInitials: string
  taskId: string
  userId: string
  avatarColor?: string
  onRefresh?: () => void
  disabled?: boolean
  isBulk?: boolean
}

export default function MessageBubble({ message: m, isMe, senderName, senderInitials, taskId, userId, avatarColor = '#4F46E5', onRefresh, disabled, isBulk }: MessageBubbleProps) {
  const [localDeleted] = useState(!!m.deleted)
  const [localText] = useState(m.text || '')
  const [localEdited] = useState(!!m.edited)

  const hasFile = !!m.fileId

  const fmtTime = (d: string) => { try { return new Date(d).toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  // ═══ SİLİNMİŞ MESAJ ═══
  if (localDeleted) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
        {!isMe && <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-1" style={{ backgroundColor: avatarColor + '15', color: avatarColor }}>{senderInitials}</div>}
        <div className="max-w-[80%] px-3.5 py-2 rounded-2xl" style={{ backgroundColor: '#F1F5F9', border: '1px dashed #CBD5E1' }}>
          <span className="text-[9px] font-bold block mb-0.5" style={{ color: '#94A3B8' }}>{senderName}</span>
          <p className="text-[11px] italic flex items-center gap-1" style={{ color: '#94A3B8' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            Bu mesaj silindi
          </p>
        </div>
        {isMe && <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-1" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{senderInitials}</div>}
      </div>
    )
  }

  // ═══ NORMAL MESAJ ═══
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-1" style={{ backgroundColor: avatarColor + '15', color: avatarColor }}>
          {senderInitials}
        </div>
      )}

      <div className={`max-w-[80%] px-3.5 py-2 ${isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`} style={{
        backgroundColor: isMe ? '#4F46E5' : '#fff',
        border: isMe ? 'none' : '1px solid #E2E8F0',
      }}>
        <span className="text-[9px] font-bold block mb-0.5" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : avatarColor }}>
          {senderName}
        </span>
        {localText && <p className="text-[12px] break-words leading-relaxed" style={{ color: isMe ? '#fff' : '#334155' }}>{localText}</p>}
        {hasFile && (
          <a href={`${API}/attachments/${m.fileId}/download`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg transition hover:opacity-90"
            style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : '#F8FAFC', border: isMe ? 'none' : '1px solid #E2E8F0', textDecoration: 'none' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={isMe ? 'white' : '#4F46E5'} strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            <span className="text-[10px] font-semibold truncate flex-1" style={{ color: isMe ? 'white' : '#4338CA' }}>{m.fileName || 'fayl'}</span>
          </a>
        )}

        {/* Vaxt */}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {localEdited && <span className="text-[7px] italic" style={{ color: isMe ? 'rgba(255,255,255,0.4)' : '#CBD5E1' }}>düzənləndi</span>}
          <span className="text-[8px]" style={{ color: isMe ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>{m.date ? fmtTime(m.date) : ''}</span>
        </div>
      </div>

      {/* Sağ avatar */}
      {isMe && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-1" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
          {senderInitials}
        </div>
      )}
    </div>
  )
}
