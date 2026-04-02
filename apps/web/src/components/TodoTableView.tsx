'use client'

import { useState } from 'react'

interface TodoTableViewProps {
  todos: any[]
  onTodoClick: (id: string) => void
  onComplete?: (id: string) => void
}

type SortKey = 'content' | 'status' | 'priority' | 'project' | 'dueDate' | 'createdAt'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  WAITING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS: { label: 'Davam edir', color: '#F59E0B', bg: '#FFFBEB' },
  DONE: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
  CANCELLED: { label: 'İptal', color: '#EF4444', bg: '#FEF2F2' },
}

const PRIO_CONFIG: Record<string, { label: string; color: string }> = {
  P1: { label: 'Kritik', color: '#EF4444' },
  P2: { label: 'Yüksək', color: '#F59E0B' },
  P3: { label: 'Orta', color: '#3B82F6' },
  P4: { label: 'Normal', color: '#64748B' },
}

const PRIO_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }
const STATUS_ORDER: Record<string, number> = { WAITING: 0, IN_PROGRESS: 1, DONE: 2, CANCELLED: 3 }

function todoDiff(dueDate: string): number | null {
  if (!dueDate) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

export default function TodoTableView({ todos, onTodoClick, onComplete }: TodoTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...todos].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'content': cmp = (a.content || '').localeCompare(b.content || ''); break
      case 'status': cmp = (STATUS_ORDER[a.todoStatus || 'WAITING'] ?? 9) - (STATUS_ORDER[b.todoStatus || 'WAITING'] ?? 9); break
      case 'priority': cmp = (PRIO_ORDER[a.priority || 'P4'] ?? 9) - (PRIO_ORDER[b.priority || 'P4'] ?? 9); break
      case 'project': cmp = (a.project?.name || 'zzz').localeCompare(b.project?.name || 'zzz'); break
      case 'dueDate': cmp = new Date(a.dueDate || '2099-01-01').getTime() - new Date(b.dueDate || '2099-01-01').getTime(); break
      case 'createdAt': cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); break
    }
    return sortDir === 'desc' ? -cmp : cmp
  })

  const completedCount = sorted.filter(t => t.isCompleted || (t.todoStatus || 'WAITING') === 'DONE').length

  const columns: { key: SortKey; label: string; minW: number }[] = [
    { key: 'content', label: 'Tapşırıq adı', minW: 280 },
    { key: 'status', label: 'Status', minW: 130 },
    { key: 'priority', label: 'Prioritet', minW: 100 },
    { key: 'project', label: 'Layihə', minW: 130 },
    { key: 'dueDate', label: 'Son tarix', minW: 120 },
    { key: 'createdAt', label: 'Yaradılıb', minW: 110 },
  ]

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{sorted.length} todo</span>
        <span style={{ color: '#E2E8F0' }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>
          Tamamlanma: {sorted.length > 0 ? Math.round((completedCount / sorted.length) * 100) : 0}%
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 44, padding: '11px 8px', textAlign: 'center', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>#</th>
              <th style={{ width: 36, padding: '11px 4px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }} />
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    minWidth: col.minW, padding: '11px 14px', textAlign: 'left',
                    background: '#F8FAFC', borderBottom: '2px solid #E2E8F0',
                    fontSize: 11, fontWeight: 700, color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    cursor: 'pointer', userSelect: 'none', transition: 'background 0.1s',
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
          <tbody>
            {sorted.map((task, i) => {
              const status = task.todoStatus || 'WAITING'
              const sConfig = STATUS_CONFIG[status] || STATUS_CONFIG.WAITING
              const pConfig = PRIO_CONFIG[task.priority] || PRIO_CONFIG.P4
              const diff = task.dueDate ? todoDiff(task.dueDate) : null
              const done = task.isCompleted || status === 'DONE'
              const dueDateColor = diff !== null ? (diff < 0 ? '#EF4444' : diff === 0 ? '#D97706' : '#94A3B8') : '#94A3B8'

              return (
                <tr key={task.id}
                  onClick={() => onTodoClick(task.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: i % 2 === 1 ? '#FAFBFC' : 'white',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 1 ? '#FAFBFC' : 'white'}>

                  {/* # */}
                  <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>{i + 1}</td>

                  {/* Checkbox */}
                  <td style={{ padding: '10px 4px', borderBottom: '1px solid #F1F5F9' }}>
                    <button
                      onClick={e => { e.stopPropagation(); onComplete?.(task.id) }}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sConfig.color}`,
                        background: done ? sConfig.color : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  </td>

                  {/* İçerik */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: done ? '#94A3B8' : '#1E293B',
                        textDecoration: done ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 350,
                      }}>
                        {task.content}
                      </span>
                      {task.description && (
                        <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>📝</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      backgroundColor: sConfig.bg, color: sConfig.color,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sConfig.color }} />
                      {sConfig.label}
                    </span>
                  </td>

                  {/* Prioritet */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      backgroundColor: pConfig.color + '14', color: pConfig.color,
                    }}>
                      {pConfig.label}
                    </span>
                  </td>

                  {/* Layihə */}
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    {task.project?.name ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, backgroundColor: '#FFF3E0', color: '#EB8909' }}>
                        {task.project.name}
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

                  {/* Expand */}
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); onTodoClick(task.id) }}
                      style={{
                        width: 22, height: 22, borderRadius: 4, border: 'none',
                        backgroundColor: '#F1F5F9', cursor: 'pointer', fontSize: 10, color: '#64748B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s',
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
        borderTop: '1px solid #E2E8F0', background: '#FAFBFC', fontSize: 11, color: '#64748B',
      }}>
        <span><strong>{sorted.length}</strong> todo</span>
        <span style={{ color: '#E2E8F0' }}>|</span>
        <span>Tamamlanma: <strong style={{ color: '#059669' }}>{sorted.length > 0 ? Math.round((completedCount / sorted.length) * 100) : 0}%</strong></span>
      </div>
    </div>
  )
}
