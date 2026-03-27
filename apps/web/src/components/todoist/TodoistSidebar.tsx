'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface Project {
  id: string
  name: string
  color: string
  isInbox: boolean
  isFavorite: boolean
  _count?: { tasks: number }
}

interface TodoistSidebarProps {
  projects: Project[]
  onCreateProject?: () => void
  onQuickAdd?: () => void
  todayCount?: number
}

const views = [
  { name: 'Gələnlər', href: '/tapshiriqlarim/inbox', icon: 'inbox' },
  { name: 'Bugün', href: '/tapshiriqlarim/today', icon: 'today' },
  { name: 'Gələcək', href: '/tapshiriqlarim/upcoming', icon: 'upcoming' },
]

function SideIcon({ type, active }: { type: string; active: boolean }) {
  const c = active ? 'var(--todoist-red)' : 'var(--todoist-text-secondary)'
  const icons: Record<string, React.ReactNode> = {
    inbox: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
    today: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><text x="12" y="19" textAnchor="middle" fill={c} fontSize="8" fontWeight="bold" stroke="none">{new Date().getDate()}</text></svg>,
    upcoming: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
  }
  return <>{icons[type] || null}</>
}

export default function TodoistSidebar({ projects, onCreateProject, onQuickAdd, todayCount }: TodoistSidebarProps) {
  const pathname = usePathname()
  const [projectsOpen, setProjectsOpen] = useState(true)

  const favorites = projects.filter(p => p.isFavorite && !p.isInbox)
  const regularProjects = projects.filter(p => !p.isInbox)

  return (
    <div className="w-[220px] shrink-0 h-full overflow-y-auto border-r" style={{ borderColor: 'var(--todoist-divider)', backgroundColor: 'var(--todoist-bg)' }}>
      <div className="p-3 space-y-0.5">
        {/* Quick Add Button */}
        <button onClick={onQuickAdd}
          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[12px] font-semibold transition hover:bg-[var(--todoist-red-light)] mb-1"
          style={{ color: 'var(--todoist-red)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Tapşırıq əlavə et
          <span className="ml-auto">
            <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ backgroundColor: 'var(--todoist-border)', color: 'var(--todoist-text-tertiary)', border: '1px solid var(--todoist-divider)' }}>Q</kbd>
          </span>
        </button>

        {/* Əsas görünüşlər */}
        {views.map(v => {
          const isActive = pathname === v.href
          return (
            <Link key={v.href} href={v.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition
                ${isActive ? 'bg-[var(--todoist-sidebar-active)] text-[var(--todoist-red)] font-semibold' : 'text-[var(--todoist-text)] hover:bg-[var(--todoist-border)]'}`}>
              <SideIcon type={v.icon} active={isActive} />
              {v.name}
              {v.name === 'Bugün' && todayCount ? (
                <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--todoist-red)' }}>{todayCount}</span>
              ) : null}
            </Link>
          )
        })}

        {/* Favoritlər */}
        {favorites.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--todoist-text-tertiary)' }}>Favoritlər</p>
            </div>
            {favorites.map(p => {
              const isActive = pathname === `/tapshiriqlarim/project/${p.id}`
              return (
                <Link key={p.id} href={`/tapshiriqlarim/project/${p.id}`}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition
                    ${isActive ? 'bg-[var(--todoist-sidebar-active)] text-[var(--todoist-red)] font-semibold' : 'text-[var(--todoist-text)] hover:bg-[var(--todoist-border)]'}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate flex-1">{p.name}</span>
                  {p._count?.tasks ? (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>{p._count.tasks}</span>
                  ) : null}
                </Link>
              )
            })}
          </>
        )}

        {/* Layihələr */}
        <div className="pt-3 pb-1 px-2.5 flex items-center justify-between">
          <button onClick={() => setProjectsOpen(!projectsOpen)}
            className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--todoist-text-tertiary)' }}>
            <span style={{ transform: projectsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s', display: 'inline-block', fontSize: 8 }}>▼</span>
            Layihələr
          </button>
          <button onClick={onCreateProject}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--todoist-border)] transition" title="Layihə yarat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {projectsOpen && (
          <div className="space-y-0.5">
            {regularProjects.map(p => {
              const isActive = pathname === `/tapshiriqlarim/project/${p.id}`
              return (
                <Link key={p.id} href={`/tapshiriqlarim/project/${p.id}`}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition
                    ${isActive ? 'bg-[var(--todoist-sidebar-active)] text-[var(--todoist-red)] font-semibold' : 'text-[var(--todoist-text)] hover:bg-[var(--todoist-border)]'}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate flex-1">{p.name}</span>
                  {p._count?.tasks ? (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>{p._count.tasks}</span>
                  ) : null}
                </Link>
              )
            })}
            {regularProjects.length === 0 && (
              <p className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Hələ layihə yoxdur</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
