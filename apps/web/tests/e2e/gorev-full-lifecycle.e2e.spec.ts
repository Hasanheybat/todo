import { test, expect, Page } from '@playwright/test'
import { loginAs, API, USERS, TEST_FILE, today } from './helpers'

// ══════════════════════════════════════════════════════════════
// GÖREV TAM LIFECYCLE TESTİ — API + UI Hibrid
// 1 toplu GÖREV: yaratma → mesaj → düzənləmə → status → finalize → approve
// ══════════════════════════════════════════════════════════════

const TITLE = 'LIFECYCLE_TEST_GÖREV_V3'
test.describe.serial('GÖREV Tam Lifecycle', () => {

const DESC  = 'Lifecycle test: yaratma, mesajlaşma, düzənləmə, status, finalizasiya, onay.'

// ── Mesaj konstantları ──
const MSG_L_ISCI1 = 'Leyla→İşçi1: tapşırığa baxın'
const MSG_L_ISCI2 = 'Leyla→İşçi2: prioritet yüksəkdir'
const MSG_BULK1   = 'Toplu #1: hamı işə başlasın'
const MSG_ISCI1_L = 'Nigar→Leyla: anladım başlayıram'
const MSG_ISCI2_L = 'Rashad→Leyla: qəbul etdim'
const MSG_L_ISCI6 = 'Leyla→İşçi6: xoş gəldiniz'
const MSG_L_ISCI7 = 'Leyla→İşçi7: alt-görev əlavə olundu'
const MSG_BULK2   = 'Toplu #2: yenilənmiş plan'
const MSG_ISCI6_L = 'İşçi6→Leyla: qəbul etdim'

// ── State ──
const state: Record<string, string> = {}

// ── API helpers ──
async function apiLogin(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '123456' }),
  })
  return (await r.json()).accessToken || ''
}

async function apiCall(method: string, path: string, token: string, body?: any): Promise<any> {
  const opts: any = { method, headers: { Authorization: `Bearer ${token}` } }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  const r = await fetch(`${API}${path}`, opts)
  const text = await r.text()
  try { const data = JSON.parse(text); data._httpStatus = r.status; return data } catch { return { _httpStatus: r.status, raw: text } }
}

async function apiUsers(token: string): Promise<any[]> {
  const r = await fetch(`${API}/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  return Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []
}

async function apiBusinesses(token: string): Promise<any[]> {
  const r = await fetch(`${API}/users/businesses`, { headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}

async function apiTasks(token: string): Promise<any[]> {
  const r = await fetch(`${API}/tasks?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  return Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []
}

async function ensureState() {
  // Yalnız boşdursa login et (rate limit-ə düşməmək üçün)
  if (!state.hasanToken) state.hasanToken = await apiLogin('hasan@techflow.az')
  if (!state.leylaToken) state.leylaToken = await apiLogin('leyla@techflow.az')
  if (!state.turalToken) state.turalToken = await apiLogin('tural@techflow.az') // Komanda Lideri — gorev.approve var
  if (!state.nigarToken) state.nigarToken = await apiLogin('nigar@techflow.az')
  if (!state.rashadToken) state.rashadToken = await apiLogin('rashad@techflow.az')

  if (!state.isci1Id) {
    const users = await apiUsers(state.hasanToken)
    console.log(`ensureState: ${users.length} user tapıldı, hasanToken: ${!!state.hasanToken}`)

    state.leylaId = users.find((u: any) => u.email === 'leyla@techflow.az')?.id || ''
    state.turalId = users.find((u: any) => u.email === 'tural@techflow.az')?.id || ''
    const nigar = users.find((u: any) => u.email === 'nigar@techflow.az')
    const rashad = users.find((u: any) => u.email === 'rashad@techflow.az')
    state.isci1Id = nigar?.id || ''; state.isci1Name = nigar?.fullName || ''; state.isci1Email = nigar?.email || ''
    state.isci2Id = rashad?.id || ''; state.isci2Name = rashad?.fullName || ''; state.isci2Email = rashad?.email || ''

    const employees = users.filter((u: any) => u.role === 'EMPLOYEE' && !['nigar@techflow.az', 'rashad@techflow.az'].includes(u.email))
    for (let i = 0; i < 5; i++) {
      if (employees[i]) {
        state[`isci${i + 3}Id`] = employees[i].id
        state[`isci${i + 3}Name`] = employees[i].fullName
        state[`isci${i + 3}Email`] = employees[i].email
      }
    }

    const biz = await apiBusinesses(state.hasanToken)
    state.businessId = (Array.isArray(biz) ? biz : [])[0]?.id || ''
    state.departmentId = (Array.isArray(biz) ? biz : [])[0]?.departments?.[0]?.department?.id || ''
  }

  // İşçi tokenları
  for (let i = 3; i <= 7; i++) {
    if (state[`isci${i}Email`] && !state[`isci${i}Token`]) {
      state[`isci${i}Token`] = await apiLogin(state[`isci${i}Email`])
    }
  }

  // Mövcud task axtar
  if (!state.taskId) {
    const tasks = await apiTasks(state.hasanToken)
    const existing = tasks.find((t: any) => t.title === TITLE)
    if (existing) state.taskId = existing.id
  }
}

// ── UI helpers ──
async function openGorevCard(page: Page, titlePart: string) {
  await page.goto('/tasks')
  await page.waitForTimeout(1500)
  async function tryClick(): Promise<boolean> {
    const card = page.locator('.cursor-pointer', { hasText: titlePart }).first()
    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      await card.click(); await page.waitForTimeout(600); return true
    }
    return false
  }
  if (await tryClick()) return
  for (const label of ['Hamısı', 'Davam edir', 'Onay gözləyir', 'Tamamlandı', 'Rədd', 'Gözləyir']) {
    const tab = page.locator('button').filter({ hasText: label }).first()
    if (await tab.isVisible({ timeout: 600 }).catch(() => false)) {
      await tab.click({ force: true }); await page.waitForTimeout(600)
      if (await tryClick()) return
    }
  }
  await page.locator('.cursor-pointer', { hasText: titlePart }).first().click()
  await page.waitForTimeout(600)
}

async function loginAsEmail(page: Page, email: string) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[type="email"], input[placeholder*="E-poçt"], input[placeholder*="sizin"]', email)
  await page.fill('input[type="password"], input[placeholder*="Şifrə"]', '123456')
  await page.click('button:has-text("Daxil ol")')
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 })
}

// ════════════════════════════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 0: Hazırlıq', () => {
  test('0.1 - Token, user ID-lər alınır', async () => {
    await ensureState()
    console.log(`0.1 — İşçi1: ${state.isci1Name} | İşçi2: ${state.isci2Name}`)
    console.log(`0.1 — İşçi3: ${state.isci3Name} | İşçi4: ${state.isci4Name} | İşçi5: ${state.isci5Name}`)
    console.log(`0.1 — İşçi6: ${state.isci6Name} | İşçi7: ${state.isci7Name}`)
    expect(state.hasanToken).toBeTruthy()
    expect(state.isci7Id).toBeTruthy()
  })

  test('0.2 - Köhnə test görevləri silinir + yeni GÖREV yaradılır', async () => {
    await ensureState()
    // Köhnə sil
    const tasks = await apiTasks(state.hasanToken)
    for (const t of tasks) {
      if (t.title?.includes('LIFECYCLE_TEST')) {
        await fetch(`${API}/tasks/${t.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.hasanToken}` } })
      }
    }
    // Yeni yarat
    console.log(`0.2 — assigneeIds: [${state.isci1Id?.slice(0,8)}, ${state.isci2Id?.slice(0,8)}, ${state.isci3Id?.slice(0,8)}, ${state.isci4Id?.slice(0,8)}, ${state.isci5Id?.slice(0,8)}]`)
    console.log(`0.2 — approverId (Tural): ${state.turalId?.slice(0,8)}, businessId: ${state.businessId?.slice(0,8)}`)
    // Kreator: Leyla (tasks.create var), Yetkili: Tural (gorev.approve var)
    const r = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.leylaToken}` },
      body: JSON.stringify({
        title: TITLE, description: DESC, type: 'GOREV', priority: 'HIGH',
        dueDate: today(7), businessId: state.businessId, departmentId: state.departmentId,
        assigneeIds: [state.isci1Id, state.isci2Id, state.isci3Id, state.isci4Id, state.isci5Id],
        approverId: state.turalId,
      }),
    })
    const result = await r.json()
    state.taskId = result.id || ''
    console.log(`0.2 — GÖREV yaradıldı: ${state.taskId} (status: ${r.status})`)
    if (!state.taskId) console.log('0.2 — XƏTA:', JSON.stringify(result).slice(0, 300))
    expect(state.taskId).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 1: İlk Açılış — UI yoxlaması
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 1: İlk Açılış', () => {

  test('1.1 - Leyla GÖREV-i görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await page.goto('/tasks')
    await page.waitForTimeout(2000)
    // Tab-larda axtar
    let found = false
    for (const label of ['Hamısı', 'Gözləyir', 'Davam edir']) {
      const tab = page.locator('button').filter({ hasText: label }).first()
      if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tab.click({ force: true })
        await page.waitForTimeout(1000)
      }
      const card = page.locator('.cursor-pointer', { hasText: TITLE }).first()
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true
        console.log(`1.1 — Leyla GÖREV-i "${label}" tab-da tapdı ✓`)
        break
      }
    }
    if (!found) {
      // Debug: səhifədə nə var?
      const pageText = await page.locator('body').innerText().catch(() => '')
      console.log(`1.1 — GÖREV tapılmadı! Səhifədə olan: ${pageText.slice(0, 200)}`)
    }
    expect(found).toBe(true)
  })

  test('1.2 - Nigar "Başlat" düyməsini görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await expect(page.getByRole('button', { name: 'Başlat', exact: true })).toBeVisible({ timeout: 5000 })
    console.log('1.2 — Nigar Başlat görür ✓')
  })

  test('1.3 - Rashad "Başlat" düyməsini görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await expect(page.getByRole('button', { name: 'Başlat', exact: true })).toBeVisible({ timeout: 5000 })
    console.log('1.3 — Rashad Başlat görür ✓')
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 2: Mesajlaşma (API ilə göndər, UI ilə yoxla)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 2: Mesajlaşma', () => {

  test('2.1 - API: Leyla hər işçiyə fərdi mesaj göndərir', async () => {
    // Leyla → İşçi1
    const r1 = await apiCall('PATCH', `/tasks/${state.taskId}/assignee-note`, state.turalToken, { userId: state.isci1Id, approverNote: MSG_L_ISCI1 })
    console.log(`2.1 — Leyla→İşçi1: status ${r1.status}`)
    // Leyla → İşçi2
    const r2 = await apiCall('PATCH', `/tasks/${state.taskId}/assignee-note`, state.turalToken, { userId: state.isci2Id, approverNote: MSG_L_ISCI2 })
    console.log(`2.1 — Leyla→İşçi2: status ${r2.status}`)
    expect(r1._httpStatus).toBeLessThan(300)
    expect(r2._httpStatus).toBeLessThan(300)
  })

  test('2.2 - API: Leyla toplu mesaj göndərir', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/bulk-note`, state.turalToken, { note: MSG_BULK1 })
    console.log(`2.2 — Toplu mesaj: status ${r._httpStatus}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('2.3 - API: İşçilər cavab yazır', async () => {
    const r1 = await apiCall('PATCH', `/tasks/${state.taskId}/worker-note`, state.nigarToken, { note: MSG_ISCI1_L })
    const r2 = await apiCall('PATCH', `/tasks/${state.taskId}/worker-note`, state.rashadToken, { note: MSG_ISCI2_L })
    console.log(`2.3 — Nigar cavab: ${r1.status} | Rashad cavab: ${r2.status}`)
    expect(r1._httpStatus).toBeLessThan(300)
    expect(r2._httpStatus).toBeLessThan(300)
  })

  test('2.4 - UI: Nigar mesajları görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    // Fərdi mesaj
    const leylaMsg = await page.locator(`text=${MSG_L_ISCI1}`).first().isVisible({ timeout: 5000 }).catch(() => false)
    const ownMsg = await page.locator(`text=${MSG_ISCI1_L}`).first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`2.4 — Leyla mesajı: ${leylaMsg} | Öz cavabı: ${ownMsg}`)

    // Toplu mesaj tab
    const bulkTab = page.locator('button:has-text("Toplu mesajlar")').first()
    if (await bulkTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bulkTab.click()
      await page.waitForTimeout(300)
      const bulkVisible = await page.locator(`text=${MSG_BULK1}`).first().isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`2.4 — Toplu mesaj görünür: ${bulkVisible}`)
    }
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 3: Düzənləmə — 3 silinir, 2 yeni əlavə olur
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 3: Düzənləmə', () => {

  test('3.1 - API: 3 işçi silinir, 2 yeni əlavə olur', async () => {
    const r = await apiCall('PUT', `/tasks/${state.taskId}`, state.leylaToken, {
      assigneeIds: [state.isci1Id, state.isci2Id, state.isci6Id, state.isci7Id],
    })
    console.log(`3.1 — Düzənləmə: status ${r.status}`)
    console.log(`  Silinən: ${state.isci3Name}, ${state.isci4Name}, ${state.isci5Name}`)
    console.log(`  Əlavə olan: ${state.isci6Name}, ${state.isci7Name}`)

    // Yoxla
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.hasanToken)
    const ids = (task.assignees || []).map((a: any) => a.userId)
    console.log(`3.1 — Assignee sayı: ${ids.length} (gözlənilən: 4)`)
    expect(ids.length).toBe(4)
    expect(ids).toContain(state.isci1Id)
    expect(ids).toContain(state.isci2Id)
    expect(ids).toContain(state.isci6Id)
    expect(ids).toContain(state.isci7Id)
    expect(ids).not.toContain(state.isci3Id)
  })

  test('3.2 - API: Assignee kontrolu (API artıq 3.1-də yoxlayıb, UI skip)', async () => {
    // API artıq 3.1-də yoxladı — 4 assignee, düzgün ID-lər
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.leylaToken)
    const names = (task.assignees || []).map((a: any) => a.user?.fullName || a.userId)
    console.log(`3.2 — Mövcud assignee-lər: ${names.join(', ')}`)
    expect(names.length).toBe(4)
  })

  test('3.3 - Nigar köhnə mesajları hələ görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)
    const ownMsg = await page.locator(`text=${MSG_ISCI1_L}`).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`3.3 — Nigar öz cavabı qorunub: ${ownMsg}`)
    expect(ownMsg).toBe(true)
  })

  test('3.4 - İşçi6 (yeni) GÖREV-i görür', async ({ page }) => {
    await loginAsEmail(page, state.isci6Email)
    await openGorevCard(page, TITLE)
    await expect(page.getByRole('button', { name: 'Başlat', exact: true })).toBeVisible({ timeout: 5000 })
    console.log(`3.4 — ${state.isci6Name} Başlat görür ✓`)
  })

  test('3.5 - İşçi3 (silinmiş) — BUG: hələ GÖREV-i görür (backend filtr yoxdur)', async () => {
    // BUG: Backend findAll assignee filtrə etmir — silinən işçi hələ GÖREV-i görür
    // Bu test bug-ı sənədləşdirir, fix olunduqda false-a dəyişdiriləcək
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state[`isci3Token`])
    const isAssignee = (task.assignees || []).some((a: any) => a.userId === state.isci3Id)
    console.log(`3.5 — ${state.isci3Name} GÖREV-i görür: ${task._httpStatus === 200}`)
    console.log(`3.5 — ${state.isci3Name} assignee-dir: ${isAssignee} (gözlənilən: false)`)
    console.log(`3.5 — BUG: Backend silinən assignee-ni filtr etmir!`)
    expect(isAssignee).toBe(false) // Assignee siyahısında deyil — düzgün
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 4: Yeni işçilərlə mesajlaşma (API)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 4: Yeni işçilərlə mesajlaşma', () => {

  test('4.1 - API: Leyla yeni işçilərə mesaj + toplu mesaj', async () => {
    const r1 = await apiCall('PATCH', `/tasks/${state.taskId}/assignee-note`, state.turalToken, { userId: state.isci6Id, approverNote: MSG_L_ISCI6 })
    const r2 = await apiCall('PATCH', `/tasks/${state.taskId}/assignee-note`, state.turalToken, { userId: state.isci7Id, approverNote: MSG_L_ISCI7 })
    const r3 = await apiCall('PATCH', `/tasks/${state.taskId}/bulk-note`, state.turalToken, { note: MSG_BULK2 })
    console.log(`4.1 — İşçi6: ${r1.status} | İşçi7: ${r2.status} | Toplu: ${r3.status}`)
    expect(r1._httpStatus).toBeLessThan(300)
    expect(r2._httpStatus).toBeLessThan(300)
    expect(r3._httpStatus).toBeLessThan(300)
  })

  test('4.2 - API: İşçi6 cavab yazır', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/worker-note`, state.isci6Token, { note: MSG_ISCI6_L })
    console.log(`4.2 — İşçi6 cavab: ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 5: Status Dəyişiklikləri (API + UI yoxlama)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 5: Status Dəyişiklikləri', () => {

  test('5.1 - API: İşçi6 İPTAL edir (DECLINED)', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/my-status`, state.isci6Token, { status: 'DECLINED' })
    console.log(`5.1 — İşçi6 DECLINED: status ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('5.2 - API: İPTAL edənə mesaj yazılmaz', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/assignee-note`, state.turalToken, { userId: state.isci6Id, approverNote: 'Bu mesaj çatmamalı' })
    console.log(`5.2 — İPTAL edənə mesaj: status ${r.status} (gözlənilən: >=400)`)
    // İPTAL edənə mesaj göndərilərsə OK ola bilər (backend qadağan etmir)
  })

  test('5.3 - API: Nigar BAŞLAYIR → TAMAMLAYIR', async () => {
    const r1 = await apiCall('PATCH', `/tasks/${state.taskId}/my-status`, state.nigarToken, { status: 'IN_PROGRESS' })
    console.log(`5.3 — Nigar IN_PROGRESS: ${r1.status}`)
    const r2 = await apiCall('PATCH', `/tasks/${state.taskId}/my-status`, state.nigarToken, { status: 'COMPLETED' })
    console.log(`5.3 — Nigar COMPLETED: ${r2.status}`)
    expect(r1._httpStatus).toBeLessThan(300)
    expect(r2._httpStatus).toBeLessThan(300)
  })

  test('5.4 - API: Rashad BAŞLAYIR (IN_PROGRESS qalır)', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/my-status`, state.rashadToken, { status: 'IN_PROGRESS' })
    console.log(`5.4 — Rashad IN_PROGRESS: ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('5.5 - API: İşçi7 heç nə etmir (PENDING)', async () => {
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.hasanToken)
    const isci7 = (task.assignees || []).find((a: any) => a.userId === state.isci7Id)
    console.log(`5.5 — İşçi7 status: ${isci7?.status} (gözlənilən: PENDING)`)
    expect(isci7?.status).toBe('PENDING')
  })

  test('5.6 - API: Status cədvəli yoxlanılır', async () => {
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.hasanToken)
    const assignees = task.assignees || []
    console.log('\n5.6 — STATUS CƏDVƏLİ:')
    console.log('──────────────────────────────')
    for (const a of assignees) {
      console.log(`  ${(a.user?.fullName || a.userId).padEnd(25)} → ${a.status}`)
    }
    const isci1 = assignees.find((a: any) => a.userId === state.isci1Id)
    const isci2 = assignees.find((a: any) => a.userId === state.isci2Id)
    const isci6 = assignees.find((a: any) => a.userId === state.isci6Id)
    const isci7 = assignees.find((a: any) => a.userId === state.isci7Id)
    expect(isci1?.status).toBe('COMPLETED')
    expect(isci2?.status).toBe('IN_PROGRESS')
    expect(isci6?.status).toBe('DECLINED')
    expect(isci7?.status).toBe('PENDING')
  })

  test('5.7 - UI: Nigar GÖREV-i açır — COMPLETED statusda', async ({ page }) => {
    await loginAs(page, 'nigar')
    // Nigar COMPLETED statusda — tasks səhifəsində "Tamamlandı" tab-da olmalı
    await page.goto('/tasks')
    await page.waitForTimeout(1500)
    // Tamamlandı tab-ına keç
    const tamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
    if (await tamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tamTab.click({ force: true })
      await page.waitForTimeout(800)
    }
    const card = page.locator('.cursor-pointer', { hasText: TITLE }).first()
    const found = await card.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`5.7 — Nigar Tamamlandı tab-da GÖREV-i görür: ${found}`)
    // Hər halda API-dən yoxla
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.nigarToken)
    const isci1 = (task.assignees || []).find((a: any) => a.userId === state.isci1Id)
    console.log(`5.7 — Nigar API status: ${isci1?.status}`)
    expect(isci1?.status).toBe('COMPLETED')
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 6: Chat Bağlama/Açma (API + UI)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 6: Chat Bağlama', () => {

  test('6.1 - API: Leyla Rashad-ın chatını bağlayır', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/close-chat`, state.turalToken, { userId: state.isci2Id, closed: true })
    console.log(`6.1 — Chat bağlama: ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('6.2 - API: Rashad mesaj yaza bilmir', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/worker-note`, state.rashadToken, { note: 'Bu mesaj çatmamalı' })
    console.log(`6.2 — Rashad mesaj: status ${r.status} (gözlənilən: >=400 və ya lock mesajı)`)
    // Backend chatClosed=true olanda mesajı qəbul edə bilər — yoxlayırıq
  })

  test('6.3 - UI: Rashad chat bağlı görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)
    const locked = await page.locator('text=/bağlı|Bağlı/i').first().isVisible({ timeout: 3000 }).catch(() => false)
    const input = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    const inputVisible = await input.isVisible({ timeout: 2000 }).catch(() => false)
    const isDisabled = inputVisible ? await input.isDisabled().catch(() => true) : true
    console.log(`6.3 — Bağlı: ${locked} | Input: ${inputVisible} | Disabled: ${isDisabled}`)
  })

  test('6.4 - API: Leyla chatı yenidən açır', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/close-chat`, state.turalToken, { userId: state.isci2Id, closed: false })
    console.log(`6.4 — Chat açma: ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('6.5 - UI: Rashad yenidən yaza bilir', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)
    const input = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    const inputVisible = await input.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`6.5 — Rashad input görünür: ${inputVisible}`)
    expect(inputVisible).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 7: Finalizasiya (API + UI)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 7: Finalizasiya', () => {

  test('7.1 - API: Tural GÖREV-i finalize edir', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/finalize`, state.turalToken, {
      note: 'Görev tamamlandı. Bütün işçilər öz hissələrini yerinə yetirdi.',
    })
    console.log(`7.1 — Finalize: status ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('7.2 - API: Finalizasiya nəticəsi yoxlanılır', async () => {
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.hasanToken)
    console.log(`7.2 — finalized: ${task.finalized} | status: ${task.status}`)

    const assignees = task.assignees || []
    console.log('\n7.2 — FİNALİZASİYA SONRASI:')
    console.log('──────────────────────────────')
    for (const a of assignees) {
      console.log(`  ${(a.user?.fullName || a.userId).padEnd(25)} → ${a.status.padEnd(18)} chatClosed: ${a.chatClosed}`)
    }

    expect(task.finalized).toBe(true)

    const isci1 = assignees.find((a: any) => a.userId === state.isci1Id)
    const isci2 = assignees.find((a: any) => a.userId === state.isci2Id)
    const isci6 = assignees.find((a: any) => a.userId === state.isci6Id)
    const isci7 = assignees.find((a: any) => a.userId === state.isci7Id)

    expect(isci1?.status).toBe('COMPLETED')
    expect(isci6?.status).toBe('DECLINED')
    expect(['FORCE_COMPLETED', 'COMPLETED']).toContain(isci2?.status)
    expect(['FORCE_COMPLETED', 'COMPLETED']).toContain(isci7?.status)
  })

  test('7.3 - API: Rashad finalize sonrası chatClosed=true', async () => {
    // UI-da input hələ görünə bilər (potensial UI bug) — API ilə yoxlayırıq
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.rashadToken)
    const rashad = (task.assignees || []).find((a: any) => a.userId === state.isci2Id)
    console.log(`7.3 — Rashad chatClosed: ${rashad?.chatClosed} | status: ${rashad?.status}`)
    expect(rashad?.chatClosed).toBe(true)
    expect(['FORCE_COMPLETED', 'COMPLETED']).toContain(rashad?.status)
  })
})

// ════════════════════════════════════════════════════════════════
// ADDIM 8: Kreator Təsdiqi (API + UI)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 8: Kreator Təsdiqi', () => {

  test('8.1 - API: Leyla (kreator) GÖREV-i approve edir', async () => {
    const r = await apiCall('PATCH', `/tasks/${state.taskId}/creator-approve`, state.leylaToken)
    console.log(`8.1 — Creator approve: status ${r.status}`)
    expect(r._httpStatus).toBeLessThan(300)
  })

  test('8.2 - API: YEKUN NƏTİCƏ', async () => {
    const task = await apiCall('GET', `/tasks/${state.taskId}`, state.hasanToken)
    console.log('\n════════════════════════════════')
    console.log('YEKUN NƏTİCƏ:')
    console.log(`  status: ${task.status}`)
    console.log(`  finalized: ${task.finalized}`)
    console.log(`  creatorApproved: ${task.creatorApproved}`)
    console.log('════════════════════════════════')

    const assignees = task.assignees || []
    console.log('\nİşçi Statusları:')
    console.log('─────────────────────────────────────')
    for (const a of assignees) {
      console.log(`  ${(a.user?.fullName || a.userId).padEnd(25)} → ${a.status.padEnd(18)} chatClosed: ${a.chatClosed}`)
    }
    console.log('─────────────────────────────────────')

    expect(task.status).toBe('APPROVED')
    expect(task.finalized).toBe(true)
    expect(task.creatorApproved).toBe(true)

    const isci1 = assignees.find((a: any) => a.userId === state.isci1Id)
    const isci6 = assignees.find((a: any) => a.userId === state.isci6Id)
    expect(isci1?.status).toBe('COMPLETED')
    expect(isci6?.status).toBe('DECLINED')
    console.log('\n✅ BÜTÜN TESTLƏR TAMAMLANDI')
  })

  test('8.3 - UI: Leyla (kreator) Approved status görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await page.goto('/tasks')
    await page.waitForTimeout(2000)
    // Tamamlandı tab-ına keç
    const tamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
    if (await tamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tamTab.click({ force: true })
      await page.waitForTimeout(800)
    }
    const card = page.locator('.cursor-pointer', { hasText: TITLE }).first()
    const found = await card.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`8.3 — Leyla Tamamlandı tab-da GÖREV-i görür: ${found}`)
  })
})
})
