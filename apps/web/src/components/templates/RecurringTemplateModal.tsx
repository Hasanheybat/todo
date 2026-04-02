'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import ConfirmModal from '@/components/ConfirmModal'

const dayNames = ['Bazar', 'B.e.', 'Ç.a.', 'Çərşənbə', 'C.a.', 'Cümə', 'Şənbə']

interface RecurringTemplateModalProps {
  open: boolean
  editTemplate?: any | null
  onClose: () => void
  onSaved: () => void
}

export default function RecurringTemplateModal({ open, editTemplate, onClose, onSaved }: RecurringTemplateModalProps) {
  const isEdit = !!editTemplate

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [scheduleType, setScheduleType] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY')
  const [dayOfMonth, setDayOfMonth] = useState(10)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [notificationDay, setNotificationDay] = useState(13)
  const [deadlineDay, setDeadlineDay] = useState(15)
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [items, setItems] = useState<{ title: string; priority: string }[]>([{ title: '', priority: 'MEDIUM' }])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Data
  const [businesses, setBusinesses] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      loadBusinesses()
      if (editTemplate) {
        setName(editTemplate.name || '')
        setDescription(editTemplate.description || '')
        setBusinessId(editTemplate.businessId || '')
        setDepartmentId(editTemplate.departmentId || '')
        setScheduleType(editTemplate.scheduleType === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY')
        setDayOfMonth(editTemplate.dayOfMonth || 10)
        setDayOfWeek(editTemplate.dayOfWeek || 1)
        setNotificationDay(editTemplate.notificationDay || 13)
        setDeadlineDay(editTemplate.deadlineDay || 15)
        setHasEndDate(!!editTemplate.endDate)
        setEndDate(editTemplate.endDate ? new Date(editTemplate.endDate).toISOString().split('T')[0] : '')
        setItems(editTemplate.items?.map((i: any) => ({ title: i.title, priority: i.priority })) || [{ title: '', priority: 'MEDIUM' }])
        setSelectedUsers(editTemplate.assignees?.map((a: any) => a.userId || a.user?.id) || [])
      } else {
        resetForm()
      }
    }
  }, [open, editTemplate])

  useEffect(() => {
    if (businessId) loadDepartments(businessId)
  }, [businessId])

  useEffect(() => {
    loadUsers()
  }, [businessId, departmentId])

  function resetForm() {
    setName(''); setDescription(''); setBusinessId(''); setDepartmentId('')
    setScheduleType('MONTHLY'); setDayOfMonth(10); setDayOfWeek(1)
    setNotificationDay(13); setDeadlineDay(15); setHasEndDate(false); setEndDate('')
    setItems([{ title: '', priority: 'MEDIUM' }]); setSelectedUsers([])
  }

  async function loadBusinesses() {
    try {
      const res = await api.getBusinesses()
      setBusinesses(res)
    } catch (e) { console.error(e) }
  }

  async function loadDepartments(bizId: string) {
    try {
      const res = await api.getDepartments()
      setDepartments(res.filter((d: any) => d.businessId === bizId || d.business?.id === bizId))
    } catch (e) { console.error(e) }
  }

  async function loadUsers() {
    try {
      const res = await api.getUsers()
      // Filial/şöbəyə görə filtrləmə
      const filtered = res.filter((u: any) => {
        if (!businessId) return true
        return u.businesses?.some((ub: any) => {
          const bizMatch = (ub.business?.id || ub.businessId) === businessId
          if (!departmentId) return bizMatch
          return bizMatch && (ub.departmentId === departmentId || ub.department?.id === departmentId)
        })
      })
      setUsers(filtered)
    } catch (e) { console.error(e) }
  }

  function toggleUser(userId: string) {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  function addItem() { setItems([...items, { title: '', priority: 'MEDIUM' }]) }
  function removeItem(i: number) { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, value: string) {
    const u = [...items]; u[i] = { ...u[i], [field]: value }; setItems(u)
  }

  async function handleSubmit() {
    if (!name.trim()) return alert('Görev başlığı daxil edin')
    const validItems = items.filter(i => i.title.trim())
    if (validItems.length === 0) return alert('Minimum 1 alt görev əlavə edin')
    if (selectedUsers.length === 0) return alert('Ən az 1 işçi seçin')

    if (isEdit) {
      setConfirmOpen(true)
      return
    }

    await doSave()
  }

  async function doSave() {
    setLoading(true)
    try {
      const payload = {
        name, description, isRecurring: true,
        scheduleType, scheduleTime: '09:00',
        dayOfMonth: scheduleType === 'MONTHLY' ? dayOfMonth : undefined,
        dayOfWeek: scheduleType === 'WEEKLY' ? dayOfWeek : undefined,
        businessId: businessId || undefined,
        departmentId: departmentId || undefined,
        notificationDay, deadlineDay,
        endDate: hasEndDate && endDate ? new Date(endDate).toISOString() : undefined,
        items: items.filter(i => i.title.trim()),
        assigneeIds: selectedUsers,
      }

      if (isEdit && editTemplate) {
        await api.updateTemplate(editTemplate.id, payload)
      } else {
        await api.createTemplate(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  const scheduleLabel = scheduleType === 'MONTHLY'
    ? `Hər ayın ${dayOfMonth}-i`
    : `Hər ${dayNames[dayOfWeek]}`

  const bizName = businesses.find(b => b.id === businessId)?.name || ''

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{ background: 'var(--todoist-surface)', borderRadius: '14px', width: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--todoist-divider)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{isEdit ? '✏️' : '🔁'}</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--todoist-text)', flex: 1 }}>{isEdit ? 'Şablonu Düzənlə' : 'Təkrarlanan Görev Yarat'}</h3>
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--todoist-hover)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--todoist-text-secondary)' }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px' }}>
            {/* Başlıq */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Görev başlığı</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Aylıq Satış Hesabatı..."
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--todoist-divider)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}
              />
            </div>

            {/* Təsvir */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Təsvir</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Açıqlama..."
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--todoist-divider)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', background: 'var(--todoist-surface)', color: 'var(--todoist-text)', resize: 'vertical', minHeight: '50px' }}
              />
            </div>

            {/* Filial + Şöbə */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Filial</label>
                <select
                  value={businessId} onChange={(e) => { setBusinessId(e.target.value); setDepartmentId(''); setSelectedUsers([]) }}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--todoist-divider)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}
                >
                  <option value="">Filial seçin...</option>
                  {businesses.map(b => <option key={b.id} value={b.id}>🏢 {b.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Şöbə</label>
                <select
                  value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--todoist-divider)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }}
                >
                  <option value="">Şöbə seçin...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.department?.name || d.name}</option>)}
                </select>
              </div>
            </div>

            {/* İşçilər */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>
                İşçilər {bizName && <span style={{ color: 'var(--todoist-text-tertiary)', fontWeight: 400 }}>({bizName})</span>}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {users.map(u => {
                  const sel = selectedUsers.includes(u.id)
                  const initials = (u.fullName || u.email || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <button key={u.id} onClick={() => toggleUser(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: '14px', fontSize: '10px', fontWeight: sel ? 600 : 500,
                        cursor: 'pointer', border: `1px solid ${sel ? 'var(--todoist-red)' : 'var(--todoist-divider)'}`,
                        background: sel ? 'var(--todoist-red-light)' : 'var(--todoist-surface)', color: sel ? 'var(--todoist-red)' : 'var(--todoist-text)',
                      }}
                    >
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: sel ? 'var(--todoist-red)' : 'var(--todoist-text-tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700 }}>
                        {initials}
                      </div>
                      {u.fullName || u.email}
                    </button>
                  )
                })}
                {users.length === 0 && businessId && <span style={{ fontSize: '10px', color: 'var(--todoist-text-tertiary)' }}>Bu filialda işçi tapılmadı</span>}
                {!businessId && <span style={{ fontSize: '10px', color: 'var(--todoist-text-tertiary)' }}>Əvvəlcə filial seçin</span>}
              </div>
            </div>

            {/* Alt görevlər */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Alt görevlər</label>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'var(--todoist-hover)', borderRadius: '6px', border: '1px solid var(--todoist-divider)', marginBottom: '4px' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--todoist-divider)', color: 'var(--todoist-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <input
                    value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)}
                    placeholder="Alt görev adı..."
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', fontFamily: 'inherit', color: 'var(--todoist-text)' }}
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--todoist-text-tertiary)', fontSize: '14px' }}>✕</button>
                  )}
                </div>
              ))}
              <div onClick={addItem} style={{ padding: '6px 8px', border: '1.5px dashed var(--todoist-divider)', borderRadius: '6px', fontSize: '11px', color: 'var(--todoist-text-tertiary)', cursor: 'pointer', textAlign: 'center' }}>
                ＋ Alt görev əlavə et
              </div>
            </div>

            {/* Zamanlama */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>🔁 Təkrarlama qaydası</label>
              <div style={{ marginBottom: '6px', padding: '6px 10px', background: 'var(--todoist-red-light)', borderRadius: '6px', fontSize: '10px', color: 'var(--todoist-red)', border: '1px solid var(--todoist-red)' }}>
                💡 Sistem hər dövrdə avtomatik bütün işçilərə görev göndərəcək. Siz bir dəfə qurursunuz, qalanını sistem edir.
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--todoist-red-light)', border: '1px solid var(--todoist-red)', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--todoist-red)', fontWeight: 600 }}>
                <span>Hər</span>
                <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as any)}
                  style={{ padding: '4px 6px', border: '1px solid var(--todoist-red)', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', background: 'var(--todoist-surface)', color: 'var(--todoist-text)', outline: 'none' }}>
                  <option value="MONTHLY">ayın</option>
                  <option value="WEEKLY">həftənin</option>
                </select>
                {scheduleType === 'MONTHLY' ? (
                  <input type="number" value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))} min={1} max={31}
                    style={{ width: '42px', textAlign: 'center', padding: '4px 6px', border: '1px solid var(--todoist-red)', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', background: 'var(--todoist-surface)', color: 'var(--todoist-text)', outline: 'none' }} />
                ) : (
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    style={{ padding: '4px 6px', border: '1px solid var(--todoist-red)', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', background: 'var(--todoist-surface)', color: 'var(--todoist-text)', outline: 'none' }}>
                    {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                )}
                {scheduleType === 'MONTHLY' && <span>-u/ı/si</span>}
              </div>
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--todoist-text-secondary)' }}>
                Məsələn: <strong>{scheduleLabel}</strong> — sistem avtomatik görev yaradıb işçilərə göndərəcək
              </div>

              {/* Bitiş tarixi */}
              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--todoist-hover)', border: '1px solid var(--todoist-divider)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} style={{ cursor: 'pointer' }} />
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', cursor: 'pointer' }} onClick={() => setHasEndDate(!hasEndDate)}>
                    Bitiş tarixi qoy <span style={{ fontWeight: 400 }}>(opsional — nə vaxt dayansın?)</span>
                  </label>
                </div>
                {hasEndDate && (
                  <div style={{ marginTop: '6px' }}>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '160px', padding: '6px 8px', border: '1.5px solid var(--todoist-divider)', borderRadius: '6px', fontSize: '11px', fontFamily: 'inherit', outline: 'none', background: 'var(--todoist-surface)', color: 'var(--todoist-text)' }} />
                    <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginTop: '2px' }}>Bu tarixdən sonra görev avtomatik dayanacaq</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tarixlər */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--todoist-text-secondary)', display: 'block', marginBottom: '4px' }}>Tarixlər</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Atanma */}
                <div style={{ flex: 1, padding: '8px 10px', border: '1.5px solid var(--todoist-red)', borderRadius: '8px', background: 'var(--todoist-red-light)' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--todoist-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>📅 ATANMA TARİXİ</div>
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginBottom: '4px' }}>Görev nə vaxt göndərilsin?</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--todoist-red)' }}>{scheduleLabel}</div>
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginTop: '2px' }}>Avtomatik — yuxarıdakı qaydadan gəlir</div>
                </div>
                {/* Bildirim */}
                <div style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #FFE0B2', borderRadius: '8px', background: '#FFF8F0' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--todoist-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>🔔 BİLDİRİM TARİXİ</div>
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginBottom: '4px' }}>Tamamlamayanlardan status istə</div>
                  <input type="number" value={notificationDay} onChange={(e) => setNotificationDay(Number(e.target.value))} min={1} max={31}
                    style={{ width: '60px', padding: '4px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', border: '1.5px solid #FFE0B2', borderRadius: '6px', fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginTop: '2px' }}>Ayın neçəsində xatırlatma?</div>
                </div>
                {/* Deadline */}
                <div style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #FFCDD2', borderRadius: '8px', background: '#FFF5F5' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--todoist-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>⏰ SON TARİX (DEADLİNE)</div>
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginBottom: '4px' }}>Nə vaxta qədər tamamlanmalı?</div>
                  <input type="number" value={deadlineDay} onChange={(e) => setDeadlineDay(Number(e.target.value))} min={1} max={31}
                    style={{ width: '60px', padding: '4px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', border: '1.5px solid #FFCDD2', borderRadius: '6px', fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ fontSize: '9px', color: 'var(--todoist-text-secondary)', marginTop: '2px' }}>Ayın neçəsində bitməli?</div>
                </div>
              </div>
            </div>

            {/* Düzənləmə xəbərdarlığı */}
            {isEdit && (
              <div style={{ padding: '8px 10px', background: '#FFF8F0', border: '1px solid #FFE0B2', borderRadius: '6px', fontSize: '10px', color: '#EB8909' }}>
                ⚠️ Dəyişikliklər yalnız <strong>gələcək dövrə</strong> tətbiq olunacaq. Mövcud atanmalar dəyişməz.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--todoist-divider)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', background: 'var(--todoist-surface)', color: 'var(--todoist-text-secondary)', border: '1px solid var(--todoist-divider)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Ləğv et
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '8px 20px', background: '#DC4C3E', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? '...' : isEdit ? '💾 Yadda saxla' : `🚀 Göndər — ${selectedUsers.length} işçiyə`}
            </button>
          </div>
        </div>
      </div>

      {/* Düzənləmə onaylama modalı */}
      <ConfirmModal
        open={confirmOpen}
        title="Dəyişiklikləri təsdiqləyin"
        message={`"${name}" şablonunda dəyişikliklər yadda saxlanılsın?\n\nDəyişikliklər yalnız gələcək dövrlərə tətbiq olunacaq. Artıq göndərilmiş atanmalar dəyişməyəcək.`}
        type="warning"
        confirmText="✅ Təsdiq et və saxla"
        onConfirm={() => { setConfirmOpen(false); doSave() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
