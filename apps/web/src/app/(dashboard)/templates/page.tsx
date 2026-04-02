'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import RecurringTemplateCard from '@/components/templates/RecurringTemplateCard'
import RecurringTemplateModal from '@/components/templates/RecurringTemplateModal'
import RecurringTrackModal from '@/components/templates/RecurringTrackModal'
import PageGuard from '@/components/PageGuard'

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type ScheduleType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  CRITICAL: { label: 'Kritik', color: 'bg-red-100 text-red-700' },
  HIGH: { label: 'Yüksək', color: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: 'Orta', color: 'bg-blue-100 text-blue-700' },
  LOW: { label: 'Aşağı', color: 'bg-gray-100 text-gray-700' },
}

const scheduleLabels: Record<ScheduleType, string> = {
  ONCE: 'Tək dəfəlik', DAILY: 'Hər gün', WEEKLY: 'Həftəlik', MONTHLY: 'Aylıq', CUSTOM: 'Xüsusi interval',
}

const dayNames = ['Bazar', 'B.e.', 'Ç.a.', 'Çərşənbə', 'C.a.', 'Cümə', 'Şənbə']

function getScheduleText(t: any): string {
  switch (t.scheduleType) {
    case 'DAILY': return `Hər gün ${t.scheduleTime}`
    case 'WEEKLY': return `Hər ${dayNames[t.dayOfWeek || 0]} ${t.scheduleTime}`
    case 'MONTHLY': return `Hər ayın ${t.dayOfMonth}-i ${t.scheduleTime}`
    case 'CUSTOM': return `Hər ${t.customDays} gündən bir ${t.scheduleTime}`
    case 'ONCE': return `Tək dəfəlik ${t.scheduleTime}`
    default: return ''
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailTemplate, setDetailTemplate] = useState<any | null>(null)
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'templates' | 'recurring'>('templates')
  const [recurringModalOpen, setRecurringModalOpen] = useState(false)
  const [editRecurringTemplate, setEditRecurringTemplate] = useState<any | null>(null)
  const [trackTemplate, setTrackTemplate] = useState<any | null>(null)

  const [newTemplate, setNewTemplate] = useState({
    name: '', description: '', scheduleType: 'WEEKLY' as ScheduleType,
    dayOfWeek: 1, dayOfMonth: 1, time: '09:00', customDays: 7,
  })
  const [templateItems, setTemplateItems] = useState<{ title: string; priority: Priority }[]>([{ title: '', priority: 'MEDIUM' }])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => { loadTemplates() }, [])

  const [recurringTodos, setRecurringTodos] = useState<any[]>([])

  async function loadTemplates() {
    setLoading(true)
    try {
      const [tmpl, todos] = await Promise.all([
        api.getTemplates().catch(() => []),
        api.getTodoistTasks().catch(() => []),
      ])
      setTemplates(tmpl)
      setRecurringTodos(todos.filter((t: any) => t.isRecurring))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const tabTemplates = activeTab === 'templates'
    ? recurringTodos
    : templates.filter(t => t.isRecurring)
  const filtered = filterActive === 'ALL' ? tabTemplates : tabTemplates.filter(t => {
    if (activeTab === 'templates') {
      // Şəxsi TODO-lar: aktiv = tamamlanmamış
      return filterActive === 'ACTIVE' ? !t.isCompleted : t.isCompleted
    }
    // GÖREV şablonları: aktiv = isActive
    return filterActive === 'ACTIVE' ? t.isActive : !t.isActive
  })
  const recurringCount = templates.filter(t => t.isRecurring).length
  const standardCount = recurringTodos.length

  function addItem() { setTemplateItems([...templateItems, { title: '', priority: 'MEDIUM' }]) }
  function removeItem(i: number) { if (templateItems.length > 1) setTemplateItems(templateItems.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, value: string) { const u = [...templateItems]; u[i] = { ...u[i], [field]: value }; setTemplateItems(u) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!newTemplate.name.trim()) errors.name = 'Şablon adı daxil edin'
    const validItems = templateItems.filter(i => i.title.trim())
    if (validItems.length === 0) errors.items = 'Minimum 1 tapşırıq əlavə edin'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return
    try {
      await api.createTemplate({
        name: newTemplate.name, description: newTemplate.description,
        scheduleType: newTemplate.scheduleType, scheduleTime: newTemplate.time,
        dayOfWeek: newTemplate.scheduleType === 'WEEKLY' ? newTemplate.dayOfWeek : undefined,
        dayOfMonth: newTemplate.scheduleType === 'MONTHLY' ? newTemplate.dayOfMonth : undefined,
        customDays: newTemplate.scheduleType === 'CUSTOM' ? newTemplate.customDays : undefined,
        items: validItems,
      })
      setModalOpen(false)
      setNewTemplate({ name: '', description: '', scheduleType: 'WEEKLY', dayOfWeek: 1, dayOfMonth: 1, time: '09:00', customDays: 7 })
      setTemplateItems([{ title: '', priority: 'MEDIUM' }])
      await loadTemplates()
    } catch (err: any) { setFormErrors({ name: err.message }) }
  }

  async function handleToggle(id: string) {
    setActionLoading(true)
    try { await api.toggleTemplate(id); setDetailTemplate(null); await loadTemplates() }
    catch (err) { console.error(err) } finally { setActionLoading(false) }
  }

  async function handleExecute(id: string) {
    setActionLoading(true)
    try {
      const result = await api.executeTemplate(id)
      alert(result.message)
      setDetailTemplate(null)
      await loadTemplates()
    } catch (err) { console.error(err) } finally { setActionLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu şablonu silmək istəyirsiniz?')) return
    try { await api.deleteTemplate(id); setDetailTemplate(null); await loadTemplates() }
    catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><svg className="animate-spin h-8 w-8" style={{ color: 'var(--todoist-red)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>

  return (
    <PageGuard requires={['tasks.read']}>
    <div className="pb-10">
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-[24px] font-extrabold" style={{ color: 'var(--todoist-text)' }}>Şablonlar</h1>
          <p className="text-[13px]" style={{ color: 'var(--todoist-text-secondary)' }}>Görev şablonları və təkrarlanan görevlər</p>
        </div>
        {/* Əlavə düyməsi silindi — şablonlar yalnız tapşırıq yaradarkən "Təkrarla" ilə yaranır */}
      </div>

      {/* ═══ 2 TAB BAR ═══ */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid var(--todoist-divider)' }}>
        <button
          onClick={() => { setActiveTab('templates'); setFilterActive('ALL') }}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-2 ${activeTab === 'templates' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}
        >
          🔁 Şəxsi Təkrarlanan
          <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${activeTab === 'templates' ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{standardCount}</span>
        </button>
        <button
          onClick={() => { setActiveTab('recurring'); setFilterActive('ALL') }}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition flex items-center gap-2 ${activeTab === 'recurring' ? 'border-[var(--todoist-red)] text-[var(--todoist-red)]' : 'border-transparent text-[var(--todoist-text-secondary)] hover:text-[var(--todoist-text)]'}`}
        >
          🔁 Təkrarlanan Görevlər
          <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${activeTab === 'recurring' ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)]' : 'bg-[var(--todoist-border)] text-[var(--todoist-text-tertiary)]'}`}>{recurringCount}</span>
        </button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
          <button key={f} onClick={() => setFilterActive(f)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition border-[1.5px]"
            style={{
              backgroundColor: filterActive === f ? 'var(--todoist-red)' : 'var(--todoist-surface)',
              color: filterActive === f ? 'var(--todoist-surface)' : 'var(--todoist-text)',
              borderColor: filterActive === f ? 'var(--todoist-red)' : 'var(--todoist-divider)'
            }}>
            {f === 'ALL' ? 'Hamısı' : f === 'ACTIVE' ? 'Aktiv' : 'Dayandırılmış'}
          </button>
        ))}
      </div>

      {/* ═══ Təkrarlanan Görevlər Tab ═══ */}
      {activeTab === 'recurring' && (
        <div>
          {filtered.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ border: '1px solid var(--todoist-divider)', background: 'var(--todoist-surface)' }}>
              <p style={{ color: 'var(--todoist-text-tertiary)' }}>Təkrarlanan görev şablonu tapılmadı</p>
              <button onClick={() => { setEditRecurringTemplate(null); setRecurringModalOpen(true) }} className="mt-3 text-sm font-medium" style={{ color: 'var(--todoist-red)' }}>
                İlk təkrarlanan görevi yaradın →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((template) => (
                <RecurringTemplateCard
                  key={template.id}
                  template={template}
                  onToggle={handleToggle}
                  onEdit={(t) => { setEditRecurringTemplate(t); setRecurringModalOpen(true) }}
                  onTrack={(t) => setTrackTemplate(t)}
                  onDelete={handleDelete}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Şəxsi Təkrarlanan Tab — recurring TODO-lar ═══ */}
      {activeTab === 'templates' && (filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ border: '1px solid var(--todoist-divider)', background: 'var(--todoist-surface)' }}>
          <p style={{ color: 'var(--todoist-text-tertiary)' }}>Şəxsi təkrarlanan tapşırıq tapılmadı</p>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--todoist-text-secondary)' }}>TODO yaradarkən "Təkrarla" seçimini aktiv edin</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo: any) => {
            const recurLabel = todo.recurRule === 'daily' ? 'Hər gün' : todo.recurRule === 'weekly' ? 'Hər həftə' : todo.recurRule === 'monthly' ? 'Hər ay' : todo.recurRule
            const statusColor = (todo.todoStatus || 'WAITING') === 'DONE' ? '#10B981' : (todo.todoStatus || 'WAITING') === 'IN_PROGRESS' ? '#F59E0B' : '#64748B'
            const statusLabel = (todo.todoStatus || 'WAITING') === 'DONE' ? 'Tamamlandı' : (todo.todoStatus || 'WAITING') === 'IN_PROGRESS' ? 'Davam edir' : 'Gözləyir'
            return (
              <div key={todo.id} className="flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer hover:shadow-sm"
                style={{ background: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}
                onClick={() => setDetailTemplate(todo)}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--todoist-text)' }}>{todo.content}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>🔁 {recurLabel}</span>
                    <span className="text-[10px]" style={{ color: statusColor }}>{statusLabel}</span>
                    {todo.dueDate && <span className="text-[10px]" style={{ color: 'var(--todoist-text-tertiary)' }}>📅 {new Date(todo.dueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</span>}
                    {todo.project?.name && <span className="text-[10px]" style={{ color: '#EB8909' }}>📂 {todo.project.name}</span>}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: '#FFF3E0', color: '#EB8909', fontWeight: 700 }}>TODO</span>
              </div>
            )
          })}
        </div>
      ))}

      {/* ═══ Köhnə Şəxsi Təkrarlanan kart (gizli saxlanılır, lazım olanda açılacaq) ═══ */}
      {false && (activeTab as string) === 'templates_old' && (filtered.length === 0 ? (
        <div />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((template) => (
            <div key={template.id} onClick={() => setDetailTemplate(template)} className={`rounded-xl p-5 hover:shadow-md transition cursor-pointer ${template.isActive ? '' : 'opacity-60'}`} style={{ background: 'var(--todoist-surface)', border: '1px solid var(--todoist-divider)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--todoist-text)' }}>{template.name}</h3>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${template.isActive ? 'bg-green-100 text-green-700' : ''}`} style={!template.isActive ? { background: 'var(--todoist-hover)', color: 'var(--todoist-text-secondary)' } : undefined}>
                      {template.isActive ? 'Aktiv' : 'Dayandırılmış'}
                    </span>
                  </div>
                  {template.description && <p className="text-xs mt-0.5" style={{ color: 'var(--todoist-text-secondary)' }}>{template.description}</p>}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] uppercase font-medium mb-1.5" style={{ color: 'var(--todoist-text-tertiary)' }}>Tapşırıqlar ({template.items?.length || 0})</p>
                <div className="space-y-1">
                  {template.items?.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--todoist-text-tertiary)' }} />
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--todoist-text)' }}>{item.title}</span>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium ${priorityConfig[item.priority as Priority]?.color || 'bg-gray-100'}`}>
                        {priorityConfig[item.priority as Priority]?.label || item.priority}
                      </span>
                    </div>
                  ))}
                  {(template.items?.length || 0) > 3 && <p className="text-[10px] pl-3.5" style={{ color: 'var(--todoist-text-tertiary)' }}>+{template.items.length - 3} daha</p>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--todoist-text-secondary)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {getScheduleText(template)}
                </div>
                <div className="flex items-center gap-1">
                  {template.assignees?.slice(0, 2).map((a: any) => (
                    <div key={a.user.id} className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: 'var(--todoist-red-light)' }} title={a.user.fullName}>
                      <span className="text-[9px] font-semibold" style={{ color: 'var(--todoist-red)' }}>{a.user.fullName.split(' ').map((n: string) => n[0]).join('')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Detail Modal */}
      {detailTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailTemplate(null)}>
          <div className="w-full max-w-lg rounded-xl p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--todoist-surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--todoist-text)' }}>{detailTemplate.name}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${detailTemplate.isActive ? 'bg-green-100 text-green-700' : ''}`} style={!detailTemplate.isActive ? { background: 'var(--todoist-hover)', color: 'var(--todoist-text-secondary)' } : undefined}>
                    {detailTemplate.isActive ? 'Aktiv' : 'Dayandırılmış'}
                  </span>
                </div>
                {detailTemplate.description && <p className="text-sm mt-1" style={{ color: 'var(--todoist-text-secondary)' }}>{detailTemplate.description}</p>}
              </div>
              <button onClick={() => setDetailTemplate(null)} style={{ color: 'var(--todoist-text-tertiary)' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--todoist-red-light)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--todoist-red)' }}>Zamanlama: {getScheduleText(detailTemplate)}</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div><p className="text-[10px] uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Son icra</p><p className="text-xs" style={{ color: 'var(--todoist-red)' }}>{detailTemplate.lastRunAt ? new Date(detailTemplate.lastRunAt).toLocaleString('az') : '—'}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: 'var(--todoist-text-tertiary)' }}>Növbəti icra</p><p className="text-xs" style={{ color: 'var(--todoist-red)' }}>{detailTemplate.nextRunAt ? new Date(detailTemplate.nextRunAt).toLocaleString('az') : '—'}</p></div>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--todoist-text-secondary)' }}>Tapşırıqlar ({detailTemplate.items?.length || 0})</p>
              <div className="space-y-2">
                {detailTemplate.items?.map((item: any, i: number) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: '1px solid var(--todoist-divider)' }}>
                    <span className="text-xs font-bold w-5" style={{ color: 'var(--todoist-text-tertiary)' }}>{i + 1}</span>
                    <span className="text-sm flex-1" style={{ color: 'var(--todoist-text)' }}>{item.title}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityConfig[item.priority as Priority]?.color || 'bg-gray-100'}`}>{priorityConfig[item.priority as Priority]?.label || item.priority}</span>
                  </div>
                ))}
              </div>
            </div>
            {detailTemplate.assignees?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--todoist-text-secondary)' }}>Atanan şəxslər</p>
                <div className="flex gap-2 flex-wrap">
                  {detailTemplate.assignees.map((a: any) => (
                    <span key={a.user.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--todoist-red-light)', color: 'var(--todoist-red)' }}>{a.user.fullName}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 flex gap-2 flex-wrap" style={{ borderTop: '1px solid var(--todoist-divider)' }}>
              <button disabled={actionLoading} onClick={() => handleToggle(detailTemplate.id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${detailTemplate.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                {detailTemplate.isActive ? 'Dayandır' : 'Aktivləşdir'}
              </button>
              <button disabled={actionLoading} onClick={() => handleExecute(detailTemplate.id)} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50" style={{ background: 'var(--todoist-red)' }}>İndi İcra Et</button>
              <button onClick={() => handleDelete(detailTemplate.id)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition">Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--todoist-surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--todoist-text)' }}>Yeni Tapşırıq Şablonu</h3>
              <button onClick={() => setModalOpen(false)} style={{ color: 'var(--todoist-text-tertiary)' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--todoist-text)' }}>Şablon adı</label>
                <input type="text" value={newTemplate.name} onChange={(e) => { setNewTemplate({ ...newTemplate, name: e.target.value }); setFormErrors({}) }} placeholder="Həftəlik Hesabat..." className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition ${formErrors.name ? 'border-red-400' : 'focus:border-[var(--todoist-red)]'}`} style={{ borderColor: formErrors.name ? undefined : 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--todoist-text)' }}>Təsvir</label>
                <textarea value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} rows={2} placeholder="Açıqlama..." className="mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm outline-none resize-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--todoist-text)' }}>Tapşırıqlar</label>
                  <button type="button" onClick={addItem} className="text-xs font-medium" style={{ color: 'var(--todoist-red)' }}>+ Əlavə et</button>
                </div>
                {formErrors.items && <p className="mb-2 text-xs text-red-500">{formErrors.items}</p>}
                <div className="space-y-2">
                  {templateItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-4 shrink-0" style={{ color: 'var(--todoist-text-tertiary)' }}>{i + 1}.</span>
                      <input type="text" value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)} placeholder="Tapşırıq adı" className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                      <select value={item.priority} onChange={(e) => updateItem(i, 'priority', e.target.value)} className="rounded-lg border px-2 py-2 text-xs outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}>
                        <option value="CRITICAL">Kritik</option><option value="HIGH">Yüksək</option><option value="MEDIUM">Orta</option><option value="LOW">Aşağı</option>
                      </select>
                      {templateItems.length > 1 && <button type="button" onClick={() => removeItem(i)} className="hover:text-red-500" style={{ color: 'var(--todoist-text-tertiary)' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ border: '1px solid var(--todoist-divider)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--todoist-text)' }}>Zamanlama</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Tip</label>
                    <select value={newTemplate.scheduleType} onChange={(e) => setNewTemplate({ ...newTemplate, scheduleType: e.target.value as ScheduleType })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}>
                      {Object.entries(scheduleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Saat</label>
                    <input type="time" value={newTemplate.time} onChange={(e) => setNewTemplate({ ...newTemplate, time: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                  </div>
                </div>
                {newTemplate.scheduleType === 'WEEKLY' && (
                  <div className="mt-3"><label className="block text-xs mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Həftənin günü</label>
                    <div className="flex gap-1">{dayNames.map((name, i) => (
                      <button key={i} type="button" onClick={() => setNewTemplate({ ...newTemplate, dayOfWeek: i })} className="flex-1 rounded-md py-1.5 text-xs font-medium transition" style={newTemplate.dayOfWeek === i ? { background: 'var(--todoist-red)', color: 'white' } : { background: 'var(--todoist-hover)', color: 'var(--todoist-text-secondary)' }}>{name.slice(0, 2)}</button>
                    ))}</div>
                  </div>
                )}
                {newTemplate.scheduleType === 'MONTHLY' && (
                  <div className="mt-3"><label className="block text-xs mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Ayın günü</label>
                    <input type="number" min={1} max={31} value={newTemplate.dayOfMonth} onChange={(e) => setNewTemplate({ ...newTemplate, dayOfMonth: parseInt(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                  </div>
                )}
                {newTemplate.scheduleType === 'CUSTOM' && (
                  <div className="mt-3"><label className="block text-xs mb-1" style={{ color: 'var(--todoist-text-secondary)' }}>Hər neçə gündən bir</label>
                    <input type="number" min={1} value={newTemplate.customDays} onChange={(e) => setNewTemplate({ ...newTemplate, customDays: parseInt(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--todoist-red)]" style={{ borderColor: 'var(--todoist-divider)', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition" style={{ borderColor: 'var(--todoist-divider)', color: 'var(--todoist-text)', background: 'var(--todoist-surface)' }}>Ləğv et</button>
                <button type="submit" className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--todoist-red)' }}>Yarat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Təkrarlanan Görev Yaratma/Düzənləmə Modalı ═══ */}
      <RecurringTemplateModal
        open={recurringModalOpen}
        editTemplate={editRecurringTemplate}
        onClose={() => { setRecurringModalOpen(false); setEditRecurringTemplate(null) }}
        onSaved={loadTemplates}
      />

      {/* ═══ Müdür İzləmə Modalı ═══ */}
      <RecurringTrackModal
        open={!!trackTemplate}
        template={trackTemplate}
        onClose={() => setTrackTemplate(null)}
        onDeletePeriod={() => { setTrackTemplate(null); alert('Bu ayın atanması silindi.') }}
      />
    </div>
    </PageGuard>
  )
}
