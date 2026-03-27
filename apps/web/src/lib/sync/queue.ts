import { db, type PendingCommand } from './db'

export async function addCommand(type: string, args: Record<string, any>, temp_id?: string) {
  await db.pendingCommands.add({
    type,
    temp_id,
    args,
    createdAt: new Date().toISOString(),
  })
}

export async function getCommands(): Promise<PendingCommand[]> {
  return db.pendingCommands.orderBy('createdAt').toArray()
}

export async function clearCommands(ids: number[]) {
  await db.pendingCommands.bulkDelete(ids)
}

export async function clearAllCommands() {
  await db.pendingCommands.clear()
}

export async function getPendingCount(): Promise<number> {
  return db.pendingCommands.count()
}
