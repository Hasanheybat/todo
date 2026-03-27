'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface PermissionGateProps {
  /** Tələb olunan yetkilər — hamısı olmalıdır */
  requires?: string[]
  /** Ən azı biri olmalıdır */
  requiresAny?: string[]
  /** Yetki varsa göstər */
  children: ReactNode
  /** Yetki yoxdursa göstər (optional) */
  fallback?: ReactNode
  /** true olsa, children disabled görünür (gizlənmir) */
  disableOnly?: boolean
}

export default function PermissionGate({ requires, requiresAny, children, fallback, disableOnly }: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = useAuth()

  let allowed = true

  if (requires && requires.length > 0) {
    allowed = requires.every(p => hasPermission(p))
  }
  if (requiresAny && requiresAny.length > 0) {
    allowed = hasAnyPermission(requiresAny)
  }

  if (allowed) return <>{children}</>

  if (disableOnly) {
    return (
      <div style={{ opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' }} title="Bu əməliyyat üçün icazəniz yoxdur">
        {children}
      </div>
    )
  }

  return fallback ? <>{fallback}</> : null
}
