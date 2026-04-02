'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface PageGuardProps {
  /** Tələb olunan yetkilər — hamısı olmalıdır */
  requires?: string[]
  /** Ən azı biri olmalıdır */
  requiresAny?: string[]
  children: ReactNode
}

/**
 * Səhifə səviyyəsində yetki yoxlaması.
 * Yetki yoxdursa "İcazəniz yoxdur" mesajı göstərir.
 */
export default function PageGuard({ requires, requiresAny, children }: PageGuardProps) {
  const { hasPermission, hasAnyPermission, user } = useAuth()

  // Auth yüklənməyibsə gözlə
  if (!user) return null

  let allowed = true

  if (requires && requires.length > 0) {
    allowed = requires.every(p => hasPermission(p))
  }
  if (requiresAny && requiresAny.length > 0) {
    allowed = allowed && hasAnyPermission(requiresAny)
  }

  if (allowed) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
        İcazəniz yoxdur
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        Bu səhifəyə giriş üçün lazımi yetkiniz yoxdur.
        Əgər bu səhvdirsə, şirkət admininizə müraciət edin.
      </p>
      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        {requires && <span>Tələb: {requires.join(', ')}</span>}
        {requiresAny && <span>Tələb (ən az 1): {requiresAny.join(', ')}</span>}
      </div>
    </div>
  )
}
