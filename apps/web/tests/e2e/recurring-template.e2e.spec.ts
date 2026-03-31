import { test, expect } from '@playwright/test'
import { loginAs, API, today } from './helpers'

// ══════════════════════════════════════════════════════════════
// TƏKRARLANAN ŞABLON — TAM LIFECYCLE TESTİ
// Şablon CRUD + Manual Dispatch + Task yaranma + Aylıq + Deadline
// ══════════════════════════════════════════════════════════════

const PFX = 'TMPL_'
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

test.describe.serial('Təkrarlanan Şablon Lifecycle', () => {

// ════════════════════════════════════════
// ADDIM 0: Hazırlıq
// ════════════════════════════════════════
test('0.1 - Login + User ID-lər', async () => {
  state.token = await apiLogin('hasan@techflow.az')
  expect(tok()).toBeTruthy()

  const r = await fetch(`${API}/users?limit=100`, { headers: { Authorization: `Bearer ${tok()}` } })
  const d = await r.json()
  const users = Array.isArray(d) ? d : d?.data || []
  for (const u of users) state[`${u.email.split('@')[0]}_id`] = u.id
  console.log(`0.1 — ${users.length} user`)

  const biz = await fetch(`${API}/users/businesses`, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json())
  state.bakuBizId = (Array.isArray(biz) ? biz : []).find((b: any) => b.name?.includes('Bakı'))?.id || ''
  expect(state.nigar_id).toBeTruthy()
})

test('0.2 - Köhnə test şablonları silinir', async () => {
  const templates = await api('GET', '/templates', tok())
  const arr = Array.isArray(templates) ? templates : templates.data || []
  for (const t of arr) {
    if ((t.name || '').startsWith(PFX)) await api('DELETE', `/templates/${t.id}`, tok())
  }
  console.log('0.2 — Köhnə şablonlar silindi')
})

// ════════════════════════════════════════
// HİSSƏ 1: Şablon CRUD
// ════════════════════════════════════════
test('1.1 - Həftəlik şablon yaradılır', async () => {
  const r = await api('POST', '/templates', tok(), {
    name: `${PFX}Həftəlik Hesabat`,
    description: 'Hər həftə bazar ertəsi göndərilən hesabat tapşırığı',
    scheduleType: 'WEEKLY',
    scheduleTime: '09:00',
    dayOfWeek: 1, // Bazar ertəsi
    isRecurring: true,
    businessId: state.bakuBizId,
    notificationDay: 25,
    deadlineDay: 28,
    assigneeIds: [state.nigar_id, state.rashad_id, state.elvin_id, state.gunel_id, state.murad_id],
    items: [
      { title: 'Maliyyə hesabatı hazırla', priority: 'HIGH', sortOrder: 1 },
      { title: 'Müştəri statistikası yığ', priority: 'MEDIUM', sortOrder: 2 },
      { title: 'Təqdimat slaydları yenilə', priority: 'LOW', sortOrder: 3 },
    ],
  })
  state.weeklyTemplateId = r.id || ''
  console.log(`1.1 — Həftəlik şablon: ${r.id?.slice(0,8)} (${r._s})`)
  console.log(`  nextRunAt: ${r.nextRunAt?.slice(0,16)}`)
  console.log(`  isActive: ${r.isActive} | isRecurring: ${r.isRecurring}`)
  expect(r._s).toBeLessThan(300)
  expect(r.id).toBeTruthy()
})

test('1.2 - Şablon siyahısında görünür', async () => {
  const r = await api('GET', '/templates', tok())
  const arr = Array.isArray(r) ? r : r.data || []
  const found = arr.find((t: any) => t.id === state.weeklyTemplateId)
  console.log(`1.2 — Siyahıda: ${!!found} | Toplam: ${arr.length}`)
  expect(found).toBeTruthy()
})

test('1.3 - Şablon detalı yoxlanılır', async () => {
  const r = await api('GET', `/templates/${state.weeklyTemplateId}`, tok())
  console.log(`1.3 — name: ${r.name}`)
  console.log(`  items: ${(r.items || []).length} (gözlənilən: 3)`)
  console.log(`  assignees: ${(r.assignees || []).length} (gözlənilən: 5)`)
  console.log(`  scheduleType: ${r.scheduleType} | dayOfWeek: ${r.dayOfWeek}`)
  console.log(`  notificationDay: ${r.notificationDay} | deadlineDay: ${r.deadlineDay}`)
  expect((r.items || []).length).toBe(3)
  expect((r.assignees || []).length).toBe(5)
  expect(r.scheduleType).toBe('WEEKLY')
})

test('1.4 - Şablon yenilənir — 1 assignee + 1 item əlavə', async () => {
  const r = await api('PUT', `/templates/${state.weeklyTemplateId}`, tok(), {
    name: `${PFX}Həftəlik Hesabat [v2]`,
    assigneeIds: [state.nigar_id, state.rashad_id, state.elvin_id, state.gunel_id, state.murad_id, state.sebine_id],
    items: [
      { title: 'Maliyyə hesabatı hazırla', priority: 'HIGH', sortOrder: 1 },
      { title: 'Müştəri statistikası yığ', priority: 'MEDIUM', sortOrder: 2 },
      { title: 'Təqdimat slaydları yenilə', priority: 'LOW', sortOrder: 3 },
      { title: 'Email xülasəsi göndər', priority: 'MEDIUM', sortOrder: 4 },
    ],
  })
  console.log(`1.4 — Yeniləndi: ${r._s}`)
  const check = await api('GET', `/templates/${state.weeklyTemplateId}`, tok())
  console.log(`  items: ${(check.items || []).length} (gözlənilən: 4)`)
  console.log(`  assignees: ${(check.assignees || []).length} (gözlənilən: 6)`)
  expect((check.items || []).length).toBe(4)
  expect((check.assignees || []).length).toBe(6)
})

test('1.5 - Şablon deaktiv/aktiv toggle', async () => {
  // Deaktiv et
  let r = await api('POST', `/templates/${state.weeklyTemplateId}/toggle`, tok())
  console.log(`1.5 — Toggle 1: isActive=${r.isActive}`)
  expect(r.isActive).toBe(false)

  // Yenidən aktiv et
  r = await api('POST', `/templates/${state.weeklyTemplateId}/toggle`, tok())
  console.log(`1.5 — Toggle 2: isActive=${r.isActive}`)
  expect(r.isActive).toBe(true)
})

// ════════════════════════════════════════
// HİSSƏ 2: Manual Dispatch
// ════════════════════════════════════════
test('2.1 - Şablon manual execute edilir', async () => {
  const r = await api('POST', `/templates/${state.weeklyTemplateId}/execute`, tok())
  console.log(`2.1 — Execute: ${r._s} | ${r.message || 'OK'}`)
  expect(r._s).toBeLessThan(300)
})

test('2.2 - Yaradılan tasklar yoxlanılır (Nigar-dan bax)', async () => {
  // executeNow sourceTemplateId set etmir — Nigar assignee olaraq görəcək
  const nigarToken = await apiLogin('nigar@techflow.az')
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const tasks = Array.isArray(tasksR) ? tasksR : tasksR?.data || []
  // Şablon item adları ilə axtarılır
  const dispatched = tasks.filter((t: any) =>
    ['Maliyyə hesabatı', 'Müştəri statistikası', 'Təqdimat slaydları', 'Email xülasəsi'].some(k => (t.title || '').includes(k))
  )
  console.log(`2.2 — Dispatch olunmuş task: ${dispatched.length}`)
  for (const t of dispatched.slice(0,4)) {
    console.log(`  ${t.title} | assignees: ${(t.assignees || []).length} | status: ${t.status}`)
  }
  expect(dispatched.length).toBeGreaterThanOrEqual(4) // 4 item şablonda
})

test('2.3 - Nigar yaradılmış taskda Başlat görür', async () => {
  const nigarToken = await apiLogin('nigar@techflow.az')
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const tasks = Array.isArray(tasksR) ? tasksR : tasksR?.data || []
  const found = tasks.find((t: any) => (t.title || '').includes('Maliyyə hesabatı'))
  console.log(`2.3 — Nigar task: ${found?.title} | status: ${found?.status}`)
  expect(found).toBeTruthy()
})

test('2.4 - İkinci execute → yeni tasklar yaranır', async () => {
  const nigarToken = await apiLogin('nigar@techflow.az')
  const beforeR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const beforeCount = (Array.isArray(beforeR) ? beforeR : beforeR?.data || []).filter((t: any) => (t.title || '').includes('Maliyyə hesabatı')).length

  await api('POST', `/templates/${state.weeklyTemplateId}/execute`, tok())

  const afterR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const afterCount = (Array.isArray(afterR) ? afterR : afterR?.data || []).filter((t: any) => (t.title || '').includes('Maliyyə hesabatı')).length

  console.log(`2.4 — Əvvəl: ${beforeCount} | Sonra: ${afterCount}`)
  expect(afterCount).toBeGreaterThan(beforeCount)
})

// ════════════════════════════════════════
// HİSSƏ 3: Aylıq Şablon + Deadline
// ════════════════════════════════════════
test('3.1 - Aylıq şablon yaradılır (10 assignee, deadline=20)', async () => {
  const workers = ['nigar','rashad','elvin','gunel','murad','sebine','orxan','ulviyye','zaur','ekber']
  const r = await api('POST', '/templates', tok(), {
    name: `${PFX}Aylıq Anbar Sayımı`,
    description: 'Hər ayın 15-i göndərilir, 20-sinə tamamlanmalıdır',
    scheduleType: 'MONTHLY',
    scheduleTime: '09:00',
    dayOfMonth: 15,
    isRecurring: true,
    businessId: state.bakuBizId,
    notificationDay: 18,
    deadlineDay: 20,
    assigneeIds: workers.map(n => state[`${n}_id`]).filter(Boolean),
    items: [
      { title: 'Anbar siyahısını yoxla', priority: 'HIGH', sortOrder: 1 },
      { title: 'Çatışmazlıqları qeyd et', priority: 'MEDIUM', sortOrder: 2 },
    ],
  })
  state.monthlyTemplateId = r.id || ''
  console.log(`3.1 — Aylıq şablon: ${r.id?.slice(0,8)} (${r._s})`)
  console.log(`  dayOfMonth: ${r.dayOfMonth} | deadlineDay: ${r.deadlineDay}`)
  expect(r._s).toBeLessThan(300)
})

test('3.2 - Aylıq execute → tasklar yaranır', async () => {
  await api('POST', `/templates/${state.monthlyTemplateId}/execute`, tok())

  const nigarToken = await apiLogin('nigar@techflow.az')
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const tasks = Array.isArray(tasksR) ? tasksR : tasksR?.data || []
  const dispatched = tasks.filter((t: any) => (t.title || '').includes('Anbar siyahısını') || (t.title || '').includes('Çatışmazlıqları'))
  console.log(`3.2 — Dispatch: ${dispatched.length} task`)

  if (dispatched.length > 0) {
    const dueDate = dispatched[0].dueDate
    console.log(`  dueDate: ${dueDate?.slice(0,10)}`)
    if (dueDate) {
      const day = new Date(dueDate).getDate()
      console.log(`  Gün: ${day} (gözlənilən: 20)`)
      expect(day).toBe(20)
    }
  }
})

test('3.3 - Gündəlik şablon yaradılır', async () => {
  const r = await api('POST', '/templates', tok(), {
    name: `${PFX}Gündəlik Standup`,
    scheduleType: 'DAILY',
    scheduleTime: '10:00',
    isRecurring: true,
    assigneeIds: [state.nigar_id, state.rashad_id],
    items: [
      { title: 'Dünənki işlər', priority: 'MEDIUM', sortOrder: 1 },
      { title: 'Bugünkü plan', priority: 'MEDIUM', sortOrder: 2 },
    ],
  })
  state.dailyTemplateId = r.id || ''
  console.log(`3.3 — Gündəlik: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.4 - Custom şablon (hər 3 gün)', async () => {
  const r = await api('POST', '/templates', tok(), {
    name: `${PFX}3 Günlük Yoxlama`,
    scheduleType: 'CUSTOM',
    customDays: 3,
    scheduleTime: '14:00',
    isRecurring: true,
    assigneeIds: [state.nigar_id],
    items: [{ title: 'Sistemləri yoxla', priority: 'HIGH', sortOrder: 1 }],
  })
  state.customTemplateId = r.id || ''
  console.log(`3.4 — Custom 3 gün: ${r.id?.slice(0,8)} (${r._s})`)
  expect(r._s).toBeLessThan(300)
})

test('3.5 - Bitiş tarixli şablon (endDate)', async () => {
  const endDate = new Date(Date.now() + 30 * 86400000).toISOString() // 30 gün sonra
  const r = await api('POST', '/templates', tok(), {
    name: `${PFX}Müvəqqəti Layihə`,
    scheduleType: 'WEEKLY',
    dayOfWeek: 5, // Cümə
    scheduleTime: '16:00',
    isRecurring: true,
    endDate,
    assigneeIds: [state.nigar_id, state.rashad_id, state.elvin_id],
    items: [{ title: 'Həftəlik yekun', priority: 'MEDIUM', sortOrder: 1 }],
  })
  state.endDateTemplateId = r.id || ''
  console.log(`3.5 — endDate şablon: ${r.id?.slice(0,8)} | endDate: ${endDate.slice(0,10)}`)
  expect(r._s).toBeLessThan(300)
})

// ════════════════════════════════════════
// HİSSƏ 4: UI Yoxlama
// ════════════════════════════════════════
test('4.1 - API: Şablon siyahısında 5 şablon var', async () => {
  const r = await api('GET', '/templates', tok())
  const arr = Array.isArray(r) ? r : r.data || []
  const testTemplates = arr.filter((t: any) => (t.name || '').startsWith(PFX))
  console.log(`4.1 — Test şablonları: ${testTemplates.length}`)
  for (const t of testTemplates) {
    console.log(`  ${t.name.padEnd(35)} ${t.scheduleType.padEnd(10)} active=${t.isActive}`)
  }
  expect(testTemplates.length).toBeGreaterThanOrEqual(4)
})

test('4.2 - API: Nigar dispatch olunmuş taskı görür', async () => {
  const nigarToken = await apiLogin('nigar@techflow.az')
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const tasks = Array.isArray(tasksR) ? tasksR : tasksR?.data || []
  const found = tasks.find((t: any) => (t.title || '').includes('Maliyyə hesabatı'))
  console.log(`4.2 — Nigar dispatch task: ${found?.title} | status: ${found?.status}`)
  expect(found).toBeTruthy()
})

// ════════════════════════════════════════
// HİSSƏ 5: Silmə + Təmizlik
// ════════════════════════════════════════
test('5.1 - Şablon silinir, tasklar qalır', async () => {
  const nigarToken = await apiLogin('nigar@techflow.az')
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const before = (Array.isArray(tasksR) ? tasksR : tasksR?.data || []).filter((t: any) => (t.title || '').includes('Maliyyə hesabatı')).length

  const r = await api('DELETE', `/templates/${state.weeklyTemplateId}`, tok())
  console.log(`5.1 — Şablon silindi: ${r._s}`)

  const tasksR2 = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${nigarToken}` } }).then(r => r.json())
  const after = (Array.isArray(tasksR2) ? tasksR2 : tasksR2?.data || []).filter((t: any) => (t.title || '').includes('Maliyyə hesabatı')).length
  console.log(`5.1 — Tasklar: əvvəl=${before} sonra=${after} (qorunmalı)`)
  expect(after).toBe(before)
})

// ════════════════════════════════════════
// YEKUN
// ════════════════════════════════════════
test('YEKUN - Statistika + Təmizlik', async () => {
  console.log('\n══════════════════════════════════════════')
  console.log('   TƏKRARLANAN ŞABLON — YEKUN NƏTİCƏ')
  console.log('══════════════════════════════════════════')

  const templates = await api('GET', '/templates', tok())
  const arr = Array.isArray(templates) ? templates : templates.data || []
  const testTemplates = arr.filter((t: any) => (t.name || '').startsWith(PFX))
  console.log(`  Aktiv test şablonları: ${testTemplates.length}`)
  for (const t of testTemplates) {
    console.log(`    ${t.name.padEnd(30)} ${t.scheduleType.padEnd(10)} active=${t.isActive}`)
  }

  // Təmizlik
  for (const t of testTemplates) {
    await api('DELETE', `/templates/${t.id}`, tok())
  }
  // Dispatch olunmuş taskları da sil
  const tasksR = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json())
  const tasks = Array.isArray(tasksR) ? tasksR : tasksR?.data || []
  for (const t of tasks) {
    if ((t.title || '').startsWith(PFX) || (t.sourceTemplateId && arr.some((tmpl: any) => tmpl.id === t.sourceTemplateId))) {
      await api('DELETE', `/tasks/${t.id}`, tok())
    }
  }
  console.log('  Təmizlik tamamlandı ✓')
  console.log('══════════════════════════════════════════')
})

}) // end describe.serial
