'use client'

import { useState } from 'react'

const dayNames = ['Bazar', 'B.e.', 'Ç.a.', 'Çərşənbə', 'C.a.', 'Cümə', 'Şənbə']
const avatarColors = ['#DC4C3E', '#246FE0', '#9333EA', '#EB8909', '#058527', '#6366F1']

function getScheduleText(t: any): string {
  if (t.scheduleType === 'WEEKLY') return `Hər ${dayNames[t.dayOfWeek || 0]}`
  if (t.scheduleType === 'MONTHLY') return `Hər ayın ${t.dayOfMonth}-i`
  return ''
}

function getInitials(name: string) {
  return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface RecurringTrackModalProps {
  open: boolean
  template: any
  trackingData?: any // API-dən gələcək: per-user subtask statusları + fayllar
  onClose: () => void
  onDeletePeriod?: () => void
}

export default function RecurringTrackModal({ open, template, trackingData, onClose, onDeletePeriod }: RecurringTrackModalProps) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  if (!open || !template) return null

  const scheduleText = getScheduleText(template)
  const period = new Date().toLocaleDateString('az', { month: 'long', year: 'numeric' })
  const assignees = template.assignees || []

  // Hələlik mock data (backend bağlandıqda real data ilə əvəz olunacaq)
  const mockUsers = assignees.map((a: any, i: number) => ({
    id: a.userId || a.user?.id,
    name: a.user?.fullName || 'İstifadəçi',
    color: avatarColors[i % avatarColors.length],
    percent: 0, // backend-dən gələcək
    status: 'Gözləyir',
    subtasks: (template.items || []).map((item: any) => ({
      title: item.title,
      status: 'PENDING',
      date: null,
    })),
    files: [],
  }))

  // Tracking data varsa istifadə et, yoxsa mock
  const users = trackingData?.users || mockUsers
  const activeUser = users.find((u: any) => u.id === activeUserId) || users[0]

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--todoist-surface)', borderRadius: '14px', width: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — test dizaynı birebir */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--todoist-divider)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--todoist-text)', flex: 1 }}>{template.name}</h3>
          <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'var(--todoist-red-light)', color: 'var(--todoist-red)', fontWeight: 600 }}>🔁 {scheduleText}</span>
          <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: 'var(--todoist-hover)', color: 'var(--todoist-text-secondary)', fontWeight: 500 }}>{period}</span>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--todoist-hover)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--todoist-text-secondary)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* User tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {users.map((u: any, i: number) => {
              const isActive = (activeUser?.id === u.id) || (!activeUserId && i === 0)
              return (
                <button key={u.id || i} onClick={() => setActiveUserId(u.id)}
                  style={{
                    padding: '5px 10px', borderRadius: '14px', fontSize: '10px', fontWeight: 600,
                    cursor: 'pointer', border: `1px solid ${isActive ? '#DC4C3E' : 'var(--todoist-divider)'}`,
                    background: isActive ? '#DC4C3E' : 'var(--todoist-surface)', color: isActive ? '#fff' : 'var(--todoist-text)',
                  }}
                >
                  {getInitials(u.name)} {u.name} — <strong>{u.percent}%</strong>
                </button>
              )
            })}
          </div>

          {/* Active user detail */}
          {activeUser && (
            <div>
              {/* User header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '10px',
                background: activeUser.percent === 100 ? '#ECFDF5' : '#FFF8F0',
                border: `1px solid ${activeUser.percent === 100 ? '#A7F3D0' : '#FFE0B2'}`,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: activeUser.color || 'var(--todoist-red)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                }}>
                  {getInitials(activeUser.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--todoist-text)' }}>{activeUser.name}</div>
                  <div style={{ fontSize: '10px', color: activeUser.percent === 100 ? '#058527' : 'var(--todoist-text-secondary)' }}>
                    {activeUser.status || (activeUser.percent === 100 ? 'Tamamlandı' : 'Davam edir')}
                  </div>
                </div>
                <span style={{
                  fontSize: '20px', fontWeight: 800,
                  color: activeUser.percent === 100 ? '#058527' : activeUser.percent > 0 ? '#EB8909' : 'var(--todoist-text-secondary)',
                }}>
                  {activeUser.percent}%
                </span>
              </div>

              {/* Subtasks */}
              {(activeUser.subtasks || []).map((st: any, i: number) => {
                const isDone = st.status === 'COMPLETED'
                const isProg = st.status === 'IN_PROGRESS'
                return (
                  <div key={i} style={{
                    padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
                    border: `1px solid ${isDone ? '#A7F3D0' : isProg ? '#FFE0B2' : 'var(--todoist-divider)'}`,
                    background: isDone ? '#ECFDF5' : isProg ? '#FFF8F0' : 'var(--todoist-surface)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {/* Check icon */}
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isDone ? '#058527' : isProg ? '#EB8909' : 'var(--todoist-divider)'}`,
                      background: isDone ? '#058527' : 'transparent',
                      color: isDone ? '#fff' : '#EB8909',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px',
                    }}>
                      {isDone ? '✓' : isProg ? '◉' : ''}
                    </div>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--todoist-text)' }}>{st.title}</span>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px',
                      background: isDone ? '#ECFDF5' : isProg ? '#FFF3E0' : 'var(--todoist-hover)',
                      color: isDone ? '#058527' : isProg ? '#EB8909' : 'var(--todoist-text-secondary)',
                    }}>
                      {isDone ? (st.date || 'Tamamlandı') : isProg ? 'Davam edir' : 'Gözləyir'}
                    </span>
                  </div>
                )
              })}

              {/* User files */}
              {activeUser.files && activeUser.files.length > 0 && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--todoist-red-light)', border: '1px solid var(--todoist-red)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--todoist-red)', marginBottom: '6px' }}>
                    📎 {activeUser.name}-ın yüklədiyi dosyalar ({activeUser.files.length}/5)
                  </div>
                  {activeUser.files.map((f: any, i: number) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid var(--todoist-divider)' }}>
                        <span style={{ fontSize: '9px', color: 'var(--todoist-text-tertiary)' }}>{f.slotNumber || i + 1}</span>
                        <span style={{ fontSize: '11px' }}>📄</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>{f.filename}</span>
                          {' '}
                          <span style={{ fontSize: '9px', color: 'var(--todoist-text-tertiary)' }}>{f.size ? `${Math.round(f.size / 1024)} KB` : ''}</span>
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--todoist-text-tertiary)' }}>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('az') : ''}</span>
                      </div>
                      {/* Tarixçə — əvvəlki silindisə */}
                      {f.previousFile && (
                        <div style={{ paddingLeft: '16px', padding: '2px 0 4px 16px', borderBottom: '1px solid var(--todoist-divider)' }}>
                          <span style={{ fontSize: '8px', color: 'var(--todoist-text-tertiary)' }}>
                            <span style={{ textDecoration: 'line-through' }}>{f.previousFile}</span>
                            {' '}<span style={{ color: '#DC4C3E' }}>silindi</span>
                            {' → '}<span style={{ color: '#058527' }}>{f.filename}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--todoist-divider)', display: 'flex', gap: '8px' }}>
          <button onClick={onDeletePeriod}
            style={{ padding: '6px 10px', background: '#FFF5F5', color: '#DC4C3E', border: '1px solid #FFCDD2', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
            🗑 Bu ayı sil
          </button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ padding: '8px 16px', background: 'var(--todoist-surface)', color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Bağla
          </button>
        </div>
      </div>
    </div>
  )
}
