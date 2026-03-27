'use client'

import { createContext, useContext } from 'react'

interface TodoContextType {
  projects: any[]
  refreshProjects: () => void
  inboxId: string | null
  openQuickAdd: () => void
}

export const TodoContext = createContext<TodoContextType>({
  projects: [], refreshProjects: () => {}, inboxId: null, openQuickAdd: () => {}
})

export const useTodoContext = () => useContext(TodoContext)
