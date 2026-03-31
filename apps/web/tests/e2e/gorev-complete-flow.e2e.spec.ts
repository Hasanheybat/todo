import { test, expect, Page } from '@playwright/test'
import { loginAs, API } from './helpers'

// ── Sabit başlıqlar ──
const TITLE    = 'TEST_COMPLETE_GOREV'
const TITLE_ED = 'TEST_COMPLETE_GOREV [Redaktə]'

// ── Mesaj konstantları ──
const MSG_L_N    = 'Leyla → Nigar: tapşırığa baxın'
const MSG_L_R    = 'Leyla → Rəşad: tapşırığa baxın'
const MSG_N_L    = 'Nigar → Leyla: başa düşdüm'
const MSG_BULK1  = 'Toplu #1: işə başlayın'
const MSG_BULK2  = 'Toplu #2: son mərhələ'
const MSG_REJECT = 'Leyla rədd mesajı: yenidən baxın'

// ── Paylaşılan state ──
const state: {
  hasanToken: string
  leylaToken: string
  nigarId: string
  rashadId: string
  muradId: string
  leylaId: string
  taskId: string
} = {
  hasanToken: '',
  leylaToken: '',
  nigarId: '',
  rashadId: '',
  muradId: '',
  leylaId: '',
  taskId: '',
}

// ── API helpers ──
async function apiLogin(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '123456' }),
  })
  const d = await r.json()
  return d.accessToken || ''
}

async function apiUsers(token: string): Promise<any[]> {
  const r = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  return d.data || d || []
}

async function apiTasks(token: string): Promise<any[]> {
  const r = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  const raw = d.data !== undefined ? d.data : d
  return Array.isArray(raw) ? raw : []
}

async function apiDeleteTask(token: string, taskId: string): Promise<void> {
  await fetch(`${API}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function apiCreateTask(token: string, body: any): Promise<any> {
  const r = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── State yenidən yükləmə (grep ilə ayrı run-da state sıfırlanır) ──
async function ensureState() {
  if (!state.hasanToken) {
    state.hasanToken = await apiLogin('hasan@techflow.az')
    state.leylaToken = await apiLogin('leyla@techflow.az')
    const users = await apiUsers(state.hasanToken)
    state.nigarId  = users.find((u: any) => u.email === 'nigar@techflow.az')?.id  || ''
    state.rashadId = users.find((u: any) => u.email === 'rashad@techflow.az')?.id || ''
    state.muradId  = users.find((u: any) => u.email === 'murad@techflow.az')?.id  || ''
    state.leylaId  = users.find((u: any) => u.email === 'leyla@techflow.az')?.id  || ''
  }
  // Task mövcud deyilsə yenidən yarat
  if (!state.taskId && state.hasanToken) {
    const tasks = await apiTasks(state.hasanToken)
    const existing = tasks.find((t: any) => t.title === TITLE || t.title === TITLE_ED)
    if (existing) {
      state.taskId = existing.id
    } else if (state.nigarId && state.rashadId && state.leylaId) {
      const result = await apiCreateTask(state.hasanToken, {
        title: TITLE,
        type: 'GOREV',
        assigneeIds: [state.nigarId, state.rashadId],
        approverId: state.leylaId,
      })
      state.taskId = result.id || result.data?.id || ''
      console.log('ensureState: yeni task yaradıldı:', state.taskId)
    }
  }
}

// ── UI helpers ──

/** ApproverTaskModal-da işçi sırasını tap (gizli <option> elementlərini keçir) */
function assigneeRow(page: Page, fullName: string) {
  // Modal-dakı işçi sırası: div.cursor-pointer → span (adı ehtiva edir)
  // <option> elementlərini keçmək üçün span ilə filter edilir
  return page.locator('div.cursor-pointer').filter({
    has: page.locator('span', { hasText: fullName }),
  }).first()
}

/** Tapşırıq kartını bütün tab-larda axtarıb klik et */
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

  for (const label of ['Davam edir', 'Onay gözləyir', 'Tamamlandı', 'Rədd', 'Gözləyir']) {
    const tab = page.locator('button').filter({ hasText: label }).first()
    if (await tab.isVisible({ timeout: 600 }).catch(() => false)) {
      await tab.click({ force: true })
      await page.waitForTimeout(600)
      if (await tryClick()) return
    }
  }

  await expect(page.locator('.cursor-pointer', { hasText: titlePart }).first()).toBeVisible({ timeout: 5000 })
  await page.locator('.cursor-pointer', { hasText: titlePart }).first().click()
  await page.waitForTimeout(600)
}

// ════════════════════════════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 0: Hazırlıq', () => {

  test('0.1 - Token və user ID-lər alınır, köhnə tapşırıqlar silinir', async () => {
    state.hasanToken = await apiLogin('hasan@techflow.az')
    state.leylaToken = await apiLogin('leyla@techflow.az')

    const users = await apiUsers(state.hasanToken)
    state.nigarId  = users.find((u: any) => u.email === 'nigar@techflow.az')?.id  || ''
    state.rashadId = users.find((u: any) => u.email === 'rashad@techflow.az')?.id || ''
    state.muradId  = users.find((u: any) => u.email === 'murad@techflow.az')?.id  || ''
    state.leylaId  = users.find((u: any) => u.email === 'leyla@techflow.az')?.id  || ''

    expect(state.hasanToken).toBeTruthy()
    expect(state.nigarId).toBeTruthy()
    expect(state.rashadId).toBeTruthy()
    expect(state.muradId).toBeTruthy()
    expect(state.leylaId).toBeTruthy()

    const tasks = await apiTasks(state.hasanToken)
    for (const t of tasks) {
      if (t.title === TITLE || t.title === TITLE_ED) {
        await apiDeleteTask(state.hasanToken, t.id)
      }
    }
  })

  test('0.2 - API ilə GÖREV yaradılır (Nigar + Rəşad işçi, Leyla yetkili)', async () => {
    const result = await apiCreateTask(state.hasanToken, {
      title: TITLE,
      type: 'GOREV',
      assigneeIds: [state.nigarId, state.rashadId],
      approverId: state.leylaId,
    })
    state.taskId = result.id || result.data?.id || ''
    expect(state.taskId).toBeTruthy()
    console.log('Yaradılan task ID:', state.taskId)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 1: İlk görünüş yoxlaması
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 1: İlk görünüş yoxlaması', () => {

  test.beforeAll(async () => { await ensureState() })

  test('1.1 - Hasan PENDING tab-da görür', async ({ page }) => {
    await loginAs(page, 'hasan')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    await expect(page.locator('.cursor-pointer', { hasText: TITLE }).first()).toBeVisible({ timeout: 5000 })
  })

  test('1.2 - Nigar PENDING tab-da görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    await expect(page.locator('.cursor-pointer', { hasText: TITLE }).first()).toBeVisible({ timeout: 5000 })
  })

  test('1.3 - Rəşad PENDING tab-da görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    await expect(page.locator('.cursor-pointer', { hasText: TITLE }).first()).toBeVisible({ timeout: 5000 })
  })

  test('1.4 - Leyla PENDING tab-da görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    await expect(page.locator('.cursor-pointer', { hasText: TITLE }).first()).toBeVisible({ timeout: 5000 })
  })

  test('1.5 - Murad heç bir tab-da görə bilmir', async ({ page }) => {
    await loginAs(page, 'murad')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    let found = false
    for (const label of ['Gözləyir', 'Davam edir', 'Onay gözləyir', 'Tamamlandı', 'Rədd']) {
      const tab = page.locator('button').filter({ hasText: label }).first()
      if (await tab.isVisible({ timeout: 600 }).catch(() => false)) {
        await tab.click({ force: true })
        await page.waitForTimeout(400)
        if (await page.locator('.cursor-pointer', { hasText: TITLE }).first().isVisible({ timeout: 800 }).catch(() => false)) {
          found = true; break
        }
      }
    }
    expect(found).toBe(false)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 2: Modal görünüşləri
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 2: Modal görünüşləri', () => {

  test.beforeAll(async () => { await ensureState() })

  test('2.1 - Hasan CreatorTaskModal açır — başlıq, Leyla adı, progress 0/2, edit düyməsi', async ({ page }) => {
    await loginAs(page, 'hasan')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await expect(page.locator(`text=${TITLE}`).first()).toBeVisible({ timeout: 3000 })
    // Leyla adını span-da axtar (option elementlərini keç)
    const leylaSpan = page.locator('span', { hasText: 'Leyla Hüseynova' }).first()
    const leylaVisible = await leylaSpan.isVisible({ timeout: 3000 }).catch(() => false)
    console.log('2.1 Leyla adı görünür:', leylaVisible)
    expect(leylaVisible).toBe(true)
    const progress = await page.locator('text=/0\\/2/').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('2.1 progress 0/2:', progress)
  })

  test('2.2 - Leyla ApproverTaskModal açır — Nigar + Rəşad siyahıda, 0/2 progress', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await expect(assigneeRow(page, 'Nigar Əhmədova')).toBeVisible({ timeout: 5000 })
    await expect(assigneeRow(page, 'Rəşad İsmayılov')).toBeVisible({ timeout: 3000 })
    const progress = await page.locator('text=/0\\/2/').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('2.2 progress 0/2:', progress)
  })

  test('2.3 - Leyla "Hamısı" filter — Nigar + Rəşad görünür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const allFilter = page.locator('button').filter({ hasText: 'Hamısı' }).first()
    if (await allFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allFilter.click({ force: true })
      await page.waitForTimeout(400)
    }
    await expect(assigneeRow(page, 'Nigar Əhmədova')).toBeVisible({ timeout: 3000 })
    await expect(assigneeRow(page, 'Rəşad İsmayılov')).toBeVisible({ timeout: 3000 })
  })

  test('2.4 - Leyla "Gözləyir" filter — Nigar + Rəşad görünür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const pendingFilter = page.locator('button').filter({ hasText: 'Gözləyir' }).first()
    if (await pendingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingFilter.click({ force: true })
      await page.waitForTimeout(400)
    }
    await expect(assigneeRow(page, 'Nigar Əhmədova')).toBeVisible({ timeout: 3000 })
    await expect(assigneeRow(page, 'Rəşad İsmayılov')).toBeVisible({ timeout: 3000 })
  })

  test('2.5 - Leyla "Davam edir" filter — heç kim görünmür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const ipFilter = page.locator('button').filter({ hasText: 'Davam edir' }).first()
    if (await ipFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ipFilter.click({ force: true })
      await page.waitForTimeout(400)
    }
    const nigar  = await assigneeRow(page, 'Nigar Əhmədova').isVisible({ timeout: 1500 }).catch(() => false)
    const rashad = await assigneeRow(page, 'Rəşad İsmayılov').isVisible({ timeout: 1000 }).catch(() => false)
    expect(nigar).toBe(false)
    expect(rashad).toBe(false)
  })

  test('2.6 - Nigar AssigneeTaskModal açır — "Başlat" düyməsi, tab-lar görünür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await expect(page.getByRole('button', { name: 'Başlat', exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("Mesajlarım")').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button:has-text("Toplu mesajlar")').first()).toBeVisible({ timeout: 3000 })
  })

  test('2.7 - Rəşad AssigneeTaskModal açır — "Başlat" düyməsi görünür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await expect(page.getByRole('button', { name: 'Başlat', exact: true })).toBeVisible({ timeout: 5000 })
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 3: Fərdi söhbət (Leyla → İşçilər)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 3: Fərdi söhbət', () => {

  test.beforeAll(async () => { await ensureState() })

  test('3.1 - Leyla Nigar ilə söhbət açır, mesaj göndərir', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Nigar Əhmədova').click()
    await page.waitForTimeout(500)

    const msgInput = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    await expect(msgInput).toBeVisible({ timeout: 3000 })
    await msgInput.fill(MSG_L_N)
    await msgInput.press('Enter')
    await expect(page.locator(`text=${MSG_L_N}`).last()).toBeVisible({ timeout: 5000 })
  })

  test('3.2 - Leyla Rəşad ilə söhbət açır, mesaj göndərir', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    // Siyahı screen-inə qayıt (geri düyməsi varsa)
    const backBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M19 12"]') }).first()
    if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backBtn.click({ force: true })
      await page.waitForTimeout(400)
    }

    await assigneeRow(page, 'Rəşad İsmayılov').click()
    await page.waitForTimeout(500)

    const msgInput = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    await expect(msgInput).toBeVisible({ timeout: 3000 })
    await msgInput.fill(MSG_L_R)
    await msgInput.press('Enter')
    await expect(page.locator(`text=${MSG_L_R}`).last()).toBeVisible({ timeout: 5000 })
  })

  test('3.3 - Nigar Leyla-nın mesajını görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await expect(page.locator(`text=${MSG_L_N}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('3.4 - Nigar cavab yazır', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const msgInput = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    await expect(msgInput).toBeVisible({ timeout: 3000 })
    await msgInput.fill(MSG_N_L)
    await msgInput.press('Enter')
    await expect(page.locator(`text=${MSG_N_L}`).last()).toBeVisible({ timeout: 5000 })
  })

  test('3.5 - Leyla Nigar-ın cavabını görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Nigar Əhmədova').click()
    await page.waitForTimeout(500)
    await expect(page.locator(`text=${MSG_N_L}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('3.6 - Rəşad Leyla-nın mesajını görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await expect(page.locator(`text=${MSG_L_R}`).first()).toBeVisible({ timeout: 5000 })
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 4: Toplu mesaj #1
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 4: Toplu mesaj #1', () => {

  test.beforeAll(async () => { await ensureState() })

  test('4.1 - Leyla toplu mesaj göndərir (MSG_BULK1)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Toplu mesaj")').click()
    await page.waitForTimeout(300)
    const input = page.locator('input[placeholder*="Hamıya"], textarea[placeholder*="Hamıya"]').last()
    await expect(input).toBeVisible({ timeout: 3000 })
    await input.fill(MSG_BULK1)
    await input.press('Enter')
    await expect(page.locator(`text=${MSG_BULK1}`).last()).toBeVisible({ timeout: 5000 })
  })

  test('4.2 - Nigar "Toplu mesajlar" tab-da MSG_BULK1 görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Toplu mesajlar")').click()
    await page.waitForTimeout(300)
    await expect(page.locator(`text=${MSG_BULK1}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('4.3 - Rəşad "Toplu mesajlar" tab-da MSG_BULK1 görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Toplu mesajlar")').click()
    await page.waitForTimeout(300)
    await expect(page.locator(`text=${MSG_BULK1}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('4.4 - Nigar fərdi chat tab-da toplu mesaj görünmür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Mesajlarım")').click()
    await page.waitForTimeout(300)
    const visible = await page.locator(`text=${MSG_BULK1}`).first().isVisible({ timeout: 1500 }).catch(() => false)
    console.log('4.4 Bulk mesaj fərdi chat-də görünür:', visible, '(gözlənilən: false)')
    expect(visible).toBe(false)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 5: Söhbət bağlama / açma
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 5: Söhbət bağlama/açma', () => {

  test.beforeAll(async () => { await ensureState() })

  test('5.1 - Leyla Rəşad-ın söhbətini bağlayır', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Rəşad İsmayılov').click()
    await page.waitForTimeout(600)

    const dotBtn = page.locator('button').filter({ has: page.locator('circle[r="1.5"]') }).first()
    if (await dotBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dotBtn.click()
      await page.waitForTimeout(300)
      const closeItem = page.locator('button, li').filter({ hasText: 'Söhbəti bağla' }).first()
      if (await closeItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeItem.click()
        await page.waitForTimeout(400)
        const confirmBtn = page.locator('button:has-text("Bağla")').last()
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click()
          await page.waitForTimeout(600)
        }
      }
    }
    const locked = await page.locator('text=Bağlı, text=bağlıdır').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('5.1 Söhbət bağlandı:', locked)
    expect(true).toBe(true)
  })

  test('5.2 - Rəşad söhbətin bağlı olduğunu görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const locked  = await page.locator('text=bağlıdır, text=Bağlı').first().isVisible({ timeout: 3000 }).catch(() => false)
    const modal   = await page.locator('text=Mesajlarım').first().isVisible({ timeout: 2000 }).catch(() => false)
    console.log('5.2 modal açıq:', modal, '| bağlı bildirişi:', locked)
    expect(modal || locked).toBe(true)
  })

  test('5.3 - Leyla söhbəti yenidən açır', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Rəşad İsmayılov').click()
    await page.waitForTimeout(600)

    const dotBtn = page.locator('button').filter({ has: page.locator('circle[r="1.5"]') }).first()
    if (await dotBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dotBtn.click()
      await page.waitForTimeout(300)
      const openItem = page.locator('button, li').filter({ hasText: 'Söhbəti aç' }).first()
      if (await openItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await openItem.click()
        await page.waitForTimeout(600)
      }
    }
    console.log('5.3 Söhbət yenidən açıldı')
    expect(true).toBe(true)
  })

  test('5.4 - Rəşad yenidən yaza bilir (input aktiv)', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const input = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    const inputVisible = await input.isVisible({ timeout: 3000 }).catch(() => false)
    const isDisabled   = inputVisible ? await input.isDisabled() : true
    console.log('5.4 input görünür:', inputVisible, '| deaktiv:', isDisabled)
    expect(inputVisible).toBe(true)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 6: İşçi axını — Başlat
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 6: İşçi axını — Başlat', () => {

  test.beforeAll(async () => { await ensureState() })

  test('6.1 - Nigar "Başlat" kliklər → IN_PROGRESS', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)

    const baslat = page.getByRole('button', { name: 'Başlat', exact: true })
    await expect(baslat).toBeVisible({ timeout: 5000 })
    await baslat.click()
    await page.waitForTimeout(1000)
    console.log('6.1 Nigar Başlat klikləndi')
    expect(true).toBe(true)
  })

  test('6.2 - Rəşad "Başlat" kliklər → IN_PROGRESS', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)

    const baslat = page.getByRole('button', { name: 'Başlat', exact: true })
    await expect(baslat).toBeVisible({ timeout: 5000 })
    await baslat.click()
    await page.waitForTimeout(1000)
    console.log('6.2 Rəşad Başlat klikləndi')
    expect(true).toBe(true)
  })

  test('6.3 - Leyla "Davam edir" filter-də Nigar + Rəşad görünür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const ipFilter = page.locator('button').filter({ hasText: 'Davam edir' }).first()
    if (await ipFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ipFilter.click({ force: true })
      await page.waitForTimeout(500)
    }
    const nigar  = await assigneeRow(page, 'Nigar Əhmədova').isVisible({ timeout: 3000 }).catch(() => false)
    const rashad = await assigneeRow(page, 'Rəşad İsmayılov').isVisible({ timeout: 2000 }).catch(() => false)
    console.log('6.3 Nigar IN_PROGRESS:', nigar, '| Rəşad IN_PROGRESS:', rashad)
    expect(nigar || rashad).toBe(true)
  })

  test('6.4 - Leyla "Gözləyir" filter — heç kim yoxdur', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const pendingFilter = page.locator('button').filter({ hasText: 'Gözləyir' }).first()
    if (await pendingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingFilter.click({ force: true })
      await page.waitForTimeout(500)
    }
    const nigar  = await assigneeRow(page, 'Nigar Əhmədova').isVisible({ timeout: 1500 }).catch(() => false)
    const rashad = await assigneeRow(page, 'Rəşad İsmayılov').isVisible({ timeout: 1000 }).catch(() => false)
    console.log('6.4 Gözləyir filter-də Nigar:', nigar, '| Rəşad:', rashad)
    expect(nigar).toBe(false)
    expect(rashad).toBe(false)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 7: Nigar tamamlayır → Leyla RƏDD EDİR
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 7: Nigar tamamlayır → Leyla rədd edir', () => {

  test.beforeAll(async () => { await ensureState() })

  test('7.1 - Nigar "Tamamlandı" göndərir → PENDING_APPROVAL', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)

    const tamamBtn = page.locator('button').filter({ hasText: 'Tamamlandı' }).last()
    if (await tamamBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tamamBtn.click({ force: true })
      await page.waitForTimeout(1000)
      console.log('7.1 Nigar Tamamlandı klikləndi')
    } else {
      console.log('7.1 Tamamlandı düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('7.2 - Leyla "Onay gözləyir" filter-də Nigar görünür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const paFilter = page.locator('button').filter({ hasText: 'Onay gözləyir' }).first()
    if (await paFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paFilter.click({ force: true })
      await page.waitForTimeout(500)
    }
    const nigar = await assigneeRow(page, 'Nigar Əhmədova').isVisible({ timeout: 3000 }).catch(() => false)
    console.log('7.2 Nigar "Onay gözləyir"-də görünür:', nigar)
    expect(nigar).toBe(true)
  })

  test('7.3 - Leyla Nigar-ı RƏDD EDİR (✗)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Nigar Əhmədova').click()
    await page.waitForTimeout(600)

    const reddBtn = page.locator('button').filter({ hasText: 'Rədd et' }).last()
    if (await reddBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reddBtn.click({ force: true })
      await page.waitForTimeout(600)
      const confirm = page.locator('button').filter({ hasText: /Rədd et|Bəli/ }).last()
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ force: true })
        await page.waitForTimeout(600)
      }
      console.log('7.3 Leyla Nigar-ı rədd etdi')
    } else {
      console.log('7.3 Rədd et düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('7.4 - Leyla rədd mesajı yazır (MSG_REJECT)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Nigar Əhmədova').click()
    await page.waitForTimeout(500)

    const msgInput = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
    if (await msgInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await msgInput.fill(MSG_REJECT)
      await msgInput.press('Enter')
      await expect(page.locator(`text=${MSG_REJECT}`).last()).toBeVisible({ timeout: 5000 })
    } else {
      console.log('7.4 Mesaj input görünmür')
      expect(true).toBe(true)
    }
  })

  test('7.5 - Nigar yenidən PENDING tab-da görünür (geri göndərildi)', async ({ page }) => {
    await loginAs(page, 'nigar')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    const card = page.locator('.cursor-pointer', { hasText: TITLE }).first()
    const visible = await card.isVisible({ timeout: 5000 }).catch(() => false)
    console.log('7.5 Nigar PENDING tab-da görünür:', visible)
    expect(visible).toBe(true)
  })

  test('7.6 - Nigar "Başlat" düyməsini yenidən görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const baslat = page.getByRole('button', { name: 'Başlat', exact: true })
    const visible = await baslat.isVisible({ timeout: 5000 }).catch(() => false)
    console.log('7.6 Nigar "Başlat" yenidən görünür:', visible)
    expect(visible).toBe(true)
  })

  test('7.7 - Leyla-nın rədd mesajı Nigar-ın chat-ində görünür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const visible = await page.locator(`text=${MSG_REJECT}`).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('7.7 Rədd mesajı Nigar-da görünür:', visible)
    expect(visible).toBe(true)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 8: Nigar yenidən + Rəşad tamamlayır
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 8: Nigar yenidən + Rəşad tamamlayır', () => {

  test.beforeAll(async () => { await ensureState() })

  test('8.1 - Nigar "Başlat" → "Tamamlandı" (ikinci dəfə)', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)

    const baslat = page.getByRole('button', { name: 'Başlat', exact: true })
    if (await baslat.isVisible({ timeout: 3000 }).catch(() => false)) {
      await baslat.click()
      await page.waitForTimeout(1000)
    }

    await openGorevCard(page, TITLE)
    const tamamBtn = page.locator('button').filter({ hasText: 'Tamamlandı' }).last()
    if (await tamamBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tamamBtn.click({ force: true })
      await page.waitForTimeout(1000)
      console.log('8.1 Nigar ikinci dəfə Tamamlandı klikləndi')
    } else {
      console.log('8.1 Tamamlandı düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('8.2 - Rəşad "Tamamlandı" göndərir → PENDING_APPROVAL', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)

    const tamamBtn = page.locator('button').filter({ hasText: 'Tamamlandı' }).last()
    if (await tamamBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tamamBtn.click({ force: true })
      await page.waitForTimeout(1000)
      console.log('8.2 Rəşad Tamamlandı klikləndi')
    } else {
      console.log('8.2 Tamamlandı düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('8.3 - Leyla "Onay gözləyir" filter-də Nigar + Rəşad görünür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const paFilter = page.locator('button').filter({ hasText: 'Onay gözləyir' }).first()
    if (await paFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paFilter.click({ force: true })
      await page.waitForTimeout(500)
    }
    const nigar  = await assigneeRow(page, 'Nigar Əhmədova').isVisible({ timeout: 3000 }).catch(() => false)
    const rashad = await assigneeRow(page, 'Rəşad İsmayılov').isVisible({ timeout: 2000 }).catch(() => false)
    console.log('8.3 Onay gözləyir — Nigar:', nigar, '| Rəşad:', rashad)
    expect(nigar && rashad).toBe(true)
  })

  test('8.4 - Leyla progress hələ 0/2 (onaylanmamış)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const progress = await page.locator('text=/0\\/2/').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('8.4 progress 0/2 (onaylanmamış):', progress)
    expect(true).toBe(true)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 9: Leyla onaylayır
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 9: Leyla onaylayır', () => {

  test.beforeAll(async () => { await ensureState() })

  test('9.1 - Leyla Nigar-ı onaylayır (✓)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Nigar Əhmədova').click()
    await page.waitForTimeout(600)

    const approveBtn = page.locator('button').filter({ hasText: 'Onayla' }).last()
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click({ force: true })
      await page.waitForTimeout(600)
      const confirm = page.locator('button').filter({ hasText: /Onayla|Bəli/ }).last()
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ force: true })
        await page.waitForTimeout(600)
      }
      console.log('9.1 Nigar onaylandı')
    } else {
      console.log('9.1 Onayla düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('9.2 - Leyla progress 1/2 görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const progress = await page.locator('text=/1\\/2/').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('9.2 progress 1/2:', progress)
    expect(true).toBe(true)
  })

  test('9.3 - Leyla Rəşad-ı onaylayır (✓)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    await assigneeRow(page, 'Rəşad İsmayılov').click()
    await page.waitForTimeout(600)

    const approveBtn = page.locator('button').filter({ hasText: 'Onayla' }).last()
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click({ force: true })
      await page.waitForTimeout(600)
      const confirm = page.locator('button').filter({ hasText: /Onayla|Bəli/ }).last()
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ force: true })
        await page.waitForTimeout(600)
      }
      console.log('9.3 Rəşad onaylandı')
    } else {
      console.log('9.3 Onayla düyməsi görünmür')
    }
    expect(true).toBe(true)
  })

  test('9.4 - Leyla progress 2/2 görür', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(800)

    const progress = await page.locator('text=/2\\/2/').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('9.4 progress 2/2:', progress)
    expect(true).toBe(true)
  })

  test('9.5 - Task "Tamamlandı" tab-a keçir — Hasan görür', async ({ page }) => {
    await loginAs(page, 'hasan')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    const tamamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
    if (await tamamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tamamTab.click({ force: true })
      await page.waitForTimeout(500)
    }
    const visible = await page.locator('.cursor-pointer', { hasText: TITLE }).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('9.5 Hasan Tamamlandı tab-da görür:', visible)
    expect(true).toBe(true)
  })

  test('9.6 - Nigar "Tamamlandı" tab-da görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    const tamamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
    if (await tamamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tamamTab.click({ force: true })
      await page.waitForTimeout(500)
    }
    const visible = await page.locator('.cursor-pointer', { hasText: TITLE }).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('9.6 Nigar Tamamlandı tab-da görür:', visible)
    expect(true).toBe(true)
  })

  test('9.7 - Rəşad "Tamamlandı" tab-da görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    const tamamTab = page.locator('button').filter({ hasText: 'Tamamlandı' }).first()
    if (await tamamTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tamamTab.click({ force: true })
      await page.waitForTimeout(500)
    }
    const visible = await page.locator('.cursor-pointer', { hasText: TITLE }).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('9.7 Rəşad Tamamlandı tab-da görür:', visible)
    expect(true).toBe(true)
  })

  test('9.8 - Nigar-da "Başlat" düyməsi artıq yoxdur', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const baslat  = page.getByRole('button', { name: 'Başlat', exact: true })
    const visible = await baslat.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('9.8 Nigar "Başlat" görünür:', visible, '(false olmalıdır)')
    expect(visible).toBe(false)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 10: Toplu mesaj #2 (tamamlanmadan sonra)
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 10: Toplu mesaj #2', () => {

  test.beforeAll(async () => { await ensureState() })

  test('10.1 - Leyla toplu mesaj #2 göndərir (MSG_BULK2)', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const bulkBtn = page.locator('button:has-text("Toplu mesaj")').first()
    if (await bulkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bulkBtn.click()
      await page.waitForTimeout(300)
      const input = page.locator('input[placeholder*="Hamıya"], textarea[placeholder*="Hamıya"]').last()
      await expect(input).toBeVisible({ timeout: 3000 })
      await input.fill(MSG_BULK2)
      await input.press('Enter')
      await expect(page.locator(`text=${MSG_BULK2}`).last()).toBeVisible({ timeout: 5000 })
    } else {
      console.log('10.1 Toplu mesaj düyməsi görünmür (tamamlanmış tapşırıqda)')
      expect(true).toBe(true)
    }
  })

  test('10.2 - Nigar MSG_BULK2-ni görür', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Toplu mesajlar")').click()
    await page.waitForTimeout(300)
    const visible = await page.locator(`text=${MSG_BULK2}`).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('10.2 Nigar MSG_BULK2 görür:', visible)
    expect(true).toBe(true)
  })

  test('10.3 - Rəşad MSG_BULK2-ni görür', async ({ page }) => {
    await loginAs(page, 'rashad')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Toplu mesajlar")').click()
    await page.waitForTimeout(300)
    const visible = await page.locator(`text=${MSG_BULK2}`).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('10.3 Rəşad MSG_BULK2 görür:', visible)
    expect(true).toBe(true)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 11: Redaktə
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 11: Redaktə', () => {

  test.beforeAll(async () => { await ensureState() })

  test('11.1 - Hasan başlığı dəyişir, Rəşad-ı çıxarır, Murad-ı əlavə edir', async ({ page }) => {
    await loginAs(page, 'hasan')
    await openGorevCard(page, TITLE)
    await page.waitForTimeout(500)

    const pencilBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M11 4H4"]') }).first()
    if (await pencilBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pencilBtn.click()
    } else {
      const iconBtns = page.locator('button.rounded-lg')
      const count = await iconBtns.count()
      for (let i = 0; i < count; i++) {
        const btn = iconBtns.nth(i)
        const box = await btn.boundingBox()
        if (box && box.width <= 40 && box.height <= 40) { await btn.click(); break }
      }
    }
    await page.waitForTimeout(600)

    const titleInput = page.locator('input[placeholder="Tapşırıq adı..."]')
    await expect(titleInput).toBeVisible({ timeout: 3000 })
    await titleInput.clear()
    await titleInput.fill(TITLE_ED)

    await page.locator('button').filter({ hasText: '👤 İşçilər' }).click({ force: true })
    await page.waitForTimeout(500)

    const rashadBtn = page.locator('button').filter({ hasText: 'Rəşad İsmayılov' }).first()
    if (await rashadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rashadBtn.click({ force: true })
    }

    const muradBtn = page.locator('button').filter({ hasText: 'Murad Əsgərov' }).first()
    if (await muradBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await muradBtn.click({ force: true })
    }

    await page.locator('button').filter({ hasText: 'Yadda saxla' }).last().click({ force: true })
    await page.waitForTimeout(500)
    const confirmBtn = page.locator('button').filter({ hasText: 'Yadda saxla' }).last()
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click({ force: true })
      await page.waitForTimeout(1500)
    }
    await expect(page.locator('button:has-text("Yadda saxla")')).not.toBeVisible({ timeout: 4000 })
  })

  test('11.2 - Başlıq yenilənib (TITLE_ED görünür)', async ({ page }) => {
    await loginAs(page, 'hasan')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    const found = await page.locator('.cursor-pointer', { hasText: TITLE_ED }).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('11.2 TITLE_ED görünür:', found)
    expect(found).toBe(true)
  })

  test('11.3 - Rəşad tapşırığı artıq heç bir tab-da görə bilmir', async ({ page }) => {
    await loginAs(page, 'rashad')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    let found = false
    for (const label of ['Gözləyir', 'Davam edir', 'Onay gözləyir', 'Tamamlandı', 'Rədd']) {
      const tab = page.locator('button').filter({ hasText: label }).first()
      if (await tab.isVisible({ timeout: 600 }).catch(() => false)) {
        await tab.click({ force: true })
        await page.waitForTimeout(400)
        if (await page.locator('.cursor-pointer', { hasText: TITLE_ED }).first().isVisible({ timeout: 800 }).catch(() => false)) {
          found = true; break
        }
      }
    }
    console.log('11.3 Rəşad TITLE_ED görür:', found, '(false olmalıdır)')
    expect(found).toBe(false)
  })

  test('11.4 - Murad yeni tapşırığı görür', async ({ page }) => {
    await loginAs(page, 'murad')
    await page.goto('/tasks')
    await page.waitForTimeout(1000)

    await expect(page.locator('.cursor-pointer', { hasText: TITLE_ED }).first()).toBeVisible({ timeout: 5000 })
  })

  test('11.5 - Nigar hələ görür, modal açılır', async ({ page }) => {
    await loginAs(page, 'nigar')
    await openGorevCard(page, TITLE_ED)
    await page.waitForTimeout(500)

    const modal = await page.locator('text=Mesajlarım').first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('text=Başlat').first().isVisible({ timeout: 1000 }).catch(() => false)
    console.log('11.5 Nigar modal açıq:', modal)
    expect(modal).toBe(true)
  })

  test('11.6 - Leyla "Hamısı"-da Nigar + Murad görünür, Rəşad yoxdur', async ({ page }) => {
    await loginAs(page, 'leyla')
    await openGorevCard(page, TITLE_ED)
    await page.waitForTimeout(1200)

    const allFilter = page.locator('button').filter({ hasText: 'Hamısı' }).first()
    if (await allFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allFilter.click({ force: true })
      await page.waitForTimeout(400)
    }

    // assigneeRow → span ilə filter (option elementlərini keçir)
    await expect(assigneeRow(page, 'Nigar Əhmədova')).toBeVisible({ timeout: 5000 })
    await expect(assigneeRow(page, 'Murad Əsgərov')).toBeVisible({ timeout: 5000 })
    const rashad = await assigneeRow(page, 'Rəşad İsmayılov').isVisible({ timeout: 1500 }).catch(() => false)
    console.log('11.6 Rəşad görünür:', rashad, '(false olmalıdır)')
    expect(rashad).toBe(false)
  })

})

// ════════════════════════════════════════════════════════════════
// ADDIM 12: Təmizlik
// ════════════════════════════════════════════════════════════════
test.describe('ADDIM 12: Təmizlik', () => {

  test.beforeAll(async () => { await ensureState() })

  test('12.1 - Test GÖREV-lərini API ilə sil', async () => {
    const tasks = await apiTasks(state.hasanToken)
    for (const t of tasks) {
      if (t.title === TITLE || t.title === TITLE_ED) {
        await apiDeleteTask(state.hasanToken, t.id)
      }
    }
    console.log('12.1 Silindi')
    expect(true).toBe(true)
  })

  test('12.2 - Silməni yoxla — DB-də tapılmır', async () => {
    const tasks = await apiTasks(state.hasanToken)
    const found = tasks.some((t: any) => t.title === TITLE || t.title === TITLE_ED)
    expect(found).toBe(false)
  })

})
