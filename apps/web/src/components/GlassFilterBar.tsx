'use client'

import { PrioFlag } from './TaskCard'

// ─── Tiplər ─────────────────────────────────────────────────────────────────
export interface GlassStatusTab {
  key: string
  label: string
  dot?: string
  icon?: string
  iconColor?: string
  count: number
  colorClass?: string // active rəng mövzu: 'blue' | 'amber' | 'green' | 'red' | 'primary'
}

export interface GlassFilterBarProps {
  // Növ (GÖREV / TODO)
  viewFilter: 'all' | 'gorev' | 'todo'
  onViewFilter: (v: 'all' | 'gorev' | 'todo') => void
  gorevCount: number
  todoCount: number

  // Filial
  businesses: { id: string; name: string }[]
  selectedBiz: string
  onBizChange: (id: string) => void

  // Prioritet
  selectedPriority: string
  onPriorityChange: (key: string) => void

  // İşçi
  users: { id: string; fullName: string }[]
  selectedUser: string
  onUserChange: (id: string) => void

  // Status tabları
  statusTabs: GlassStatusTab[]
  selectedStatus: string
  onStatusChange: (key: string) => void

  // Reset
  showReset: boolean
  onReset: () => void
}

// ─── Sabit prioritet konfiqurasiyası ────────────────────────────────────────
const PRIORITIES = [
  { key: 'ALL',      label: 'Hamısı', dot: '#94A3B8' },
  { key: 'CRITICAL', label: 'Kritik',  dot: '#7C3AED' },
  { key: 'HIGH',     label: 'Yüksək',  dot: '#EF4444' },
  { key: 'MEDIUM',   label: 'Orta',    dot: '#F59E0B' },
  { key: 'LOW',      label: 'Aşağı',   dot: '#10B981' },
]

// Status ikonları
const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  ALL:              { icon: '⊞',  color: '#94A3B8' },
  PENDING:          { icon: '○',  color: '#64748B' },
  CREATED:          { icon: '○',  color: '#64748B' },
  IN_PROGRESS:      { icon: '↻',  color: '#3B82F6' },
  PENDING_APPROVAL: { icon: '⏳', color: '#F59E0B' },
  COMPLETED:        { icon: '✓',  color: '#10B981' },
  APPROVED:         { icon: '✓',  color: '#10B981' },
  REJECTED:         { icon: '✕',  color: '#EF4444' },
  DECLINED:         { icon: '✕',  color: '#EF4444' },
  // TODO statusları
  WAITING:          { icon: '○',  color: '#64748B' },
  DONE:             { icon: '✓',  color: '#10B981' },
  CANCELLED:        { icon: '✕',  color: '#EF4444' },
}

const STATUS_ACTIVE: Record<string, { bg: string; text: string; cntBg: string; cntText: string }> = {
  ALL:              { bg: 'rgba(79,70,229,0.08)',  text: '#4F46E5', cntBg: '#4F46E5',  cntText: '#fff' },
  PENDING:          { bg: 'rgba(100,116,139,0.08)',text: '#475569', cntBg: '#475569',  cntText: '#fff' },
  CREATED:          { bg: 'rgba(100,116,139,0.08)',text: '#475569', cntBg: '#475569',  cntText: '#fff' },
  IN_PROGRESS:      { bg: 'rgba(59,130,246,0.08)', text: '#2563EB', cntBg: '#2563EB',  cntText: '#fff' },
  PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.08)', text: '#D97706', cntBg: '#D97706',  cntText: '#fff' },
  COMPLETED:        { bg: 'rgba(16,185,129,0.08)', text: '#059669', cntBg: '#059669',  cntText: '#fff' },
  APPROVED:         { bg: 'rgba(16,185,129,0.08)', text: '#059669', cntBg: '#059669',  cntText: '#fff' },
  REJECTED:         { bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', cntBg: '#DC2626',  cntText: '#fff' },
  DECLINED:         { bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', cntBg: '#DC2626',  cntText: '#fff' },
  WAITING:          { bg: 'rgba(100,116,139,0.08)',text: '#475569', cntBg: '#475569',  cntText: '#fff' },
  DONE:             { bg: 'rgba(16,185,129,0.08)', text: '#059669', cntBg: '#059669',  cntText: '#fff' },
  CANCELLED:        { bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', cntBg: '#DC2626',  cntText: '#fff' },
}

// ─── Kiçik köməkçi: rəf çipi ─────────────────────────────────────────────
function ShelfChip({
  label, active, onClick, dot, isPrio = false, dotColor,
}: {
  label: string; active: boolean; onClick: () => void
  dot?: boolean; isPrio?: boolean; dotColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap select-none"
      style={{
        background: active ? 'var(--todoist-red)' : 'rgba(0,0,0,0.04)',
        color: active ? '#fff' : 'var(--todoist-text-secondary)',
      }}
    >
      {dot && dotColor && (
        isPrio
          ? <PrioFlag color={active ? '#fff' : dotColor} size={10} />
          : <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: dotColor }} />
      )}
      {label}
    </button>
  )
}

// ─── ANA KOMPONENT ──────────────────────────────────────────────────────────
export default function GlassFilterBar({
  viewFilter, onViewFilter, gorevCount, todoCount,
  businesses, selectedBiz, onBizChange,
  selectedPriority, onPriorityChange,
  users, selectedUser, onUserChange,
  statusTabs, selectedStatus, onStatusChange,
  showReset, onReset,
}: GlassFilterBarProps) {

  const totalCount = gorevCount + todoCount

  return (
    <div className="rounded-2xl overflow-hidden mb-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
      style={{ border: '1.5px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)' }}>

      {/* ── YUXARI RƏFLƏR ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-[rgba(0,0,0,0.05)]"
        style={{ borderBottom: '1.5px solid rgba(0,0,0,0.05)' }}>

        {/* 1. Növ */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-bold tracking-[0.07em] uppercase text-[var(--todoist-text-tertiary)] mb-2">Növ</p>
          <div className="flex gap-1.5 flex-wrap">
            <ShelfChip label={`Hamısı ${totalCount}`} active={viewFilter === 'all'} onClick={() => onViewFilter('all')} />
            <ShelfChip label={`GÖREV ${gorevCount}`} active={viewFilter === 'gorev'} onClick={() => onViewFilter('gorev')} />
            <ShelfChip label={`TODO ${todoCount}`} active={viewFilter === 'todo'} onClick={() => onViewFilter('todo')} />
          </div>
        </div>

        {/* 2. Filial */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-bold tracking-[0.07em] uppercase text-[var(--todoist-text-tertiary)] mb-2">Filial</p>
          <div className="flex gap-1.5 flex-wrap">
            <ShelfChip label="Hamısı" active={selectedBiz === 'ALL'} onClick={() => onBizChange('ALL')} />
            {businesses.slice(0, 5).map(b => (
              <ShelfChip key={b.id} label={b.name.length > 10 ? b.name.slice(0, 9) + '…' : b.name}
                active={selectedBiz === b.id} onClick={() => onBizChange(b.id)} />
            ))}
          </div>
        </div>

        {/* 3. Prioritet */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-bold tracking-[0.07em] uppercase text-[var(--todoist-text-tertiary)] mb-2">Prioritet</p>
          <div className="flex gap-1.5 flex-wrap">
            {PRIORITIES.map(p => (
              <ShelfChip
                key={p.key}
                label={p.label}
                active={selectedPriority === p.key}
                onClick={() => onPriorityChange(p.key)}
                dot={p.key !== 'ALL'}
                isPrio={p.key !== 'ALL'}
                dotColor={p.dot}
              />
            ))}
          </div>
        </div>

        {/* 4. İşçi */}
        <div className="px-4 py-3">
          <p className="text-[9px] font-bold tracking-[0.07em] uppercase text-[var(--todoist-text-tertiary)] mb-2">İşçi</p>
          <div className="flex gap-1.5 flex-wrap">
            <ShelfChip label="Hamısı" active={selectedUser === 'ALL'} onClick={() => onUserChange('ALL')} />
            {users.slice(0, 5).map(u => (
              <ShelfChip key={u.id} label={u.fullName.split(' ')[0]}
                active={selectedUser === u.id} onClick={() => onUserChange(u.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── AŞAĞI STATUS SƏTRI ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide"
        style={{ background: 'rgba(248,250,252,0.6)' }}>
        {statusTabs.map(tab => {
          const isActive = selectedStatus === tab.key
          const activeStyle = STATUS_ACTIVE[tab.key] ?? STATUS_ACTIVE['ALL']
          const ico = STATUS_ICONS[tab.key]

          return (
            <button
              key={tab.key}
              onClick={() => onStatusChange(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap shrink-0"
              style={isActive
                ? { background: activeStyle.bg, color: activeStyle.text }
                : { color: 'var(--todoist-text-tertiary)' }
              }
            >
              {tab.dot
                ? <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: tab.dot }} />
                : ico && (
                  <span className="text-[12px] leading-none" style={{ color: isActive ? activeStyle.text : ico.color }}>
                    {ico.icon}
                  </span>
                )
              }
              {tab.label}
              <span
                className="text-[10px] font-bold px-1.5 py-px rounded-md ml-0.5"
                style={isActive
                  ? { background: activeStyle.cntBg, color: activeStyle.cntText }
                  : { background: 'rgba(0,0,0,0.05)', color: 'var(--todoist-text-tertiary)' }
                }
              >
                {tab.count}
              </span>
            </button>
          )
        })}

        {/* Spacer + Reset */}
        <div className="flex-1" />
        {showReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}
          >
            <span className="text-[12px]">↺</span> Sıfırla
          </button>
        )}
      </div>
    </div>
  )
}
