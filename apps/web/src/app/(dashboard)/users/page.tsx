'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import PageGuard from '@/components/PageGuard'

type Role = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'BUSINESS_MANAGER' | 'TEAM_MANAGER' | 'EMPLOYEE'

interface UserBiz {
  businessId: string
  departmentId: string | null
  customRoleId: string | null
  positionTitle: string | null
  salary: number | null
  payDay: number | null
  startDate: string | null
  business: { id: string; name: string }
  department: { id: string; name: string; color: string } | null
  customRole: { id: string; name: string } | null
}

interface User {
  id: string
  fullName: string
  email: string
  role: Role
  parentId: string | null
  status: 'active' | 'inactive'
  customRoleId: string | null
  customRole: { id: string; name: string } | null
  businesses?: UserBiz[]
}

interface Business {
  id: string
  name: string
  departments: { department: { id: string; name: string; color: string } }[]
  _count: { users: number }
}

interface CustomRole {
  id: string
  name: string
  permissions: string[]
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Baş Müdir',
  BUSINESS_MANAGER: 'İşletmə Müdiri',
  TEAM_MANAGER: 'İşçi Müdiri',
  EMPLOYEE: 'İşçi',
}

const roleStyles: Record<Role, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  TENANT_ADMIN: { bg: 'rgba(147,51,234,0.1)', color: '#9333EA' },
  BUSINESS_MANAGER: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB' },
  TEAM_MANAGER: { bg: 'rgba(234,179,8,0.1)', color: '#CA8A04' },
  EMPLOYEE: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
}

interface TreeNode extends User { children: TreeNode[] }

function countDescendants(node: TreeNode): number {
  let c = 0; for (const ch of node.children) { c += 1 + countDescendants(ch) }; return c
}

function OrgChartNode({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const desc = hasChildren ? countDescendants(node) : 0
  const rs = roleStyles[node.role]
  return (
    <div className="flex flex-col items-center">
      <div onClick={() => hasChildren && setExpanded(!expanded)}
        className={`relative rounded-lg px-3 py-2 transition text-center ${hasChildren ? 'cursor-pointer' : ''}`}
        style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
        <p className="text-[11px] font-semibold leading-tight whitespace-nowrap" style={{ color: 'var(--todoist-text)' }}>{node.fullName}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold" style={{ backgroundColor: rs.bg, color: rs.color }}>{roleLabels[node.role]}</span>
          {hasChildren && <span className="inline-flex items-center rounded-full px-1 py-px text-[8px] font-bold text-white" style={{ backgroundColor: 'var(--todoist-red)' }}>{desc}</span>}
          {hasChildren && <svg className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--todoist-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>}
        </div>
        <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full`} style={{ backgroundColor: node.status === 'active' ? '#10B981' : '#9CA3AF', border: '2px solid var(--todoist-surface)' }} />
      </div>
      {hasChildren && expanded && (<>
        <div className="w-0.5 h-3 rounded" style={{ backgroundColor: 'var(--todoist-divider)' }} />
        <div className="flex gap-2">
          {node.children.map((child, i) => (
            <div key={child.id} className="relative flex flex-col items-center">
              <div className="w-0.5 h-3 rounded" style={{ backgroundColor: 'var(--todoist-divider)' }} />
              {node.children.length > 1 && <div className="absolute top-0 h-0.5" style={{ backgroundColor: 'var(--todoist-divider)', left: i === 0 ? '50%' : '0', right: i === node.children.length - 1 ? '50%' : '0' }} />}
              <OrgChartNode node={child} />
            </div>
          ))}
        </div>
      </>)}
    </div>
  )
}

// ═══ Assignment Row ═══
interface AssignmentData {
  businessId: string; departmentId: string; customRoleId: string
  positionTitle: string; salary: string; payDay: string; startDate: string
}

function AssignmentRow({ assignment, businesses, roles, onChange, onRemove, index }: {
  assignment: AssignmentData
  businesses: Business[]; roles: CustomRole[]
  onChange: (index: number, field: string, value: string) => void
  onRemove: (index: number) => void; index: number
}) {
  const selectedBiz = businesses.find(b => b.id === assignment.businessId)
  const departments = selectedBiz?.departments?.map(d => d.department) || []
  const inputStyle = { backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)' }}>
      {/* Sıra 1: Filial | Şöbə | Yetki */}
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Filial</label>
            <select value={assignment.businessId}
              onChange={e => { onChange(index, 'businessId', e.target.value); onChange(index, 'departmentId', '') }}
              className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition"
              style={inputStyle}>
              <option value="">Seçin...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Şöbə</label>
            <select value={assignment.departmentId}
              onChange={e => onChange(index, 'departmentId', e.target.value)}
              disabled={!assignment.businessId || departments.length === 0}
              className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition disabled:opacity-50"
              style={inputStyle}>
              <option value="">{departments.length === 0 ? 'Şöbə yoxdur' : 'Seçin...'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Yetki Qrupu</label>
            <select value={assignment.customRoleId}
              onChange={e => onChange(index, 'customRoleId', e.target.value)}
              className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition"
              style={inputStyle}>
              <option value="">Seçin...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => onRemove(index)} type="button" className="mt-5 p-1.5 rounded-lg transition shrink-0" style={{ color: 'var(--todoist-red)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(220,76,62,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      {/* Sıra 2: Vəzifə | Maaş | Ödəmə günü | Başlama tarixi */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Vəzifə</label>
          <input type="text" value={assignment.positionTitle} placeholder="Müdir, İşçi..."
            onChange={e => onChange(index, 'positionTitle', e.target.value)}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Maaş (₼)</label>
          <input type="number" value={assignment.salary} placeholder="0"
            onChange={e => onChange(index, 'salary', e.target.value)}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Ödəmə günü</label>
          <select value={assignment.payDay} onChange={e => onChange(index, 'payDay', e.target.value)}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition" style={inputStyle}>
            <option value="">Ay sonu</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={String(d)}>Ayın {d}-i</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Başlama tarixi</label>
          <input type="date" value={assignment.startDate}
            onChange={e => onChange(index, 'startDate', e.target.value)}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition" style={inputStyle} />
        </div>
      </div>
    </div>
  )
}

// ═══ MAIN PAGE ═══
export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth()
  const [view, setView] = useState<'table' | 'tree'>('table')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [hierarchy, setHierarchy] = useState<TreeNode[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'EMPLOYEE' as Role, customRoleId: '' })
  const [assignments, setAssignments] = useState<AssignmentData[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  const canCreate = hasPermission('users.manage')
  const canUpdate = hasPermission('users.manage')
  const canAssignRole = hasPermission('users.manage')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, tree, bizList, roleList] = await Promise.all([
        api.getUsers(), api.getUserHierarchy(),
        api.getBusinesses().catch(() => []), api.getRoles().catch(() => []),
      ])
      setUsers(list); setHierarchy(tree); setBusinesses(bizList); setRoles(roleList)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const managers = users.filter(u => u.role === 'TEAM_MANAGER' || u.role === 'BUSINESS_MANAGER').length
  const employees = users.filter(u => u.role === 'EMPLOYEE').length

  function openCreateModal() {
    setEditingUser(null)
    setFormData({ fullName: '', email: '', password: '', role: 'EMPLOYEE', customRoleId: '' })
    setAssignments([]); setFormErrors({}); setSubmitError(''); setModalOpen(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setFormData({ fullName: user.fullName, email: user.email, password: '', role: user.role, customRoleId: user.customRoleId || '' })
    setAssignments((user.businesses || []).map(b => ({
      businessId: b.businessId, departmentId: b.departmentId || '', customRoleId: b.customRoleId || '',
      positionTitle: b.positionTitle || '', salary: b.salary != null ? String(b.salary) : '', payDay: b.payDay != null ? String(b.payDay) : '',
      startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
    })))
    setFormErrors({}); setSubmitError(''); setModalOpen(true)
  }

  function addAssignment() { setAssignments(prev => [...prev, { businessId: '', departmentId: '', customRoleId: '', positionTitle: '', salary: '', payDay: '', startDate: '' }]) }
  function updateAssignment(index: number, field: string, value: string) { setAssignments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a)) }
  function removeAssignment(index: number) { setAssignments(prev => prev.filter((_, i) => i !== index)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!formData.fullName.trim()) errors.fullName = 'Ad daxil edin'
    if (!editingUser && !formData.email.trim()) errors.email = 'E-poçt daxil edin'
    if (!editingUser && (!formData.password.trim() || formData.password.length < 6)) errors.password = 'Şifrə min 6 simvol'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true); setSubmitError('')
    const validAssignments = assignments.filter(a => a.businessId).map(a => ({
      businessId: a.businessId, departmentId: a.departmentId || undefined, customRoleId: a.customRoleId || undefined,
      positionTitle: a.positionTitle || undefined,
      salary: a.salary ? parseFloat(a.salary) : undefined,
      payDay: a.payDay ? parseInt(a.payDay) : undefined,
      startDate: a.startDate || undefined,
    }))

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, { fullName: formData.fullName, role: formData.role, customRoleId: formData.customRoleId || null, assignments: validAssignments })
      } else {
        await api.createUser({ fullName: formData.fullName, email: formData.email, password: formData.password, role: formData.role, customRoleId: formData.customRoleId || undefined, parentId: currentUser?.id || null, assignments: validAssignments })
      }
      setModalOpen(false); await loadData()
    } catch (err: any) { setSubmitError(err.message || 'Xəta') }
    finally { setSaving(false) }
  }

  const stats = [
    { label: 'Ümumi', value: totalUsers, color: 'var(--todoist-text)' },
    { label: 'Aktiv', value: activeUsers, color: '#10B981' },
    { label: 'Müdir', value: managers, color: '#F59E0B' },
    { label: 'İşçi', value: employees, color: '#3B82F6' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-7 w-7" style={{ color: 'var(--todoist-red)' }} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  return (
    <PageGuard requires={['users.read']}>
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>İşçilər</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--todoist-text-tertiary)' }}>{totalUsers} işçi · Filial və şöbə idarəetməsi</p>
        </div>
        {canCreate && (
          <button onClick={openCreateModal} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: 'var(--todoist-red)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Yeni İşçi
          </button>
        )}
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--todoist-text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Axtarış + View toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--todoist-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="İşçi axtar..."
            className="w-full rounded-lg py-2 pl-10 pr-4 text-[13px] outline-none transition"
            style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--todoist-divider)' }}>
          {['table', 'tree'].map(v => (
            <button key={v} onClick={() => setView(v as any)}
              className="px-3 py-2 text-[12px] font-semibold transition"
              style={{
                backgroundColor: view === v ? 'var(--todoist-red)' : 'var(--todoist-surface)',
                color: view === v ? '#fff' : 'var(--todoist-text-secondary)',
              }}>
              {v === 'table' ? 'Cədvəl' : 'İerarxiya'}
            </button>
          ))}
        </div>
      </div>

      {/* Cədvəl */}
      {view === 'table' && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--todoist-divider)' }}>
                  {['Ad', 'E-poçt', 'Rol', 'Filial / Şöbə', 'Yetki Qrupu', 'Status', ...(canUpdate ? [''] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--todoist-text-tertiary)', backgroundColor: 'var(--todoist-bg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center" style={{ color: 'var(--todoist-text-tertiary)' }}>İşçi tapılmadı</td></tr>
                ) : filtered.map(u => {
                  const rs = roleStyles[u.role]
                  return (
                    <tr key={u.id} className="transition" style={{ borderBottom: '1px solid var(--todoist-divider)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--todoist-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: rs.bg }}>
                              <span className="text-[11px] font-bold" style={{ color: rs.color }}>{u.fullName.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.status === 'active' ? '#10B981' : '#9CA3AF', border: '2px solid var(--todoist-surface)' }} />
                          </div>
                          <span className="font-semibold" style={{ color: 'var(--todoist-text)' }}>{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--todoist-text-secondary)' }}>{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: rs.bg, color: rs.color }}>{roleLabels[u.role]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.businesses && u.businesses.length > 0 ? (
                          <div className="space-y-1.5">
                            {u.businesses.map((b, i) => (
                              <div key={i} className="text-[12px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium" style={{ color: 'var(--todoist-text)' }}>{b.business.name}</span>
                                  {b.department && (<>
                                    <span style={{ color: 'var(--todoist-divider)' }}>/</span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.department.color }} />
                                      <span style={{ color: 'var(--todoist-text-secondary)' }}>{b.department.name}</span>
                                    </span>
                                  </>)}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {b.positionTitle && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>{b.positionTitle}</span>}
                                  {b.salary != null && <span className="text-[10px] font-semibold" style={{ color: '#10B981' }}>{b.salary.toLocaleString('az-AZ')} ₼</span>}
                                  {b.payDay != null && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>ayın {b.payDay}-i</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <span style={{ color: 'var(--todoist-text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.businesses && u.businesses.some(b => b.customRole) ? (
                          <div className="space-y-1">
                            {u.businesses.filter(b => b.customRole).map((b, i) => (
                              <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mr-1" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                                {b.customRole!.name}
                              </span>
                            ))}
                          </div>
                        ) : u.customRole ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                            {u.customRole.name}
                          </span>
                        ) : <span style={{ color: 'var(--todoist-text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: u.status === 'active' ? '#10B981' : 'var(--todoist-text-tertiary)' }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: u.status === 'active' ? '#10B981' : '#9CA3AF' }} />
                          {u.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                        </span>
                      </td>
                      {canUpdate && (
                        <td className="px-4 py-3">
                          <button onClick={() => openEditModal(u)} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg transition"
                            style={{ color: 'var(--todoist-red)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(220,76,62,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                            Redaktə
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* İerarxiya */}
      {view === 'tree' && (
        <div className="rounded-xl p-8 overflow-x-auto" style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
          <div className="flex justify-center min-w-max">
            {hierarchy.length === 0 ? <p style={{ color: 'var(--todoist-text-tertiary)' }}>İerarxiya boşdur</p> : hierarchy.map((node: TreeNode) => <OrgChartNode key={node.id} node={node} />)}
          </div>
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl p-6 shadow-2xl mx-4 mb-10" style={{ backgroundColor: 'var(--todoist-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--todoist-text)' }}>
                {editingUser ? 'İşçi Redaktə Et' : 'Yeni İşçi Əlavə Et'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ color: 'var(--todoist-text-tertiary)' }} className="hover:opacity-70">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {submitError && <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>{submitError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Ad və Soyad</label>
                  <input type="text" value={formData.fullName}
                    onChange={e => { setFormData({ ...formData, fullName: e.target.value }); setFormErrors({ ...formErrors, fullName: '' }) }}
                    placeholder="Adı Soyadı"
                    className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition"
                    style={{ backgroundColor: 'var(--todoist-bg)', border: formErrors.fullName ? '1px solid #EF4444' : '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
                  {formErrors.fullName && <p className="mt-1 text-[11px]" style={{ color: '#EF4444' }}>{formErrors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>E-poçt</label>
                  <input type="email" value={formData.email}
                    onChange={e => { setFormData({ ...formData, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }) }}
                    placeholder="email@domain.com" disabled={!!editingUser}
                    className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition"
                    style={{ backgroundColor: editingUser ? 'var(--todoist-bg)' : 'var(--todoist-bg)', border: formErrors.email ? '1px solid #EF4444' : '1px solid var(--todoist-divider)', color: editingUser ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)', opacity: editingUser ? 0.7 : 1 }} />
                  {formErrors.email && <p className="mt-1 text-[11px]" style={{ color: '#EF4444' }}>{formErrors.email}</p>}
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Şifrə</label>
                  <input type="password" value={formData.password}
                    onChange={e => { setFormData({ ...formData, password: e.target.value }); setFormErrors({ ...formErrors, password: '' }) }}
                    placeholder="Minimum 6 simvol"
                    className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition"
                    style={{ backgroundColor: 'var(--todoist-bg)', border: formErrors.password ? '1px solid #EF4444' : '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }} />
                  {formErrors.password && <p className="mt-1 text-[11px]" style={{ color: '#EF4444' }}>{formErrors.password}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Sistem Rolu</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                    className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition"
                    style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}>
                    <option value="EMPLOYEE">İşçi</option>
                    <option value="TEAM_MANAGER">İşçi Müdiri</option>
                    <option value="BUSINESS_MANAGER">İşletmə Müdiri</option>
                  </select>
                </div>
                {canAssignRole && (
                  <div>
                    <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Əsas Yetki Qrupu</label>
                    <select value={formData.customRoleId} onChange={e => setFormData({ ...formData, customRoleId: e.target.value })}
                      className="block w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition"
                      style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text)' }}>
                      <option value="">Seçin...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.permissions?.length || 0} yetki)</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Filial təyinatları */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[13px] font-bold" style={{ color: 'var(--todoist-text)' }}>Filial Təyinatları</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--todoist-text-tertiary)' }}>Hər filial üçün ayrı şöbə və yetki qrupu təyin edə bilərsiniz</p>
                  </div>
                  <button type="button" onClick={addAssignment} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition"
                    style={{ color: 'var(--todoist-red)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(220,76,62,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Filial əlavə et
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <div className="text-center py-6 rounded-lg" style={{ border: '2px dashed var(--todoist-divider)' }}>
                    <svg className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--todoist-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <p className="text-[12px]" style={{ color: 'var(--todoist-text-tertiary)' }}>Hələ filial təyin edilməyib</p>
                    <button type="button" onClick={addAssignment} className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--todoist-red)' }}>+ Filial əlavə et</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((a, i) => (
                      <AssignmentRow key={i} index={i} assignment={a} businesses={businesses} roles={roles} onChange={updateAssignment} onRemove={removeAssignment} />
                    ))}
                  </div>
                )}
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition"
                  style={{ backgroundColor: 'var(--todoist-bg)', border: '1px solid var(--todoist-divider)', color: 'var(--todoist-text-secondary)' }}>
                  Ləğv et
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: 'var(--todoist-red)' }}>
                  {saving ? 'Saxlanılır...' : editingUser ? 'Yadda saxla' : 'Əlavə et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageGuard>
  )
}
