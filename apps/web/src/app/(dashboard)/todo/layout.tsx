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
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        setQuickAddOpen(true)
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
        onAdded={loadProjects}
        projects={projects}
        labels={labels}
      />
    </TodoContext.Provider>
  )
}
