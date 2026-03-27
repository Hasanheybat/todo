'use client'

import { useState, useEffect, useRef } from 'react'

const MONTHS_AZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const DAYS_AZ = ['Bz', 'Be', 'Ça', 'Çə', 'Ca', 'Cü', 'Şə']

interface Props {
  value: string            // "YYYY-MM-DD"
  onChange: (v: string) => void
  placeholder?: string
}

export default function ThemeDatePicker({ value, onChange, placeholder = 'Tarix seçin' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() || today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  // Təqvim grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const startIdx = firstDay === 0 ? 6 : firstDay - 1 // Monday-based
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startIdx; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (d: number) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
  const isSelected = (d: number) => parsed && d === parsed.getDate() && viewMonth === parsed.getMonth() && viewYear === parsed.getFullYear()

  const displayValue = parsed ? `${parsed.getDate()} ${MONTHS_AZ[parsed.getMonth()].slice(0, 3)} ${parsed.getFullYear()}` : ''

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition outline-none cursor-pointer"
        style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', color: value ? 'var(--todoist-text)' : 'var(--todoist-text-tertiary)', minWidth: 110 }}>
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--todoist-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {displayValue || placeholder}
        {value && (
          <span onClick={e => { e.stopPropagation(); onChange('') }} className="ml-auto p-0.5 rounded transition hover:opacity-70" style={{ color: 'var(--todoist-text-tertiary)' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[260px] rounded-xl shadow-xl p-3 z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          {/* Header — ay/il naviqasiyası */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: 'var(--todoist-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>{MONTHS_AZ[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: 'var(--todoist-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Gün başlıqları */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAYS_AZ.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--todoist-text-tertiary)' }}>{d}</div>
            ))}
          </div>

          {/* Günlər */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button type="button" onClick={() => selectDay(day)}
                    className="w-8 h-8 rounded-lg text-[12px] font-medium transition flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected(day) ? 'var(--todoist-red)' : 'transparent',
                      color: isSelected(day) ? '#fff' : isToday(day) ? 'var(--todoist-red)' : 'var(--todoist-text)',
                      fontWeight: isToday(day) || isSelected(day) ? 700 : 500,
                      border: isToday(day) && !isSelected(day) ? '1.5px solid var(--todoist-red)' : '1.5px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected(day)) e.currentTarget.style.backgroundColor = 'var(--todoist-bg)' }}
                    onMouseLeave={e => { if (!isSelected(day)) e.currentTarget.style.backgroundColor = 'transparent' }}>
                    {day}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>

          {/* Bu gün butonu */}
          <div className="mt-2 pt-2 flex justify-center" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
            <button type="button" onClick={() => { const t = new Date(); selectDay(t.getDate()); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()) }}
              className="text-[11px] font-semibold px-3 py-1 rounded-lg transition" style={{ color: 'var(--todoist-red)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--todoist-bg)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              Bu gün
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
