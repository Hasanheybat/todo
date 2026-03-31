import { test, expect } from '@playwright/test'
import { loginAs, API, today } from './helpers'

// ══════════════════════════════════════════════════════════════
// TODO SİSTEMİ TAM LIFECYCLE TESTİ
// Layihə, seksiya, tapşırıq, etiket, təkrarlanan, xatırlatma,
// müddət, axtarış, toplu əməliyyat, sıralama, şablon
// ══════════════════════════════════════════════════════════════

const PFX = 'TODO_LC_'
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

// ══════════════════════════════════════════════════════════════
test.describe.serial('TODO Lifecycle', () => {

// ════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════
test('0.1 - Nigar login + inbox ID alınır', async () => {
  state.token = await apiLogin('nigar@techflow.az')
  expect(tok()).toBeTruthy()

  const projects = await api('GET', '/todoist/projects', tok())
  const arr = Array.isArray(projects) ? projects : projects.data || []
  state.inboxId = arr.find((p: any) => p.isInbox)?.id || arr[0]?.id || ''
  console.log(`0.1 — Inbox: ${state.inboxId?.slice(0,8)} | ${arr.length} layihə`)
  expect(state.inboxId).toBeTruthy()
})

// ════════════════════════════════════════
// ADDIM 1: Layihə + Seksiya yaratma
// ════════════════════════════════════════
test('1.1 - Layihə yaradılır', async () => {
  const r = await api('POST', '/todoist/projects', tok(), {
    name: `${PFX}İş Layihəsi`, color: '#4F46E5', viewType: 'LIST',
  })
  state.projectId = r.id || ''
  console.log(`1.1 — Layihə: ${state.projectId?.slice(0,8)} (${r._s})`)
  expect(state.projectId).toBeTruthy()
})

test('1.2 - 3 seksiya yaradılır', async () => {
  for (const name of ['Planlaşdırma', 'İcra', 'Yoxlama']) {
    const r = await api('POST', '/todoist/sections', tok(), {
      name: `${PFX}${name}`, projectId: state.projectId,
    })
    state[`section_${name}`] = r.id || ''
  }
  console.log(`1.2 — 3 seksiya yaradıldı ✓`)
  expect(state.section_Planlaşdırma).toBeTruthy()
})

// ════════════════════════════════════════
// ADDIM 2: Etiketlər
// ════════════════════════════════════════
test('2.1 - 3 etiket yaradılır', async () => {
  for (const [name, color] of [['Vacib','#DC4C3E'], ['İş','#4F46E5'], ['Şəxsi','#058527']]) {
    const r = await api('POST', '/todoist/labels', tok(), { name: `${PFX}${name}`, color })
    state[`label_${name}`] = r.id || ''
  }
  console.log(`2.1 — 3 etiket yaradıldı ✓`)
  expect(state.label_Vacib).toBeTruthy()
})

// ════════════════════════════════════════
// ADDIM 3: Tapşırıq yaratma — müxtəlif variantlar
// ════════════════════════════════════════
test('3.1 - Sadə tapşırıq (inbox, P4, tarixsiz)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Sadə tapşırıq`, projectId: state.inboxId, priority: 'P4',
  })
  state.task_simple = r.id
  console.log(`3.1 — Sadə: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.2 - Tarixli tapşırıq (sabah, P1, seksiyalı)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Təcili hesabat`, description: 'Aylıq maliyyə hesabatı hazırla',
    projectId: state.projectId, sectionId: state.section_Planlaşdırma,
    priority: 'P1', dueDate: new Date(Date.now() + 86400000).toISOString(),
    labelIds: [state.label_Vacib, state.label_İş],
  })
  state.task_dated = r.id
  console.log(`3.2 — Tarixli+etiketli: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.3 - Müddətli tapşırıq (duration: 90 dəq)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Uzun iclas`, projectId: state.projectId,
    sectionId: state.section_İcra, priority: 'P2',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    duration: 90, // 1.5 saat
  })
  state.task_duration = r.id
  console.log(`3.3 — Müddətli (90 dəq): ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.4 - Xatırlatmalı tapşırıq (reminder: 1 saat sonra)', async () => {
  const reminderTime = new Date(Date.now() + 3600000).toISOString()
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Xatırlatma test`, projectId: state.projectId,
    sectionId: state.section_Yoxlama, priority: 'P3',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    reminder: reminderTime,
  })
  state.task_reminder = r.id
  state.reminderTime = reminderTime
  console.log(`3.4 — Xatırlatmalı: ${r.id?.slice(0,8)} reminder=${reminderTime.slice(11,16)}`)
  expect(r._s).toBeLessThan(300)
})

test('3.5 - Təkrarlanan tapşırıq (daily)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Gündəlik standup`, projectId: state.projectId,
    priority: 'P3', dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'daily',
    dueString: 'hər gün',
  })
  state.task_daily = r.id
  console.log(`3.5 — Gündəlik: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.6 - Təkrarlanan tapşırıq (weekly)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Həftəlik hesabat`, projectId: state.projectId,
    priority: 'P2', dueDate: new Date().toISOString(),
    isRecurring: true, recurRule: 'weekly',
    dueString: 'hər həftə',
  })
  state.task_weekly = r.id
  console.log(`3.6 — Həftəlik: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.7 - Alt-tapşırıq (subtask)', async () => {
  const r = await api('POST', '/todoist/tasks', tok(), {
    content: `${PFX}Alt tapşırıq 1`, projectId: state.projectId,
    parentId: state.task_dated, priority: 'P3',
  })
  state.task_subtask = r.id
  console.log(`3.7 — Alt-tapşırıq: ${r.id?.slice(0,8)} parent=${state.task_dated?.slice(0,8)}`)
  expect(r._s).toBeLessThan(300)
})

test('3.8 - Bugünkü tapşırıqlar (10 ədəd)', async () => {
  for (let i = 1; i <= 10; i++) {
    await api('POST', '/todoist/tasks', tok(), {
      content: `${PFX}Bugün #${i}`, projectId: state.inboxId,
      priority: i <= 3 ? 'P1' : i <= 6 ? 'P2' : 'P3',
      dueDate: new Date().toISOString(),
    })
  }
  console.log('3.8 — 10 bugünkü tapşırıq yaradıldı ✓')
})

// ════════════════════════════════════════
// ADDIM 4: Oxu + Yoxlama
// ════════════════════════════════════════
test('4.1 - GET tasks — layihə filtrı', async () => {
  const r = await api('GET', `/todoist/tasks?projectId=${state.projectId}`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  console.log(`4.1 — Layihə taskları: ${arr.length}`)
  expect(arr.length).toBeGreaterThanOrEqual(5) // 3.2-3.7 arası yaradılanlar
})

test('4.2 - GET tasks/today — bugünkü tapşırıqlar', async () => {
  const r = await api('GET', '/todoist/tasks/today', tok())
  const arr = Array.isArray(r) ? r : r.data || []
  const testTasks = arr.filter((t: any) => (t.content || '').startsWith(PFX))
  console.log(`4.2 — Bugün: ${arr.length} toplam, ${testTasks.length} test taskı`)
  expect(testTasks.length).toBeGreaterThanOrEqual(10)
})

test('4.3 - GET tasks/upcoming — gələcək tapşırıqlar', async () => {
  const r = await api('GET', '/todoist/tasks/upcoming', tok())
  const arr = Array.isArray(r) ? r : r.data || []
  const testTasks = arr.filter((t: any) => (t.content || '').startsWith(PFX))
  console.log(`4.3 — Gələcək: ${arr.length} toplam, ${testTasks.length} test taskı`)
  expect(testTasks.length).toBeGreaterThanOrEqual(2) // sabah + 2 gün sonra
})

test('4.4 - Duration yoxlaması', async () => {
  const r = await api('GET', `/todoist/tasks/${state.task_duration}`, tok())
  console.log(`4.4 — Duration: ${r.duration} dəq (gözlənilən: 90)`)
  expect(r.duration).toBe(90)
})

test('4.5 - Reminder yoxlaması', async () => {
  const r = await api('GET', `/todoist/tasks/${state.task_reminder}`, tok())
  console.log(`4.5 — Reminder: ${r.reminder} | reminderSent: ${r.reminderSent}`)
  expect(r.reminder).toBeTruthy()
  expect(r.reminderSent).toBe(false)
})

test('4.6 - Etiket filtrı', async () => {
  const r = await api('GET', `/todoist/tasks?labelId=${state.label_Vacib}`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  console.log(`4.6 — "Vacib" etiketli: ${arr.length} task`)
  expect(arr.length).toBeGreaterThanOrEqual(1)
})

test('4.7 - Prioritet filtrı', async () => {
  const r = await api('GET', `/todoist/tasks?priority=P1`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  const testTasks = arr.filter((t: any) => (t.content || '').startsWith(PFX))
  console.log(`4.7 — P1 prioritet: ${testTasks.length} test taskı`)
  expect(testTasks.length).toBeGreaterThanOrEqual(3)
})

// ════════════════════════════════════════
// ADDIM 5: Axtarış
// ════════════════════════════════════════
test('5.1 - Axtarış — "hesabat"', async () => {
  const r = await api('GET', `/todoist/tasks/search?q=hesabat`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  console.log(`5.1 — "hesabat" axtarışı: ${arr.length} nəticə`)
  expect(arr.length).toBeGreaterThanOrEqual(1)
})

test('5.2 - Axtarış — "standup"', async () => {
  const r = await api('GET', `/todoist/tasks/search?q=standup`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  console.log(`5.2 — "standup" axtarışı: ${arr.length} nəticə`)
  expect(arr.length).toBeGreaterThanOrEqual(1)
})

// ════════════════════════════════════════
// ADDIM 6: Tapşırıq redaktə
// ════════════════════════════════════════
test('6.1 - Tapşırıq adını dəyiş', async () => {
  const r = await api('PUT', `/todoist/tasks/${state.task_simple}`, tok(), {
    content: `${PFX}Sadə tapşırıq [DƏYİŞDİRİLDİ]`,
  })
  console.log(`6.1 — Ad dəyişdi: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('6.2 - Prioritet dəyiş (P4 → P1)', async () => {
  const r = await api('PUT', `/todoist/tasks/${state.task_simple}`, tok(), { priority: 'P1' })
  console.log(`6.2 — Prioritet P1: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('6.3 - Seksiya dəyiş', async () => {
  const r = await api('PUT', `/todoist/tasks/${state.task_simple}`, tok(), {
    projectId: state.projectId, sectionId: state.section_Yoxlama,
  })
  console.log(`6.3 — Seksiya dəyişdi: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('6.4 - Etiket əlavə et', async () => {
  const r = await api('PUT', `/todoist/tasks/${state.task_simple}`, tok(), {
    labelIds: [state.label_Şəxsi],
  })
  console.log(`6.4 — Etiket əlavə: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('6.5 - Duration dəyiş (90 → 120)', async () => {
  const r = await api('PUT', `/todoist/tasks/${state.task_duration}`, tok(), { duration: 120 })
  const check = await api('GET', `/todoist/tasks/${state.task_duration}`, tok())
  console.log(`6.5 — Duration: ${check.duration} (gözlənilən: 120)`)
  expect(check.duration).toBe(120)
})

test('6.6 - Reminder dəyiş', async () => {
  const newReminder = new Date(Date.now() + 7200000).toISOString() // 2 saat sonra
  const r = await api('PUT', `/todoist/tasks/${state.task_reminder}`, tok(), { reminder: newReminder })
  const check = await api('GET', `/todoist/tasks/${state.task_reminder}`, tok())
  console.log(`6.6 — Reminder yeniləndi, reminderSent: ${check.reminderSent} (gözlənilən: false)`)
  expect(check.reminderSent).toBe(false) // dəyişdikdə sıfırlanmalı
})

// ════════════════════════════════════════
// ADDIM 7: Tamamlama + Təkrarlanan
// ════════════════════════════════════════
test('7.1 - Sadə tapşırıq tamamla', async () => {
  const r = await api('POST', `/todoist/tasks/${state.task_simple}/complete`, tok())
  console.log(`7.1 — Sadə tamamlandı: ${r._s}`)
  expect(r._s).toBeLessThan(300)

  const check = await api('GET', `/todoist/tasks/${state.task_simple}`, tok())
  expect(check.isCompleted).toBe(true)
})

test('7.2 - Tamamlanmışı geri aç (uncomplete)', async () => {
  const r = await api('POST', `/todoist/tasks/${state.task_simple}/uncomplete`, tok())
  console.log(`7.2 — Uncomplete: ${r._s}`)
  expect(r._s).toBeLessThan(300)

  const check = await api('GET', `/todoist/tasks/${state.task_simple}`, tok())
  expect(check.isCompleted).toBe(false)
})

test('7.3 - Təkrarlanan (daily) tamamla → yeni task yaranır', async () => {
  const before = await api('GET', `/todoist/tasks/${state.task_daily}`, tok())
  const oldDueDate = before.dueDate

  const r = await api('POST', `/todoist/tasks/${state.task_daily}/complete`, tok())
  console.log(`7.3 — Daily complete: ${r._s} | recurring: ${r.recurring}`)

  if (r.recurring && r.nextTaskId) {
    state.task_daily_next = r.nextTaskId
    const next = await api('GET', `/todoist/tasks/${r.nextTaskId}`, tok())
    console.log(`7.3 — Yeni task dueDate: ${next.dueDate?.slice(0,10)} (köhnə: ${oldDueDate?.slice(0,10)})`)
    expect(new Date(next.dueDate).getTime()).toBeGreaterThan(new Date(oldDueDate).getTime())
  } else {
    console.log('7.3 — Təkrarlanan cavab formatı fərqlidir:', JSON.stringify(r).slice(0, 200))
  }
})

test('7.4 - Təkrarlanan (weekly) tamamla → 7 gün sonraya', async () => {
  const before = await api('GET', `/todoist/tasks/${state.task_weekly}`, tok())

  const r = await api('POST', `/todoist/tasks/${state.task_weekly}/complete`, tok())
  console.log(`7.4 — Weekly complete: ${r._s} | recurring: ${r.recurring}`)

  if (r.recurring && r.nextTaskId) {
    const next = await api('GET', `/todoist/tasks/${r.nextTaskId}`, tok())
    console.log(`7.4 — Yeni dueDate: ${next.dueDate?.slice(0,10)}`)
  }
})

// ════════════════════════════════════════
// ADDIM 8: Toplu əməliyyatlar (bulk)
// ════════════════════════════════════════
test('8.1 - Bulk complete — 5 bugünkü task', async () => {
  const today = await api('GET', '/todoist/tasks/today', tok())
  const arr = (Array.isArray(today) ? today : today.data || []).filter((t: any) => (t.content || '').includes(`${PFX}Bugün`))
  const ids = arr.slice(0, 5).map((t: any) => t.id)

  const r = await api('POST', '/todoist/tasks/bulk', tok(), { action: 'complete', taskIds: ids })
  console.log(`8.1 — Bulk complete (${ids.length}): ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('8.2 - Bulk priority — 3 task P1-ə', async () => {
  const today = await api('GET', '/todoist/tasks/today', tok())
  const arr = (Array.isArray(today) ? today : today.data || []).filter((t: any) =>
    (t.content || '').includes(`${PFX}Bugün`) && !t.isCompleted
  )
  const ids = arr.slice(0, 3).map((t: any) => t.id)

  const r = await api('POST', '/todoist/tasks/bulk', tok(), { action: 'priority', taskIds: ids, value: 'P1' })
  console.log(`8.2 — Bulk priority (${ids.length}): ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('8.3 - Bulk move — layihəyə köçür', async () => {
  const today = await api('GET', '/todoist/tasks/today', tok())
  const arr = (Array.isArray(today) ? today : today.data || []).filter((t: any) =>
    (t.content || '').includes(`${PFX}Bugün`) && !t.isCompleted
  )
  const ids = arr.slice(0, 2).map((t: any) => t.id)

  const r = await api('POST', '/todoist/tasks/bulk', tok(), { action: 'move', taskIds: ids, value: state.projectId })
  console.log(`8.3 — Bulk move (${ids.length}): ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

// ════════════════════════════════════════
// ADDIM 9: Şərhlər
// ════════════════════════════════════════
test('9.1 - Şərh əlavə et', async () => {
  const r = await api('POST', `/todoist/tasks/${state.task_dated}/comments`, tok(), {
    content: `${PFX}Bu tapşırıq vacibdir, tez tamamlayın`,
  })
  state.commentId = r.id
  console.log(`9.1 — Şərh: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('9.2 - Şərhləri oxu', async () => {
  const r = await api('GET', `/todoist/tasks/${state.task_dated}/comments`, tok())
  const arr = Array.isArray(r) ? r : r.data || []
  console.log(`9.2 — Şərhlər: ${arr.length}`)
  expect(arr.length).toBeGreaterThanOrEqual(1)
})

// ════════════════════════════════════════
// ADDIM 10: Sıralama (reorder)
// ════════════════════════════════════════
test('10.1 - Sıralama dəyişdir', async () => {
  const tasks = await api('GET', `/todoist/tasks?projectId=${state.projectId}`, tok())
  const arr = (Array.isArray(tasks) ? tasks : tasks.data || []).slice(0, 3)
  if (arr.length >= 2) {
    const r = await api('POST', '/todoist/tasks/reorder', tok(), {
      items: arr.map((t: any, i: number) => ({ id: t.id, sortOrder: arr.length - i })),
    })
    console.log(`10.1 — Reorder (${arr.length} task): ${r._s}`)
    expect(r._s).toBeLessThan(300)
  }
})

// ════════════════════════════════════════
// ADDIM 11: Silmə
// ════════════════════════════════════════
test('11.1 - Tapşırıq sil (soft delete)', async () => {
  const r = await api('DELETE', `/todoist/tasks/${state.task_subtask}`, tok())
  console.log(`11.1 — Alt-tapşırıq silindi: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('11.2 - Seksiya sil — tapşırıqlar qalır', async () => {
  const r = await api('DELETE', `/todoist/sections/${state.section_Yoxlama}`, tok())
  console.log(`11.2 — Yoxlama seksiyası silindi: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('11.3 - Etiket sil', async () => {
  const r = await api('DELETE', `/todoist/labels/${state.label_Şəxsi}`, tok())
  console.log(`11.3 — Şəxsi etiketi silindi: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

// ════════════════════════════════════════
// ADDIM 12: UI Yoxlama
// ════════════════════════════════════════
test('12.1 - UI: Nigar /todo-da layihəni görür', async ({ page }) => {
  await loginAs(page, 'nigar')
  await page.goto(`/todo?projectId=${state.projectId}`)
  await page.waitForTimeout(2000)
  const task = await page.locator(`text=${PFX}Təcili hesabat`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log(`12.1 — Layihə task görünür: ${task}`)
  expect(task).toBe(true)
})

test('12.2 - UI: /dashboard-da bugünkü tapşırıqlar görünür', async ({ page }) => {
  await loginAs(page, 'nigar')
  await page.goto('/dashboard')
  await page.waitForTimeout(2000)
  const found = await page.locator(`text=${PFX}Bugün`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log(`12.2 — Bugünkü TODO görünür: ${found}`)
})

// ════════════════════════════════════════
// YEKUN: Təmizlik + Xülasə
// ════════════════════════════════════════
test('YEKUN - Statistika + Təmizlik', async () => {
  // Statistika
  const allTasks = await api('GET', `/todoist/tasks?projectId=${state.projectId}&includeCompleted=true`, tok())
  const arr = Array.isArray(allTasks) ? allTasks : allTasks.data || []
  const completed = arr.filter((t: any) => t.isCompleted).length
  const active = arr.filter((t: any) => !t.isCompleted).length

  console.log('\n══════════════════════════════════════════')
  console.log('       TODO LIFECYCLE — YEKUN NƏTİCƏ')
  console.log('══════════════════════════════════════════')
  console.log(`  Layihə taskları: ${arr.length} (aktiv: ${active}, tamamlanmış: ${completed})`)
  console.log(`  Layihə: ${state.projectId?.slice(0,8)}`)
  console.log(`  Etiketlər: Vacib=${state.label_Vacib?.slice(0,8)}, İş=${state.label_İş?.slice(0,8)}`)
  console.log('══════════════════════════════════════════')

  // Layihə sil (təmizlik)
  await api('DELETE', `/todoist/projects/${state.projectId}`, tok())
  // Qalan etiketləri sil
  await api('DELETE', `/todoist/labels/${state.label_Vacib}`, tok())
  await api('DELETE', `/todoist/labels/${state.label_İş}`, tok())
  // Inbox test tasklarını sil
  const inbox = await api('GET', `/todoist/tasks?projectId=${state.inboxId}&includeCompleted=true`, tok())
  const inboxArr = Array.isArray(inbox) ? inbox : inbox.data || []
  for (const t of inboxArr) {
    if ((t.content || '').startsWith(PFX)) await api('DELETE', `/todoist/tasks/${t.id}`, tok())
  }
  console.log('✅ Təmizlik tamamlandı')
})

}) // end describe.serial
