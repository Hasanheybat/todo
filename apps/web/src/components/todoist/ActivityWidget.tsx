'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'indi'
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`
  if (diff < 172800) return 'dünən'
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün əvvəl`
  return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  created: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
    label: 'yaradıldı',
    color: '#058527',
  },
  completed: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>,
    label: 'tamamlandı',
    color: '#246FE0',
  },
  uncompleted: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 019-9 9 9 0 010 18 9 9 0 01-9-9z"/><path d="M9 12l2 2 4-4"/></svg>,
    label: 'geri açıldı',
    color: '#EB8909',
  },
  updated: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
    label: 'yeniləndi',
    color: '#808080',
  },
  deleted: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    label: 'silindi',
    color: '#DC4C3E',
  },
}

function getActionConfig(action: string) {
  if (action.startsWith('bulk_')) {
    const base = action.replace('bulk_', '')
    const config = ACTION_CONFIG[base] || ACTION_CONFIG['updated']
    return { ...config, label: `toplu ${config.label}` }
  }
  return ACTION_CONFIG[action] || ACTION_CONFIG['updated']
}

function getTaskName(activity: any): string {
  if (activity.task?.content) return activity.task.content
  // Silinmiş task — details-dən content götür
  if (activity.details) {
    try {
      const d = JSON.parse(activity.details)
      if (d.content) return d.content
    } catch {}
  }
  return 'Silinmiş tapşırıq'
}

interface ActivityWidgetProps {
  limit?: number
}

export default function ActivityWidget({ limit = 15 }: ActivityWidgetProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      const data = await api.getTodoistActivities(50)
      setActivities(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const visibleActivities = expanded ? activities : activities.slice(0, limit)

  return (
    <div className="border border-[var(--todoist-divider)] dark:border-[#333] rounded-xl bg-white dark:bg-[#1E1E1E]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--todoist-divider)] dark:border-[#333]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-secondary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <h3 className="text-[13px] font-bold text-[var(--todoist-text)] dark:text-[#E8E8E8]">Son fəaliyyətlər</h3>
        </div>
        {activities.length > limit && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-medium text-[#246FE0] hover:underline">
            {expanded ? 'Gizlə' : `Hamısını gör (${activities.length})`}
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`overflow-y-auto ${expanded ? 'max-h-[400px]' : ''}`}>
        {loading ? (
          <div className="px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-3/4 rounded bg-[var(--todoist-border)]" />
              <div className="h-4 w-1/2 rounded bg-[var(--todoist-border)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--todoist-border)]" />
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--todoist-text-tertiary)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-[12px] text-[var(--todoist-text-tertiary)]">Hələ fəaliyyət yoxdur</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--todoist-sidebar-hover)] dark:divide-[#2A2A2A]">
            {visibleActivities.map((activity: any) => {
              const config = getActionConfig(activity.action)
              const taskName = getTaskName(activity)
              return (
                <div key={activity.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#F9F8F6] dark:hover:bg-[#252525] transition">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: config.color + '15', color: config.color }}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[var(--todoist-text)] dark:text-[#E8E8E8] leading-snug">
                      <span className="font-medium truncate">{taskName}</span>
                      {' '}
                      <span className="text-[var(--todoist-text-secondary)]">{config.label}</span>
                    </p>
                    <p className="text-[10px] text-[var(--todoist-text-tertiary)] mt-0.5">{timeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
