'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  TASK_CREATED:      { label: 'Tapşırıq yaratdı',      icon: '➕', color: '#10B981', bg: '#ECFDF5' },
  STATUS_CHANGED:    { label: 'Status dəyişdirdi',      icon: '🔄', color: '#3B82F6', bg: '#EFF6FF' },
  PRIORITY_CHANGED:  { label: 'Prioritet dəyişdirdi',   icon: '🏷', color: '#F59E0B', bg: '#FFFBEB' },
  DUE_DATE_CHANGED:  { label: 'Son tarixi dəyişdirdi',  icon: '📅', color: '#8B5CF6', bg: '#F5F3FF' },
  ASSIGNEE_ADDED:    { label: 'İşçi təyin etdi',        icon: '👤', color: '#06B6D4', bg: '#ECFEFF' },
  TASK_APPROVED:     { label: 'Tapşırığı onayladı',     icon: '✅', color: '#10B981', bg: '#ECFDF5' },
  TASK_REJECTED:     { label: 'Tapşırığı rədd etdi',    icon: '❌', color: '#EF4444', bg: '#FEF2F2' },
  COMMENT_ADDED:     { label: 'Şərh yazdı',             icon: '💬', color: '#64748B', bg: '#F1F5F9' },
  FILE_UPLOADED:     { label: 'Fayl yüklədi',            icon: '📎', color: '#64748B', bg: '#F1F5F9' },
  TASK_DELETED:      { label: 'Tapşırığı sildi',        icon: '🗑', color: '#EF4444', bg: '#FEF2F2' },
  TODO_CREATED:      { label: 'TODO yaratdı',            icon: '☑', color: '#EB8909', bg: '#FFF3E0' },
  TODO_COMPLETED:    { label: 'TODO tamamladı',          icon: '✅', color: '#10B981', bg: '#ECFDF5' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'İndicə'
  if (mins < 60) return `${mins} dəq əvvəl`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat əvvəl`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün əvvəl`
  return new Date(dateStr).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ActivityPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterUser, setFilterUser] = useState<string>('ALL')
  const [offset, setOffset] = useState(0)
  const limit = 30

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [result, userList] = await Promise.all([
        api.getActivityLog({
          entityType: filterType !== 'ALL' ? filterType : undefined,
          userId: filterUser !== 'ALL' ? filterUser : undefined,
          limit,
          offset,
        }),
        api.getUsers().catch(() => []),
      ])
      setItems(result.items || [])
      setTotal(result.total || 0)
      setUsers(userList)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filterType, filterUser, offset])

  useEffect(() => { loadData() }, [loadData])

  // Gün üzrə qruplaşdırma
  const groupedByDay = items.reduce((acc: Record<string, any[]>, item) => {
    const day = new Date(item.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {})

  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-6 w-6" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Tarixçə</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Son əməliyyatlar — {total} qeyd</p>
        </div>
      </div>

      {/* Filtrlər */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Növ filtri */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--todoist-divider)' }}>
          {[
            { key: 'ALL', label: 'Hamısı' },
            { key: 'TASK', label: 'GÖREV', badge: '#E8F0FE', badgeColor: '#246FE0' },
            { key: 'TODO', label: 'TODO', badge: '#FFF3E0', badgeColor: '#EB8909' },
          ].map(tab => (
            <button key={tab.key} onClick={() => { setFilterType(tab.key); setOffset(0) }}
              className={`px-3 py-1.5 text-[11px] font-bold transition ${filterType === tab.key ? 'text-white' : 'text-[var(--todoist-text-secondary)] hover:bg-gray-50'}`}
              style={{ backgroundColor: filterType === tab.key ? 'var(--todoist-red)' : 'var(--todoist-surface)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* İşçi filtri */}
        <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setOffset(0) }}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg outline-none"
          style={{ border: '1px solid var(--todoist-divider)', backgroundColor: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}>
          <option value="ALL">Bütün işçilər</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--todoist-border)' }}>
            <span className="text-[28px]">📋</span>
          </div>
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Tarixçə boşdur</h3>
          <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>Tapşırıqlar üzərində əməliyyat edildikdə burada görünəcək</p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedByDay).map(([day, dayItems]) => (
            <div key={day} className="mb-6">
              {/* Gün başlığı */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>{day}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--todoist-divider)' }} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--todoist-border)', color: 'var(--todoist-text-tertiary)' }}>{dayItems.length}</span>
              </div>

              {/* Əməliyyatlar */}
              <div className="relative ml-4">
                {/* Sol xətt */}
                <div className="absolute left-[7px] top-0 bottom-0 w-[2px]" style={{ backgroundColor: 'var(--todoist-divider)' }} />

                {dayItems.map((item: any, i: number) => {
                  const config = ACTION_CONFIG[item.action] || { label: item.action, icon: '📌', color: '#64748B', bg: '#F1F5F9' }
                  const details = item.details ? JSON.parse(item.details) : null

                  return (
                    <div key={item.id} className="relative flex items-start gap-3 pb-4">
                      {/* Nöqtə */}
                      <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center z-10 text-[8px]"
                        style={{ backgroundColor: config.bg, border: `2px solid ${config.color}` }}>
                      </div>

                      {/* Məlumat */}
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                            {item.user?.fullName || 'İstifadəçi'}
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: config.color }}>
                            {config.icon} {config.label}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>

                        {/* Entity */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-px rounded"
                            style={{ backgroundColor: item.entityType === 'TODO' ? '#FFF3E0' : '#E8F0FE', color: item.entityType === 'TODO' ? '#EB8909' : '#246FE0' }}>
                            {item.entityType}
                          </span>
                          <span className="text-[11px] font-medium truncate" style={{ color: 'var(--todoist-text-secondary)', maxWidth: '400px' }}>
                            {item.entityTitle}
                          </span>
                        </div>

                        {/* Detallar */}
                        {details && (
                          <div className="mt-1 text-[10px] px-2 py-1 rounded-md inline-block" style={{ backgroundColor: 'var(--todoist-bg)', color: 'var(--todoist-text-tertiary)' }}>
                            {details.oldStatus && details.newStatus && `${details.oldStatus} → ${details.newStatus}`}
                            {details.oldPriority && details.newPriority && `${details.oldPriority} → ${details.newPriority}`}
                            {details.oldDate && details.newDate && `${details.oldDate} → ${details.newDate}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition disabled:opacity-30"
                style={{ backgroundColor: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>
                ← Əvvəl
              </button>
              <span className="text-[11px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>
                {offset + 1}–{Math.min(offset + limit, total)} / {total}
              </span>
              <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition disabled:opacity-30"
                style={{ backgroundColor: 'var(--todoist-border)', color: 'var(--todoist-text-secondary)' }}>
                Sonrakı →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
