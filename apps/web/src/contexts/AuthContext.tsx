'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { api } from '@/lib/api'

interface CustomRole {
  id: string
  name: string
  permissions: string[]
}

interface UserBusiness {
  businessId: string
  departmentId?: string | null
  positionTitle?: string | null
  customRoleId?: string | null
  business: { id: string; name: string }
  department?: { id: string; name: string; color: string } | null
  customRole?: CustomRole | null
}

interface User {
  id: string
  email: string
  fullName: string
  role: string
  tenantId: string
  parentId: string | null
  customRoleId: string | null
  customRole?: CustomRole | null
  businesses?: UserBusiness[]
  status: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { fullName: string; email: string; password: string; companyName: string }) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (perms: string[]) => boolean
  permissions: string[]
  isCompanyOwner: boolean
  activeBranchId: string | null
  setActiveBranchId: (id: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)

  // Uygulama yüklənəndə token yoxla
  useEffect(() => {
    const token = api.getToken()
    if (token) {
      // Token varsa user məlumatını yüklə
      api.request<User>('/auth/me')
        .then((u) => setUser(u))
        .catch(() => {
          api.setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    api.setToken(res.accessToken)
    if (res.refreshToken) {
      localStorage.setItem('refreshToken', res.refreshToken)
    }
    setUser(res.user)
  }, [])

  const register = useCallback(async (data: { fullName: string; email: string; password: string; companyName: string }) => {
    const res = await api.register(data)
    api.setToken(res.accessToken)
    if (res.refreshToken) {
      localStorage.setItem('refreshToken', res.refreshToken)
    }
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  // Auto-select first branch when user loads
  useEffect(() => {
    if (user?.businesses && user.businesses.length > 0 && !activeBranchId) {
      setActiveBranchId(user.businesses[0].business.id)
    }
  }, [user])

  // Permission helpers
  // Per-branch role: activeBranchId varsa UserBusiness.customRole istifadə et, yoxsa User.customRole fallback
  const isCompanyOwner = user?.role === 'TENANT_ADMIN'
  const permissions = useMemo(() => {
    if (activeBranchId && user?.businesses) {
      const ub = user.businesses.find(b => b.business.id === activeBranchId)
      if (ub?.customRole?.permissions) return ub.customRole.permissions
    }
    return user?.customRole?.permissions || []
  }, [user, activeBranchId])

  const hasPermission = useCallback((perm: string) => {
    if (permissions.includes('*')) return true
    return permissions.includes(perm)
  }, [permissions])

  const hasAnyPermission = useCallback((perms: string[]) => {
    if (permissions.includes('*')) return true
    return perms.some(p => permissions.includes(p))
  }, [permissions])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      hasPermission,
      hasAnyPermission,
      permissions,
      isCompanyOwner,
      activeBranchId,
      setActiveBranchId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
