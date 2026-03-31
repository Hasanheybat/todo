'use client'

// Shared priority colors
export const P: Record<string, string> = { CRITICAL: '#7C3AED', HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', INFO: '#64748B' }

// Shared status config
export const S: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Yaradıldı', color: '#64748B', bg: '#F1F5F9' },
  PENDING: { label: 'Gözləyir', color: '#64748B', bg: '#F1F5F9' },
  IN_PROGRESS: { label: 'Davam edir', color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED: { label: 'Tamamlandı', color: '#10B981', bg: '#ECFDF5' },
  PENDING_APPROVAL: { label: 'Onay gözləyir', color: '#F59E0B', bg: '#FFFBEB' },
  APPROVED: { label: 'Onaylandı', color: '#10B981', bg: '#ECFDF5' },
  REJECTED: { label: 'Rədd', color: '#EF4444', bg: '#FEF2F2' },
  DECLINED: { label: 'Rədd edildi', color: '#EF4444', bg: '#FEF2F2' },
  FORCE_COMPLETED: { label: 'Bağlandı (donuq)', color: '#94A3B8', bg: '#F1F5F9' },
}

export function PrioFlag({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  )
}

export function daysDiff(d: string) {
  const now = new Date(); now.setHours(0,0,0,0)
  const due = new Date(d); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

interface TaskCardProps {
  task: any
  onClick: (task: any) => void
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const pColor = P[task.priority as keyof typeof P] || '#808080'
  const effectiveStatus = task.myStatus || task.status
  const sConfig = S[effectiveStatus] || S.CREATED
  const diff = task.dueDate ? daysDiff(task.dueDate) : null
  const done = ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].includes(effectiveStatus)
  const timeText = diff !== null ? (diff < 0 ? `${Math.abs(diff)} gün gecikmiş` : diff === 0 ? 'Bugün' : `${diff} gün qalıb`) : ''
  const timeColor = diff !== null && diff < 0 ? '#EF4444' : diff === 0 ? '#F59E0B' : '#64748B'
  const isGroup = !!task._groupCount && task._groupCount > 1

  return (
    <div onClick={() => onClick(task)} className="rounded-xl hover:shadow-md transition cursor-pointer overflow-hidden"
      style={{ backgroundColor: 'var(--todoist-surface)', border: '1px solid var(--todoist-border)' }}>

      {/* Üst rəng xətti */}
      <div style={{ height: 3, backgroundColor: pColor }} />

      {/* Yaradıcı badge */}
      {task.isCreator && (
        <div className="px-3 pt-1.5 flex items-center gap-1">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>Yaradıcı</span>
          {task.status !== effectiveStatus && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ backgroundColor: S[task.status]?.bg || '#F0F0F0', color: S[task.status]?.color || '#808080' }}>Görev: {S[task.status]?.label || task.status}</span>}
        </div>
      )}

      {/* Başlıq + bayrak + badge */}
      <div className={`px-3 ${task.isCreator ? 'pt-1' : 'pt-2.5'} pb-2 flex items-start justify-between gap-2`}>
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div className="shrink-0 mt-0.5"><PrioFlag color={pColor} size={14} /></div>
          <p className="text-[13px] font-semibold leading-snug"
            style={{ color: done ? 'var(--todoist-text-tertiary)' : 'var(--todoist-text)' }}>
            {task.title}
          </p>
        </div>
        {task.sourceTemplateId && (
          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
            🔁 Təkrarlanan
          </span>
        )}
        {isGroup && !task.sourceTemplateId && (
          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#E8F0FE', color: '#246FE0' }}>
            {task._groupCount} nəfər
          </span>
        )}
      </div>

      {/* Etiketlər + Layihə */}
      {(task.labels?.length > 0 || task.project) && (
        <div className="px-3 pb-1 flex items-center gap-1 flex-wrap">
          {task.project && (
            <span className="text-[8px] font-semibold px-1.5 py-px rounded" style={{ backgroundColor: (task.project.color || '#808080') + '18', color: task.project.color || '#808080' }}>
              📂 {task.project.name}
            </span>
          )}
          {task.labels?.map((tl: any) => (
            <span key={tl.label?.id || tl.id} className="text-[8px] font-semibold px-1.5 py-px rounded-full" style={{ backgroundColor: ((tl.label?.color || tl.color || '#808080') + '20'), color: tl.label?.color || tl.color || '#808080' }}>
              {tl.label?.name || tl.name}
            </span>
          ))}
        </div>
      )}

      {/* İşçi + filial */}
      <div className="px-3 pb-2 flex items-center gap-2">
        {isGroup ? (
          <div className="flex items-center gap-1">
            {task._groupTasks.slice(0, 3).map((gt: any, i: number) => (
              <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: pColor + '18', color: pColor, marginLeft: i > 0 ? -4 : 0 }}>
                {gt.assignees?.[0]?.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </div>
            ))}
            {task._groupCount > 3 && (
              <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--todoist-text-secondary)' }}>+{task._groupCount - 3}</span>
            )}
          </div>
        ) : task.assignees?.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ backgroundColor: pColor + '18', color: pColor }}>
              {task.assignees[0].user.fullName.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <span className="text-[11px]" style={{ color: 'var(--todoist-text)' }}>
              {task.assignees[0].user.fullName}{task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
            </span>
          </div>
        ) : null}
        {task.business && (
          <>
            <span style={{ color: 'var(--todoist-divider)' }}>·</span>
            <span className="text-[10px] font-medium" style={{ color: '#7C3AED' }}>{task.business.name}</span>
          </>
        )}
      </div>

      {/* Status + gün */}
      <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
        {isGroup ? (() => {
          const completed = task._groupTasks.filter((gt: any) => gt.assignees?.[0]?.status === 'COMPLETED' || gt.status === 'COMPLETED' || gt.status === 'APPROVED').length
          const total = task._groupCount
          const pct = total > 0 ? (completed / total) * 100 : 0
          return (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E8E8' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#058527' : '#246FE0' }} />
              </div>
              <span className="text-[10px] font-bold shrink-0" style={{ color: pct === 100 ? '#058527' : '#246FE0' }}>
                {completed}/{total}
              </span>
            </div>
          )
        })() : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: sConfig.bg, color: sConfig.color }}>
            {sConfig.label}
          </span>
        )}
        {timeText && (
          <span className="text-[10px] font-bold" style={{ color: timeColor }}>
            {timeText}
          </span>
        )}
      </div>
    </div>
  )
}
