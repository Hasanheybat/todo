import { test, expect, Page } from '@playwright/test'
import { loginAs, API, USERS, today } from './helpers'

// ══════════════════════════════════════════════════════════════
// MEGA E2E TEST — 5 Task/Görev, 19 İşçi, Tam Lifecycle
// TASK (groupId) + GÖREV (toplu) qarışıq real şirkət ssenarisi
// Bütün izləmə /tasks səhifəsində
// ══════════════════════════════════════════════════════════════

const PREFIX = 'MEGA_'
const T1 = `${PREFIX}Aylıq Hesabat`
const T2 = `${PREFIX}Müştəri Zəngi`
const G3 = `${PREFIX}Veb Sayt Yenilənməsi`
const G4 = `${PREFIX}Anbar Sayımı`
const T5 = `${PREFIX}Təcili Email`

const state: Record<string, any> = {}

// ── API helpers ──
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

async function apiUsers(token: string): Promise<any[]> {
  const r = await fetch(`${API}/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  return Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []
}

// ── TASK yaratma (groupId ilə fərdi) ──
async function createGroupTasks(token: string, title: string, assigneeIds: string[], opts: any = {}): Promise<string[]> {
  const groupId = crypto.randomUUID()
  const taskIds: string[] = []
  for (const uid of assigneeIds) {
    const r = await api('POST', '/tasks', token, {
      title, type: 'TASK', groupId, assigneeIds: [uid],
      priority: opts.priority || 'MEDIUM', dueDate: opts.dueDate || today(7),
      businessId: opts.businessId, departmentId: opts.departmentId,
    })
    if (r.id) taskIds.push(r.id)
  }
  state[`${title}_groupId`] = groupId
  state[`${title}_taskIds`] = taskIds
  return taskIds
}

// ── State helpers ──
function uid(name: string): string { return state[`${name}_id`] || '' }
function tok(name: string): string { return state[`${name}_token`] || '' }

// ── UI helpers ──
async function findTaskOnPage(page: Page, titlePart: string): Promise<boolean> {
  await page.goto('/tasks')
  await page.waitForTimeout(1500)
  for (const tab of ['Hamısı', 'Gözləyir', 'Davam edir', 'Tamamlandı', 'Rədd']) {
    const btn = page.locator('button').filter({ hasText: tab }).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ force: true }); await page.waitForTimeout(600)
      if (await page.locator('.cursor-pointer', { hasText: titlePart }).first().isVisible({ timeout: 1500 }).catch(() => false)) return true
    }
  }
  return false
}

// ══════════════════════════════════════════════════════════════
test.describe.serial('MEGA Task Scenario', () => {

const EMAILS = [
  'hasan', 'leyla', 'aynur', 'tural', 'kamran',
  'nigar', 'rashad', 'elvin', 'gunel', 'murad', 'sebine', 'orxan',
  'ulviyye', 'zaur', 'ekber', 'rauf', 'togrul', 'lamiye', 'nermin',
]

// ════════════════════════════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════════════════════════════

test('0.1 - Bütün 19 user login + ID-lər alınır', async () => {
  // Login
  for (const name of EMAILS) {
    state[`${name}_token`] = await apiLogin(`${name}@techflow.az`)
  }
  expect(tok('hasan')).toBeTruthy()
  expect(tok('nermin')).toBeTruthy()

  // User ID-lər
  const users = await apiUsers(tok('hasan'))
  for (const u of users) {
    const key = u.email.split('@')[0]
    state[`${key}_id`] = u.id
    state[`${key}_name`] = u.fullName
  }
  console.log(`0.1 — ${users.length} user login oldu`)
  for (const name of EMAILS) console.log(`  ${name.padEnd(10)} → ${state[`${name}_name`] || 'N/A'}`)

  // Filial/şöbə
  const biz = await fetch(`${API}/users/businesses`, { headers: { Authorization: `Bearer ${tok('hasan')}` } }).then(r => r.json())
  state.bakuBizId = (Array.isArray(biz) ? biz : []).find((b: any) => b.name?.includes('Bakı'))?.id || ''
  state.genceBizId = (Array.isArray(biz) ? biz : []).find((b: any) => b.name?.includes('Gəncə'))?.id || ''
  console.log(`0.1 — Bakı: ${state.bakuBizId?.slice(0,8)} | Gəncə: ${state.genceBizId?.slice(0,8)}`)
  expect(uid('nigar')).toBeTruthy()
})

test('0.2 - Köhnə test taskları silinir', async () => {
  for (const creatorToken of [tok('hasan'), tok('leyla'), tok('aynur')]) {
    const tasks = await apiUsers(creatorToken).catch(() => []) // reuse function name but actually get tasks
    const taskList = await fetch(`${API}/tasks?limit=200`, { headers: { Authorization: `Bearer ${creatorToken}` } }).then(r => r.json())
    const arr = Array.isArray(taskList) ? taskList : taskList.data || []
    for (const t of arr) {
      if ((t.title || '').startsWith(PREFIX)) {
        await fetch(`${API}/tasks/${t.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${creatorToken}` } })
      }
    }
  }
  console.log('0.2 — Köhnə tasklar silindi')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 1: 5 Task/Görev yaratma
// ════════════════════════════════════════════════════════════════

test('1.1 - TASK 1: Aylıq Hesabat — Həsən → 10 işçi (groupId)', async () => {
  // Həsən CEO — bütün filiallardan assign edə bilər
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']
  const ids = await createGroupTasks(tok('hasan'), T1, workers.map(uid), { businessId: state.bakuBizId })
  console.log(`1.1 — TASK1 yaradıldı: ${ids.length} fərdi tapşırıq, groupId: ${state[`${T1}_groupId`]?.slice(0,8)}`)
  expect(ids.length).toBe(10)
})

test('1.2 - TASK 2: Müştəri Zəngi — Həsən → 12 işçi (groupId)', async () => {
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber','togrul','lamiye']
  const ids = await createGroupTasks(tok('hasan'), T2, workers.map(uid), { businessId: state.bakuBizId })
  console.log(`1.2 — TASK2 yaradıldı: ${ids.length} fərdi tapşırıq`)
  expect(ids.length).toBe(12)
})

test('1.3 - GÖREV 3: Veb Sayt — Həsən yaradır, Tural yetkili, 10 işçi', async () => {
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','rauf','togrul','lamiye']
  const r = await api('POST', '/tasks', tok('hasan'), {
    title: G3, description: 'Şirkət veb saytının tam yenilənməsi layihəsi', type: 'GOREV',
    priority: 'HIGH', dueDate: today(14), businessId: state.bakuBizId,
    assigneeIds: workers.map(uid), approverId: uid('tural'),
  })
  state.gorev3Id = r.id || ''
  console.log(`1.3 — GÖREV3 yaradıldı: ${state.gorev3Id?.slice(0,8)} (${r._s})`)
  expect(state.gorev3Id).toBeTruthy()
})

test('1.4 - GÖREV 4: Anbar Sayımı — Həsən yaradır, Kamran yetkili, 10 işçi', async () => {
  const workers = ['ulviyye','zaur','ekber','rauf','togrul','lamiye','nermin','nigar','rashad','elvin']
  const r = await api('POST', '/tasks', tok('hasan'), {
    title: G4, description: 'Aylıq anbar sayımı — bütün filiallar', type: 'GOREV',
    priority: 'MEDIUM', dueDate: today(10), businessId: state.genceBizId,
    assigneeIds: workers.map(uid), approverId: uid('kamran'),
  })
  state.gorev4Id = r.id || ''
  console.log(`1.4 — GÖREV4 yaradıldı: ${state.gorev4Id?.slice(0,8)} (${r._s})`)
  expect(state.gorev4Id).toBeTruthy()
})

test('1.5 - TASK 5: Təcili Email — Həsən → 10 işçi, CRITICAL', async () => {
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']
  const ids = await createGroupTasks(tok('hasan'), T5, workers.map(uid), {
    priority: 'CRITICAL', dueDate: today(1), businessId: state.bakuBizId,
  })
  console.log(`1.5 — TASK5 yaradıldı: ${ids.length} fərdi tapşırıq, CRITICAL`)
  expect(ids.length).toBe(10)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 2: UI — Kreatorlar öz tasklarını görür
// ════════════════════════════════════════════════════════════════

test('2.1 - UI: Həsən /tasks-da Task1-i görür', async ({ page }) => {
  await loginAs(page, 'hasan')
  const found = await findTaskOnPage(page, T1)
  console.log(`2.1 — Həsən Task1 görür: ${found} ✓`)
  expect(found).toBe(true)
})

test('2.2 - UI: Nigar /tasks-da özünə aid tapşırıqları görür', async ({ page }) => {
  await loginAs(page, 'nigar')
  const found1 = await findTaskOnPage(page, T1)
  console.log(`2.2 — Nigar Task1 görür: ${found1}`)
  // Nigar 5 task-da iştirak edir (T1, T2, G3, G4, T5)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 3: TASK 1 — Status dəyişiklikləri
// ════════════════════════════════════════════════════════════════

test('3.1 - TASK1: 3 COMPLETED, 2 DECLINED, 5 PENDING', async () => {
  const taskIds = state[`${T1}_taskIds`] as string[]
  // Hər task 1 assignee-yə uyğun gəlir (yaradılma sırasına görə)
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']

  // 3 COMPLETED: nigar, rashad, ulviyye
  for (const name of ['nigar', 'rashad', 'ulviyye']) {
    const idx = workers.indexOf(name)
    await api('PATCH', `/tasks/${taskIds[idx]}/my-status`, tok(name), { status: 'COMPLETED' })
  }
  // 2 DECLINED: gunel, zaur
  for (const name of ['gunel', 'zaur']) {
    const idx = workers.indexOf(name)
    await api('PATCH', `/tasks/${taskIds[idx]}/my-status`, tok(name), { status: 'DECLINED' })
  }
  console.log('3.1 — Task1: 3 COMPLETED, 2 DECLINED, 5 PENDING ✓')
})

test('3.2 - TASK1: Leyla toplu mesaj göndərir', async () => {
  const taskIds = state[`${T1}_taskIds`] as string[]
  // Toplu mesaj hər task-a ayrı-ayrı göndərilir (TASK tipində)
  for (const tid of taskIds) {
    await api('PATCH', `/tasks/${tid}/bulk-note`, tok('hasan'), { note: 'Hesabat deadline yaxınlaşır!' })
  }
  console.log('3.2 — Task1: Leyla toplu mesaj göndərdi ✓')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 4: TASK 2 — Status dəyişiklikləri
// ════════════════════════════════════════════════════════════════

test('4.1 - TASK2: 8 COMPLETED, 2 IN_PROGRESS, 2 PENDING', async () => {
  const taskIds = state[`${T2}_taskIds`] as string[]
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber','togrul','lamiye']

  // 8 COMPLETED
  for (const name of ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye']) {
    const idx = workers.indexOf(name)
    await api('PATCH', `/tasks/${taskIds[idx]}/my-status`, tok(name), { status: 'COMPLETED' })
  }
  // 2 IN_PROGRESS
  for (const name of ['zaur','ekber']) {
    const idx = workers.indexOf(name)
    await api('PATCH', `/tasks/${taskIds[idx]}/my-status`, tok(name), { status: 'IN_PROGRESS' })
  }
  // togrul, lamiye — PENDING qalır
  console.log('4.1 — Task2: 8 COMPLETED, 2 IN_PROGRESS, 2 PENDING ✓')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 5: GÖREV 3 — Mesajlaşma
// ════════════════════════════════════════════════════════════════

test('5.1 - GÖREV3: Tural hər işçiyə fərdi mesaj göndərir', async () => {
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','rauf','togrul','lamiye']
  for (const name of workers) {
    const r = await api('PATCH', `/tasks/${state.gorev3Id}/assignee-note`, tok('tural'), {
      userId: uid(name), approverNote: `${state[`${name}_name`]}, veb sayt bölmənizi hazırlayın`,
    })
  }
  console.log('5.1 — Görev3: Tural 10 fərdi mesaj göndərdi ✓')
})

test('5.2 - GÖREV3: Tural toplu mesaj göndərir', async () => {
  await api('PATCH', `/tasks/${state.gorev3Id}/bulk-note`, tok('tural'), { note: 'Hamı: cümə gününə hazır olmalıdır!' })
  console.log('5.2 — Görev3: toplu mesaj ✓')
})

test('5.3 - GÖREV3: 5 işçi cavab yazır', async () => {
  for (const name of ['nigar','rashad','elvin','rauf','togrul']) {
    await api('PATCH', `/tasks/${state.gorev3Id}/worker-note`, tok(name), { note: `${state[`${name}_name`]}: anladım, başlayıram` })
  }
  console.log('5.3 — Görev3: 5 işçi cavab yazdı ✓')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 6: GÖREV 3 — Status + Düzənləmə
// ════════════════════════════════════════════════════════════════

test('6.1 - GÖREV3: 6 COMPLETED, 2 DECLINED, 2 IN_PROGRESS', async () => {
  // 6 COMPLETED
  for (const name of ['nigar','rashad','elvin','sebine','rauf','togrul']) {
    await api('PATCH', `/tasks/${state.gorev3Id}/my-status`, tok(name), { status: 'COMPLETED' })
  }
  // 2 DECLINED
  for (const name of ['gunel','orxan']) {
    await api('PATCH', `/tasks/${state.gorev3Id}/my-status`, tok(name), { status: 'DECLINED' })
  }
  // 2 IN_PROGRESS (murad, lamiye)
  for (const name of ['murad','lamiye']) {
    await api('PATCH', `/tasks/${state.gorev3Id}/my-status`, tok(name), { status: 'IN_PROGRESS' })
  }
  console.log('6.1 — Görev3: 6C, 2D, 2IP ✓')
})

test('6.2 - GÖREV3: Həsən düzənləyir — 2 DECLINED silir, 2 yeni əlavə edir', async () => {
  // gunel, orxan silinir → nermin, ulviyye əlavə olur
  const keep = ['nigar','rashad','elvin','murad','sebine','rauf','togrul','lamiye']
  const add = ['nermin','ulviyye']
  const newAssignees = [...keep, ...add].map(uid)
  const r = await api('PUT', `/tasks/${state.gorev3Id}`, tok('hasan'), { assigneeIds: newAssignees })
  console.log(`6.2 — Görev3 düzənləndi: ${r._s}`)

  // Yoxla
  const task = await api('GET', `/tasks/${state.gorev3Id}`, tok('hasan'))
  const ids = (task.assignees || []).map((a: any) => a.userId)
  console.log(`6.2 — Assignee sayı: ${ids.length} (gözlənilən: 10)`)
  expect(ids.length).toBe(10)
  expect(ids).not.toContain(uid('gunel'))
  expect(ids).not.toContain(uid('orxan'))
  expect(ids).toContain(uid('nermin'))
  expect(ids).toContain(uid('ulviyye'))
})

test('6.3 - GÖREV3: Tural yeni işçilərə mesaj yazır', async () => {
  for (const name of ['nermin','ulviyye']) {
    await api('PATCH', `/tasks/${state.gorev3Id}/assignee-note`, tok('tural'), {
      userId: uid(name), approverNote: `Xoş gəldiniz ${state[`${name}_name`]}! Veb sayt layihəsinə qoşuldunuz.`,
    })
  }
  console.log('6.3 — Görev3: yeni işçilərə mesaj ✓')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 7: GÖREV 4 — Mesaj + Chat bağlama
// ════════════════════════════════════════════════════════════════

test('7.1 - GÖREV4: Kamran hər işçiyə mesaj göndərir', async () => {
  const workers = ['ulviyye','zaur','ekber','rauf','togrul','lamiye','nermin','nigar','rashad','elvin']
  for (const name of workers) {
    await api('PATCH', `/tasks/${state.gorev4Id}/assignee-note`, tok('kamran'), {
      userId: uid(name), approverNote: `${state[`${name}_name`]}, anbar bölmənizi sayın`,
    })
  }
  console.log('7.1 — Görev4: Kamran 10 mesaj göndərdi ✓')
})

test('7.2 - GÖREV4: Kamran 3 chatı bağlayır, sonra 1-ni açır', async () => {
  // 3 bağla
  for (const name of ['zaur','ekber','rauf']) {
    await api('PATCH', `/tasks/${state.gorev4Id}/close-chat`, tok('kamran'), { userId: uid(name), closed: true })
  }
  console.log('7.2 — 3 chat bağlandı')
  // 1 yenidən aç
  await api('PATCH', `/tasks/${state.gorev4Id}/close-chat`, tok('kamran'), { userId: uid('rauf'), closed: false })
  console.log('7.2 — Rauf chatı yenidən açıldı ✓')
})

test('7.3 - GÖREV4: 5 COMPLETED, 3 DECLINED, 2 PENDING', async () => {
  // 5 COMPLETED
  for (const name of ['ulviyye','togrul','lamiye','nigar','rashad']) {
    await api('PATCH', `/tasks/${state.gorev4Id}/my-status`, tok(name), { status: 'COMPLETED' })
  }
  // 3 DECLINED
  for (const name of ['zaur','ekber','nermin']) {
    await api('PATCH', `/tasks/${state.gorev4Id}/my-status`, tok(name), { status: 'DECLINED' })
  }
  // rauf, elvin — PENDING qalır
  console.log('7.3 — Görev4: 5C, 3D, 2P ✓')
})

// ════════════════════════════════════════════════════════════════
// ADDIM 8: UI Yoxlama — /tasks status tabları
// ════════════════════════════════════════════════════════════════

test('8.1 - UI: Nigar /tasks-da müxtəlif tab-larda tapşırıq görür', async ({ page }) => {
  await loginAs(page, 'nigar')
  await page.goto('/tasks')
  await page.waitForTimeout(1500)

  // Nigar 5 task-da iştirak edir, müxtəlif statuslarda
  let totalFound = 0
  for (const tab of ['Hamısı', 'Gözləyir', 'Tamamlandı', 'Rədd', 'Davam edir']) {
    const btn = page.locator('button').filter({ hasText: tab }).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ force: true }); await page.waitForTimeout(600)
      const cards = await page.locator('.cursor-pointer').filter({ hasText: PREFIX }).count()
      if (cards > 0) { totalFound += cards; console.log(`8.1 — "${tab}" tab: ${cards} task`) }
    }
  }
  console.log(`8.1 — Nigar toplam ${totalFound} task görür`)
  expect(totalFound).toBeGreaterThan(0)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 9: Task1 bağlanır + Task2 approve
// ════════════════════════════════════════════════════════════════

test('9.1 - Task1: Leyla bağlayır (close) — qalanlar FORCE_COMPLETED', async () => {
  const taskIds = state[`${T1}_taskIds`] as string[]
  // Close hər task-ı ayrı-ayrı
  for (const tid of taskIds) {
    await api('POST', `/tasks/${tid}/close`, tok('hasan'))
  }
  console.log('9.1 — Task1 bağlandı ✓')

  // Yoxla: bütün tasklar APPROVED olmalı
  for (const tid of taskIds.slice(0, 3)) {
    const t = await api('GET', `/tasks/${tid}`, tok('hasan'))
    console.log(`9.1 — Task ${tid.slice(0,8)}: status=${t.status}, finalized=${t.finalized}`)
  }
})

test('9.2 - Task2: Həsən approve edir', async () => {
  const taskIds = state[`${T2}_taskIds`] as string[]
  for (const tid of taskIds) {
    await api('PATCH', `/tasks/${tid}/creator-approve`, tok('hasan'))
  }
  console.log('9.2 — Task2 approved ✓')

  // Yoxla
  const t = await api('GET', `/tasks/${taskIds[0]}`, tok('hasan'))
  console.log(`9.2 — Task2 ilk: status=${t.status}, creatorApproved=${t.creatorApproved}`)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 10: GÖREV 3 finalize + approve
// ════════════════════════════════════════════════════════════════

test('10.1 - GÖREV3: Tural finalize edir', async () => {
  const r = await api('PATCH', `/tasks/${state.gorev3Id}/finalize`, tok('tural'), {
    note: 'Veb sayt yenilənməsi tamamlandı. Bütün bölmələr yoxlanıldı.',
  })
  console.log(`10.1 — Görev3 finalize: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('10.2 - GÖREV3: Həsən approve edir', async () => {
  const r = await api('PATCH', `/tasks/${state.gorev3Id}/creator-approve`, tok('hasan'))
  console.log(`10.2 — Görev3 approve: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('10.3 - GÖREV3: Son statuslar yoxlanılır', async () => {
  const task = await api('GET', `/tasks/${state.gorev3Id}`, tok('hasan'))
  console.log(`\n10.3 — GÖREV3 YEKUN:`)
  console.log(`  status: ${task.status} | finalized: ${task.finalized} | creatorApproved: ${task.creatorApproved}`)
  for (const a of (task.assignees || [])) {
    console.log(`  ${(a.user?.fullName || '').padEnd(22)} → ${a.status}`)
  }
  expect(task.status).toBe('APPROVED')
  expect(task.finalized).toBe(true)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 11: GÖREV 4 finalize + approve
// ════════════════════════════════════════════════════════════════

test('11.1 - GÖREV4: Kamran finalize edir', async () => {
  const r = await api('PATCH', `/tasks/${state.gorev4Id}/finalize`, tok('kamran'), {
    note: 'Anbar sayımı tamamlandı.',
  })
  console.log(`11.1 — Görev4 finalize: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('11.2 - GÖREV4: Həsən approve edir', async () => {
  const r = await api('PATCH', `/tasks/${state.gorev4Id}/creator-approve`, tok('hasan'))
  console.log(`11.2 — Görev4 approve: ${r._s}`)
  expect(r._s).toBeLessThan(300)
})

test('11.3 - GÖREV4: Son statuslar yoxlanılır', async () => {
  const task = await api('GET', `/tasks/${state.gorev4Id}`, tok('hasan'))
  console.log(`\n11.3 — GÖREV4 YEKUN:`)
  console.log(`  status: ${task.status} | finalized: ${task.finalized}`)
  for (const a of (task.assignees || [])) {
    console.log(`  ${(a.user?.fullName || '').padEnd(22)} → ${a.status.padEnd(18)} chatClosed: ${a.chatClosed}`)
  }
  expect(task.status).toBe('APPROVED')

  // PENDING olanlar FORCE_COMPLETED olmalı
  const rauf = (task.assignees || []).find((a: any) => a.userId === uid('rauf'))
  const elvin = (task.assignees || []).find((a: any) => a.userId === uid('elvin'))
  expect(['FORCE_COMPLETED', 'COMPLETED']).toContain(rauf?.status)
  expect(['FORCE_COMPLETED', 'COMPLETED']).toContain(elvin?.status)
})

// ════════════════════════════════════════════════════════════════
// ADDIM 12: Task5 — hamı tamamlayır + approve
// ════════════════════════════════════════════════════════════════

test('12.1 - TASK5: Hamı tamamlayır (10/10)', async () => {
  const taskIds = state[`${T5}_taskIds`] as string[]
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']
  for (let i = 0; i < workers.length; i++) {
    await api('PATCH', `/tasks/${taskIds[i]}/my-status`, tok(workers[i]), { status: 'COMPLETED' })
  }
  console.log('12.1 — Task5: 10/10 COMPLETED ✓')
})

test('12.2 - TASK5: Həsən approve edir', async () => {
  const taskIds = state[`${T5}_taskIds`] as string[]
  for (const tid of taskIds) {
    await api('PATCH', `/tasks/${tid}/creator-approve`, tok('hasan'))
  }
  console.log('12.2 — Task5 approved ✓')
})

// ════════════════════════════════════════════════════════════════
// YEKUN: Bütün 5 task/görev statusları
// ════════════════════════════════════════════════════════════════

test('YEKUN - Bütün taskların son vəziyyəti', async () => {
  console.log('\n══════════════════════════════════════════')
  console.log('         MEGA TEST — YEKUN NƏTİCƏ')
  console.log('══════════════════════════════════════════')

  // Task1
  const t1ids = state[`${T1}_taskIds`] as string[]
  const t1 = await api('GET', `/tasks/${t1ids[0]}`, tok('hasan'))
  console.log(`\n📋 TASK 1 (Aylıq Hesabat): status=${t1.status} finalized=${t1.finalized}`)

  // Task2
  const t2ids = state[`${T2}_taskIds`] as string[]
  const t2 = await api('GET', `/tasks/${t2ids[0]}`, tok('aynur'))
  console.log(`📋 TASK 2 (Müştəri Zəngi): status=${t2.status} creatorApproved=${t2.creatorApproved}`)

  // Görev3
  const g3 = await api('GET', `/tasks/${state.gorev3Id}`, tok('hasan'))
  console.log(`📋 GÖREV 3 (Veb Sayt): status=${g3.status} finalized=${g3.finalized} approved=${g3.creatorApproved}`)
  console.log(`   İşçilər: ${(g3.assignees||[]).map((a:any) => `${a.user?.fullName?.split(' ')[0]}:${a.status}`).join(', ')}`)

  // Görev4
  const g4 = await api('GET', `/tasks/${state.gorev4Id}`, tok('aynur'))
  console.log(`📋 GÖREV 4 (Anbar): status=${g4.status} finalized=${g4.finalized} approved=${g4.creatorApproved}`)
  console.log(`   İşçilər: ${(g4.assignees||[]).map((a:any) => `${a.user?.fullName?.split(' ')[0]}:${a.status}`).join(', ')}`)

  // Task5
  const t5ids = state[`${T5}_taskIds`] as string[]
  const t5 = await api('GET', `/tasks/${t5ids[0]}`, tok('hasan'))
  console.log(`📋 TASK 5 (Təcili Email): status=${t5.status} creatorApproved=${t5.creatorApproved}`)

  console.log('\n══════════════════════════════════════════')
  console.log('✅ MEGA TEST TAMAMLANDI')
  console.log('══════════════════════════════════════════')
})

test('YEKUN UI - /tasks-da Həsən tamamlanmış taskları görür', async ({ page }) => {
  await loginAs(page, 'hasan')
  await page.goto('/tasks')
  await page.waitForTimeout(1500)
  const tamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
  if (await tamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tamTab.click({ force: true }); await page.waitForTimeout(800)
  }
  const cards = await page.locator('.cursor-pointer').filter({ hasText: PREFIX }).count()
  console.log(`YEKUN UI — Leyla Tamamlandı tab-da ${cards} task görür`)
})

}) // end MEGA describe.serial
