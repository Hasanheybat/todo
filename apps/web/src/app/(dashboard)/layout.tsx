'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TaskFormModal from '@/components/TaskFormModal'
import GlobalQuickAdd from '@/components/todoist/GlobalQuickAdd'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { api } from '@/lib/api'
import { Toaster } from 'react-hot-toast'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { loading, isAuthenticated } = useAuth()
  const router = useRouter()

  // Global GÖREV + TODO yaratma modalları
  const [globalGorevOpen, setGlobalGorevOpen] = useState(false)
  const [globalTodoOpen, setGlobalTodoOpen] = useState(false)
  const [globalUsers, setGlobalUsers] = useState<any[]>([])
  const [globalDepts, setGlobalDepts] = useState<any[]>([])
  const [globalBiz, setGlobalBiz] = useState<any[]>([])
  const [globalProjects, setGlobalProjects] = useState<any[]>([])
  const [globalLabels, setGlobalLabels] = useState<any[]>([])

  // Global event listener — bütün səhifələrdə işləyir
  useEffect(() => {
    const gorevHandler = () => {
      // Əgər başqa səhifə artıq modal açıbsa, açma
      if (document.querySelector('[data-gorev-modal-open="true"]')) return
      Promise.all([
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getBusinesses().catch(() => []),
      ]).then(([u, d, b]) => { setGlobalUsers(u); setGlobalDepts(d); setGlobalBiz(b) })
      setGlobalGorevOpen(true)
    }
    const todoHandler = () => {
      if (document.querySelector('[data-todo-modal-open="true"]')) return
      Promise.all([
        api.getTodoistProjects().catch(() => []),
        api.getTodoistLabels().catch(() => []),
      ]).then(([p, l]) => { setGlobalProjects(p); setGlobalLabels(l) })
      setGlobalTodoOpen(true)
    }
    window.addEventListener('open-add-gorev', gorevHandler)
    window.addEventListener('open-add-todo', todoHandler)
    window.addEventListener('open-add-task', gorevHandler)
    return () => {
      window.removeEventListener('open-add-gorev', gorevHandler)
      window.removeEventListener('open-add-todo', todoHandler)
      window.removeEventListener('open-add-task', gorevHandler)
    }
  }, [])

  // Tema yüklə — FocusFlow (light/dark)
  useEffect(() => {
    const saved = localStorage.getItem('wfp-theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Köhnə data-theme attributunu təmizlə
    document.documentElement.removeAttribute('data-theme')
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login')
  }, [loading, isAuthenticated, router])

  // Browser push notification icazəsi
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 3000)
    }
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--todoist-bg)' }}>
        <svg className="animate-spin h-7 w-7" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <ThemeProvider>
    <SocketProvider>
      <Toaster position="bottom-center" toastOptions={{
        duration: 5000,
        style: { background: '#333', color: '#fff', fontSize: '13px', borderRadius: '8px', padding: '10px 16px' },
      }} />
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--todoist-bg)' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto px-6 py-4 lg:px-8" style={{ backgroundColor: 'var(--todoist-bg)' }}>
            {children}
          </main>
        </div>

        {/* Global GÖREV yaratma modalı — bütün səhifələrdə işləyir */}
        <TaskFormModal
          open={globalGorevOpen}
          onClose={() => setGlobalGorevOpen(false)}
          onSaved={() => { setGlobalGorevOpen(false); window.dispatchEvent(new CustomEvent('refresh-tasks')) }}
          editingTask={null}
          users={globalUsers}
          departments={globalDepts}
          businesses={globalBiz}
        />

        {/* Global TODO yaratma modalı — bütün səhifələrdə işləyir */}
        <GlobalQuickAdd
          open={globalTodoOpen}
          onClose={() => setGlobalTodoOpen(false)}
          onAdded={() => { setGlobalTodoOpen(false); window.dispatchEvent(new CustomEvent('refresh-tasks')) }}
          projects={globalProjects}
          labels={globalLabels}
        />
      </div>
    </SocketProvider>
    </ThemeProvider>
  )
}
