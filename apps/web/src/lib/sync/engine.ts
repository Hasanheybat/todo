import { db, getSyncToken, setSyncToken } from './db'
import { getCommands, clearCommands } from './queue'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

let syncing = false
let syncInterval: ReturnType<typeof setInterval> | null = null

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const auth = localStorage.getItem('auth')
    if (auth) return JSON.parse(auth).accessToken
  } catch {}
  return null
}

// ═══ Əsas Sync Funksiyası ═══
export async function performSync(): Promise<{ ok: boolean; error?: string }> {
  if (syncing) return { ok: false, error: 'Sync davam edir' }
  if (typeof window === 'undefined') return { ok: false, error: 'SSR' }

  const token = getToken()
  if (!token) return { ok: false, error: 'Token yoxdur' }

  syncing = true
  try {
    // 1. Göndərilməmiş command-ları topla
    const pending = await getCommands()
    const commands = pending.map(p => ({
      type: p.type,
      temp_id: p.temp_id,
      args: p.args,
    }))

    // 2. Sync token al
    const syncToken = await getSyncToken()

    // 3. POST /sync
    const res = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ sync_token: syncToken, commands }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        return { ok: false, error: 'Auth xətası' }
      }
      return { ok: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()

    // 4. Göndərilmiş command-ları sil
    if (pending.length > 0) {
      await clearCommands(pending.map(p => p.id!).filter(Boolean))
    }

    // 5. temp_id mapping — lokal ID-ləri real ID-lərlə əvəzlə
    if (data.temp_id_mapping) {
      for (const [tempId, realId] of Object.entries(data.temp_id_mapping)) {
        const task = await db.tasks.get(tempId)
        if (task) {
          await db.tasks.delete(tempId)
          await db.tasks.put({ ...task, id: realId as string })
        }
        const project = await db.projects.get(tempId)
        if (project) {
          await db.projects.delete(tempId)
          await db.projects.put({ ...project, id: realId as string })
        }
        const section = await db.sections.get(tempId)
        if (section) {
          await db.sections.delete(tempId)
          await db.sections.put({ ...section, id: realId as string })
        }
        const label = await db.labels.get(tempId)
        if (label) {
          await db.labels.delete(tempId)
          await db.labels.put({ ...label, id: realId as string })
        }
      }
    }

    // 6. Serverdən gələn dəyişiklikləri IndexedDB-yə yaz
    if (data.tasks?.length) {
      for (const task of data.tasks) {
        if (task.isDeleted) {
          await db.tasks.delete(task.id)
        } else {
          await db.tasks.put(task)
        }
      }
    }

    if (data.projects?.length) {
      for (const project of data.projects) {
        if (project.isDeleted) {
          await db.projects.delete(project.id)
        } else {
          await db.projects.put(project)
        }
      }
    }

    if (data.sections?.length) {
      for (const section of data.sections) {
        if (section.isDeleted) {
          await db.sections.delete(section.id)
        } else {
          await db.sections.put(section)
        }
      }
    }

    if (data.labels?.length) {
      for (const label of data.labels) {
        if (label.isDeleted) {
          await db.labels.delete(label.id)
        } else {
          await db.labels.put(label)
        }
      }
    }

    if (data.comments?.length) {
      for (const comment of data.comments) {
        if (comment.isDeleted) {
          await db.comments.delete(comment.id)
        } else {
          await db.comments.put(comment)
        }
      }
    }

    // 7. Yeni sync token saxla
    if (data.sync_token) {
      await setSyncToken(data.sync_token)
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  } finally {
    syncing = false
  }
}

// ═══ Avtomatik Sync ═══
export function startAutoSync(intervalMs = 30000) {
  if (syncInterval) return
  // İlk sync
  performSync()
  // Hər 30 saniyə
  syncInterval = setInterval(() => {
    if (navigator.onLine) performSync()
  }, intervalMs)

  // Online olduqda dərhal sync
  window.addEventListener('online', () => performSync())
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// ═══ Status ═══
export function isSyncing() { return syncing }
export function isOnline() { return typeof navigator !== 'undefined' ? navigator.onLine : true }
