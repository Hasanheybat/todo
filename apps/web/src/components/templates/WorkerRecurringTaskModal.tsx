'use client'

import { useState } from 'react'

interface WorkerRecurringTaskModalProps {
  open: boolean
  task: any // dispatch olunmuş Task instance
  onClose: () => void
  onComplete?: () => void
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void
  onFileUpload?: (slotNumber: number, file: File) => void
  onFileDelete?: (fileId: string) => void
}

export default function WorkerRecurringTaskModal({ open, task, onClose, onComplete, onSubtaskToggle, onFileUpload, onFileDelete }: WorkerRecurringTaskModalProps) {
  const [subtaskStates, setSubtaskStates] = useState<Record<string, boolean>>({})
  const [fileSlots, setFileSlots] = useState<Record<number, { name: string; size: string } | null>>({})

  if (!open || !task) return null

  const subtasks = task.subTasks || task.items || []
  const templateFiles = task.templateFiles || []
  const assigneeFiles = task.assigneeFiles || []

  // Tamamlanma hesabla
  const completed = Object.values(subtaskStates).filter(Boolean).length
  const total = subtasks.length || 1
  const percent = Math.round((completed / total) * 100)

  function toggleSubtask(id: string, idx: number) {
    setSubtaskStates(prev => {
      const newState = { ...prev, [id || idx]: !prev[id || idx] }
      if (onSubtaskToggle) onSubtaskToggle(id, newState[id || idx])
      return newState
    })
  }

  function handleFileSelect(slotNumber: number) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 1572864) { alert('Fayl ölçüsü maksimum 1.5 MB ola bilər!'); return }
      setFileSlots(prev => ({ ...prev, [slotNumber]: { name: file.name, size: `${Math.round(file.size / 1024)} KB` } }))
      if (onFileUpload) onFileUpload(slotNumber, file)
    }
    input.click()
  }

  function removeFile(slotNumber: number) {
    setFileSlots(prev => ({ ...prev, [slotNumber]: null }))
    if (onFileDelete) onFileDelete(String(slotNumber))
  }

  const allDone = percent === 100

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '14px', width: '580px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — test dizaynı birebir */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <h3 style={{ fontSize: '15px', fontWeight: 700, flex: 1 }}>{task.title || task.name}</h3>
          <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '10px', background: '#E8F0FE', color: '#246FE0', fontWeight: 600 }}>🔁 Təkrarlanan</span>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5F3F0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#808080' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Təsvir */}
          {task.description && (
            <div style={{ fontSize: '12px', color: '#808080', marginBottom: '8px' }}>{task.description}</div>
          )}

          {/* Tarix badge-ləri */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {task.createdAt && (
              <div style={{ padding: '4px 8px', background: '#E8F0FE', borderRadius: '6px', fontSize: '10px', color: '#246FE0', fontWeight: 600 }}>
                📅 Atandı: {new Date(task.createdAt).toLocaleDateString('az')}
              </div>
            )}
            {task.dueDate && (
              <div style={{ padding: '4px 8px', background: '#FFEBEE', borderRadius: '6px', fontSize: '10px', color: '#DC4C3E', fontWeight: 600 }}>
                ⏰ Deadline: {new Date(task.dueDate).toLocaleDateString('az')}
              </div>
            )}
          </div>

          {/* Şablon faylı */}
          {templateFiles.length > 0 && templateFiles.map((f: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#FAFAFA', border: '1px solid #EBEBEB', borderRadius: '6px', marginBottom: '12px', fontSize: '11px' }}>
              📄 <span style={{ flex: 1 }}><strong>{f.filename || f.name}</strong> · {f.size || ''}</span>
              <span style={{ color: '#246FE0', fontWeight: 600, cursor: 'pointer' }}>Yüklə</span>
            </div>
          ))}

          {/* Alt görevlər */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#808080', marginBottom: '6px' }}>Alt görevlər (klikləyin tamamlamaq üçün)</div>
          {subtasks.map((st: any, i: number) => {
            const id = st.id || String(i)
            const isDone = subtaskStates[id]
            return (
              <div key={id} onClick={() => toggleSubtask(id, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                  marginBottom: '4px', border: '1px solid #EBEBEB',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isDone ? '#058527' : '#EBEBEB'}`,
                  background: isDone ? '#058527' : '#fff', color: isDone ? '#fff' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px',
                  transition: 'all 0.15s',
                }}>
                  {isDone ? '✓' : ''}
                </div>
                <span style={{
                  flex: 1, fontSize: '12px',
                  textDecoration: isDone ? 'line-through' : 'none',
                  color: isDone ? '#B3B3B3' : '#1F1F1F',
                }}>
                  {st.title}
                </span>
                <span style={{
                  fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px',
                  background: isDone ? '#ECFDF5' : '#F5F3F0',
                  color: isDone ? '#058527' : '#808080',
                }}>
                  {isDone ? 'Tamamlandı' : 'Gözləyir'}
                </span>
              </div>
            )
          })}

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ flex: 1, height: '6px', background: '#F0F0F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: '#058527', transition: 'width 0.3s', width: `${percent}%` }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: percent === 100 ? '#058527' : percent > 0 ? '#EB8909' : '#808080' }}>
              {percent}%
            </span>
          </div>

          {/* ═══ DOSYA ƏLAVƏ — 5 Slot (maks 1.5 MB) ═══ */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EBEBEB' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#808080' }}>
                📎 Dosya əlavə et <span style={{ color: '#B3B3B3', fontWeight: 400 }}>(maks 5 fayl, hər biri 1.5 MB)</span>
              </span>
              <span style={{ fontSize: '10px', color: '#B3B3B3', fontWeight: 600 }}>
                {Object.values(fileSlots).filter(Boolean).length + assigneeFiles.length}/5
              </span>
            </div>

            {[1, 2, 3, 4, 5].map(slot => {
              const existingFile = assigneeFiles.find((f: any) => f.slotNumber === slot && !f.isDeleted)
              const localFile = fileSlots[slot]
              const hasFile = existingFile || localFile

              return (
                <div key={slot} style={{
                  padding: '6px 8px', marginBottom: '4px', borderRadius: '6px',
                  border: hasFile ? '1px solid #EBEBEB' : '1.5px dashed #EBEBEB',
                  background: hasFile ? '#FAFAFA' : '#fff',
                  cursor: hasFile ? 'default' : 'pointer',
                }} onClick={() => !hasFile && handleFileSelect(slot)}>
                  {hasFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#B3B3B3', width: '14px' }}>{slot}</span>
                      <span style={{ fontSize: '14px' }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#058527' }}>
                          {existingFile?.filename || localFile?.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#B3B3B3' }}>
                          {existingFile ? `${Math.round(existingFile.size / 1024)} KB · ${new Date(existingFile.uploadedAt).toLocaleDateString('az')}` : `${localFile?.size} · Yükləndi indi`}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(slot) }}
                        style={{ padding: '2px 6px', border: '1px solid #FFCDD2', background: '#FFF5F5', color: '#DC4C3E', fontSize: '9px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>
                        Sil
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#B3B3B3', width: '14px' }}>{slot}</span>
                      <span style={{ fontSize: '11px', color: '#B3B3B3' }}>＋ Dosya yüklə</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tamamla butonu */}
          {allDone && (
            <button onClick={onComplete}
              style={{
                marginTop: '10px', padding: '8px 16px', background: '#058527', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>
              ✅ Görevi Tamamla
            </button>
          )}

          {/* Xəbərdarlıq */}
          <div style={{ marginTop: '10px', padding: '8px 10px', background: '#FFF8F0', border: '1px solid #FFE0B2', borderRadius: '6px', fontSize: '10px', color: '#EB8909' }}>
            ⚠️ Tamamladıqdan sonra redaktə mümkün deyil
          </div>
        </div>
      </div>
    </div>
  )
}
