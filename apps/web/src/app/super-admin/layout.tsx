'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const navItems = [
  { href: '/super-admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/super-admin/tenants', label: 'İşletmələr', icon: 'tenants' },
  { href: '/super-admin/settings', label: 'Ayarlar', icon: 'settings' },
  { href: '/super-admin/logs', label: 'Loglar', icon: 'logs' },
]

function NavIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#fff' : 'rgba(255,255,255,0.6)'
  switch (type) {
    case 'dashboard': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    case 'tenants': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M6 21V10M10 21V10M14 21V10M18 21V10M12 3l9 4H3l9-4z"/></svg>
    case 'settings': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    case 'logs': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    default: return null
  }
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auth yoxlaması — token yoxdursa login-ə yönləndir
  useEffect(() => {
    if (pathname === '/super-admin/login') return
    const token = api.getToken()
    const superAdmin = localStorage.getItem('superAdmin')
    if (!token || !superAdmin) {
      router.replace('/super-admin/login')
    }
  }, [pathname, router])

  const handleLogout = () => {
    api.setToken(null)
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('superAdmin')
    router.push('/super-admin/login')
  }

  if (pathname === '/super-admin/login') return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 100%)' }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-white">WorkFlow Pro</p>
              <p className="text-[10px] font-medium" style={{ color: 'rgba(165,180,252,0.7)' }}>Super Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-5 right-4 lg:hidden text-white/50 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                }}>
                <NavIcon type={item.icon} active={isActive} />
                {item.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#A5B4FC]" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5">
          <div className="border-t border-white/10 pt-4 px-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.15)', color: '#A5B4FC' }}>SA</div>
              <div>
                <p className="text-[12px] font-semibold text-white">Super Admin</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>admin@workflowpro.az</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 mt-3 px-2 py-1.5 rounded-md text-[11px] font-medium transition hover:bg-white/10 w-full"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Çıxış
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
            <h2 className="text-[14px] font-bold text-gray-700">Super Admin Panel</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-400">{new Date().toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-indigo-100 text-indigo-600">SA</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
