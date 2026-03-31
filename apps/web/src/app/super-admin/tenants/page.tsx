'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from '@/lib/permissions'

const PERM_GROUPS = PERMISSION_GROUPS
const ALL_PERM_LIST = ALL_PERMISSIONS

type FilterType = 'all' | 'active' | 'passive' | 'Free' | 'Pro' | 'Enterprise'

const planColors: Record<string, { bg: string; color: string }> = {
  Free: { bg: '#F3F4F6', color: '#6B7280' },
  Pro: { bg: '#EEF2FF', color: '#4F46E5' },
  Enterprise: { bg: '#FFFBEB', color: '#D97706' },
}

export default function TenantsPage() {
  const [allTenants, setAllTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null)
  const [createModal, setCreateModal] = useState(false)

  const loadTenants = useCallback(async () => {
    try {
      const data = await api.getAdminTenants()
      setAllTenants(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTenants() }, [loadTenants])

  const handleToggleStatus = async (id: string) => {
    try {
      await api.toggleTenantStatus(id)
      loadTenants()
      setSelectedTenant(null)
    } catch {}
  }

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Bu işletməni silmək istədiyinizdən əminsiniz?')) return
    try {
      await api.deleteAdminTenant(id)
      loadTenants()
      setSelectedTenant(null)
    } catch {}
  }

  const filtered = allTenants.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'active') return t.isActive === true
    if (filter === 'passive') return t.isActive === false
    if (filter === 'Free' || filter === 'Pro' || filter === 'Enterprise') return t.plan === filter.toLowerCase()
    return true
  })

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Hamısı', count: allTenants.length },
    { key: 'active', label: 'Aktiv', count: allTenants.filter(t => t.isActive).length },
    { key: 'passive', label: 'Pasiv', count: allTenants.filter(t => !t.isActive).length },
    { key: 'Free', label: 'Free' },
    { key: 'Pro', label: 'Pro' },
    { key: 'Enterprise', label: 'Enterprise' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-800">İşletmələr</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Bütün tenant-ləri idarə edin</p>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Yeni İşletmə
        </button>
      </div>

      {/* Axtarış + Filtrlər */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="İşletmə axtar..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12px] border border-gray-200 bg-white outline-none focus:border-indigo-400 transition" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filter === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {f.label} {f.count !== undefined && <span className="ml-1 opacity-70">{f.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Cədvəl */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3 text-left">İşletmə</th>
              <th className="px-3 py-3 text-left">Plan</th>
              <th className="px-3 py-3 text-center">İstifadəçi</th>
              <th className="px-3 py-3 text-center hidden md:table-cell">Filial</th>
              <th className="px-3 py-3 text-center hidden lg:table-cell">Tapşırıq</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className="border-t border-gray-50 hover:bg-indigo-50/30 transition cursor-pointer" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFBFC' }}
                onClick={() => setSelectedTenant(t)}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{t.name[0]}{t.name.split(' ')[1]?.[0] || ''}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-700">{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.adminEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={planColors[t.plan]}>{t.plan}</span>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span className="text-[13px] font-semibold text-gray-600">{t.userCount || 0}</span>
                  <span className="text-[10px] text-gray-400">/{t.settings?.maxUsers || 20}</span>
                </td>
                <td className="px-3 py-3.5 text-center hidden md:table-cell text-[13px] font-semibold text-gray-600">{t.branchCount || 0}</td>
                <td className="px-3 py-3.5 text-center hidden lg:table-cell text-[13px] font-semibold text-gray-600">{t.taskCount || 0}</td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${t.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {t.isActive ? 'Aktiv' : 'Pasiv'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelectedTenant(t)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition" title="Detay">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition" title="Sil">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-[13px]">Nəticə tapılmadı</div>
        )}
      </div>

      {/* Detay Modal */}
      {selectedTenant && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedTenant(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{selectedTenant.name[0]}</div>
                  <div>
                    <h2 className="text-[18px] font-bold text-gray-800">{selectedTenant.name}</h2>
                    <p className="text-[11px] text-gray-400">{selectedTenant.admin}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-gray-600 transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Status + Plan */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Status</label>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${selectedTenant.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[13px] font-semibold text-gray-700">{selectedTenant.isActive ? 'Aktiv' : 'Pasiv'}</span>
                      <button onClick={() => handleToggleStatus(selectedTenant.id)} className={`ml-auto px-3 py-1 rounded-lg text-[10px] font-bold transition ${selectedTenant.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {selectedTenant.isActive ? 'Pasiv et' : 'Aktiv et'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Plan</label>
                    <select className="w-full px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" defaultValue={selectedTenant.plan}>
                      <option value="Free">Free</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Limitlər */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-2 block">Limitlər</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[18px] font-extrabold text-gray-700">{selectedTenant.userCount || 0}<span className="text-[12px] text-gray-400 font-normal">/{selectedTenant.settings?.maxUsers || 20}</span></p>
                      <p className="text-[10px] text-gray-400 mt-0.5">İstifadəçi</p>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(selectedTenant.userCount || 0 / selectedTenant.settings?.maxUsers || 20) * 100}%` }} />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[18px] font-extrabold text-gray-700">{selectedTenant.branchCount || 0}<span className="text-[12px] text-gray-400 font-normal">/{selectedTenant.settings?.maxBranches || 2}</span></p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Filial</p>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${(selectedTenant.branchCount || 0 / selectedTenant.settings?.maxBranches || 2) * 100}%` }} />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[18px] font-extrabold text-gray-700">{selectedTenant.businesses?.reduce((s: number, b: any) => s + (b.departments?.length || 0), 0) || 0}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Şöbə</p>
                    </div>
                  </div>
                </div>

                {/* Yetkiler */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-gray-500">İcazə verilən yetkiler ({(selectedTenant._permissions || selectedTenant.allowedPermissions || []).length}/{ALL_PERM_LIST.length})</label>
                    <button onClick={() => {
                      const current = selectedTenant._permissions || selectedTenant.allowedPermissions || []
                      const allSelected = current.length === ALL_PERM_LIST.length
                      setSelectedTenant({ ...selectedTenant, _permissions: allSelected ? [] : [...ALL_PERM_LIST] })
                    }} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: '#4F46E5', backgroundColor: '#EEF2FF' }}>
                      {(selectedTenant._permissions || selectedTenant.allowedPermissions || []).length === ALL_PERM_LIST.length ? 'Hamısını sil' : 'Hamısını seç'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PERM_GROUPS.map(g => (
                      <div key={g.key} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] font-bold text-gray-600 mb-1.5">{g.icon} {g.label}</p>
                        <div className="space-y-1">
                          {g.permissions.map(p => {
                            const perms = selectedTenant._permissions || selectedTenant.allowedPermissions || []
                            const checked = perms.includes(p.key)
                            return (
                              <label key={p.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={() => {
                                  const current = selectedTenant._permissions || selectedTenant.allowedPermissions || []
                                  const updated = checked ? current.filter((k: string) => k !== p.key) : [...current, p.key]
                                  setSelectedTenant({ ...selectedTenant, _permissions: updated })
                                }} className="w-3.5 h-3.5 rounded accent-indigo-500" />
                                <span className="text-[10px] text-gray-600">{p.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Məlumatlar */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Yaranma tarixi</label>
                    <p className="text-[13px] text-gray-700">{selectedTenant.createdAt}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Son aktivlik</label>
                    <p className="text-[13px] text-gray-700">{selectedTenant.updatedAt?.split('T')[0] || '-'}</p>
                  </div>
                </div>

                {/* Admin */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Admin</label>
                  <input type="text" defaultValue={selectedTenant.admin}
                    className="w-full px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" />
                </div>

                {/* Tapşırıq statistikası */}
                <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-[20px] font-extrabold text-indigo-600">{selectedTenant.taskCount || 0}</p>
                    <p className="text-[10px] text-indigo-400">Tapşırıq</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[20px] font-extrabold text-indigo-600">{selectedTenant.userCount || 0}</p>
                    <p className="text-[10px] text-indigo-400">İstifadəçi</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[20px] font-extrabold text-indigo-600">{selectedTenant.branchCount || 0}</p>
                    <p className="text-[10px] text-indigo-400">Filial</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[20px] font-extrabold text-indigo-600">{selectedTenant.businesses?.reduce((s: number, b: any) => s + (b.departments?.length || 0), 0) || 0}</p>
                    <p className="text-[10px] text-indigo-400">Şöbə</p>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => handleDeleteTenant(selectedTenant.id)} className="px-4 py-2 rounded-lg text-[12px] font-bold text-red-500 bg-red-50 hover:bg-red-100 transition">Sil</button>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedTenant(null)} className="px-5 py-2 rounded-lg text-[12px] font-semibold text-gray-500 hover:bg-gray-100 transition">Bağla</button>
                  <button onClick={async () => {
                    try {
                      await api.updateAdminTenant(selectedTenant.id, {
                        allowedPermissions: selectedTenant._permissions || selectedTenant.allowedPermissions || [],
                      })
                      loadTenants()
                      setSelectedTenant(null)
                    } catch (e: any) { alert(e.message) }
                  }} className="px-5 py-2 rounded-lg text-[12px] font-bold text-white transition hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>Yadda saxla</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
