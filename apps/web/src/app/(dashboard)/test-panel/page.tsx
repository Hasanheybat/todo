'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const PANEL_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function TestPanelPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [switching, setSwitching] = useState<number | null>(null)

  useEffect(() => {
    // Admin token ilə bütün user-ları yüklə
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az', password: '123456' }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.accessToken) return
        return fetch(`${API}/users`, { headers: { Authorization: `Bearer ${data.accessToken}` } })
      })
      .then(r => r?.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
      .finally(() => setLoading(false))
  }, [])

  // İstifadəçi seç
  const handleSelect = (panelIndex: number, userId: string) => {
    const next = [...selectedUsers]
    next[panelIndex] = userId || null
    setSelectedUsers(next)
  }

  // İstifadəçiyə keç — login edib dashboard-a yönləndir
  const handleSwitch = async (panelIndex: number) => {
    const userId = selectedUsers[panelIndex]
    if (!userId) return
    const user = users.find(u => u.id === userId)
    if (!user) return

    setSwitching(panelIndex)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: '123456' }),
      })
      const data = await res.json()
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
        router.push('/dashboard')
        // Səhifəni yenilə ki Header/Sidebar yeni user-ı görsün
        setTimeout(() => window.location.href = '/dashboard', 100)
      }
    } catch { alert('Login xətası') }
    finally { setSwitching(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Test Panel</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--todoist-text-tertiary)' }}>
          6 istifadəçi seçin. Birinə toxununca onun hesabına keçid edəcək — login lazım deyil.
        </p>
      </div>

      {/* 3x2 Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => {
          const color = PANEL_COLORS[i]
          const selectedId = selectedUsers[i]
          const selectedUser = users.find(u => u.id === selectedId)

          return (
            <div key={i} className="rounded-2xl overflow-hidden transition hover:shadow-lg"
              style={{ border: `2px solid ${color}20`, backgroundColor: 'var(--todoist-surface)' }}>

              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color + '08', borderBottom: `1px solid ${color}20` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ backgroundColor: color }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <select value={selectedId || ''} onChange={e => handleSelect(i, e.target.value)}
                    className="w-full text-[12px] font-semibold outline-none bg-transparent cursor-pointer"
                    style={{ color: selectedId ? 'var(--todoist-text)' : 'var(--todoist-text-tertiary)' }}>
                    <option value="">İstifadəçi seçin...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} disabled={selectedUsers.includes(u.id) && selectedUsers[i] !== u.id}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User info + keçid butonu */}
              <div className="px-4 py-4">
                {selectedUser ? (
                  <div className="space-y-3">
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold text-white"
                        style={{ backgroundColor: color }}>
                        {selectedUser.fullName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold" style={{ color: 'var(--todoist-text)' }}>{selectedUser.fullName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{selectedUser.email}</p>
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>
                          {selectedUser.role === 'TENANT_ADMIN' ? 'Şirkət Sahibi' :
                           selectedUser.role === 'BUSINESS_MANAGER' ? 'Müdir' :
                           selectedUser.role === 'TEAM_MANAGER' ? 'Rəhbər' : 'İşçi'}
                        </p>
                      </div>
                    </div>

                    {/* Businesses */}
                    {selectedUser.businesses?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedUser.businesses.map((b: any) => (
                          <span key={b.id} className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: color + '10', color }}>
                            {b.business?.name || '?'} {b.positionTitle ? `· ${b.positionTitle}` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Keçid butonu */}
                    <button onClick={() => handleSwitch(i)} disabled={switching === i}
                      className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: color }}>
                      {switching === i ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                          Dashboard-a keç
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: color + '10' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>İstifadəçi seçin</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Alt not */}
      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)' }}>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--todoist-text)' }}>Necə istifadə etməli?</p>
        <ol className="text-[11px] mt-1.5 space-y-1" style={{ color: 'var(--todoist-text-secondary)' }}>
          <li>1. Hər paneldə fərqli istifadəçi seçin (6 nəfər)</li>
          <li>2. Panel 1-dən "Dashboard-a keç" basın → həmin user kimi daxil olursunuz</li>
          <li>3. Görev yaradın, status dəyişin, test edin</li>
          <li>4. Bu səhifəyə qayıdıb başqa user-a keçin — eyni görevləri onun gözündən görün</li>
          <li>5. Şifrə: hamısı <strong>123456</strong></li>
        </ol>
      </div>
    </div>
  )
}
