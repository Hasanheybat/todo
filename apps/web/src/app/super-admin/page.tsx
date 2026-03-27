'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

const planColors: Record<string, { bg: string; color: string }> = {
  starter: { bg: '#F3F4F6', color: '#6B7280' },
  pro: { bg: '#EEF2FF', color: '#4F46E5' },
  enterprise: { bg: '#FFFBEB', color: '#D97706' },
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getAdminStats().catch(() => null),
      api.getAdminTenants().catch(() => []),
      api.getAdminHealth().catch(() => null),
    ]).then(([s, t, h]) => {
      setStats(s); setTenants(t); setHealth(h)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="animate-pulse space-y-4 py-8"><div className="h-8 w-40 bg-gray-100 rounded" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}</div></div>
  }

  const statCards = [
    { label: 'Toplam İşletmə', value: stats?.tenantCount || 0, icon: '🏢', color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Aktiv / Pasiv', value: `${stats?.activeCount || 0} / ${stats?.passiveCount || 0}`, icon: '✅', color: '#059669', bg: '#ECFDF5' },
    { label: 'Toplam İstifadəçi', value: stats?.userCount || 0, icon: '👥', color: '#D97706', bg: '#FFFBEB' },
    { label: 'Toplam Tapşırıq', value: (stats?.taskCount || 0).toLocaleString(), icon: '📋', color: '#DC2626', bg: '#FEF2F2' },
  ]

  const planDist = stats?.planDistribution || []
  const totalTenants = stats?.tenantCount || 1

  // Health data
  const dbStatus = health?.database?.status === 'online'
  const errorsHour = health?.errors?.lastHour || 0
  const errorsDay = health?.errors?.lastDay || 0
  const memPercent = health?.memory?.percent || 0
  const uptime = health?.uptimeFormatted || '—'
  const dbLatency = health?.database?.latencyMs || 0
  const recentErrors = health?.recentErrors || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold text-gray-800">Dashboard</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Sistem ümumi görünüşü</p>
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px]" style={{ backgroundColor: s.bg }}>{s.icon}</div>
            <div>
              <p className="text-[22px] font-extrabold text-gray-800">{s.value}</p>
              <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monitoring kartları */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[11px] font-bold text-gray-400 uppercase">Sistem</span>
            </div>
            <p className="text-[18px] font-extrabold text-gray-800">{health.status === 'healthy' ? 'Sağlam' : 'Problem'}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Uptime: {uptime}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${dbStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[11px] font-bold text-gray-400 uppercase">Verilənlər Bazası</span>
            </div>
            <p className="text-[18px] font-extrabold text-gray-800">{dbLatency}ms</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{dbStatus ? 'Aktiv' : 'Oflayn'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${memPercent < 80 ? 'bg-green-500' : memPercent < 90 ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-[11px] font-bold text-gray-400 uppercase">Memori</span>
            </div>
            <p className="text-[18px] font-extrabold text-gray-800">{memPercent}%</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{health.memory?.usedMB}MB / {health.memory?.totalMB}MB</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${errorsHour === 0 ? 'bg-green-500' : errorsHour < 5 ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-[11px] font-bold text-gray-400 uppercase">Xətalar</span>
            </div>
            <p className="text-[18px] font-extrabold text-gray-800">{errorsHour}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Son 1 saat ({errorsDay} bu gün)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Son qeydiyyatlar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-gray-800">İşletmələr</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Qeydiyyatdan keçmiş işletmələr</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">{tenants.length} işletmə</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">İşletmə</th>
                <th className="px-3 py-3 text-left">Plan</th>
                <th className="px-3 py-3 text-center">İstifadəçi</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Tarix</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.slice(0, 6).map((t, i) => (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition cursor-pointer" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{t.name?.[0] || '?'}</div>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-700">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.adminEmail || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={planColors[t.plan] || planColors.starter}>{t.plan}</span></td>
                  <td className="px-3 py-3 text-center text-[13px] font-semibold text-gray-600">{t.userCount || t._count?.users || 0}</td>
                  <td className="px-3 py-3 text-[12px] text-gray-400 hidden md:table-cell">{t.createdAt?.split('T')[0]}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${t.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {t.isActive ? 'Aktiv' : 'Pasiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sağ panel */}
        <div className="space-y-6">
          {/* Plan paylanması */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-[14px] font-bold text-gray-800 mb-4">Plan Paylanması</h3>
            <div className="space-y-3">
              {planDist.map((p: any) => (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full w-24 text-center" style={planColors[p.plan] || planColors.starter}>{p.plan}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(p.count / totalTenants) * 100}%`, backgroundColor: (planColors[p.plan] || planColors.starter).color }} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-700 w-6 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Son xətalar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-[14px] font-bold text-gray-800 mb-3">Son Xətalar</h3>
            {recentErrors.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-[12px] text-gray-400">Xəta yoxdur</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentErrors.map((e: any) => (
                  <div key={e.id} className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-600">{e.details?.method} {e.details?.path}</span>
                      <span className="text-[9px] text-red-400">{new Date(e.createdAt).toLocaleTimeString('az')}</span>
                    </div>
                    <p className="text-[11px] text-red-500 mt-0.5 truncate">{e.details?.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
