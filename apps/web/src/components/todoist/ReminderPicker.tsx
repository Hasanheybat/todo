'use client'

import { useState, useRef, useEffect } from 'react'

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const AZ_DAYS = ['B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.', 'B.']

interface ReminderPickerProps {
  value: string | null
  onChange: (reminder: string | null) => void
  onClose: () => void
  position?: 'top' | 'bottom'
}

export default function ReminderPicker({ value, onChange, onClose, position = 'bottom' }: ReminderPickerProps) {
  const now = new Date()
  const initialDate = value ? new Date(value) : now
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(value ? toDateStr(new Date(value)) : null)
  const [selectedHour, setSelectedHour] = useState(value ? new Date(value).getHours() : 9)
  const [selectedMinute, setSelectedMinute] = useState(value ? new Date(value).getMinutes() : 0)
  const [showCalendar, setShowCalendar] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const addMinutes = (min: number) => {
    const d = new Date(); d.setMinutes(d.getMinutes() + min)
    onChange(d.toISOString()); onClose()
  }
  const setTomorrowMorning = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); onChange(d.toISOString()); onClose() }
  const setNextMondayMorning = () => {
    const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day
    d.setDate(d.getDate() + diff); d.setHours(9, 0, 0, 0); onChange(d.toISOString()); onClose()
  }

  // Calendar
  const todayStr = toDateStr(now)
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []
  for (let i = startDay - 1; i >= 0; i--) { const d = daysInPrevMonth - i; const m = viewMonth === 0 ? 11 : viewMonth - 1; const y = viewMonth === 0 ? viewYear - 1 : viewYear; cells.push({ day: d, month: m, year: y, isCurrentMonth: false }) }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) { const m = viewMonth === 11 ? 0 : viewMonth + 1; const y = viewMonth === 11 ? viewYear + 1 : viewYear; cells.push({ day: d, month: m, year: y, isCurrentMonth: false }) }
  const rows = cells.length > 35 && cells.slice(35).every(c => !c.isCurrentMonth) ? cells.slice(0, 35) : cells

  const handlePrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } else setViewMonth(viewMonth - 1) }
  const handleNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } else setViewMonth(viewMonth + 1) }

  const handleDateSelect = (cell: typeof cells[0]) => {
    const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  const handleConfirm = () => {
    if (!selectedDate) return
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d, selectedHour, selectedMinute, 0, 0)
    onChange(dt.toISOString()); onClose()
  }

  const posClass = position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

  // Seçilmiş tarixin göstərilməsi
  const selectedDateObj = selectedDate ? (() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  })() : null
  const selectedDateText = selectedDateObj
    ? `${selectedDateObj.getDate()} ${AZ_MONTHS[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
    : null

  return (
    <div ref={ref} className={`absolute ${posClass} left-0 z-30 rounded-xl shadow-2xl`}
      style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', width: 300 }}
      onClick={e => e.stopPropagation()}>

      {/* Header — seçilmiş tarix + saat burda görsənir */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold" style={{ color: '#6366F1' }}>🔔 Xatırlatma</p>
          {value && (
            <button onClick={() => { onChange(null); onClose() }} className="text-[10px] font-medium px-2 py-0.5 rounded-md transition hover:opacity-80" style={{ color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' }}>
              Sil
            </button>
          )}
        </div>

        {/* Seçilmiş tarix + saat göstəricisi */}
        {selectedDate && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <span className="text-[12px] font-semibold" style={{ color: '#6366F1' }}>{selectedDateText}</span>
            <span className="text-[12px] font-bold" style={{ color: '#6366F1' }}>•</span>
            <div className="flex items-center gap-1">
              <select value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))}
                className="px-1 py-0.5 text-[12px] font-bold rounded border-0 outline-none cursor-pointer"
                style={{ backgroundColor: 'transparent', color: '#6366F1' }}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
              </select>
              <span className="text-[13px] font-bold" style={{ color: '#6366F1' }}>:</span>
              <select value={selectedMinute} onChange={e => setSelectedMinute(Number(e.target.value))}
                className="px-1 py-0.5 text-[12px] font-bold rounded border-0 outline-none cursor-pointer"
                style={{ backgroundColor: 'transparent', color: '#6366F1' }}>
                {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
              </select>
            </div>
            <button onClick={handleConfirm} className="ml-auto px-2.5 py-1 text-[10px] font-bold rounded-md transition hover:opacity-85"
              style={{ backgroundColor: '#6366F1', color: '#fff' }}>
              ✓
            </button>
          </div>
        )}
      </div>

      <div className="border-t mx-3" style={{ borderColor: 'var(--todoist-divider)' }} />

      {/* Sürətli butonlar */}
      <div className="px-2 py-1.5 space-y-0.5">
        <QuickBtn icon="clock" label="30 dəqiqə sonra" sub={formatTime(addMin(now, 30))} color="#6366F1" onClick={() => addMinutes(30)} />
        <QuickBtn icon="clock" label="1 saat sonra" sub={formatTime(addMin(now, 60))} color="#6366F1" onClick={() => addMinutes(60)} />
        <QuickBtn icon="clock" label="3 saat sonra" sub={formatTime(addMin(now, 180))} color="#6366F1" onClick={() => addMinutes(180)} />
        <QuickBtn icon="sun" label="Sabah 09:00" sub="09:00" color="#EB8909" onClick={setTomorrowMorning} />
        <QuickBtn icon="calendar" label="Gələn B.e 09:00" sub="09:00" color="#246FE0" onClick={setNextMondayMorning} />
      </div>

      <div className="border-t mx-3" style={{ borderColor: 'var(--todoist-divider)' }} />

      {/* Özel tarix seç butonu / təqvim */}
      <div className="px-2 py-1.5">
        <button onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 transition text-left"
          style={{ backgroundColor: showCalendar ? 'var(--todoist-sidebar-hover)' : 'transparent' }}
          onMouseEnter={e => { if (!showCalendar) e.currentTarget.style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
          onMouseLeave={e => { if (!showCalendar) e.currentTarget.style.backgroundColor = 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--todoist-text)' }}>Özel tarix seç</span>
          <svg className={`w-3 h-3 ml-auto transition ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="var(--todoist-text-tertiary)" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
        </button>

        {showCalendar && (
          <div className="mt-1">
            {/* Ay naviqasiya */}
            <div className="flex items-center justify-between px-2 py-1">
              <button onClick={handlePrev} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--todoist-sidebar-hover)] transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-[11px] font-bold" style={{ color: 'var(--todoist-text)' }}>{AZ_MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={handleNext} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--todoist-sidebar-hover)] transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            {/* Həftə günləri */}
            <div className="grid grid-cols-7 px-2">
              {AZ_DAYS.map(d => (
                <div key={d} className="text-center text-[9px] font-bold py-0.5" style={{ color: 'var(--todoist-text-tertiary)' }}>{d}</div>
              ))}
            </div>

            {/* Təqvim */}
            <div className="grid grid-cols-7 px-2 pb-2">
              {rows.map((cell, i) => {
                const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                const isToday = cellStr === todayStr
                const isSelected = cellStr === selectedDate

                return (
                  <button key={i} onClick={() => handleDateSelect(cell)}
                    className="w-full aspect-square flex items-center justify-center rounded-md text-[10px] font-medium transition relative"
                    style={{
                      color: isSelected ? '#fff' : !cell.isCurrentMonth ? '#D1D1D1' : 'var(--todoist-text)',
                      backgroundColor: isSelected ? '#6366F1' : 'transparent',
                      fontWeight: isToday && !isSelected ? 700 : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.target as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
                    onMouseLeave={e => { if (!isSelected) (e.target as HTMLElement).style.backgroundColor = 'transparent' }}>
                    {cell.day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: '#6366F1' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickBtn({ icon, label, sub, color, onClick }: { icon: string; label: string; sub: string; color: string; onClick: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    sun: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  }
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition text-left"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--todoist-sidebar-hover)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      <span className="shrink-0">{icons[icon]}</span>
      <span className="text-[11px] font-semibold flex-1" style={{ color: 'var(--todoist-text)' }}>{label}</span>
      <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{sub}</span>
    </button>
  )
}

function toDateStr(d: Date) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function addMin(d: Date, min: number) { const r = new Date(d); r.setMinutes(r.getMinutes() + min); return r }
function formatTime(d: Date) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
