import { Page, expect } from '@playwright/test'
import * as path from 'path'

export const BASE = 'http://localhost:3000'
export const API  = 'http://localhost:4000'

export const USERS = {
  hasan:  { email: 'hasan@techflow.az',  password: '123456', name: 'Həsən Əliyev'   },
  nigar:  { email: 'nigar@techflow.az',  password: '123456', name: 'Nigar Əhmədova'  },
  rashad: { email: 'rashad@techflow.az', password: '123456', name: 'Rəşad İsmayılov' },
  leyla:  { email: 'leyla@techflow.az',  password: '123456', name: 'Leyla Hüseynova' },
  murad:  { email: 'murad@techflow.az',  password: '123456', name: 'Murad Əsgərov'   },
}

export const TEST_FILE = path.join(__dirname, '../fixtures/test-file.txt')

/** Login with quick-login button */
export async function loginAs(page: Page, user: keyof typeof USERS) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  const u = USERS[user]
  // Try quick login button first (increased timeout for slow renders)
  const quickBtn = page.locator('button', { hasText: u.name.split(' ')[0] }).first()
  if (await quickBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await quickBtn.click()
  } else {
    await page.fill('input[type="email"], input[placeholder*="E-poçt"], input[placeholder*="sizin"]', u.email)
    await page.fill('input[type="password"], input[placeholder*="Şifrə"]', u.password)
    await page.click('button:has-text("Daxil ol")')
  }
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 })
}

/** Open TaskFormModal from /tasks page */
export async function openTaskForm(page: Page) {
  await page.goto('/tasks')
  await page.click('button:has-text("Tapşırıq əlavə et")')
  await expect(page.locator('text=GÖREV yarat, text=Tapşırıq yarat').first()).toBeVisible({ timeout: 5000 })
    .catch(() => {})
  // Click GÖREV yarat or the first task option
  const gorevBtn = page.locator('text=GÖREV yarat').first()
  if (await gorevBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await gorevBtn.click()
  }
}

/** Wait for and close any confirmation dialog with given button text */
export async function confirmDialog(page: Page, btnText: string) {
  const btn = page.locator(`button:has-text("${btnText}")`).last()
  await expect(btn).toBeVisible({ timeout: 5000 })
  await btn.click()
}

/** Cancel confirmation dialog */
export async function cancelDialog(page: Page) {
  await page.click('button:has-text("Ləğv et")')
}

/** Open the ApproverTaskModal for a task card by title */
export async function openTaskCard(page: Page, titlePart: string) {
  await page.goto('/tasks')
  // Wait for page to hydrate — wait for at least one task card div to appear
  await page.waitForTimeout(800)
  // Use div.cursor-pointer to avoid matching <select> elements
  const card = page.locator('div.cursor-pointer', { hasText: titlePart }).first()
  await expect(card).toBeVisible({ timeout: 5000 })
  await card.click()
  // Wait for modal
  await expect(page.locator('text=Yaradan:').first()).toBeVisible({ timeout: 5000 })
}

/** Click assignee row in ApproverTaskModal to open their chat */
export async function openAssigneeChat(page: Page, name: string) {
  // Use div.cursor-pointer to avoid matching <select> elements on the tasks page behind modal
  const row = page.locator('div.cursor-pointer', { hasText: name }).last()
  await expect(row).toBeVisible({ timeout: 3000 })
  await row.click()
  await page.waitForTimeout(500)
}

/** Send a message in the currently open chat panel */
export async function sendMessage(page: Page, text: string) {
  const input = page.locator('input[placeholder*="Mesaj"], textarea[placeholder*="Mesaj"]').last()
  await input.fill(text)
  // Use Enter key — both individual and bulk chat inputs support onKeyDown Enter
  await input.press('Enter')
  await expect(page.locator(`text=${text}`).last()).toBeVisible({ timeout: 5000 })
}

/** Click "Toplu mesaj" button and send bulk message */
export async function sendBulkMessage(page: Page, text: string) {
  await page.locator('button:has-text("Toplu mesaj")').click()
  const input = page.locator('input[placeholder*="Hamıya"], textarea[placeholder*="Hamıya"]').last()
  await expect(input).toBeVisible({ timeout: 3000 })
  await input.fill(text)
  // Use Enter key — bulk chat input supports onKeyDown Enter
  await input.press('Enter')
  await expect(page.locator(`text=${text}`).last()).toBeVisible({ timeout: 5000 })
}

/** Get today's date string for date input (YYYY-MM-DD) */
export function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

/** Delete all test tasks created during tests via API */
export async function cleanupTestTasks(titlePart: string) {
  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USERS.hasan.email, password: USERS.hasan.password }),
    })
    const { accessToken } = await loginRes.json()
    const tasks = await fetch(`${API}/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json())
    for (const task of (tasks.data || tasks || [])) {
      if (task.title?.includes(titlePart)) {
        await fetch(`${API}/tasks/${task.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
    }
  } catch {}
}
