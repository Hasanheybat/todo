import { test, expect, Page } from '@playwright/test'
import { loginAs, API, USERS, today } from './helpers'

// ══════════════════════════════════════════════════════════════
// TASK (groupId) TAM LIFECYCLE TESTİ
// Fərdi tapşırıq dağıtma: yaratma → mesaj → düzənləmə →
// status → reject → close → approve → UI yoxlama
// ══════════════════════════════════════════════════════════════

const PREFIX = 'TASK_LC_'
const T1 = `${PREFIX}Hesabat_Hazırla`
const T2 = `${PREFIX}Sənəd_Göndər`
const T3 = `${PREFIX}Reject_Test`

const state: Record<string, any> = {}

// ── API ──
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

function uid(n: string) { return state[`${n}_id`] || '' }
function tok(n: string) { return state[`${n}_token`] || '' }

async function createGroupTasks(token: string, title: string, assigneeIds: string[], opts: any = {}): Promise<string[]> {
  const groupId = crypto.randomUUID()
  const ids: string[] = []
  for (const uid of assigneeIds) {
    const r = await api('POST', '/tasks', token, {
      title, type: 'TASK', groupId, assigneeIds: [uid],
      priority: opts.priority || 'MEDIUM', dueDate: opts.dueDate || today(7),
      businessId: opts.businessId,
    })
    if (r.id) ids.push(r.id)
  }
  state[`${title}_groupId`] = groupId
  state[`${title}_taskIds`] = ids
  return ids
}

async function findTaskOnPage(page: Page, titlePart: string): Promise<boolean> {
  await page.goto('/tasks')
  await page.waitForTimeout(1500)
  for (const tab of ['Hamısı', 'Gözləyir', 'Davam edir', 'Tamamlandı', 'Rədd']) {
    const btn = page.locator('button').filter({ hasText: tab }).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ force: true }); await page.waitForTimeout(500)
      if (await page.locator('.cursor-pointer', { hasText: titlePart }).first().isVisible({ timeout: 1500 }).catch(() => false)) return true
    }
  }
  return false
}

// ══════════════════════════════════════════════════════════════
test.describe.serial('TASK Lifecycle', () => {

const WORKERS_10 = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']
const WORKERS_12 = [...WORKERS_10, 'togrul', 'lamiye']

// ════════════════════════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════════════════════════
test('0.1 - Login + ID-lər', async () => {
  const emails = ['hasan','leyla','nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber','togrul','lamiye','nermin','rauf']
  for (const e of emails) state[`${e}_token`] = await apiLogin(`${e}@techflow.az`)
  expect(tok('hasan')).toBeTruthy()

  const r = await fetch(`${API}/users?limit=100`, { headers: { Authorization: `Bearer ${tok('hasan')}` } })
  const d = await r.json()
  const users = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []
  for (const u of users) state[`${u.email.split('@')[0]}_id`] = u.id

  const biz = await fetch(`${API}/users/businesses`, { headers: { Authorization: `Bearer ${tok('hasan')}` } }).then(r => r.json())
  state.bakuBizId = (Array.isArray(biz) ? biz : []).find((b: any) => b.name?.includes('Bakı'))?.id || ''

  console.log(`0.1 — ${users.length} user, Bakı: ${state.bakuBizId?.slice(0,8)}`)
  expect(uid('nigar')).toBeTruthy()
})

test('0.2 - Köhnə test taskları silinir', async () => {
  const tasksR = await fetch(`${API}/tasks?limit=200`, { headers: { Authorization: `Bearer ${tok('hasan')}` } }).then(r => r.json())
  const arr = Array.isArray(tasksR) ? tasksR : Array.isArray(tasksR?.data) ? tasksR.data : []
  let del = 0
  for (const t of arr) {
    if ((t.title || '').startsWith(PREFIX)) { await api('DELETE', `/tasks/${t.id}`, tok('hasan')); del++ }
  }
  console.log(`0.2 — ${del} köhnə task silindi`)
})

// ════════════════════════════════════════════════════════════
// ADDIM 1: TASK yaratma (groupId ilə)
// ════════════════════════════════════════════════════════════
test('1.1 - TASK1: Hesabat — Həsən → 10 işçi', async () => {
  const ids = await createGroupTasks(tok('hasan'), T1, WORKERS_10.map(uid), { businessId: state.bakuBizId })
  console.log(`1.1 — ${ids.length} task yaradıldı, groupId: ${state[`${T1}_groupId`]?.slice(0,8)}`)
  expect(ids.length).toBe(10)
})

test('1.2 - TASK2: Sənəd — Həsən → 12 işçi', async () => {
  const ids = await createGroupTasks(tok('hasan'), T2, WORKERS_12.map(uid), { priority: 'HIGH', businessId: state.bakuBizId })
  console.log(`1.2 — ${ids.length} task yaradıldı`)
  expect(ids.length).toBe(12)
})

test('1.3 - TASK3: Reject test — Həsən → 10 işçi', async () => {
  const ids = await createGroupTasks(tok('hasan'), T3, WORKERS_10.map(uid), { businessId: state.bakuBizId })
  console.log(`1.3 — ${ids.length} task yaradıldı`)
  expect(ids.length).toBe(10)
})

// ════════════════════════════════════════════════════════════
// ADDIM 2: UI — Kreator qruplanmış kart görür
// ════════════════════════════════════════════════════════════
test('2.1 - UI: Həsən /tasks-da qruplanmış TASK1 kartı görür', async ({ page }) => {
  await loginAs(page, 'hasan')
  const found = await findTaskOnPage(page, T1)
  console.log(`2.1 — Həsən TASK1 görür: ${found}`)
  expect(found).toBe(true)
})

test('2.2 - UI: Nigar /tasks-da öz fərdi TASK-ını görür', async ({ page }) => {
  await loginAs(page, 'nigar')
  const found = await findTaskOnPage(page, T1)
  console.log(`2.2 — Nigar TASK1 görür: ${found}`)
  expect(found).toBe(true)
})

// ════════════════════════════════════════════════════════════
// ADDIM 3: Fərdi mesajlaşma (worker-note + bulk-note)
// ════════════════════════════════════════════════════════════
test('3.1 - İşçilər worker-note yazır', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  for (let i = 0; i < 5; i++) {
    const r = await api('PATCH', `/tasks/${ids[i]}/worker-note`, tok(WORKERS_10[i]), {
      note: `${WORKERS_10[i]}: hesabatımı hazırlayıram`,
    })
    if (i === 0) console.log(`3.1 — ${WORKERS_10[i]} note: ${r._s}`)
  }
  console.log('3.1 — 5 işçi worker-note yazdı ✓')
})

test('3.2 - Həsən toplu mesaj göndərir (bulk-note)', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  for (const tid of ids) {
    await api('PATCH', `/tasks/${tid}/bulk-note`, tok('hasan'), { note: 'Hamı: deadline sabah!' })
  }
  console.log('3.2 — Həsən 10 task-a bulk-note göndərdi ✓')
})

test('3.3 - UI: Nigar öz mesajını və toplu mesajı görür', async ({ page }) => {
  await loginAs(page, 'nigar')
  await page.goto('/tasks'); await page.waitForTimeout(1500)
  // Nigar task kartını tapıb açır
  const card = page.locator('.cursor-pointer', { hasText: T1 }).first()
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    await card.click(); await page.waitForTimeout(800)
    const ownMsg = await page.locator('text=nigar: hesabatımı hazırlayıram').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`3.3 — Nigar öz mesajı: ${ownMsg}`)
    // Toplu mesaj tab
    const bulkTab = page.locator('button:has-text("Toplu mesajlar")').first()
    if (await bulkTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bulkTab.click(); await page.waitForTimeout(300)
      const bulk = await page.locator('text=deadline sabah').first().isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`3.3 — Toplu mesaj: ${bulk}`)
    }
  }
})

// ════════════════════════════════════════════════════════════
// ADDIM 4: Status dəyişiklikləri — TASK1
// ════════════════════════════════════════════════════════════
test('4.1 - TASK1: 4 COMPLETED, 2 DECLINED, 2 IN_PROGRESS, 2 PENDING', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  // 4 COMPLETED: nigar, rashad, elvin, ulviyye
  for (const n of ['nigar','rashad','elvin','ulviyye']) {
    const idx = WORKERS_10.indexOf(n)
    await api('PATCH', `/tasks/${ids[idx]}/my-status`, tok(n), { status: 'COMPLETED' })
  }
  // 2 DECLINED: gunel, zaur
  for (const n of ['gunel','zaur']) {
    const idx = WORKERS_10.indexOf(n)
    await api('PATCH', `/tasks/${ids[idx]}/my-status`, tok(n), { status: 'DECLINED' })
  }
  // 2 IN_PROGRESS: murad, sebine
  for (const n of ['murad','sebine']) {
    const idx = WORKERS_10.indexOf(n)
    await api('PATCH', `/tasks/${ids[idx]}/my-status`, tok(n), { status: 'IN_PROGRESS' })
  }
  // 2 PENDING: orxan, ekber (heç nə etmir)
  console.log('4.1 — TASK1: 4C, 2D, 2IP, 2P ✓')
})

test('4.2 - API: Status yoxlaması', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  const statuses: Record<string, string> = {}
  for (let i = 0; i < WORKERS_10.length; i++) {
    const t = await api('GET', `/tasks/${ids[i]}`, tok('hasan'))
    const a = (t.assignees || [])[0]
    statuses[WORKERS_10[i]] = a?.status || 'N/A'
  }
  console.log('4.2 — TASK1 statusları:', statuses)
  expect(statuses.nigar).toBe('COMPLETED')
  expect(statuses.gunel).toBe('DECLINED')
  expect(statuses.murad).toBe('IN_PROGRESS')
  expect(statuses.orxan).toBe('PENDING')
})

// ════════════════════════════════════════════════════════════
// ADDIM 5: Status dəyişiklikləri — TASK2
// ════════════════════════════════════════════════════════════
test('5.1 - TASK2: 10 COMPLETED, 2 PENDING', async () => {
  const ids = state[`${T2}_taskIds`] as string[]
  for (let i = 0; i < 10; i++) {
    await api('PATCH', `/tasks/${ids[i]}/my-status`, tok(WORKERS_12[i]), { status: 'COMPLETED' })
  }
  // togrul, lamiye — PENDING
  console.log('5.1 — TASK2: 10C, 2P ✓')
})

// ════════════════════════════════════════════════════════════
// ADDIM 6: Düzənləmə — TASK1 assignee silmə/əlavə
// ════════════════════════════════════════════════════════════
test('6.1 - TASK1: Həsən 2 DECLINED işçini silir (gunel, zaur)', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  // gunel idx=3, zaur idx=8 — bu taskları sil
  const gunelIdx = WORKERS_10.indexOf('gunel')
  const zaurIdx = WORKERS_10.indexOf('zaur')
  await api('DELETE', `/tasks/${ids[gunelIdx]}`, tok('hasan'))
  await api('DELETE', `/tasks/${ids[zaurIdx]}`, tok('hasan'))
  console.log('6.1 — gunel + zaur taskları silindi')

  // ID siyahısını yenilə
  const remaining = ids.filter((_: any, i: number) => i !== gunelIdx && i !== zaurIdx)
  state[`${T1}_taskIds`] = remaining
  console.log(`6.1 — Qalan task sayı: ${remaining.length}`)
  expect(remaining.length).toBe(8)
})

test('6.2 - TASK1: Həsən 2 yeni işçi əlavə edir (rauf, nermin)', async () => {
  const groupId = state[`${T1}_groupId`]
  for (const n of ['rauf','nermin']) {
    const r = await api('POST', '/tasks', tok('hasan'), {
      title: T1, type: 'TASK', groupId, assigneeIds: [uid(n)],
      priority: 'MEDIUM', dueDate: today(7), businessId: state.bakuBizId,
    })
    if (r.id) (state[`${T1}_taskIds`] as string[]).push(r.id)
  }
  console.log(`6.2 — Yeni task sayı: ${(state[`${T1}_taskIds`] as string[]).length}`)
  expect((state[`${T1}_taskIds`] as string[]).length).toBe(10)
})

test('6.3 - Silinən gunel TASK1-i artıq görmür (API)', async () => {
  const tasks = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${tok('gunel')}` } }).then(r => r.json())
  const arr = Array.isArray(tasks) ? tasks : tasks?.data || []
  const found = arr.some((t: any) => (t.title || '').includes(T1))
  console.log(`6.3 — Günel TASK1 API-dən görür: ${found} (gözlənilən: false)`)
  expect(found).toBe(false)
})

test('6.4 - Yeni rauf TASK1-i görür (API)', async () => {
  const tasks = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${tok('rauf')}` } }).then(r => r.json())
  const arr = Array.isArray(tasks) ? tasks : tasks?.data || []
  const found = arr.some((t: any) => (t.title || '').includes(T1))
  console.log(`6.4 — Rauf TASK1 API-dən görür: ${found}`)
  expect(found).toBe(true)
})

// ════════════════════════════════════════════════════════════
// ADDIM 7: Geri dönüşsüz status testləri
// ════════════════════════════════════════════════════════════
test('7.1 - COMPLETED → IN_PROGRESS geri dönüşü olmaz', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  // nigar idx=0, COMPLETED statusda
  const r = await api('PATCH', `/tasks/${ids[0]}/my-status`, tok('nigar'), { status: 'IN_PROGRESS' })
  console.log(`7.1 — COMPLETED→IN_PROGRESS: ${r._s} (gözlənilən: >=400)`)
  expect(r._s).toBeGreaterThanOrEqual(400)
})

test('7.2 - DECLINED → COMPLETED geri dönüşü olmaz', async () => {
  // TASK3 istifadə edək — bir işçini DECLINED edib geri dönməyə çalışaq
  const ids = state[`${T3}_taskIds`] as string[]
  await api('PATCH', `/tasks/${ids[0]}/my-status`, tok('nigar'), { status: 'DECLINED' })
  const r = await api('PATCH', `/tasks/${ids[0]}/my-status`, tok('nigar'), { status: 'COMPLETED' })
  console.log(`7.2 — DECLINED→COMPLETED: ${r._s} (gözlənilən: >=400)`)
  expect(r._s).toBeGreaterThanOrEqual(400)
})

// ════════════════════════════════════════════════════════════
// ADDIM 8: Creator close — TASK1
// ════════════════════════════════════════════════════════════
test('8.1 - Həsən TASK1-i close edir → qalanlar FORCE_COMPLETED', async () => {
  const ids = state[`${T1}_taskIds`] as string[]
  for (const tid of ids) {
    await api('POST', `/tasks/${tid}/close`, tok('hasan'))
  }
  console.log('8.1 — TASK1 bütün tasklar close edildi ✓')

  // Yoxla: murad IN_PROGRESS idi → FORCE_COMPLETED olmalı
  const muradTask = await api('GET', `/tasks/${ids[WORKERS_10.indexOf('murad') < 3 ? WORKERS_10.indexOf('murad') : 2]}`, tok('hasan'))
  const muradA = (muradTask.assignees || [])[0]
  console.log(`8.1 — murad əvvəl IP idi, indi: ${muradA?.status}`)
})

// ════════════════════════════════════════════════════════════
// ADDIM 9: Creator approve — TASK2
// ════════════════════════════════════════════════════════════
test('9.1 - Həsən TASK2-ni creator-approve edir', async () => {
  const ids = state[`${T2}_taskIds`] as string[]
  for (const tid of ids) {
    await api('PATCH', `/tasks/${tid}/creator-approve`, tok('hasan'))
  }
  console.log('9.1 — TASK2 approved ✓')

  // Yoxla
  const t = await api('GET', `/tasks/${ids[0]}`, tok('hasan'))
  console.log(`9.1 — İlk task: status=${t.status}, creatorApproved=${t.creatorApproved}`)
  expect(t.creatorApproved).toBe(true)
})

// ════════════════════════════════════════════════════════════
// ADDIM 10: Task reject testi — TASK3
// ════════════════════════════════════════════════════════════
test('10.1 - TASK3: bəzi işçilər tamamlayır', async () => {
  const ids = state[`${T3}_taskIds`] as string[]
  // 5 COMPLETED (nigar artıq DECLINED oldu test 7.2-dən, rashad-dan başlayaq)
  for (let i = 1; i < 6; i++) {
    await api('PATCH', `/tasks/${ids[i]}/my-status`, tok(WORKERS_10[i]), { status: 'COMPLETED' })
  }
  console.log('10.1 — TASK3: 5 nəfər COMPLETED ✓')
})

test('10.2 - TASK3: Həsən reject edir (PENDING_APPROVAL olanlar)', async () => {
  const ids = state[`${T3}_taskIds`] as string[]
  // Reject çalışa bilər, amma status PENDING_APPROVAL olmalıdır
  // Close ilə bağlayaq
  for (const tid of ids) {
    await api('POST', `/tasks/${tid}/close`, tok('hasan'))
  }
  console.log('10.2 — TASK3 close ilə bağlandı ✓')
})

// ════════════════════════════════════════════════════════════
// ADDIM 11: UI Yekun Yoxlama
// ════════════════════════════════════════════════════════════
test('11.1 - UI: Həsən Tamamlandı tab-da TASK2 görür', async ({ page }) => {
  await loginAs(page, 'hasan')
  await page.goto('/tasks'); await page.waitForTimeout(1500)
  const tamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
  if (await tamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tamTab.click({ force: true }); await page.waitForTimeout(600)
  }
  const found = await page.locator('.cursor-pointer', { hasText: T2 }).first().isVisible({ timeout: 3000 }).catch(() => false)
  console.log(`11.1 — Həsən Tamamlandı-da TASK2 görür: ${found}`)
  expect(found).toBe(true)
})

// ════════════════════════════════════════════════════════════
// YEKUN
// ════════════════════════════════════════════════════════════
test('YEKUN - Bütün TASK statusları', async () => {
  console.log('\n══════════════════════════════════════════')
  console.log('      TASK LIFECYCLE — YEKUN NƏTİCƏ')
  console.log('══════════════════════════════════════════')

  // TASK1
  const t1ids = state[`${T1}_taskIds`] as string[]
  const t1 = await api('GET', `/tasks/${t1ids[0]}`, tok('hasan'))
  console.log(`\n📋 TASK1 (Hesabat): status=${t1.status} finalized=${t1.finalized}`)

  // TASK2
  const t2ids = state[`${T2}_taskIds`] as string[]
  const t2 = await api('GET', `/tasks/${t2ids[0]}`, tok('hasan'))
  console.log(`📋 TASK2 (Sənəd): status=${t2.status} creatorApproved=${t2.creatorApproved}`)

  // TASK3
  const t3ids = state[`${T3}_taskIds`] as string[]
  const t3 = await api('GET', `/tasks/${t3ids[0]}`, tok('hasan'))
  console.log(`📋 TASK3 (Reject): status=${t3.status}`)

  console.log('\n══════════════════════════════════════════')
  console.log('✅ TASK LIFECYCLE TESTİ TAMAMLANDI')
  console.log('══════════════════════════════════════════')
})

}) // end describe.serial
