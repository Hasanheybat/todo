'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import PageGuard from '@/components/PageGuard'
import ThemeDatePicker from '@/components/ThemeDatePicker'

type TabType = 'ALL' | 'EMPLOYEES'

// ═══ Tarix helper-ləri ═══
function getToday() { const d = new Date(); return d.toISOString().split('T')[0] }
function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] }
function getMonthRange(offset: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}
function getYearRange(offset: number) {
  const y = new Date().getFullYear() + offset
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

// ═══ Sütun Filtr Dropdown ═══
function ColumnFilter({ label, values, selected, onApply, color }: {
  label: string; values: string[]; selected: string[]; onApply: (v: string[]) => void; color?: string
}) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<string[]>(selected)
  const ref = useRef<HTMLDivElement>(null)
  const hasFilter = selected.length > 0

  useEffect(() => { setLocal(selected) }, [selected])
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(v: string) { setLocal(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]) }

  return (
    <div className="relative inline-flex items-center gap-1" ref={ref}>
      <span style={{ color: color || 'var(--todoist-text-tertiary)' }}>{label}</span>
      <button onClick={() => setOpen(!open)} className="p-0.5 rounded transition" style={{ color: hasFilter ? 'var(--todoist-red)' : 'var(--todoist-text-tertiary)' }}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg py-2 z-50 max-h-52 overflow-y-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          {values.length === 0 ? (
            <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Məlumat yoxdur</p>
          ) : values.map(v => (
            <label key={v} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[12px] transition hover:opacity-80" style={{ color: 'var(--todoist-text)' }}>
              <input type="checkbox" checked={local.includes(v)} onChange={() => toggle(v)} className="rounded" />
              {v}
            </label>
          ))}
          <div className="flex gap-1.5 px-3 pt-2 mt-1" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
            <button onClick={() => { onApply(local); setOpen(false) }} className="flex-1 rounded px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Tamam</button>
            <button onClick={() => { onApply([]); setLocal([]); setOpen(false) }} className="flex-1 rounded px-2 py-1 text-[10px] font-semibold" style={{ color: 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-divider)' }}>Sıfırla</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancePage() {
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('ALL')
  const [users, setUsers] = useState<any[]>([])

  // Tarix filtri
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [datePreset, setDatePreset] = useState('')

  // Sütun filtrləri — kassa
  const [filterCats, setFilterCats] = useState<string[]>([])
  const [filterDebits, setFilterDebits] = useState<string[]>([])
  const [filterCredits, setFilterCredits] = useState<string[]>([])

  // Sütun filtrləri — işçi ledger
  const [filterLedgerUsers, setFilterLedgerUsers] = useState<string[]>([])
  const [filterLedgerCats, setFilterLedgerCats] = useState<string[]>([])

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txType, setTxType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [catPopup, setCatPopup] = useState(false)
  const [addBalanceModal, setAddBalanceModal] = useState(false)
  const [payModal, setPayModal] = useState<any>(null)
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState(getToday())
  const [addDropdown, setAddDropdown] = useState(false)
  const [editModal, setEditModal] = useState<any>(null)
  const [editData, setEditData] = useState({ amount: '', description: '', date: '', categoryId: '' })

  // Forms
  const [newTx, setNewTx] = useState({ amount: '', description: '', date: getToday(), categoryId: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#6366f1' })
  const [catSearch, setCatSearch] = useState('')
  const [newBalance, setNewBalance] = useState({ userId: '', amount: '', category: 'BONUS', description: '' })
  const [saving, setSaving] = useState(false)

  const inputStyle = { backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t, c, l, b] = await Promise.all([
        api.getFinanceSummary(), api.getTransactions(), api.getCategories(),
        api.getEmployeeLedger(), api.getEmployeeBalances(),
      ])
      setSummary(s); setTransactions(t); setCategories(c); setLedger(l); setBalances(b)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ═══ Filtrlənmiş data ═══
  const filtered = transactions.filter(t => {
    // Tarix filtri
    if (dateStart && new Date(t.date) < new Date(dateStart)) return false
    if (dateEnd && new Date(t.date) > new Date(dateEnd + 'T23:59:59')) return false
    // Kateqoriya filtri
    if (filterCats.length > 0 && !filterCats.includes(t.category?.name || '—')) return false
    // Debit filtri
    if (filterDebits.length > 0 && (t.type !== 'DEBIT' || !filterDebits.includes(String(t.amount)))) return false
    // Kredit filtri
    if (filterCredits.length > 0 && (t.type !== 'CREDIT' || !filterCredits.includes(String(t.amount)))) return false
    return true
  })

  const filteredLedger = ledger.filter(e => {
    if (dateStart && new Date(e.createdAt) < new Date(dateStart)) return false
    if (dateEnd && new Date(e.createdAt) > new Date(dateEnd + 'T23:59:59')) return false
    if (filterLedgerUsers.length > 0 && !filterLedgerUsers.includes(e.user.fullName)) return false
    if (filterLedgerCats.length > 0 && !filterLedgerCats.includes(e.category)) return false
    return true
  })

  // Unikal dəyərlər
  const uniqueCatNames = [...new Set(transactions.map(t => t.category?.name || '—'))]
  const uniqueDebits = [...new Set(transactions.filter(t => t.type === 'DEBIT').map(t => String(t.amount)))]
  const uniqueCredits = [...new Set(transactions.filter(t => t.type === 'CREDIT').map(t => String(t.amount)))]
  const uniqueLedgerUsers = [...new Set(ledger.map(e => e.user.fullName))]
  const uniqueLedgerCats = [...new Set(ledger.map(e => e.category))]

  // ═══ Tarix preset ═══
  function applyDatePreset(preset: string) {
    setDatePreset(preset)
    if (preset === 'today') { setDateStart(getToday()); setDateEnd(getToday()) }
    else if (preset === 'yesterday') { setDateStart(getYesterday()); setDateEnd(getYesterday()) }
    else if (preset === 'thisMonth') { const r = getMonthRange(0); setDateStart(r.start); setDateEnd(r.end) }
    else if (preset === 'lastMonth') { const r = getMonthRange(-1); setDateStart(r.start); setDateEnd(r.end) }
    else if (preset === 'thisYear') { const r = getYearRange(0); setDateStart(r.start); setDateEnd(r.end) }
    else if (preset === 'lastYear') { const r = getYearRange(-1); setDateStart(r.start); setDateEnd(r.end) }
    else { setDateStart(''); setDateEnd('') }
  }

  // ═══ CRUD funksiyalar ═══
  async function handleCreateTx(e: React.FormEvent) {
    e.preventDefault()
    if (!newTx.amount || !newTx.date) return
    setSaving(true)
    try {
      await api.createTransaction({ amount: parseFloat(newTx.amount), type: txType, description: newTx.description, date: newTx.date, categoryId: newTx.categoryId || undefined })
      setTxModalOpen(false); setNewTx({ amount: '', description: '', date: getToday(), categoryId: '' }); await loadData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleCreateCat(e: React.FormEvent) {
    e.preventDefault()
    if (!newCat.name) return
    try { await api.createCategory({ name: newCat.name, color: newCat.color }); setNewCat({ name: '', color: '#6366f1' }); setCategories(await api.getCategories()) } catch {}
  }

  async function handleDeleteCat(id: string) { try { await api.deleteCategory(id); setCategories(await api.getCategories()) } catch {} }

  async function handleCalculate() {
    setSaving(true)
    try { const res: any = await api.calculateSalaries(); alert(res.message || 'Hesablandı'); await loadData() }
    catch (err: any) { alert(err.message || 'Xəta') }
    finally { setSaving(false) }
  }

  async function handlePay() {
    if (!payModal) return; setSaving(true)
    try { await api.paySalary(payModal.id); setPayModal(null); await loadData() }
    catch (err: any) { alert(err.message || 'Xəta') }
    finally { setSaving(false) }
  }

  async function handleAddBalance(e: React.FormEvent) {
    e.preventDefault()
    if (!newBalance.userId || !newBalance.amount) return; setSaving(true)
    try {
      await api.addEmployeeBalance({ userId: newBalance.userId, amount: parseFloat(newBalance.amount), category: newBalance.category, description: newBalance.description || undefined })
      setAddBalanceModal(false); setNewBalance({ userId: '', amount: '', category: 'BONUS', description: '' }); await loadData()
    } catch (err: any) { alert(err.message || 'Xəta') }
    finally { setSaving(false) }
  }

  async function handleEditTx(e: React.FormEvent) {
    e.preventDefault(); if (!editModal) return; setSaving(true)
    try {
      await api.updateTransaction(editModal.id, { amount: parseFloat(editData.amount), description: editData.description, date: editData.date, categoryId: editData.categoryId || undefined })
      setEditModal(null); await loadData()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function ensureUsers() { if (users.length === 0) try { setUsers(await api.getUsers()) } catch {} }

  function openTxModal(type: 'DEBIT' | 'CREDIT') { setTxType(type); setNewTx({ amount: '', description: '', date: getToday(), categoryId: '' }); setTxModalOpen(true); setAddDropdown(false) }

  function openEditModal(tx: any) { setEditModal(tx); setEditData({ amount: String(tx.amount), description: tx.description || '', date: new Date(tx.date).toISOString().split('T')[0], categoryId: tx.categoryId || '' }) }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-7 w-7" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  )

  const tabs: { key: TabType; label: string }[] = [{ key: 'ALL', label: 'Hamısı' }, { key: 'EMPLOYEES', label: 'İşçi Hesabları' }]
  const unpaidCount = balances.filter(b => b.balance > 0).length
  const datePresets = [
    { key: 'today', label: 'Bu gün' }, { key: 'yesterday', label: 'Dünən' },
    { key: 'thisMonth', label: 'Cari ay' }, { key: 'lastMonth', label: 'Keçən ay' },
    { key: 'thisYear', label: 'Cari il' }, { key: 'lastYear', label: 'Keçən il' },
  ]

  return (
    <PageGuard requires={['finance.read']}>
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Maliyyə</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--todoist-text-tertiary)' }}>Kassa debit/kredit və işçi hesabları</p>
        </div>
        <div className="relative">
          <button onClick={() => setAddDropdown(!addDropdown)} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: 'var(--todoist-red)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Əlavə et <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {addDropdown && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg py-1 z-50" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              <button onClick={() => openTxModal('DEBIT')} className="w-full px-4 py-2.5 text-left text-[13px] font-medium flex items-center gap-2" style={{ color: '#10B981' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>Debit (pul gəldi)
              </button>
              <button onClick={() => openTxModal('CREDIT')} className="w-full px-4 py-2.5 text-left text-[13px] font-medium flex items-center gap-2" style={{ color: '#EF4444' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>Kredit (pul çıxdı)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat kartları — filtrlənmiş datadan hesablanır */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(() => {
          const hasDateFilter = dateStart || dateEnd
          const fDebit = filtered.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)
          const fCredit = filtered.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
          const fBalance = fDebit - fCredit
          const items = [
            { label: hasDateFilter ? 'Seçilmiş bakiyə' : 'Bakiyə', value: hasDateFilter ? fBalance : (summary?.balance || 0), color: (hasDateFilter ? fBalance : (summary?.balance || 0)) >= 0 ? '#3B82F6' : '#F59E0B' },
            { label: hasDateFilter ? 'Seçilmiş debit' : 'Debit', value: hasDateFilter ? fDebit : (summary?.totalDebit || 0), color: '#10B981' },
            { label: hasDateFilter ? 'Seçilmiş kredit' : 'Kredit', value: hasDateFilter ? fCredit : (summary?.totalCredit || 0), color: '#EF4444' },
            { label: 'İşçi borcu', value: ledger.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0) - ledger.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0), color: '#F59E0B' },
          ]
          return items.map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value.toLocaleString('az-AZ')} ₼</p>
            </div>
          ))
        })()}
      </div>

      {/* Tarix filtri + Kateqoriyalar butonu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="flex flex-wrap gap-1.5">
          {datePresets.map(p => (
            <button key={p.key} onClick={() => applyDatePreset(datePreset === p.key ? '' : p.key)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition"
              style={{ backgroundColor: datePreset === p.key ? 'var(--todoist-red)' : 'transparent', color: datePreset === p.key ? '#fff' : 'var(--todoist-text-secondary)', border: `1px solid ${datePreset === p.key ? 'var(--todoist-red)' : 'var(--todoist-divider)'}` }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeDatePicker value={dateStart} onChange={v => { setDateStart(v); setDatePreset('') }} placeholder="Başlanğıc" />
          <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text-tertiary)' }}>→</span>
          <ThemeDatePicker value={dateEnd} onChange={v => { setDateEnd(v); setDatePreset('') }} placeholder="Son" />
        </div>
        <button onClick={() => setCatPopup(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ml-auto"
          style={{ border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Kateqoriyalar
        </button>
      </div>

      {/* Tablar */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--todoist-divider)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-2.5 text-[13px] font-semibold transition relative"
            style={{ color: tab === t.key ? 'var(--todoist-red)' : 'var(--todoist-text-tertiary)', borderBottom: tab === t.key ? '2px solid var(--todoist-red)' : '2px solid transparent' }}>
            {t.label}
            {t.key === 'EMPLOYEES' && unpaidCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>{unpaidCount}</span>}
          </button>
        ))}
      </div>

      {/* ═══ KASSA CƏDVƏLİ ═══ */}
      {tab === 'ALL' && (
        <div className="rounded-xl overflow-visible" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--todoist-bg)', borderBottom: '1px solid var(--todoist-divider)' }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)', width: '90px' }}>Tarix</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ width: '100px' }}>
                  <ColumnFilter label="KATEQORİYA" values={uniqueCatNames} selected={filterCats} onApply={setFilterCats} />
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase" style={{ width: '100px' }}>
                  <div className="flex justify-end"><ColumnFilter label="DEBİT" values={uniqueDebits} selected={filterDebits} onApply={setFilterDebits} color="#10B981" /></div>
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase" style={{ width: '100px' }}>
                  <div className="flex justify-end"><ColumnFilter label="KREDİT" values={uniqueCredits} selected={filterCredits} onApply={setFilterCredits} color="#EF4444" /></div>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Açıqlama</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center" style={{ color: 'var(--todoist-text-tertiary)' }}>Əməliyyat tapılmadı</td></tr>
              ) : filtered.map(tx => (
                <tr key={tx.id} className="group transition" style={{ borderBottom: '1px solid var(--todoist-divider)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--todoist-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: 'var(--todoist-text-tertiary)' }}>{new Date(tx.date).toLocaleDateString('az')}</td>
                  <td className="px-4 py-3">
                    {tx.category ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: tx.category.color + '20', color: tx.category.color }}>{tx.category.name}</span> : <span style={{ color: 'var(--todoist-text-tertiary)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: '#10B981' }}>{tx.type === 'DEBIT' ? `${tx.amount.toLocaleString('az-AZ')} ₼` : ''}</td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: '#EF4444' }}>{tx.type === 'CREDIT' ? `${tx.amount.toLocaleString('az-AZ')} ₼` : ''}</td>
                  <td className="px-4 py-3">
                    <p className="text-[12px]" style={{ color: 'var(--todoist-text)' }}>{tx.description || ''}</p>
                    {tx.employee && <p className="text-[10px] mt-0.5" style={{ color: 'var(--todoist-text-tertiary)' }}>{tx.employee.fullName}</p>}
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => openEditModal(tx)} className="p-1 rounded transition opacity-0 group-hover:opacity-100" style={{ color: 'var(--todoist-text-tertiary)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ İŞÇİ HESABLARI ═══ */}
      {tab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={handleCalculate} disabled={saving} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#3B82F6' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Maaşları Hesabla
            </button>
            <button onClick={async () => { await ensureUsers(); setAddBalanceModal(true) }} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition" style={{ border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Bakiyə əlavə et
            </button>
          </div>

          <div className="rounded-xl overflow-visible" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ backgroundColor: 'var(--todoist-bg)', borderBottom: '1px solid var(--todoist-divider)' }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)', width: '90px' }}>Tarix</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ width: '140px' }}>
                    <ColumnFilter label="İŞÇİ" values={uniqueLedgerUsers} selected={filterLedgerUsers} onApply={setFilterLedgerUsers} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ width: '70px' }}>
                    <ColumnFilter label="KAT." values={uniqueLedgerCats} selected={filterLedgerCats} onApply={setFilterLedgerCats} />
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase" style={{ color: '#10B981', width: '80px' }}>Debit</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase" style={{ color: '#EF4444', width: '80px' }}>Kredit</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Açıqlama</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)', width: '70px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--todoist-text-tertiary)' }}>
                    <p className="text-[14px] font-medium">Hərəkət yoxdur</p>
                    <p className="text-[12px] mt-1">"Maaşları Hesabla" ilə başlayın</p>
                  </td></tr>
                ) : filteredLedger.map(e => {
                  const isPaid = e.type === 'DEBIT' && e.category === 'MAAS' && ledger.some(
                    c => c.type === 'CREDIT' && c.userBusinessId === e.userBusinessId && c.month === e.month && c.year === e.year && c.category === 'MAAS'
                  )
                  return (
                    <tr key={e.id} className="transition" style={{ borderBottom: '1px solid var(--todoist-divider)' }}
                      onMouseEnter={el => (el.currentTarget.style.backgroundColor = 'var(--todoist-bg)')}
                      onMouseLeave={el => (el.currentTarget.style.backgroundColor = 'transparent')}>
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: 'var(--todoist-text-tertiary)' }}>{new Date(e.createdAt).toLocaleDateString('az')}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--todoist-text)' }}>{e.user.fullName}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ backgroundColor: e.category === 'MAAS' ? 'rgba(239,68,68,0.1)' : e.category === 'BONUS' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)', color: e.category === 'MAAS' ? '#EF4444' : e.category === 'BONUS' ? '#3B82F6' : '#6B7280' }}>{e.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: '#10B981' }}>{e.type === 'DEBIT' ? `${e.amount.toLocaleString('az-AZ')} ₼` : ''}</td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: '#EF4444' }}>{e.type === 'CREDIT' ? `${e.amount.toLocaleString('az-AZ')} ₼` : ''}</td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--todoist-text-secondary)' }}>{e.description || ''}</td>
                      <td className="px-4 py-3 text-center">
                        {e.type === 'DEBIT' && e.category === 'MAAS' && !isPaid && (
                          <button onClick={() => { setPayModal(e); setPayNote(''); setPayDate(getToday()) }} className="text-[10px] font-semibold px-2.5 py-1 rounded text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Ödə</button>
                        )}
                        {e.type === 'DEBIT' && e.category === 'MAAS' && isPaid && (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Ödənilib</span>
                        )}
                        {e.type === 'CREDIT' && <span className="text-[10px] font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Ödəmə</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Debit/Kredit Modal ═══ */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setTxModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-5" style={{ color: txType === 'DEBIT' ? '#10B981' : '#EF4444' }}>{txType === 'DEBIT' ? 'Debit (pul gəldi)' : 'Kredit (pul çıxdı)'}</h3>
            <form onSubmit={handleCreateTx} className="space-y-4">
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Məbləğ (₼)</label>
                <input type="number" step="0.01" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} placeholder="0.00" className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Açıqlama</label>
                <input type="text" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} placeholder="Açıqlama" className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Tarix</label>
                  <ThemeDatePicker value={newTx.date} onChange={v => setNewTx({ ...newTx, date: v })} placeholder="Tarix seçin" /></div>
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Kateqoriya</label>
                  <select value={newTx.categoryId} onChange={e => setNewTx({ ...newTx, categoryId: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle}>
                    <option value="">Seçin...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTxModalOpen(false)} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50" style={{ backgroundColor: txType === 'DEBIT' ? '#10B981' : '#EF4444' }}>{saving ? 'Saxlanılır...' : 'Əlavə et'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Kateqoriyalar Popup ═══ */}
      {catPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setCatPopup(false)}>
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>Kateqoriyalar</h3>
              <button onClick={() => setCatPopup(false)} style={{ color: 'var(--todoist-text-tertiary)' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <input type="text" value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Axtar..." className="w-full rounded-lg py-2 px-3 text-[13px] outline-none transition mb-3" style={inputStyle} />
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              {categories.filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg transition" onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--todoist-bg)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} /><span className="text-[13px] font-medium" style={{ color: 'var(--todoist-text)' }}>{c.name}</span><span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>({c._count?.transactions || 0})</span></div>
                  <button onClick={() => handleDeleteCat(c.id)} className="p-1 rounded transition" style={{ color: 'var(--todoist-text-tertiary)' }}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
            </div>
            <form onSubmit={handleCreateCat} className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
              <input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="Yeni kateqoriya" className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              <input type="color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
              <button type="submit" className="rounded-lg px-3 py-2 text-[12px] font-semibold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>Əlavə et</button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Bakiyə Əlavə Modal ═══ */}
      {addBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setAddBalanceModal(false)}>
          <div className="w-full max-w-sm rounded-xl p-6 shadow-2xl mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-4" style={{ color: 'var(--todoist-text)' }}>Bakiyə Əlavə Et</h3>
            <form onSubmit={handleAddBalance} className="space-y-4">
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>İşçi</label>
                <select value={newBalance.userId} onChange={e => setNewBalance({ ...newBalance, userId: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle}>
                  <option value="">Seçin...</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Məbləğ (₼)</label>
                  <input type="number" step="0.01" value={newBalance.amount} onChange={e => setNewBalance({ ...newBalance, amount: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Kateqoriya</label>
                  <select value={newBalance.category} onChange={e => setNewBalance({ ...newBalance, category: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle}>
                    <option value="BONUS">Bonus</option><option value="AVANS">Avans</option><option value="DIGER">Digər</option></select></div>
              </div>
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Açıqlama</label>
                <input type="text" value={newBalance.description} onChange={e => setNewBalance({ ...newBalance, description: e.target.value })} placeholder="Opsional" className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddBalanceModal(false)} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50" style={{ backgroundColor: '#3B82F6' }}>{saving ? 'Əlavə edilir...' : 'Əlavə et'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Maaş Ödəmə Modal ═══ */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setPayModal(null)}>
          <div className="w-full max-w-sm rounded-xl p-6 shadow-2xl mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-4" style={{ color: 'var(--todoist-text)' }}>Maaş Ödə</h3>
            <div className="space-y-4 mb-5">
              <div className="flex justify-between text-[13px]"><span style={{ color: 'var(--todoist-text-secondary)' }}>İşçi</span><span className="font-semibold" style={{ color: 'var(--todoist-text)' }}>{payModal.user?.fullName}</span></div>
              <div className="flex justify-between text-[14px] pt-2" style={{ borderTop: '1px solid var(--todoist-divider)' }}><span className="font-bold" style={{ color: 'var(--todoist-text)' }}>Məbləğ</span><span className="font-bold" style={{ color: '#EF4444' }}>{payModal.amount?.toLocaleString('az-AZ')} ₼</span></div>
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Ödəmə tarixi</label>
                <ThemeDatePicker value={payDate} onChange={v => setPayDate(v)} placeholder="Tarix seçin" /></div>
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Açıqlama (opsional)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder={payModal.description || ''} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
              <button onClick={handlePay} disabled={saving} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50" style={{ backgroundColor: 'var(--todoist-red)' }}>{saving ? 'Ödənilir...' : 'Ödə'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Düzənlə Modal ═══ */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setEditModal(null)}>
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl mx-4" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-5" style={{ color: 'var(--todoist-text)' }}>Əməliyyatı Düzənlə</h3>
            <form onSubmit={handleEditTx} className="space-y-4">
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Məbləğ (₼)</label>
                <input type="number" step="0.01" value={editData.amount} onChange={e => setEditData({ ...editData, amount: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
              <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Açıqlama</label>
                <input type="text" value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Tarix</label>
                  <ThemeDatePicker value={editData.date} onChange={v => setEditData({ ...editData, date: v })} placeholder="Tarix seçin" /></div>
                <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Kateqoriya</label>
                  <select value={editData.categoryId} onChange={e => setEditData({ ...editData, categoryId: e.target.value })} className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition" style={inputStyle}>
                    <option value="">Seçin...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditModal(null)} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>Ləğv et</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50" style={{ backgroundColor: 'var(--todoist-red)' }}>{saving ? 'Saxlanılır...' : 'Yadda saxla'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageGuard>
  )
}
