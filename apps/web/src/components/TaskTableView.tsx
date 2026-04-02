'use client'

import { useState } from 'react'
import { P, S, daysDiff } from '@/components/TaskCard'

interface TaskTableViewProps {
  tasks: any[]
  onTaskClick: (task: any) => void
  onStatusChange?: (taskId: string, status: string) => void
}

type SortKey = 'title' | 'status' | 'priority' | 'assignee' | 'business' | 'dueDate' | 'createdAt' | 'labels'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
const PRIORITY_LABEL: Record<string, string> = { CRITICAL: 'Kritik', HIGH: 'Yüksək', MEDIUM: 'Orta', LOW: 'Aşağı', INFO: 'Məlumat' }
const STATUS_ORDER: Record<string, number> = { PENDING: 0, CREATED: 0, IN_PROGRESS: 1, PENDING_APPROVAL: 2, COMPLETED: 3, APPROVED: 3, REJECTED: 4, DECLINED: 4, FORCE_COMPLETED: 5 }

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
  { value: 'IN_PROGRESS', label: 'Davam edir', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'PENDING_APPROVAL', label: 'Onay gözləyir', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'COMPLETED', label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
  { value: 'REJECTED', label: 'Rədd', color: '#EF4444', bg: '#FEF2F2' },
]

export default function TaskTableView({ tasks, onTaskClick, onStatusChange }: TaskTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break
      case 'status': cmp = (STATUS_ORDER[a.myStatus || a.status] ?? 9) - (STATUS_ORDER[b.myStatus || b.status] ?? 9); break
      case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break
      case 'assignee': cmp = (a.assignees?.[0]?.user?.fullName || 'zzz').localeCompare(b.assignees?.[0]?.user?.fullName || 'zzz'); break
      case 'business': cmp = (a.business?.name || 'zzz').localeCompare(b.business?.name || 'zzz'); break
      case 'dueDate': cmp = new Date(a.dueDate || '2099-01-01').getTime() - new Date(b.dueDate || '2099-01-01').getTime(); break
      case 'createdAt': cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); break
    }
    return sortDir === 'desc' ? -cmp : cmp
  })

  const completedCount = sorted.filter(t => ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(t.myStatus || t.status)).length
  const overdueCount = sorted.filter(t => t.dueDate && daysDiff(t.dueDate) < 0 && !['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(t.myStatus || t.status)).length

  const columns: { key: SortKey; label: string; minW: number }[] = [
    { key: 'title', label: 'Tapşırıq adı', minW: 240 },
    { key: 'status', label: 'Status', minW: 130 },
    { key: 'priority', label: 'Prioritet', minW: 110 },
    { key: 'assignee', label: 'İşçi', minW: 150 },
    { key: 'business', label: 'İşletmə', minW: 130 },
    { key: 'dueDate', label: 'Son tarix', minW: 120 },
    { key: 'createdAt', label: 'Yaradılıb', minW: 110 },
    { key: 'labels', label: 'Etiket', minW: 120 },
  ]

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
          {sorted.length} sətir
        </span>
        <span style={{ color: '#E2E8F0' }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>
          Tamamlanma: {sorted.length > 0 ? Math.round((completedCount / sorted.length) * 100) : 0}%
        </span>
        {overdueCount > 0 && (
          <>
            <span style={{ color: '#E2E8F0' }}>·</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444' }}>
              ⚠ {overdueCount} gecikmiş
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          {/* Header */}
          <thead>
            <tr>
              <th style={{ width: 44, padding: '11px 8px', textAlign: 'center', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>
                #
              </th>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    minWidth: col.minW, padding: '11px 14px', textAlign: 'left',
                    background: '#F8FAFC', borderBottom: '2px solid #E2E8F0',
                    fontSize: 11, fontWeight: 700, color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    cursor: 'pointer', userSelect: 'none', position: 'relative',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EFF2F5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {col.label}
                    {sortKey === col.key ? (
                      <span style={{ color: '#4F46E5', fontSize: 12, fontWeight: 800 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 10 }}>⇅</span>
                    )}
                  </span>
                </th>
              ))}
              <th style={{ width: 44, padding: '11px 8px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }} />
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sorted.map((task, i) => {
              const effectiveStatus = task.myStatus || task.status
              const sConfig = S[effectiveStatus] || S.CREATED
              const pColor = P[task.priority] || '#808080'
              const diff = task.dueDate ? daysDiff(task.dueDate) : null
              const done = ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(effectiveStatus)
              const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : '#94A3B8') : '#94A3B8'
              const initials = task.assignees?.[0]?.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'

              return (
                <tr key={task.id}
                  onClick={() => { if (statusDropdown !== task.id) onTaskClick(task) }}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: i % 2 === 1 ? '#FAFBFC' : 'white',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 1 ? '#FAFBFC' : 'white'}>

                  {/* Row number */}
                  <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>
                    {i + 1}
                  </td>

                  {/* Başlıq */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 3, height: 24, borderRadius: 2, backgroundColor: pColor, flexShrink: 0 }} />
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: done ? '#94A3B8' : '#1E293B',
                        textDecoration: done ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300,
                      }}>
                        {task.title}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
                    <span
                      onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === task.id ? null : task.id) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        backgroundColor: sConfig.bg, color: sConfig.color,
                        cursor: 'pointer', transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sConfig.color }} />
                      {sConfig.label}
                    </span>
                    {statusDropdown === task.id && onStatusChange && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 14, zIndex: 50,
                        backgroundColor: 'white', borderRadius: 10, padding: '6px 0',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0',
                        minWidth: 160,
                      }}>
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.value}
                            onClick={e => { e.stopPropagation(); onStatusChange(task.id, opt.value); setStatusDropdown(null) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '7px 14px', border: 'none', background: 'none',
                              fontSize: 12, fontWeight: 500, color: '#334155',
                              cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: opt.color }} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Prioritet */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      backgroundColor: pColor + '14', color: pColor,
                    }}>
                      {task.priority === 'CRITICAL' && <svg width="10" height="10" viewBox="0 0 24 24" fill={pColor}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>}
                      {task.priority === 'HIGH' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pColor} strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>}
                      {task.priority === 'MEDIUM' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pColor} strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                      {task.priority === 'LOW' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pColor} strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>}
                      {PRIORITY_LABEL[task.priority] || task.priority}
                    </span>
                  </td>

                  {/* İşçi */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    {task.assignees?.[0]?.user ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          backgroundColor: pColor + '18', color: pColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.assignees[0].user.fullName}
                          {task.assignees.length > 1 && <span style={{ color: '#94A3B8', marginLeft: 4 }}>+{task.assignees.length - 1}</span>}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                    )}
                  </td>

                  {/* İşletmə */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    {task.business?.name ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                        {task.business.name.length > 14 ? task.business.name.slice(0, 14) + '…' : task.business.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                    )}
                  </td>

                  {/* Son tarix */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    {task.dueDate ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: dueDateColor }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dueDateColor} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {diff !== null && diff < 0 ? `${Math.abs(diff)}g gecikmiş` : diff === 0 ? 'Bugün' : new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                    )}
                  </td>

                  {/* Yaradılıb */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8' }}>
                    {new Date(task.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                  </td>

                  {/* Etiketlər */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {task.labels?.slice(0, 2).map((tl: any) => (
                        <span key={tl.label?.id || tl.id} style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                          backgroundColor: ((tl.label?.color || tl.color || '#808080') + '20'),
                          color: tl.label?.color || tl.color || '#808080',
                        }}>
                          {tl.label?.name || tl.name}
                        </span>
                      ))}
                      {(task.labels?.length || 0) > 2 && (
                        <span style={{ fontSize: 9, color: '#94A3B8' }}>+{task.labels.length - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Expand */}
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); onTaskClick(task) }}
                      style={{
                        width: 22, height: 22, borderRadius: 4, border: 'none',
                        backgroundColor: '#F1F5F9', cursor: 'pointer', fontSize: 10, color: '#64748B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#4F46E5'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#64748B' }}>
                      ↗
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
        borderTop: '1px solid #E2E8F0', background: '#FAFBFC',
        fontSize: 11, color: '#64748B',
      }}>
        <span><strong>{sorted.length}</strong> sətir</span>
        <span style={{ color: '#E2E8F0' }}>|</span>
        <span>CƏMİ müddət: <strong style={{ color: '#1E293B' }}>{sorted.reduce((s, t) => s + (t.estimatedHours || 0), 0)}s</strong></span>
        <span style={{ color: '#E2E8F0' }}>|</span>
        <span>Tamamlanma: <strong style={{ color: '#059669' }}>{sorted.length > 0 ? Math.round((completedCount / sorted.length) * 100) : 0}%</strong></span>
      </div>
    </div>
  )
}
