'use client'

import { useState } from 'react'

interface ProjectHeaderProps {
  project: {
    id: string
    name: string
    color: string
    viewType: string
    isInbox: boolean
    isFavorite: boolean
  }
  taskCount: number
  viewType: 'LIST' | 'BOARD'
  onViewChange: (view: 'LIST' | 'BOARD') => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}

export default function ProjectHeader({ project, taskCount, viewType, onViewChange, onEdit, onDelete, onToggleFavorite }: ProjectHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--todoist-text)' }}>{project.name}</h1>
        <span className="text-[12px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>{taskCount} tapşırıq</span>
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--todoist-divider)' }}>
          <button
            onClick={() => onViewChange('LIST')}
            className="px-2.5 py-1 text-[11px] font-medium transition flex items-center gap-1"
            style={{ backgroundColor: viewType === 'LIST' ? 'var(--todoist-sidebar-hover)' : 'var(--todoist-surface)', color: viewType === 'LIST' ? 'var(--todoist-text)' : 'var(--todoist-text-secondary)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
            Siyahı
          </button>
          <button
            onClick={() => onViewChange('BOARD')}
            className="px-2.5 py-1 text-[11px] font-medium transition flex items-center gap-1"
            style={{ backgroundColor: viewType === 'BOARD' ? 'var(--todoist-sidebar-hover)' : 'var(--todoist-surface)', color: viewType === 'BOARD' ? 'var(--todoist-text)' : 'var(--todoist-text-secondary)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Board
          </button>
        </div>

        {/* Menu */}
        {!project.isInbox && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--todoist-border)] transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--todoist-text-secondary)"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-20 py-1 w-[160px]" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
                  <button onClick={() => { setMenuOpen(false); onToggleFavorite() }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-[var(--todoist-sidebar-hover)] transition flex items-center gap-2" style={{ color: 'var(--todoist-text)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={project.isFavorite ? '#FAD000' : 'none'} stroke={project.isFavorite ? '#FAD000' : 'var(--todoist-text-secondary)'} strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {project.isFavorite ? 'Favoritdən çıxar' : 'Favoritə əlavə et'}
                  </button>
                  <button onClick={() => { setMenuOpen(false); onEdit() }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-[var(--todoist-sidebar-hover)] transition flex items-center gap-2" style={{ color: 'var(--todoist-text)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Redaktə et
                  </button>
                  <div className="h-px my-1" style={{ backgroundColor: 'var(--todoist-divider)' }} />
                  <button onClick={() => { setMenuOpen(false); onDelete() }}
                    className="w-full px-3 py-1.5 text-[11px] font-medium text-left hover:bg-[var(--todoist-red-light)] transition flex items-center gap-2" style={{ color: 'var(--todoist-red)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-red)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    Layihəni sil
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
