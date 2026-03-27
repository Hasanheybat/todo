'use client'

import { useState, useRef, useEffect } from 'react'
import { parseDateString } from '@/lib/dateParser'

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const AZ_DAYS = ['B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.', 'B.']

interface CustomDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  onClear?: () => void
  onClose?: () => void
  onRecurring?: (rule: string) => void // 'daily' | 'weekly' | 'monthly'
  position?: 'top' | 'bottom'
  showQuickButtons?: boolean
}

export default function CustomDatePicker({ value, onChange, onClear, onClose, onRecurring, position = 'bottom', showQuickButtons = true }: CustomDatePickerProps) {
  const today = new Date()
  const initialDate = value ? new Date(value) : today
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const todayStr = toDateStr(today)
  const tomorrowDate = new Date(today)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrowDate)
  const nextWeekDate = new Date(today)
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeekStr = toDateStr(nextWeekDate)
  const nextSatDate = getNextSaturday(today)
  const nextSatStr = toDateStr(nextSatDate)

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDay = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
  }
  // Next month days to fill grid
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false })
  }

  // Only show 5 rows if last row is all next month
  const rows = cells.length > 35 && cells.slice(35).every(c => !c.isCurrentMonth) ? cells.slice(0, 35) : cells

  const handlePrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const handleNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const handleSelect = (cell: typeof cells[0]) => {
    const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
    onChange(dateStr)
    onClose?.()
  }

  const handleQuick = (dateStr: string) => {
    onChange(dateStr)
    onClose?.()
  }

  const posClass = position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <div ref={ref} className={`absolute ${posClass} left-0 z-30 rounded-xl shadow-2xl`}
      style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', width: 280 }}
      onClick={e => e.stopPropagation()}>

      {/* Natural language input */}
      <div className="px-3 pt-3 pb-1">
        <input
          type="text"
          placeholder='Tarix yazın... ("sabah", "cümə", "3 gün sonra")'
          className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-[var(--todoist-divider)] outline-none focus:border-[var(--todoist-red)] text-[var(--todoist-text)] placeholder:text-[var(--todoist-text-tertiary)]"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const parsed = parseDateString((e.target as HTMLInputElement).value)
              if (parsed) { onChange(parsed); onClose?.(); (e.target as HTMLInputElement).value = '' }
            }
          }}
        />
      </div>

      {/* Quick buttons */}
      {showQuickButtons && (
        <div className="px-3 pt-3 pb-1 space-y-0.5">
          <QuickBtn icon="today" label="Bugün" sub={formatWeekday(today)} color="var(--todoist-red)"
            active={value === todayStr} onClick={() => handleQuick(todayStr)} />
          <QuickBtn icon="tomorrow" label="Sabah" sub={formatWeekday(tomorrowDate)} color="#EB8909"
            active={value === tomorrowStr} onClick={() => handleQuick(tomorrowStr)} />
          <QuickBtn icon="weekend" label="Bu həftəsonu" sub={formatWeekday(nextSatDate)} color="#246FE0"
            active={value === nextSatStr} onClick={() => handleQuick(nextSatStr)} />
          <QuickBtn icon="nextweek" label="Gələn həftə" sub={formatWeekday(nextWeekDate)} color="#44BE6C"
            active={value === nextWeekStr} onClick={() => handleQuick(nextWeekStr)} />
        </div>
      )}

      {/* Təkrarlanan seçimlər */}
      {showQuickButtons && (
        <div className="px-3 pb-1 space-y-0.5">
          <div className="border-t pt-1.5 mt-0.5" style={{ borderColor: 'var(--todoist-divider)' }} />
          <p className="text-[9px] font-bold text-[var(--todoist-text-tertiary)] uppercase mb-1 px-2">Təkrarlanan</p>
          <QuickBtn icon="repeat" label="Hər gün" sub="" color="#9333EA"
            active={false} onClick={() => { onChange(todayStr); onRecurring?.('daily'); onClose?.() }} />
          <QuickBtn icon="repeat" label="Hər həftə" sub={formatWeekday(today)} color="#9333EA"
            active={false} onClick={() => { onChange(todayStr); onRecurring?.('weekly'); onClose?.() }} />
          <QuickBtn icon="repeat" label="Hər ay" sub={`${today.getDate()}-ci`} color="#9333EA"
            active={false} onClick={() => { onChange(todayStr); onRecurring?.('monthly'); onClose?.() }} />
        </div>
      )}

      <div className="border-t mx-3" style={{ borderColor: 'var(--todoist-divider)' }} />

      {/* Calendar header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <button onClick={handlePrev} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--todoist-sidebar-hover)] transition">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
          {AZ_MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={handleNext} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--todoist-sidebar-hover)] transition">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3">
        {AZ_DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-bold py-1" style={{ color: 'var(--todoist-text-tertiary)' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3 pb-2">
        {rows.map((cell, i) => {
          const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
          const isToday = cellStr === todayStr
          const isSelected = cellStr === value
          const isPast = new Date(cellStr) < new Date(todayStr) && !isToday

          return (
            <button key={i} onClick={() => handleSelect(cell)}
              className="w-full aspect-square flex items-center justify-center rounded-md text-[11px] font-medium transition relative"
              style={{
                color: isSelected ? 'var(--todoist-surface)' : !cell.isCurrentMonth ? '#D1D1D1' : isPast ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)',
                backgroundColor: isSelected ? 'var(--todoist-red)' : 'transparent',
                fontWeight: isToday && !isSelected ? 700 : undefined,
              }}
              onMouseEnter={e => { if (!isSelected) (e.target as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
              onMouseLeave={e => { if (!isSelected) (e.target as HTMLElement).style.backgroundColor = 'transparent' }}>
              {cell.day}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--todoist-red)' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Clear date button */}
      {value && onClear && (
        <>
          <div className="border-t mx-3" style={{ borderColor: 'var(--todoist-divider)' }} />
          <button onClick={() => { onClear(); onClose?.() }}
            className="w-full px-3 py-2 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--todoist-sidebar-hover)] transition text-left rounded-b-xl"
            style={{ color: 'var(--todoist-text-secondary)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Tarixi sil
          </button>
        </>
      )}
    </div>
  )
}

function QuickBtn({ icon, label, sub, color, active, onClick }: {
  icon: string; label: string; sub: string; color: string; active: boolean; onClick: () => void
}) {
  const icons: Record<string, React.ReactNode> = {
    today: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><text x="12" y="19" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold" stroke="none">{new Date().getDate()}</text></svg>,
    tomorrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/></svg>,
    weekend: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M5 12H3a2 2 0 00-2 2v5a2 2 0 002 2h18a2 2 0 002-2v-5a2 2 0 00-2-2h-2"/><path d="M17 8a3 3 0 00-3-3H10a3 3 0 00-3 3v4h10V8z"/></svg>,
    nextweek: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>,
    repeat: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  }

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition text-left"
      style={{ backgroundColor: active ? color + '12' : 'transparent' }}
      onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
      onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.backgroundColor = 'transparent' }}>
      <span className="shrink-0">{icons[icon]}</span>
      <span className="text-[11px] font-semibold flex-1" style={{ color: 'var(--todoist-text)' }}>{label}</span>
      <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{sub}</span>
    </button>
  )
}

function toDateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatWeekday(d: Date) {
  const days = ['Bazar', 'B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.']
  return days[d.getDay()]
}

function getNextSaturday(from: Date) {
  const d = new Date(from)
  const day = d.getDay()
  const diff = day === 6 ? 7 : (6 - day)
  d.setDate(d.getDate() + diff)
  return d
}
