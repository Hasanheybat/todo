import Dexie, { type Table } from 'dexie'

// ═══ İnterface-lər ═══
export interface LocalTask {
  id: string
  content: string
  description?: string
  priority: string
  isCompleted: boolean
  dueDate?: string
  dueString?: string
  isRecurring: boolean
  recurRule?: string
  sortOrder: number
  duration?: number
  reminder?: string
  projectId: string
  sectionId?: string
  parentId?: string
  isDeleted: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
  labels?: any[]
  section?: any
  project?: any
}

export interface LocalProject {
  id: string
  name: string
  color: string
  viewType: string
  isFavorite: boolean
  isInbox: boolean
  isDeleted: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: { tasks: number }
}

export interface LocalSection {
  id: string
  name: string
  sortOrder: number
  isDeleted: boolean
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface LocalLabel {
  id: string
  name: string
  color: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalComment {
  id: string
  content: string
  isDeleted: boolean
  taskId: string
  userId: string
  createdAt: string
  updatedAt: string
  user?: { id: string; fullName: string }
}

export interface PendingCommand {
  id?: number // autoincrement
  type: string
  temp_id?: string
  args: Record<string, any>
  createdAt: string
}

export interface SyncMeta {
  key: string
  value: string
}

// ═══ Dexie DB ═══
class WorkFlowDB extends Dexie {
  tasks!: Table<LocalTask, string>
  projects!: Table<LocalProject, string>
  sections!: Table<LocalSection, string>
  labels!: Table<LocalLabel, string>
  comments!: Table<LocalComment, string>
  pendingCommands!: Table<PendingCommand, number>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('WorkFlowPro')
    this.version(1).stores({
      tasks: 'id, projectId, sectionId, parentId, isCompleted, isDeleted, dueDate, updatedAt',
      projects: 'id, isDeleted, updatedAt',
      sections: 'id, projectId, isDeleted, updatedAt',
      labels: 'id, isDeleted, updatedAt',
      comments: 'id, taskId, isDeleted, updatedAt',
      pendingCommands: '++id, type, createdAt',
      syncMeta: 'key',
    })
  }
}

export const db = new WorkFlowDB()

// ═══ Helper-lər ═══
export async function getSyncToken(): Promise<string | null> {
  const meta = await db.syncMeta.get('sync_token')
  return meta?.value || null
}

export async function setSyncToken(token: string) {
  await db.syncMeta.put({ key: 'sync_token', value: token })
}

export async function clearAllData() {
  await Promise.all([
    db.tasks.clear(),
    db.projects.clear(),
    db.sections.clear(),
    db.labels.clear(),
    db.comments.clear(),
    db.pendingCommands.clear(),
    db.syncMeta.clear(),
  ])
}
