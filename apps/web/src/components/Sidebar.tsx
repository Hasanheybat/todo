'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import LabelManager from '@/components/todoist/LabelManager'
import CreateProjectModal from '@/components/todoist/CreateProjectModal'

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', TENANT_ADMIN: 'Baş Müdir', BUSINESS_MANAGER: 'İşletmə Müdiri', TEAM_MANAGER: 'İşçi Müdiri', EMPLOYEE: 'İşçi',
}

const topNav = [
  { name: 'Bugün', href: '/dashboard', icon: 'today' },
  { name: 'Gələnlər', href: '/inbox', icon: 'inbox' },
  { name: 'Gələcək', href: '/upcoming', icon: 'upcoming' },
]

const workNav = [
  { name: 'Tapşırıqlar', href: '/tasks', icon: 'tasks', perm: 'tasks.read' },
  { name: 'Todo', href: '/todo', icon: 'todo' },
  { name: 'Şablonlar', href: '/templates', icon: 'templates', perm: 'tasks.read' },
  { name: 'Filter Test ✦', href: '/filter-test', icon: 'filter' },
]

const manageNav = [
  { name: 'İşçilər', href: '/users', icon: 'users', perm: 'users.read' },
  { name: 'Rollar', href: '/roles', icon: 'roles', perm: 'users.manage' },
  { name: 'Maliyyə', href: '/finance', icon: 'finance', perm: 'finance.manage' },
]

function NavIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? 'var(--todoist-red)' : 'var(--todoist-sidebar-text)'
  const icons: Record<string, React.ReactNode> = {
    today: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><text x="12" y="19" textAnchor="middle" fill={color} fontSize="9" fontWeight="bold" stroke="none">{new Date().getDate()}</text></svg>,
    inbox: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
    upcoming: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
    tasks: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
    todo: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    templates: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="15" y="13" width="6" height="8" rx="1"/></svg>,
    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>,
    roles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    salary: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16M12 11h.01"/></svg>,
    filter: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  }
  return icons[type] || <span />
}

function NavLink({ item, pathname, onClose, hasProjectOrLabel }: { item: { name: string; href: string; icon: string }; pathname: string; onClose: () => void; hasProjectOrLabel?: boolean }) {
  const isActive = item.href === '/todo'
    ? (pathname === '/todo' && !hasProjectOrLabel)
    : (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')) || (item.href === '/dashboard' && pathname === '/dashboard'))

  return (
    <Link href={item.href} onClick={onClose}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition`}
      style={isActive
        ? { backgroundColor: 'var(--todoist-sidebar-active)', color: 'var(--todoist-sidebar-text-active)', fontWeight: 600 }
        : { color: 'var(--todoist-sidebar-text)' }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
      <NavIcon type={item.icon} active={isActive} />
      {item.name}
    </Link>
  )
}

interface SidebarProps { open: boolean; onClose: () => void }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const sidebarSearchParams = useSearchParams()
  const currentProjectId = sidebarSearchParams.get('projectId')
  const currentLabelId = sidebarSearchParams.get('labelId')
  const { user, hasPermission } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const [labels, setLabels] = useState<any[]>([])
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [karmaStats, setKarmaStats] = useState({ completed: 0, level: 1, progress: 0 })

  const loadKarma = useCallback(async () => {
    try {
      const tasks = await api.getTodoistTasks({ includeCompleted: 'true' })
      const completed = tasks.filter((t: any) => t.isCompleted).length
      // Level hesabla: hər 10 tamamlanmış task = 1 level
      const level = Math.floor(completed / 10) + 1
      const progress = (completed % 10) * 10 // 0-100%
      setKarmaStats({ completed, level, progress })
    } catch {}
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getTodoistProjects()
      setProjects(data.filter((p: any) => !p.isInbox))
    } catch {}
  }, [])

  const loadLabels = useCallback(async () => {
    try { setLabels(await api.getTodoistLabels()) } catch {}
  }, [])

  useEffect(() => {
    loadProjects(); loadLabels(); loadKarma()
  }, [loadProjects, loadLabels, loadKarma])

  const visibleManageNav = manageNav.filter(item => hasPermission(item.perm))

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--todoist-sidebar-flat)' }}
      >
        {/* Üst blok — profil */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--todoist-sidebar-avatar)', color: 'var(--todoist-sidebar-avatar-text)' }}>
              {user?.fullName?.split(' ').map(n => n[0]).join('') || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--todoist-sidebar-text)' }}>{user?.fullName || 'İstifadəçi'}</p>
            </div>
            <button onClick={onClose} className="lg:hidden transition" style={{ color: 'var(--todoist-text-secondary)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {/* Quick Add — Dropdown (hər kəs TODO yaza bilər, GÖREV üçün tasks.create lazımdır) */}
          <div className="relative mb-2">
            <button onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition"
              style={{ color: 'var(--todoist-red)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-red-light)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Tapşırıq əlavə et
              <svg className={`ml-auto w-3 h-3 transition-transform ${addDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="var(--todoist-sidebar-label)" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
            </button>

            {addDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAddDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl shadow-lg overflow-hidden"
                  style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  {hasPermission('tasks.create') && (
                    <button onClick={() => { window.dispatchEvent(new CustomEvent('open-add-task')); setAddDropdownOpen(false); onClose() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold transition hover:opacity-80"
                      style={{ color: '#4F46E5', borderBottom: '1px solid var(--todoist-border)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                      TASK yarat
                      <span className="ml-auto text-[10px] font-normal" style={{ color: 'var(--todoist-sidebar-label)' }}>Adi tapşırıq</span>
                    </button>
                  )}
                  {hasPermission('gorev.create') && (
                    <button onClick={() => { window.dispatchEvent(new CustomEvent('open-add-gorev')); setAddDropdownOpen(false); onClose() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold transition hover:opacity-80"
                      style={{ color: '#246FE0', borderBottom: '1px solid var(--todoist-border)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#246FE0" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                      GÖREV yarat
                      <span className="ml-auto text-[10px] font-normal" style={{ color: 'var(--todoist-sidebar-label)' }}>Şirkət tapşırığı</span>
                    </button>
                  )}
                  <button onClick={() => { window.dispatchEvent(new CustomEvent('open-add-todo')); setAddDropdownOpen(false); onClose() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold transition hover:opacity-80"
                    style={{ color: '#EB8909' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EB8909" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    TODO yarat
                    <span className="ml-auto text-[10px] font-normal" style={{ color: 'var(--todoist-sidebar-label)' }}>Şəxsi tapşırıq</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bugün / Gələnlər / Gələcək */}
          <div className="space-y-0.5">
            {topNav.map(item => <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} hasProjectOrLabel={!!(currentProjectId || currentLabelId)} />)}
          </div>

          <div className="my-3" style={{ borderTop: '1px solid var(--todoist-sidebar-divider)' }} />

          {/* Tapşırıqlar / Todo / Şablonlar */}
          <div className="space-y-0.5">
            {workNav.filter(item => !item.perm || hasPermission(item.perm)).map(item => <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} hasProjectOrLabel={!!(currentProjectId || currentLabelId)} />)}
          </div>

          <div className="my-3" style={{ borderTop: '1px solid var(--todoist-sidebar-divider)' }} />

          {/* Layihələr — kompakt grid */}
          <div className="flex items-center justify-between px-2.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--todoist-sidebar-label)' }}>Layihələr</span>
            <button onClick={() => setCreateProjectOpen(true)} className="text-[14px] leading-none transition" style={{ color: 'var(--todoist-sidebar-label)' }}>＋</button>
          </div>
          <div className="grid grid-cols-2 gap-1 px-1.5 mb-1">
            {projects.filter(p => !p.isInbox).map(project => {
              const projectUrl = `/todo?projectId=${project.id}`
              const isActive = pathname === '/todo' && currentProjectId === project.id
              return (
                <Link key={project.id} href={projectUrl} onClick={onClose}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-[6px] text-[11px] font-medium transition truncate"
                  style={isActive
                    ? { backgroundColor: 'var(--todoist-sidebar-active)', color: 'var(--todoist-sidebar-text-active)', fontWeight: 600 }
                    : { color: 'var(--todoist-sidebar-text)' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: project.color || '#808080' }} />
                  <span className="truncate">{project.name}</span>
                  {project._count?.tasks > 0 && <span className="ml-auto text-[9px] font-semibold shrink-0" style={{ color: 'var(--todoist-sidebar-label)' }}>{project._count.tasks}</span>}
                </Link>
              )
            })}
          </div>

          {/* Etiketlər — qara yazı + rəngli nöqtə */}
          {labels.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between px-2.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--todoist-sidebar-label)' }}>Etiketlər</span>
                <button onClick={() => setLabelManagerOpen(true)} className="text-[14px] leading-none transition" style={{ color: 'var(--todoist-sidebar-label)' }}>⚙</button>
              </div>
              <div className="grid grid-cols-2 gap-1 px-1.5 mb-2">
                {labels.slice(0, 10).map((label: any) => {
                  const labelActive = pathname === '/todo' && currentLabelId === label.id
                  return (
                  <Link key={label.id} href={`/todo?labelId=${label.id}`} onClick={onClose}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-[6px] text-[11px] font-medium transition truncate"
                    style={labelActive
                      ? { backgroundColor: 'var(--todoist-sidebar-active)', color: 'var(--todoist-sidebar-text-active)', fontWeight: 600 }
                      : { color: 'var(--todoist-sidebar-text)' }}
                    onMouseEnter={e => { if (!labelActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--todoist-sidebar-hover)' }}
                    onMouseLeave={e => { if (!labelActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: label.color || '#808080' }} />
                    <span className="truncate">{label.name}</span>
                  </Link>
                  )
                })}
                {labels.length > 10 && (
                  <button onClick={() => setLabelManagerOpen(true)} className="text-[10px] font-medium px-2 py-1" style={{ color: 'var(--todoist-sidebar-label)' }}>+{labels.length - 10} daha</button>
                )}
              </div>
            </div>
          )}

          <div className="my-3" style={{ borderTop: '1px solid var(--todoist-sidebar-divider)' }} />

          {/* İdarəetmə */}
          {visibleManageNav.length > 0 && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider px-2.5" style={{ color: 'var(--todoist-sidebar-label)' }}>İdarəetmə</p>
          )}
          <div className="space-y-0.5">
            {visibleManageNav.map(item => <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />)}
          </div>
        </nav>

        {/* Alt — karma + rol */}
        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--todoist-sidebar-divider)' }}>
          <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1">
            <span className="text-[14px]">🔥</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: 'var(--todoist-red)' }}>Karma · {karmaStats.completed} ✓</span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--todoist-sidebar-text)' }}>Level {karmaStats.level}</span>
              </div>
              <div className="h-1 rounded-full mt-0.5" style={{ backgroundColor: 'var(--todoist-border)' }}>
                <div className="h-1 rounded-full transition-all" style={{ width: `${karmaStats.progress}%`, backgroundColor: 'var(--todoist-red)' }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1">
            <div className="h-2 w-2 rounded-full bg-[#058527]" />
            <span className="text-[11px]" style={{ color: 'var(--todoist-text-secondary)' }}>{roleLabels[user?.role || ''] || ''}</span>
          </div>
        </div>
      </aside>

      <LabelManager open={labelManagerOpen} onClose={() => setLabelManagerOpen(false)} labels={labels} onRefresh={loadLabels} />
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} onSubmit={async (data) => {
        try { await api.createTodoistProject(data); setCreateProjectOpen(false); loadProjects() } catch {}
      }} />
    </>
  )
}
