'use client'

import { useState, useEffect, useCallback } from 'react'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import { api } from '@/lib/api'
import { TodoContext } from '@/contexts/TodoContext'

export default function TodoLayout({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<any[]>([])
  const [labels, setLabels] = useState<any[]>([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const [data, lbls] = await Promise.all([api.getTodoistProjects(), api.getTodoistLabels()])
      setProjects(data)
      setLabels(lbls)
    } catch (err) { console.error('Projects/Labels load error:', err) }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      // q/Q veya n/N → Quick Add aç
      if (e.key === 'q' || e.key === 'Q' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
      // / → Axtarış inputuna fokuslan (əvvəlcə yerli data-search, sonra header)
      if (e.key === '/') {
        e.preventDefault()
        const localSearch = document.querySelector<HTMLInputElement>('input[data-search]')
        const headerSearch = document.querySelector<HTMLInputElement>('header input[type="search"], input[placeholder*="axtar"]:not([data-search])')
        const searchInput = localSearch || headerSearch
        if (searchInput) { searchInput.focus(); searchInput.select() }
      }
      // b/B → Board görünüşü; l/L → List görünüşü (custom event)
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('todo-view-change', { detail: 'board' }))
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('todo-view-change', { detail: 'list' }))
      }
      // ? → Qısayol kömək paneli
      if (e.key === '?') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('todo-show-shortcuts'))
      }
      // Escape → Panelləri bağla
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('todo-escape'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const inboxId = projects.find((p: any) => p.isInbox)?.id || null

  return (
    <TodoContext.Provider value={{ projects, refreshProjects: loadProjects, inboxId, openQuickAdd: () => setQuickAddOpen(true) }}>
      {children}
      <GlobalQuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdded={() => { loadProjects(); window.dispatchEvent(new CustomEvent('todo-task-added')) }}
        projects={projects}
        labels={labels}
      />
    </TodoContext.Provider>
  )
}
