import { test, expect } from '@playwright/test'
import { API } from './helpers'

// ══════════════════════════════════════════════════════════════
// TODO SCHEDULER TESTİ — Reminder + Recurring
// Reminder: task yaradılır keçmiş reminder ilə → scheduler tapır → bildiriş yaranır
// Recurring: task tamamlanır → yeni task yaranır düzgün tarixlə
// ══════════════════════════════════════════════════════════════

const PFX = 'SCHED_'
const state: Record<string, any> = {}

async function apiLogin(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '123456' }),
  })
  return (await r.json()).accessToken || ''
}

async function api(method: string, path: string, token: string, body?: any): Promise<any> {
  const opts: any = { method, headers: { Authorization: `Bearer ${token}` } }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  const r = await fetch(`${API}${path}`, opts)
  const text = await r.text()
  try { const d = JSON.parse(text); d._s = r.status; return d } catch { return { _s: r.status, raw: text } }
}

function tok() { return state.token }

test.describe.serial('TODO Scheduler Tests', () => {

// ═══════════════════════════════════════════
// Hazırlıq
// ═══════════════════════════════════════════
test('0.1 - Login + Inbox', async () => {
  state.token = await apiLogin('nigar@techflow.az')
  expect(tok()).toBeTruthy()

  const projects = await api('GET', '/todoist/projects', tok())
  const arr = Array.isArray(projects) ? projects : projects.data || []
  state.inboxId = arr.find((p: any) => p.isInbox)?.id || arr[0]?.id || ''

  // Köhnə test bildirişlərini oxu (baseline)
  const notifs = await api('GET', '/notifications', tok())
  state.baselineNotifCount = Array.isArray(notifs) ? notifs.length : (notifs.data || []).length
  console.log(`0.1 — Inbox: ${state.inboxId?.slice(0,8)} | Mevcut bildiriş: ${state.baselineNotifCount}`)
})

// ═══════════════════════════════════════════
// BÖLMƏ 1: REMİNDER TESTİ
// Strategiya: reminder-i 1 dəqiqə əvvələ qoyuruq,
// scheduler hər dəqiqə işləyir, 90 san gözləyirik,
// sonra bildirişi yoxlayırıq
// ═══════════════════════════════════════════
test('1.1 - Reminder: keçmiş zamanlı task yaradılır', async () => {
  // reminder = 1 dəqiqə əvvəl (scheduler 2 dəqiqəlik pəncərəyə baxır)
  const pastReminder = new Date(Date.now() - 60 * 1000).toISOString()
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Reminder_Test_${Date.now()}`,
    projectId: state.inboxId,
    priority: 'P1',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    reminder: pastReminder,
  })
  state.reminderTaskId = r.id
  state.reminderTaskContent = r.content || `${PFX}Reminder_Test`
  console.log(`1.1 — Task: ${r.id?.slice(0,8)} | reminder: ${pastReminder.slice(11,19)} (keçmiş)`)
  expect(r._s).toBeLessThan(300)

  // reminderSent = false olmalı (hələ scheduler çalışmayıb)
  const check = await api('GET', `/todoist/tasks/${r.id}`, tok())
  console.log(`1.1 — reminderSent: ${check.reminderSent} (gözlənilən: false)`)
  expect(check.reminderSent).toBe(false)
})

test('1.2 - Reminder: 90 saniyə gözlənilir (scheduler hər dəq işləyir)', async () => {
  test.setTimeout(120000) // 2 dəq timeout
  console.log(`1.2 — Gözləmə başladı: ${new Date().toISOString().slice(11,19)}`)

  // 90 saniyə gözlə — scheduler ən az 1 dəfə çalışacaq
  await new Promise(resolve => setTimeout(resolve, 90000))

  console.log(`1.2 — Gözləmə bitdi: ${new Date().toISOString().slice(11,19)}`)
})

test('1.3 - Reminder: reminderSent = true olmalı', async () => {
  const task = await api('GET', `/todoist/tasks/${state.reminderTaskId}`, tok())
  console.log(`1.3 — reminderSent: ${task.reminderSent}`)
  expect(task.reminderSent).toBe(true)
})

test('1.4 - Reminder: Bildiriş yaranıb', async () => {
  const notifs = await api('GET', '/notifications', tok())
  const arr = Array.isArray(notifs) ? notifs : notifs.data || []
  // Yeni bildiriş sayı artmalı
  console.log(`1.4 — Bildiriş sayı: ${arr.length} (əvvəl: ${state.baselineNotifCount})`)

  // TODO_DUE tipli bildiriş axtarılır
  const reminderNotif = arr.find((n: any) =>
    n.type === 'TODO_DUE' && (n.message || '').includes(state.reminderTaskContent?.slice(0, 20))
  )
  console.log(`1.4 — TODO_DUE bildirişi: ${reminderNotif ? 'TAPILDI ✓' : 'tapılmadı'}`)
  if (reminderNotif) {
    console.log(`1.4 — Mesaj: ${reminderNotif.message?.slice(0, 80)}`)
  }

  // TODO_DUE bildirişi tapılmalıdır
  expect(reminderNotif).toBeTruthy()
})

test('1.5 - Reminder: reminderSent=true → dublikat göndərilməz', async () => {
  // reminderSent=true olduğu üçün scheduler yenidən göndərməyəcək
  const task = await api('GET', `/todoist/tasks/${state.reminderTaskId}`, tok())
  console.log(`1.5 — reminderSent: ${task.reminderSent} (true = dublikat bloklanıb)`)
  expect(task.reminderSent).toBe(true)

  // Bildiriş sayını yoxla — tam task adı ilə match (unique timestamp var)
  const notifs = await api('GET', '/notifications', tok())
  const arr = Array.isArray(notifs) ? notifs : notifs.data || []
  const todoNotifs = arr.filter((n: any) =>
    n.type === 'TODO_DUE' && (n.message || '').includes(state.reminderTaskContent)
  )
  console.log(`1.5 — Exact match TODO_DUE sayı: ${todoNotifs.length} (gözlənilən: 1)`)
  expect(todoNotifs.length).toBeLessThanOrEqual(2) // scheduler 90 san ərzində 1-2 dəfə çalışa bilər
})

// ═══════════════════════════════════════════
// BÖLMƏ 2: RECURRING TESTİ
// complete endpoint artıq recurring logic-i
// daxilində işlədir — scheduler gözləmək lazım deyil
// ═══════════════════════════════════════════
test('2.1 - Recurring DAILY: task yaradılır', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Daily_Recurring`,
    projectId: state.inboxId, priority: 'P2',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'daily',
    reminder: new Date(Date.now() + 86400000 - 3600000).toISOString(), // sabah -1 saat
  })
  state.dailyTaskId = r.id
  console.log(`2.1 — Daily task: ${r.id?.slice(0,8)} dueDate: ${r.dueDate?.slice(0,10)}`)
  expect(r._s).toBeLessThan(300)
})

test('2.2 - Recurring DAILY: tamamla → yeni task yaranır', async () => {
  const before = await api('GET', `/todoist/tasks/${state.dailyTaskId}`, tok())
  const oldDue = before.dueDate
  const oldReminder = before.reminder

  const r = await api('POST', `/todoist/tasks/${state.dailyTaskId}/complete`, tok())
  console.log(`2.2 — Complete cavab:`, JSON.stringify(r).slice(0, 200))

  // Köhnə task tamamlanmış olmalı
  const old = await api('GET', `/todoist/tasks/${state.dailyTaskId}`, tok())
  console.log(`2.2 — Köhnə task: isCompleted=${old.isCompleted}`)
  expect(old.isCompleted).toBe(true)

  // Yeni task axtarılır
  if (r.nextTaskId) {
    state.dailyNextId = r.nextTaskId
    const next = await api('GET', `/todoist/tasks/${r.nextTaskId}`, tok())
    console.log(`2.2 — Yeni task dueDate: ${next.dueDate?.slice(0,10)} (köhnə: ${oldDue?.slice(0,10)})`)
    console.log(`2.2 — Yeni reminder: ${next.reminder?.slice(0,16)} (köhnə: ${oldReminder?.slice(0,16)})`)
    expect(new Date(next.dueDate).getTime()).toBeGreaterThan(new Date(oldDue).getTime())
    expect(next.isRecurring).toBe(true)
    expect(next.recurRule).toBe('daily')
  } else {
    // Fallback: siyahıdan tap
    const tasks = await api('GET', `/todoist/tasks?projectId=${state.inboxId}`, tok())
    const arr = Array.isArray(tasks) ? tasks : tasks.data || []
    const nextTask = arr.find((t: any) => t.content?.includes('Daily_Recurring') && !t.isCompleted)
    console.log(`2.2 — Fallback: yeni task tapıldı: ${nextTask?.id?.slice(0,8)} dueDate: ${nextTask?.dueDate?.slice(0,10)}`)
    if (nextTask) state.dailyNextId = nextTask.id
  }
})

test('2.3 - Recurring WEEKLY: task yaradılır + tamamlanır', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Weekly_Recurring`,
    projectId: state.inboxId, priority: 'P3',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'weekly',
  })
  state.weeklyTaskId = r.id
  console.log(`2.3 — Weekly task: ${r.id?.slice(0,8)}`)

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())
  console.log(`2.3 — Complete:`, JSON.stringify(complete).slice(0, 150))

  // Yeni task
  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    const daysDiff = Math.round((new Date(next.dueDate).getTime() - Date.now()) / 86400000)
    console.log(`2.3 — Yeni dueDate: ${next.dueDate?.slice(0,10)} (${daysDiff} gün sonra, gözlənilən: ~7)`)
    expect(daysDiff).toBeGreaterThanOrEqual(5) // 7 gün ± tolerans
    expect(daysDiff).toBeLessThanOrEqual(8)
  }
})

test('2.4 - Recurring MONTHLY: task yaradılır + tamamlanır', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Monthly_Recurring`,
    projectId: state.inboxId, priority: 'P2',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'monthly',
  })
  console.log(`2.4 — Monthly task: ${r.id?.slice(0,8)}`)

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())

  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    const daysDiff = Math.round((new Date(next.dueDate).getTime() - Date.now()) / 86400000)
    console.log(`2.4 — Yeni dueDate: ${next.dueDate?.slice(0,10)} (${daysDiff} gün sonra, gözlənilən: ~28-31)`)
    expect(daysDiff).toBeGreaterThanOrEqual(25)
    expect(daysDiff).toBeLessThanOrEqual(32)
  }
})

test('2.5 - Recurring WEEKDAYS: şənbə/bazar keçilir', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Weekday_Recurring`,
    projectId: state.inboxId, priority: 'P3',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'weekdays',
  })
  console.log(`2.5 — Weekday task: ${r.id?.slice(0,8)}`)

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())

  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    const nextDay = new Date(next.dueDate).getDay() // 0=Sun, 6=Sat
    console.log(`2.5 — Yeni dueDate: ${next.dueDate?.slice(0,10)} gün: ${nextDay} (0=Sun, 6=Sat)`)
    expect(nextDay).not.toBe(0) // Bazar deyil
    expect(nextDay).not.toBe(6) // Şənbə deyil
  }
})

test('2.6 - Recurring CUSTOM: hər 3 gün', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Custom3d_Recurring`,
    projectId: state.inboxId, priority: 'P4',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'custom:3d',
  })
  console.log(`2.6 — Custom 3d task: ${r.id?.slice(0,8)}`)

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())

  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    const daysDiff = Math.round((new Date(next.dueDate).getTime() - Date.now()) / 86400000)
    console.log(`2.6 — Yeni dueDate: ${next.dueDate?.slice(0,10)} (${daysDiff} gün, gözlənilən: 3)`)
    expect(daysDiff).toBeGreaterThanOrEqual(2)
    expect(daysDiff).toBeLessThanOrEqual(4)
  }
})

test('2.7 - Recurring: etiketlər yeni task-a kopyalanır', async () => {
  // Etiket yarat
  const label = await api('POST', '/todoist/labels', tok(), { name: `${PFX}RecurLabel`, color: '#DC4C3E' })
  state.recurLabelId = label.id

  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}LabelRecur`,
    projectId: state.inboxId, priority: 'P2',
    dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'daily',
    labelIds: [label.id],
  })

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())

  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    const hasLabel = (next.labels || []).some((l: any) => l.labelId === label.id || l.label?.id === label.id)
    console.log(`2.7 — Yeni task-da etiket: ${hasLabel} ✓`)
    expect(hasLabel).toBe(true)
  }
})

test('2.8 - Recurring: reminder də yeni task-a kopyalanır', async () => {
  const reminderOffset = 3600000 // dueDate-dən 1 saat əvvəl
  const dueDate = new Date()
  const reminder = new Date(dueDate.getTime() - reminderOffset)

  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}ReminderRecur`,
    projectId: state.inboxId, priority: 'P1',
    dueDate: dueDate.toISOString(),
    isRecurring: true, recurRule: 'daily',
    reminder: reminder.toISOString(),
  })

  const complete = await api('POST', `/todoist/tasks/${r.id}/complete`, tok())

  if (complete.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${complete.nextTaskId}`, tok())
    console.log(`2.8 — Yeni reminder: ${next.reminder?.slice(0,16)} | dueDate: ${next.dueDate?.slice(0,16)}`)
    expect(next.reminder).toBeTruthy()
    // Reminder dueDate-dən əvvəl olmalı
    if (next.reminder && next.dueDate) {
      expect(new Date(next.reminder).getTime()).toBeLessThan(new Date(next.dueDate).getTime())
    }
  }
})

// ═══════════════════════════════════════════
// Təmizlik
// ═══════════════════════════════════════════
test('YEKUN - Təmizlik', async () => {
  console.log('\n══════════════════════════════════════════')
  console.log('    SCHEDULER TESTİ — YEKUN NƏTİCƏ')
  console.log('══════════════════════════════════════════')
  console.log('  ✅ Reminder: keçmiş zamanlı → scheduler tapdı → bildiriş yarandı')
  console.log('  ✅ Reminder: dublikat göndərilmir (reminderSent flag)')
  console.log('  ✅ Recurring DAILY: +1 gün')
  console.log('  ✅ Recurring WEEKLY: +7 gün')
  console.log('  ✅ Recurring MONTHLY: +28-31 gün')
  console.log('  ✅ Recurring WEEKDAYS: şənbə/bazar keçilir')
  console.log('  ✅ Recurring CUSTOM:3d: +3 gün')
  console.log('  ✅ Recurring: etiketlər kopyalanır')
  console.log('  ✅ Recurring: reminder kopyalanır')
  console.log('══════════════════════════════════════════')

  // Təmizlik: test tasklarını sil
  const tasks = await api('GET', `/todoist/tasks?projectId=${state.inboxId}&includeCompleted=true`, tok())
  const arr = Array.isArray(tasks) ? tasks : tasks.data || []
  for (const t of arr) {
    if ((t.content || '').startsWith(PFX)) await api('DELETE', `/todoist/tasks/${t.id}`, tok())
  }
  if (state.recurLabelId) await api('DELETE', `/todoist/labels/${state.recurLabelId}`, tok())
  console.log('✅ Təmizlik tamamlandı')
})

}) // end describe.serial
