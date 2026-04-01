'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const notifIcons: Record<string, string> = {
  TASK_ASSIGNED: '📋', TASK_COMPLETED: '✅', TASK_APPROVED: '👍', TASK_REJECTED: '❌',
  SALARY_PAID: '💰', COMMENT_ADDED: '💬', TEMPLATE_EXECUTED: '🔄', SYSTEM: '🔔', TODO_DUE: '⏰',
}

interface HeaderProps { onMenuClick: () => void }

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const { onNotification } = useSocket()
  const { colorMode, setColorMode } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<any>(null)

  const loadNotifs = useCallback(async () => {
    try {
      const [n, { count }] = await Promise.all([api.getNotifications(), api.getUnreadCount()])
      setNotifications(n); setUnreadCount(count)
    } catch {}
  }, [])

  useEffect(() => { loadNotifs(); const i = setInterval(loadNotifs, 60000); return () => clearInterval(i) }, [loadNotifs])

  // Real-time WebSocket bildiriş
  useEffect(() => {
    const unsub = onNotification((data: any) => {
      loadNotifs() // Yeni bildiriş gəldikdə yenilə
      // Browser push
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title || 'WorkFlow Pro', { body: data.message || '', icon: '/icon.png' })
      }
    })
    return unsub
  }, [onNotification, loadNotifs])


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await api.searchTodoistTasks(q)
        setSearchResults(results)
      } catch { setSearchResults([]) }
      finally { setSearchLoading(false) }
    }, 300)
  }

  async function markAllRead() { await api.markAllNotificationsRead(); setUnreadCount(0); setNotifications(p => p.map(n => ({...n, isRead: true}))) }
  async function notifClick(n: any) {
    if (!n.isRead) { await api.markNotificationRead(n.id); setUnreadCount(p => Math.max(0, p-1)); setNotifications(p => p.map(x => x.id === n.id ? {...x, isRead: true} : x)) }
    if (n.link) window.location.href = n.link
    setNotifOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4"
      style={{
        backgroundColor: 'var(--todoist-surface)',
        borderBottom: '1px solid var(--todoist-divider)',
        height: '48px',
        minHeight: '48px',
      }}>
      {/* Mobil menü */}
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-md transition mr-2"
        style={{ color: 'var(--todoist-text-secondary)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>

      {/* Ortada axtarış */}
      <div className="hidden md:flex flex-1 max-w-md mx-auto relative" ref={searchRef}>
        <div className="relative w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input ref={searchInputRef} type="text" placeholder="Tapşırıq axtar..." value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="w-full rounded-lg py-1.5 pl-9 pr-4 text-[13px] outline-none transition"
            style={{ backgroundColor: 'var(--todoist-sidebar-hover)', color: 'var(--todoist-text)', border: searchOpen && searchQuery.length >= 2 ? '1px solid var(--todoist-red)' : 'none' }} />
        </div>

        {/* Axtarış nəticələri dropdown */}
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
            {searchLoading ? (
              <div className="flex items-center justify-center py-6">
                <svg className="animate-spin h-5 w-5" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[12px]" style={{ color: 'var(--todoist-text-tertiary)' }}>"{searchQuery}" üçün nəticə tapılmadı</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--todoist-border)' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>{searchResults.length} nəticə</span>
                </div>
                {searchResults.map((task: any) => (
                  <button key={task.id} onClick={() => {
                    router.push('/dashboard?openTask=' + task.id)
                    setSearchOpen(false); setSearchQuery(''); setSearchResults([])
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition"
                    style={{ borderBottom: '1px solid var(--todoist-bg)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <div className="w-4 h-4 rounded-full border-2 shrink-0"
                      style={{ borderColor: (task.todoStatus || 'WAITING') === 'CANCELLED' ? '#EF4444' : (task.todoStatus || 'WAITING') === 'DONE' ? '#10B981' : (task.todoStatus || 'WAITING') === 'IN_PROGRESS' ? '#F59E0B' : '#94A3B8',
                        backgroundColor: 'transparent' }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-medium truncate ${task.isCompleted ? 'line-through' : ''}`}
                        style={{ color: task.isCompleted ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)' }}>{task.content}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.project && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>📁 {task.project.name}</span>}
                        {task.dueDate && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>📅 {new Date(task.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                    {task.isCompleted && <span className="text-[9px] px-1.5 py-px rounded bg-[#E6F4EA] text-[#058527] font-bold">✓</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Bildiriş */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }} className="relative p-2 rounded-md transition"
            style={{ color: 'var(--todoist-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1" style={{ backgroundColor: 'var(--todoist-red)' }}>{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1 w-80 rounded-xl shadow-lg overflow-hidden"
              style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--todoist-border)' }}>
                <span className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Bildirişlər</span>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-[11px] font-semibold" style={{ color: 'var(--todoist-red)' }}>Hamısını oxu</button>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? <p className="py-8 text-center text-[12px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Bildiriş yoxdur</p> : notifications.slice(0, 8).map(n => (
                  <button key={n.id} onClick={() => notifClick(n)} className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition`}
                    style={{ backgroundColor: !n.isRead ? 'var(--todoist-red-light)' : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = !n.isRead ? 'var(--todoist-red-light)' : 'transparent'}>
                    <span className="text-base mt-0.5">{notifIcons[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] ${!n.isRead ? 'font-semibold' : ''}`} style={{ color: !n.isRead ? 'var(--todoist-text)' : 'var(--todoist-text-secondary)' }}>{n.title}</p>
                      <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--todoist-text-tertiary)' }}>{n.message}</p>
                    </div>
                    {!n.isRead && <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: 'var(--todoist-red)' }} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }} className="flex items-center gap-1.5 p-1.5 rounded-md transition"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: 'var(--todoist-sidebar-avatar)', color: 'var(--todoist-sidebar-avatar-text)' }}>
              {user?.fullName?.split(' ').map(n => n[0]).join('') || '??'}
            </div>
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl shadow-lg py-1"
              style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--todoist-border)' }}>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--todoist-text)' }}>{user?.fullName}</p>
                <p className="text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>{user?.email}</p>
              </div>
              <a href="#" className="block px-3 py-2 text-[13px] transition"
                style={{ color: 'var(--todoist-text)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>Tənzimləmələr</a>
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--todoist-text-tertiary)' }}>Rəng Sxemi</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setColorMode('light')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                    style={{ backgroundColor: colorMode !== 'dark' ? '#EEF2FF' : 'transparent', color: colorMode !== 'dark' ? '#4F46E5' : 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-border)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    Açıq
                  </button>
                  <button onClick={() => setColorMode('dark')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                    style={{ backgroundColor: colorMode === 'dark' ? '#334155' : 'transparent', color: colorMode === 'dark' ? '#818CF8' : 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-border)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                    Qaranlıq
                  </button>
                </div>

              </div>
              {/* Bildiriş ayarları */}
              <div className="px-3 py-2" style={{ borderTop: '1px solid var(--todoist-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--todoist-text-tertiary)' }}>Bildirişlər</p>
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-[11px]" style={{ color: 'var(--todoist-text-secondary)' }}>Push bildiriş</span>
                  <input type="checkbox" defaultChecked={'Notification' in window && Notification.permission === 'granted'}
                    onChange={e => { if (e.target.checked && 'Notification' in window) Notification.requestPermission() }}
                    className="rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-[11px]" style={{ color: 'var(--todoist-text-secondary)' }}>Səs</span>
                  <input type="checkbox" defaultChecked={localStorage.getItem('wfp-notif-sound') !== 'off'}
                    onChange={e => localStorage.setItem('wfp-notif-sound', e.target.checked ? 'on' : 'off')}
                    className="rounded" />
                </label>
              </div>
              <div className="my-0.5" style={{ borderTop: '1px solid var(--todoist-border)' }} />
              <button onClick={() => { logout(); window.location.href = '/login' }} className="w-full text-left px-3 py-2 text-[13px] transition"
                style={{ color: 'var(--todoist-red)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-red-light)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>Çıxış</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
