'use client'

import { PrioFlag } from './TaskCard'

interface StatusTab {
  key: string
  label: string
  dot: string
  count: number
}

interface Business {
  id: string
  name: string
}

interface FilterBarProps {
  statusTabs: StatusTab[]
  selectedStatus: string
  onStatusChange: (key: string) => void
  businesses: Business[]
  selectedBiz: string
  onBizChange: (key: string) => void
  selectedPriority: string
  onPriorityChange: (key: string) => void
  users: any[]
  selectedUser: string
  onUserChange: (key: string) => void
  defaultStatus?: string
  onReset: () => void
  showReset: boolean
}

const PRIORITIES = [
  { key: 'ALL', label: 'Hamısı', dot: '#94A3B8' },
  { key: 'CRITICAL', label: 'Kritik', dot: '#7C3AED' },
  { key: 'HIGH', label: 'Yüksək', dot: '#EF4444' },
  { key: 'MEDIUM', label: 'Orta', dot: '#F59E0B' },
  { key: 'LOW', label: 'Aşağı', dot: '#10B981' },
]

export default function FilterBar({
  statusTabs, selectedStatus, onStatusChange,
  businesses, selectedBiz, onBizChange,
  selectedPriority, onPriorityChange,
  users, selectedUser, onUserChange,
  onReset, showReset,
}: FilterBarProps) {
  return (
    <>
      {/* Status tab filtrlər */}
      <div className="flex gap-0 mb-3 border-b-2 border-[var(--todoist-divider)] overflow-x-auto">
        {statusTabs.map(tab => (
          <button key={tab.key} onClick={() => onStatusChange(tab.key)}
            className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-1.5 whitespace-nowrap
              ${selectedStatus === tab.key ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}>
            {tab.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tab.dot }} />}
            {tab.label}
            <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${selectedStatus === tab.key ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Chip filtrlər */}
      <div className="flex gap-1.5 mb-5 flex-wrap items-center">
        {/* Filial chips */}
        <button onClick={() => onBizChange('ALL')}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border-[1.5px]"
          style={{ backgroundColor: selectedBiz === 'ALL' ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: selectedBiz === 'ALL' ? 'var(--todoist-surface)' : 'var(--todoist-text)', borderColor: selectedBiz === 'ALL' ? 'var(--todoist-red)' : 'var(--todoist-divider)' }}>
          Bütün filiallar
        </button>
        {businesses.map(b => (
          <button key={b.id} onClick={() => onBizChange(b.id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition border-[1.5px]"
            style={{ backgroundColor: selectedBiz === b.id ? 'var(--todoist-red)' : 'var(--todoist-surface)', color: selectedBiz === b.id ? 'var(--todoist-surface)' : 'var(--todoist-text)', borderColor: selectedBiz === b.id ? 'var(--todoist-red)' : 'var(--todoist-divider)' }}>
            {b.name}
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--todoist-divider)] mx-1" />

        {/* Prioritet chips */}
        {PRIORITIES.map(p => (
          <button key={p.key} onClick={() => onPriorityChange(p.key)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition border-[1.5px] flex items-center gap-1.5"
            style={{ backgroundColor: selectedPriority === p.key ? '#4F46E5' : 'var(--todoist-surface)', color: selectedPriority === p.key ? '#fff' : 'var(--todoist-text)', borderColor: selectedPriority === p.key ? '#4F46E5' : 'var(--todoist-divider)' }}>
            {p.key !== 'ALL' ? <PrioFlag color={selectedPriority === p.key ? '#fff' : p.dot} size={12} /> : selectedPriority !== p.key && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.dot }} />}
            {p.label}
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--todoist-divider)] mx-1" />

        {/* İşçi dropdown */}
        <select value={selectedUser} onChange={e => onUserChange(e.target.value)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold outline-none cursor-pointer border-[1.5px] border-[var(--todoist-divider)] bg-white text-[var(--todoist-text)]">
          <option value="ALL">👤 Bütün işçilər</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>

        {showReset && (
          <button onClick={onReset}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] border-[var(--todoist-red-light)]"
            style={{ color: 'var(--todoist-red)', backgroundColor: 'var(--todoist-red-light)' }}>
            ✕ Sıfırla
          </button>
        )}
      </div>
    </>
  )
}
