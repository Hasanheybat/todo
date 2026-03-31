'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from '@/lib/permissions'
import ConfirmModal from '@/components/ConfirmModal'
import PageGuard from '@/components/PageGuard'

interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  isDefault?: boolean
  _count?: { users: number }
}

export default function RolesPage() {
  const { user, isCompanyOwner, permissions: myPerms } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPerms, setEditPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; confirmText: string; onConfirm: () => void }>({ open: false, title: '', message: '', type: 'info', confirmText: '', onConfirm: () => {} })

  const [allowedPerms, setAllowedPerms] = useState<string[]>([])

  useEffect(() => { loadRoles(); loadAllowed() }, [])

  async function loadAllowed() {
    try {
      const data = await api.getPermissions()
      setAllowedPerms(Array.isArray(data) ? data : ALL_PERMISSIONS)
    } catch { setAllowedPerms(ALL_PERMISSIONS) }
  }

  async function loadRoles() {
    try {
      const data = await api.getRoles()
      setRoles(data)
      if (data.length > 0 && !selectedRole) {
        selectRole(data[0])
      }
    } catch { }
    setLoading(false)
  }

  function selectRole(role: Role) {
    setSelectedRole(role)
    setEditName(role.name)
    setEditDesc(role.description || '')
    setEditPerms([...role.permissions])
    setIsNew(false)
  }

  function startNewRole() {
    setSelectedRole(null)
    setEditName('')
    setEditDesc('')
    setEditPerms([])
    setIsNew(true)
  }

  function togglePerm(key: string) {
    setEditPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  function toggleGroup(groupKey: string) {
    const group = PERMISSION_GROUPS.find(g => g.key === groupKey)
    if (!group) return
    const availablePerms = group.permissions.filter(p => canGrant(p.key)).map(p => p.key)
    const allSelected = availablePerms.every(p => editPerms.includes(p))
    if (allSelected) {
      setEditPerms(prev => prev.filter(p => !availablePerms.includes(p)))
    } else {
      setEditPerms(prev => [...new Set([...prev, ...availablePerms])])
    }
  }

  // Kaskad limit: yalnız özündə olan yetkiləri verə bilər
  // Kaskad limit: yalnız özündə olan yetkiləri verə bilər
  function canGrant(permKey: string): boolean {
    // Tenant-ın icazə verdiyi yetkidə olmalı VƏ istifadəçinin özündə olmalı
    const tenantAllows = allowedPerms.length === 0 || allowedPerms.includes(permKey)
    const userHas = myPerms.includes(permKey) || myPerms.includes('*')
    return tenantAllows && userHas
  }

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        await api.createRole({ name: editName.trim(), description: editDesc.trim(), permissions: editPerms })
      } else if (selectedRole) {
        await api.updateRole(selectedRole.id, { name: editName.trim(), description: editDesc.trim(), permissions: editPerms })
      }
      await loadRoles()
      setIsNew(false)
    } catch (err: any) {
      alert(err?.message || 'Xəta baş verdi')
    }
    setSaving(false)
  }

  function handleDelete() {
    if (!selectedRole) return
    setConfirmModal({
      open: true,
      title: 'Rolu sil',
      message: `"${selectedRole.name}" rolu silinəcək. Bu əməliyyat geri alına bilməz.`,
      type: 'danger',
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          await api.deleteRole(selectedRole.id)
          setSelectedRole(null)
          setIsNew(false)
          await loadRoles()
        } catch (err: any) {
          alert(err?.message || 'Silinə bilmədi')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Yüklənir...</span></div>

  // Yalnız users.manage yetkisi olan (admin) bu səhifəni görə bilər
  if (!canGrant('users.manage')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Bu səhifəyə giriş icazəniz yoxdur</p>
      </div>
    )
  }

  return (
    <PageGuard requires={['users.manage']}>
    <div className="pb-10">
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Rollar və Yetkiler</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Vəzifə rolları yaradın, yetkilər təyin edin</p>
        </div>
      </div>

      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* ── Sol panel: Rol siyahısı ── */}
        <div className="w-64 shrink-0">
          {canGrant('users.manage') && (
            <button
              onClick={startNewRole}
              className="w-full rounded-lg px-3 py-2 text-[12px] font-bold mb-3 transition"
              style={{ backgroundColor: 'var(--todoist-red)', color: 'var(--todoist-surface)' }}
            >
              + Yeni rol
            </button>
          )}

          <div className="space-y-1.5">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className="w-full text-left rounded-lg px-3 py-2.5 transition"
                style={{
                  backgroundColor: (selectedRole?.id === role.id && !isNew) ? 'var(--todoist-red-light)' : 'var(--todoist-surface)',
                  border: `1px solid ${(selectedRole?.id === role.id && !isNew) ? 'var(--todoist-red)' : 'var(--todoist-divider)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                    {role.isDefault && <span title="Default rol">🔒 </span>}
                    {role.name}
                  </span>
                  {role._count && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
                      {role._count.users} nəfər
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--todoist-text-secondary)' }}>{role.description}</p>
                )}
                <div className="text-[9px] mt-1" style={{ color: 'var(--todoist-text-tertiary)' }}>
                  {role.permissions.length} / {ALL_PERMISSIONS.length} yetki
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Sağ panel: Yetki redaktoru ── */}
        <div className="flex-1 rounded-xl p-5" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          {!selectedRole && !isNew ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Sol paneldən rol seçin və ya yeni rol yaradın</p>
            </div>
          ) : (
            <>
              {/* Rol adı + təsvir */}
              <div className="mb-5">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Rol adı (məs: Satış Müdürü)"
                  className="w-full text-[16px] font-bold outline-none mb-2"
                  style={{ color: 'var(--todoist-text)' }}
                />
                <input
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Qısa təsvir..."
                  className="w-full text-[12px] outline-none"
                  style={{ color: 'var(--todoist-text-secondary)' }}
                />
              </div>

              <div className="border-t" style={{ borderColor: 'var(--todoist-divider)' }} />

              {/* Yetki qrupları */}
              <div className="mt-4 space-y-3" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
                {PERMISSION_GROUPS.map(group => {
                  const availablePerms = group.permissions.filter(p => canGrant(p.key))
                  const selectedCount = group.permissions.filter(p => editPerms.includes(p.key)).length
                  const allAvailableSelected = availablePerms.length > 0 && availablePerms.every(p => editPerms.includes(p.key))

                  return (
                    <div key={group.key} className="rounded-lg" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-border)' }}>
                      {/* Qrup başlığı */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px]">{group.icon}</span>
                          <span className="text-[12px] font-bold" style={{ color: 'var(--todoist-text)' }}>{group.label}</span>
                          <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5" style={{ backgroundColor: selectedCount > 0 ? '#E6F4EA' : 'var(--todoist-border)', color: selectedCount > 0 ? '#058527' : 'var(--todoist-text-tertiary)' }}>
                            {selectedCount}/{group.permissions.length}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="text-[9px] font-bold px-2 py-0.5 rounded"
                          style={{ color: allAvailableSelected ? 'var(--todoist-red)' : '#246FE0', backgroundColor: allAvailableSelected ? 'var(--todoist-red-light)' : '#E8F0FE' }}
                        >
                          {allAvailableSelected ? 'Hamısını sil' : 'Hamısını seç'}
                        </button>
                      </div>

                      {/* Yetki checkbox-ları */}
                      <div className="px-3 pb-2.5 grid grid-cols-2 gap-1.5">
                        {group.permissions.map(perm => {
                          const granted = canGrant(perm.key)
                          const checked = editPerms.includes(perm.key)
                          return (
                            <label
                              key={perm.key}
                              className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer transition"
                              style={{
                                backgroundColor: checked ? '#E6F4EA' : 'var(--todoist-surface)',
                                border: `1px solid ${checked ? '#A8DAB5' : 'var(--todoist-divider)'}`,
                                opacity: granted ? 1 : 0.4,
                                pointerEvents: granted ? 'auto' : 'none',
                              }}
                              title={granted ? perm.description : 'Bu icazəniz yoxdur'}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePerm(perm.key)}
                                className="accent-green-600 w-3.5 h-3.5"
                                disabled={!granted}
                              />
                              <div>
                                <span className="text-[11px] font-semibold" style={{ color: checked ? '#058527' : 'var(--todoist-text)' }}>{perm.label}</span>
                                <p className="text-[9px]" style={{ color: 'var(--todoist-text-secondary)' }}>{perm.description}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: 'var(--todoist-divider)' }}>
                <div>
                  {selectedRole && !selectedRole.isDefault && !isNew && canGrant('users.manage') && (
                    <button
                      onClick={handleDelete}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--todoist-red)', backgroundColor: 'var(--todoist-red-light)' }}
                    >
                      Rolu sil
                    </button>
                  )}
                </div>
                {(isNew ? canGrant('users.manage') : canGrant('users.manage')) && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    className="text-[12px] font-bold px-5 py-2 rounded-lg transition"
                    style={{ backgroundColor: saving ? 'var(--todoist-text-tertiary)' : '#058527', color: 'var(--todoist-surface)', opacity: !editName.trim() ? 0.5 : 1 }}
                  >
                    {saving ? 'Saxlanır...' : isNew ? 'Yarat' : 'Saxla'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
    </div>
    </PageGuard>
  )
}
