'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

type FilterType = 'all' | 'login' | 'tenant' | 'permission'

const actionColors: Record<string, { bg: string; color: string; label: string }> = {
  login: { bg: '#ECFDF5', color: '#059669', label: 'Login' },
  login_failed: { bg: '#FEF2F2', color: '#DC2626', label: 'Login xətası' },
  'tenant.create': { bg: '#EEF2FF', color: '#4F46E5', label: 'Yaradıldı' },
  'tenant.update': { bg: '#FFFBEB', color: '#D97706', label: 'Yeniləndi' },
  'tenant.deactivate': { bg: '#FEF2F2', color: '#DC2626', label: 'Deaktiv' },
  'role.create': { bg: '#F0FDF4', color: '#15803D', label: 'Rol yaradıldı' },
  'role.update': { bg: '#FFF7ED', color: '#C2410C', label: 'Rol yeniləndi' },
  'settings.update': { bg: '#F5F3FF', color: '#7C3AED', label: 'Ayar dəyişdi' },
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getAdminLogs().then(data => setLogs(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    const details = l.details || ''
    const userEmail = l.userEmail || ''
    if (search && !details.toLowerCase().includes(search.toLowerCase()) && !userEmail.includes(search)) return false
    if (filter === 'login') return l.action?.includes('login')
    if (filter === 'tenant') return l.action?.includes('tenant') || l.action?.includes('settings')
    if (filter === 'permission') return l.action?.includes('role')
    return true
  })

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Hamısı' },
    { key: 'login', label: 'Login' },
    { key: 'tenant', label: 'Tenant' },
    { key: 'permission', label: 'Yetki' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold text-gray-800">Sistem Logları</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Bütün sistem əməliyyatları</p>
      </div>

      {/* Axtarış + Filtrlər */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Log axtar..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12px] border border-gray-200 bg-white outline-none focus:border-indigo-400 transition" />
        </div>
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log cədvəli */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Tarix</th>
              <th className="px-3 py-3 text-left">İstifadəçi</th>
              <th className="px-3 py-3 text-left">Əməliyyat</th>
              <th className="px-3 py-3 text-left hidden md:table-cell">Detallar</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => {
              const ac = actionColors[log.action] || { bg: '#F3F4F6', color: '#6B7280', label: log.action }
              const dateStr = log.createdAt ? new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 16) : ''
              return (
                <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td className="px-5 py-3">
                    <p className="text-[12px] font-medium text-gray-700">{dateStr.split(' ')[0]}</p>
                    <p className="text-[10px] text-gray-400">{dateStr.split(' ')[1]}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[12px] font-semibold text-gray-600">{log.userEmail}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: ac.bg, color: ac.color }}>{ac.label}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <p className="text-[12px] text-gray-500 max-w-xs truncate">{log.details}</p>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <span className="text-[11px] font-mono text-gray-400">{log.ip}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-[13px]">Log tapılmadı</div>
        )}
      </div>
    </div>
  )
}
