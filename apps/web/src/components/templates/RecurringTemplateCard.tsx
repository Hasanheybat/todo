'use client'

const dayNames = ['Bazar', 'B.e.', 'Ç.a.', 'Çərşənbə', 'C.a.', 'Cümə', 'Şənbə']

function getScheduleText(t: any): string {
  if (t.scheduleType === 'WEEKLY') return `Hər ${dayNames[t.dayOfWeek || 0]}`
  if (t.scheduleType === 'MONTHLY') return `Hər ayın ${t.dayOfMonth}-i`
  if (t.scheduleType === 'DAILY') return 'Hər gün'
  if (t.scheduleType === 'CUSTOM') return `Hər ${t.customDays} gündən bir`
  return ''
}

interface RecurringTemplateCardProps {
  template: any
  onToggle: (id: string) => void
  onEdit: (template: any) => void
  onTrack: (template: any) => void
  onDelete: (id: string) => void
  actionLoading?: boolean
}

export default function RecurringTemplateCard({ template, onToggle, onEdit, onTrack, onDelete, actionLoading }: RecurringTemplateCardProps) {
  const scheduleText = getScheduleText(template)
  const isActive = template.isActive

  // Test dizaynındakı rənglər
  const borderColor = isActive ? 'var(--todoist-red)' : 'var(--todoist-divider)'
  const bgColor = isActive ? 'var(--todoist-red-light)' : 'var(--todoist-hover)'
  const scheduleStyle = template.scheduleType === 'WEEKLY'
    ? { background: '#F3E8FF', color: '#9333EA' }
    : { background: 'var(--todoist-red-light)', color: 'var(--todoist-red)' }

  return (
    <div
      style={{
        padding: '12px 14px',
        border: `1.5px solid ${borderColor}`,
        borderRadius: '10px',
        background: bgColor,
        opacity: isActive ? 1 : 0.7,
        transition: 'all 0.2s',
      }}
    >
      {/* Üst hissə — ad, zamanlama, toggle */}
      <div className="flex items-center gap-2.5" style={{ marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>📊</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--todoist-text)' : 'var(--todoist-text-secondary)' }} className="truncate">
              {template.name}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px',
              ...scheduleStyle
            }}>
              {scheduleText}
            </span>
            {!isActive && (
              <span style={{ fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', background: '#FFF3E0', color: '#EB8909' }}>
                ⏸ Dayandırılıb
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--todoist-text-secondary)', marginTop: '2px' }} className="flex items-center gap-1.5 flex-wrap">
            {template.business && <span>🏢 {template.business.name}</span>}
            {template.department && <span>· {template.department?.department?.name || template.department?.name}</span>}
            <span>· {template.assignees?.length || 0} işçi</span>
          </div>
        </div>

        {/* Toggle switch */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{ fontSize: '9px', fontWeight: 600, color: isActive ? '#058527' : '#EB8909' }}>
            {isActive ? 'Aktiv' : 'Dayandırılıb'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(template.id) }}
            disabled={actionLoading}
            style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: isActive ? '#058527' : 'var(--todoist-divider)',
              cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
              border: 'none',
            }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%', background: 'var(--todoist-surface)',
              position: 'absolute', top: '2px',
              ...(isActive ? { right: '2px' } : { left: '2px' }),
              transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Tarix məlumatları */}
      <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: '10px', color: 'var(--todoist-text-secondary)', marginBottom: '6px' }}>
        {template.lastRunAt && (
          <span>📅 Son göndərmə: {new Date(template.lastRunAt).toLocaleDateString('az')}</span>
        )}
        {template.nextRunAt && isActive && (
          <>
            <span>·</span>
            <span>📅 Növbəti: {new Date(template.nextRunAt).toLocaleDateString('az')}</span>
          </>
        )}
        {template.notificationDay && (
          <>
            <span>·</span>
            <span>🔔 Bildirim: ayın {template.notificationDay}-i</span>
          </>
        )}
        {template.deadlineDay && (
          <>
            <span>·</span>
            <span>⏰ Deadline: ayın {template.deadlineDay}-i</span>
          </>
        )}
      </div>

      {/* Alt görevlər */}
      {template.items?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: '10px', marginBottom: '6px' }}>
          <span style={{ fontWeight: 600, color: 'var(--todoist-text-secondary)' }}>Alt görevlər:</span>
          {template.items.slice(0, 3).map((item: any, i: number) => (
            <span key={item.id || i} style={{ padding: '2px 6px', background: 'var(--todoist-hover)', borderRadius: '4px', color: 'var(--todoist-text-secondary)' }}>
              {i + 1}. {item.title.length > 20 ? item.title.slice(0, 20) + '...' : item.title}
            </span>
          ))}
          {template.items.length > 3 && (
            <span style={{ color: 'var(--todoist-text-tertiary)' }}>+{template.items.length - 3} daha</span>
          )}
        </div>
      )}

      {/* Butonlar — test dizaynındakı stil */}
      <div className="flex gap-1.5" style={{ marginTop: '6px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(template) }}
          style={{
            padding: '4px 10px', fontSize: '10px', fontWeight: 600,
            background: 'var(--todoist-red-light)', color: 'var(--todoist-red)', border: '1px solid var(--todoist-red)',
            borderRadius: '6px', cursor: 'pointer',
          }}
        >
          ✏️ Düzənlə
        </button>
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onTrack(template) }}
            style={{
              padding: '4px 10px', fontSize: '10px', fontWeight: 600,
              background: '#ECFDF5', color: '#058527', border: '1px solid #A7F3D0',
              borderRadius: '6px', cursor: 'pointer',
            }}
          >
            📊 İzlə
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(template.id) }}
          style={{
            padding: '4px 8px', fontSize: '9px', fontWeight: 600,
            background: '#FFF5F5', color: '#DC4C3E', border: '1px solid #FFCDD2',
            borderRadius: '6px', cursor: 'pointer',
          }}
        >
          🗑 Sil
        </button>
      </div>
    </div>
  )
}
