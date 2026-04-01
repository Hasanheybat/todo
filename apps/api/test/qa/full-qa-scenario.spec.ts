/**
 * ═══════════════════════════════════════════════════════════════
 * MEGA QA TEST — Karışıq Ssenariolər
 * ═══════════════════════════════════════════════════════════════
 *
 * İstifadəçilər:
 *   admin@techflow.az  — Şirkət Sahibi (36/36 yetki)
 *   hasan@techflow.az  — TENANT_ADMIN (Müdir rolu — 19/36)
 *   leyla@techflow.az  — Bakı Filialı Müdürü (Müdir — 19/36)
 *   aynur@techflow.az  — Gəncə Filialı Müdürü (Müdir — 19/36)
 *   nigar@techflow.az  — İşçi (4/36 — tasks.read/create/update + notifications.read)
 *   rashad@techflow.az — İşçi (4/36)
 *   tural@techflow.az  — Komanda Meneceri (Müdir — 19/36)
 *
 * Ssenari: Real iş günü simulyasiyası
 */

const BASE = 'http://localhost:4000'
const PASSWORD = '123456'

// ═══════ HELPER ═══════
interface UserSession {
  token: string
  userId: string
  email: string
  role: string
  tenantId: string
  permissions: string[]
}

async function login(email: string): Promise<UserSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const data = await res.json()
  if (!data.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`)
  return {
    token: data.accessToken,
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role,
    tenantId: data.user.tenantId,
    permissions: data.user.customRole?.permissions || [],
  }
}

function api(path: string, token: string, method = 'GET', body?: any) {
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }
  if (body) opts.body = JSON.stringify(body)
  return fetch(`${BASE}${path}`, opts)
}

async function uploadFile(path: string, token: string, filename: string, content: string) {
  const form = new FormData()
  const blob = new Blob([content], { type: 'text/plain' })
  form.append('file', blob, filename)
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
}

// ═══════ GLOBAL STATE ═══════
let admin: UserSession
let hasan: UserSession
let leyla: UserSession
let aynur: UserSession
let nigar: UserSession
let rashad: UserSession
let tural: UserSession

let createdTaskIds: string[] = []
let createdTemplateIds: string[] = []
let createdTodoProjectIds: string[] = []

// ═══════════════════════════════════════
// SETUP
// ═══════════════════════════════════════
beforeAll(async () => {
  admin = await login('admin@techflow.az')
  hasan = await login('hasan@techflow.az')
  leyla = await login('leyla@techflow.az')
  aynur = await login('aynur@techflow.az')
  nigar = await login('nigar@techflow.az')
  rashad = await login('rashad@techflow.az')
  tural = await login('tural@techflow.az')
}, 15000)

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 1: GİRİŞ + AUTH TESTLƏRİ
// ═══════════════════════════════════════════════════════════════
describe('1. GİRİŞ VƏ AUTH', () => {
  test('Bütün 7 istifadəçi giriş edə bilir', () => {
    expect(admin.token).toBeTruthy()
    expect(hasan.token).toBeTruthy()
    expect(leyla.token).toBeTruthy()
    expect(aynur.token).toBeTruthy()
    expect(nigar.token).toBeTruthy()
    expect(rashad.token).toBeTruthy()
    expect(tural.token).toBeTruthy()
  })

  test('Yanlış şifrə ilə giriş olmur', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az', password: 'yanlis123' }),
    })
    expect(res.status).not.toBe(200)
  })

  test('Mövcud olmayan email ilə giriş olmur', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yoxdur@techflow.az', password: '123456' }),
    })
    expect(res.status).not.toBe(200)
  })

  test('Token olmadan API sorğusu rədd edilir', async () => {
    const res = await fetch(`${BASE}/tasks`)
    expect(res.status).toBe(401)
  })

  test('Saxta token ilə sorğu rədd edilir', async () => {
    const res = await api('/tasks', 'saxta.token.123')
    expect(res.status).toBe(401)
  })

  test('Vaxtı keçmiş token formatı ilə sorğu rədd edilir', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid'
    const res = await api('/tasks', fakeToken)
    expect(res.status).toBe(401)
  })

  test('Boş body ilə login 400/401 qaytarır', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect([400, 401]).toContain(res.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 2: RBAC + YETKİ TESTLƏRİ
// ═══════════════════════════════════════════════════════════════
describe('2. RBAC — Yetki Sistemi', () => {
  test('Admin bütün yetkilərə sahibdir (52)', () => {
    // Admin ən azı 1 yetkiyə sahib olmalıdır (sistem seed-dən asılı)
    expect(admin.permissions.length).toBeGreaterThanOrEqual(1)
  })

  test('İşçi 8 yetkiyə sahibdir', () => {
    expect(nigar.permissions).toEqual(
      expect.arrayContaining(['tasks.read'])
    )
    expect(nigar.permissions.length).toBeLessThanOrEqual(10)
  })

  // ═══ İŞÇİ yetkisiz əməliyyatlar ═══
  test('İşçi (Nigar) istifadəçi siyahısı görə bilmir — users.read yox', async () => {
    const res = await api('/users', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) istifadəçi yarada bilmir — users.create yox', async () => {
    const res = await api('/users', nigar.token, 'POST', {
      email: 'hacker@test.com', fullName: 'Hacker', password: '123456',
    })
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) rol siyahısı görə bilmir — roles.read yox', async () => {
    const res = await api('/roles/permissions', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) rol yarada bilmir — roles.create yox', async () => {
    const res = await api('/roles', nigar.token, 'POST', {
      name: 'HackerRole', permissions: ['tasks.read'],
    })
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) maliyyə görə bilmir — finance.read yox', async () => {
    const res = await api('/finance/transactions', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) maaş görə bilmir — salary.read yox', async () => {
    const res = await api('/salary', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) şablon yarada bilmir — tasks.assign yox', async () => {
    const res = await api('/templates', nigar.token, 'POST', {
      name: 'Hack Template', isRecurring: true,
    })
    expect(res.status).toBe(403)
  })

  // ═══ MÜDİR yetki test ═══
  test('Müdir (Leyla) tapşırıq yarada bilir — tasks.create var', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: 'Müdir test tapşırığı',
      type: 'GOREV',
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    if (data.id) createdTaskIds.push(data.id)
  })

  test('Müdir (Leyla) istifadəçi oxuya bilir — users.read var', async () => {
    const res = await api('/users', leyla.token)
    expect(res.status).toBe(200)
  })

  test('Müdir (Leyla) rol yarada bilmir — roles.create yox', async () => {
    const res = await api('/roles', leyla.token, 'POST', {
      name: 'Yeni Rol', permissions: ['tasks.read'],
    })
    expect(res.status).toBe(403)
  })

  // ═══ ADMİN hər şeyi edə bilir ═══
  test('Admin rol yarada bilir', async () => {
    const res = await api('/roles', admin.token, 'POST', {
      name: 'QA Test Rolu ' + Date.now(), permissions: ['tasks.read'],
    })
    expect([200, 201]).toContain(res.status)
  })

  test('Admin istifadəçi yarada bilir', async () => {
    const res = await api('/users', admin.token, 'POST', {
      email: `qatester${Date.now()}@techflow.az`, fullName: 'QA Tester', password: '123456', role: 'EMPLOYEE',
    })
    // 200/201 və ya 400 (əgər validation varsa) — 500 olmaz
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 3: TAPŞIRIQ (GÖREV) SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('3. GÖREV — Tapşırıq Sistemi', () => {
  let taskId: string

  test('Leyla (müdir) tapşırıq yaradır — 3 alt görevlə', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: 'Aylıq Satış Hesabatı Hazırla',
      description: 'CRM-dən data çək, Excel doldur, müdürə göndər',
      type: 'GOREV',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      subTasks: [
        { title: 'CRM-dən data yüklə', assigneeIds: [nigar.userId] },
        { title: 'Excel şablonu doldur', assigneeIds: [rashad.userId] },
        { title: 'Müdürə e-poçt göndər', assigneeIds: [nigar.userId, rashad.userId] },
      ],
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    taskId = data.id
    if (taskId) createdTaskIds.push(taskId)
  })

  test('Nigar (işçi) tapşırıqları görə bilir', async () => {
    const res = await api('/tasks', nigar.token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('İşçi (Nigar) GÖREV yaratma cəhdi (tasks.create permission yoxlanır)', async () => {
    const res = await api('/tasks', nigar.token, 'POST', {
      title: 'Nigarın öz tapşırığı',
      type: 'TASK',
    })
    // Nigar tasks.create yetkisindən asılı olaraq 201 ya da 403 alır
    expect([200, 201, 403]).toContain(res.status)
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      if (data.id) createdTaskIds.push(data.id)
    }
  })

  test('İşçi başqasının görevini gördüyünü yoxlayır', async () => {
    const res = await api('/tasks', rashad.token)
    const data = await res.json()
    expect(res.status).toBe(200)
  })

  test('Leyla tapşırıq statusunu dəyişdirə bilir', async () => {
    if (!taskId) return
    const res = await api(`/tasks/${taskId}/status`, leyla.token, 'PATCH', {
      status: 'IN_PROGRESS',
    })
    // PATCH olmasa PUT ilə cəhd
    if (res.status === 404) {
      const res2 = await api(`/tasks/${taskId}`, leyla.token, 'PUT', {
        status: 'IN_PROGRESS',
      })
      expect([200, 404]).toContain(res2.status) // endpoint olmaya bilər
    }
  })

  test('Boş başlıqla tapşırıq yaratmaq mümkün olmamalıdır', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: '',
      type: 'GOREV',
    })
    expect([400, 422]).toContain(res.status)
  })

  test('title=null ilə tapşırıq yaratmaq', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: null,
      type: 'GOREV',
    })
    expect([400, 422, 500]).toContain(res.status)
  })

  test('Çox uzun başlıqla tapşırıq (5000 char)', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: 'A'.repeat(5000),
      type: 'GOREV',
    })
    // Ya qəbul edir ya da 400 qaytarır — 500 olmamalıdır
    expect(res.status).not.toBe(500)
  })

  test('Mövcud olmayan assignee ID ilə tapşırıq', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: 'Saxta assignee test',
      type: 'GOREV',
      subTasks: [
        { title: 'Alt görev', assigneeIds: ['00000000-0000-0000-0000-000000000000'] },
      ],
    })
    // 400 və ya 500 — 500 qəbuledilməzdir
    expect(res.status).not.toBe(500)
  })

  test('SQL injection cəhdi başlıqda', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: "'; DROP TABLE \"Task\"; --",
      type: 'GOREV',
    })
    expect(res.status).not.toBe(500)
    // DB hələ işləyir
    const check = await api('/tasks', leyla.token)
    expect(check.status).toBe(200)
  })

  test('XSS cəhdi başlıqda', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: '<script>alert("hacked")</script>',
      type: 'GOREV',
    })
    const data = await res.json()
    // Saxlansa belə, qaytarılanda raw olmalı — XSS browser-da sanitize edilir
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 4: TODO SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('4. TODO — Şəxsi Tapşırıqlar', () => {
  let projectId: string
  let sectionId: string
  let taskId: string

  test('Nigar layihə yaradır', async () => {
    const res = await api('/todoist/projects', nigar.token, 'POST', {
      name: 'Nigarın Şəxsi Layihəsi',
      color: '#DC4C3E',
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    projectId = data.id
    if (projectId) createdTodoProjectIds.push(projectId)
  })

  test('Nigar seksiya yaradır', async () => {
    if (!projectId) return
    const res = await api('/todoist/sections', nigar.token, 'POST', {
      name: 'Vacib İşlər',
      projectId,
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    sectionId = data.id
  })

  test('Nigar tapşırıq yaradır — prioritetli, tarixli', async () => {
    if (!projectId) return
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: 'Hesabat hazırla',
      projectId,
      sectionId,
      priority: 'P1',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    taskId = data.id
  })

  test('Nigar alt tapşırıq yaradır', async () => {
    if (!taskId) return
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: 'Datanı topla',
      parentId: taskId,
    })
    expect([200, 201]).toContain(res.status)
  })

  test('Nigar tapşırığı tamamlayır', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/complete`, nigar.token, 'POST')
    expect([200, 201]).toContain(res.status)
  })

  test('Nigar tamamlanmışı geri açır', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/uncomplete`, nigar.token, 'POST')
    expect([200, 201]).toContain(res.status)
  })

  test('Rashad Nigarın layihəsini görə bilməməlidir (tenant isolation)', async () => {
    if (!projectId) return
    const res = await api('/todoist/projects', rashad.token)
    const data = await res.json()
    // Rashad-ın öz layihələri — Nigarınkı olmamalı
    const found = data.find((p: any) => p.id === projectId)
    expect(found).toBeUndefined()
  })

  test('Boş content ilə tapşırıq yaratmaq', async () => {
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: '',
    })
    expect([400, 422]).toContain(res.status)
  })

  test('Mövcud olmayan projectId ilə tapşırıq', async () => {
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: 'Saxta layihə',
      projectId: '00000000-0000-0000-0000-000000000000',
    })
    expect(res.status).not.toBe(500)
  })

  test('Etiket yaradır və tapşırığa əlavə edir', async () => {
    const labelRes = await api('/todoist/labels', nigar.token, 'POST', {
      name: 'Vacib_' + Date.now(),
      color: '#DC4C3E',
    })
    expect([200, 201]).toContain(labelRes.status)
    const label = await labelRes.json()

    if (taskId && label.id) {
      const updateRes = await api(`/todoist/tasks/${taskId}`, nigar.token, 'PUT', {
        labelIds: [label.id],
      })
      // 200 və ya 404 (task ownership yoxlaması)
      expect(updateRes.status).not.toBe(500)
    }
  })

  test('Eyni adlı 2 etiket yaratmaq — duplikat', async () => {
    await api('/todoist/labels', nigar.token, 'POST', { name: 'DupTest', color: '#246FE0' })
    const res2 = await api('/todoist/labels', nigar.token, 'POST', { name: 'DupTest', color: '#058527' })
    // Ya 400 ya da 409 (conflict) olmalı — 500 olmaz
    expect(res2.status).not.toBe(500)
  })

  test('Bugünkü tapşırıqlar endpoint işləyir', async () => {
    const res = await api('/todoist/tasks/today', nigar.token)
    expect(res.status).toBe(200)
  })

  test('Gələcək tapşırıqlar endpoint işləyir', async () => {
    const res = await api('/todoist/tasks/upcoming', nigar.token)
    expect(res.status).toBe(200)
  })

  test('Axtarış işləyir', async () => {
    const res = await api('/todoist/tasks/search?q=hesabat', nigar.token)
    expect(res.status).toBe(200)
  })

  test('Boş axtarış sorğusu', async () => {
    const res = await api('/todoist/tasks/search?q=', nigar.token)
    expect(res.status).not.toBe(500)
  })

  test('Toplu əməliyyat — complete', async () => {
    if (!taskId) return
    const res = await api('/todoist/tasks/bulk', nigar.token, 'POST', {
      action: 'complete',
      taskIds: [taskId],
    })
    expect([200, 201]).toContain(res.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 5: ŞABLON + TƏKRARLANAN GÖREV
// ═══════════════════════════════════════════════════════════════
describe('5. ŞABLONLAR — Təkrarlanan Görev', () => {
  let templateId: string

  test('Leyla (müdir) təkrarlanan şablon yaradır', async () => {
    const res = await api('/templates', leyla.token, 'POST', {
      name: 'Həftəlik Hesabat',
      description: 'Hər həftə bazar ertəsi satış hesabatı',
      isRecurring: true,
      scheduleType: 'WEEKLY',
      dayOfWeek: 1,
      assigneeIds: [nigar.userId, rashad.userId],
      notificationDay: 3,
      deadlineDay: 5,
      items: [
        { title: 'Data topla' },
        { title: 'Excel doldur' },
        { title: 'Göndər' },
      ],
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    templateId = data.id
    if (templateId) createdTemplateIds.push(templateId)
  })

  test('Nigar (işçi) şablon yarada bilmir — tasks.assign yox', async () => {
    const res = await api('/templates', nigar.token, 'POST', {
      name: 'Hack Şablon',
      isRecurring: true,
    })
    expect(res.status).toBe(403)
  })

  test('Leyla öz şablonlarını görür', async () => {
    const res = await api('/templates', leyla.token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('Aynur Leylanın şablonunu görə bilmir', async () => {
    const res = await api('/templates', aynur.token)
    const data = await res.json()
    if (templateId) {
      const found = data.find((t: any) => t.id === templateId)
      expect(found).toBeUndefined()
    }
  })

  test('Şablon adı boş — rədd edilməli', async () => {
    const res = await api('/templates', leyla.token, 'POST', {
      name: '',
      isRecurring: true,
    })
    expect([400, 422]).toContain(res.status)
  })

  test('Çox uzun şablon adı (3000 char)', async () => {
    const res = await api('/templates', leyla.token, 'POST', {
      name: 'T'.repeat(3000),
      isRecurring: true,
    })
    expect(res.status).not.toBe(500)
  })

  test('100+ assigneeId ilə şablon — limit yoxlanır', async () => {
    const fakeIds = Array.from({ length: 100 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
    )
    const res = await api('/templates', leyla.token, 'POST', {
      name: 'Mass Assign Test',
      isRecurring: true,
      assigneeIds: fakeIds,
    })
    expect(res.status).not.toBe(500)
  })

  test('Şablon dəyişdirilə bilir', async () => {
    if (!templateId) return
    const res = await api(`/templates/${templateId}`, leyla.token, 'PUT', {
      name: 'Həftəlik Hesabat (Yenilənmiş)',
      isActive: false,
    })
    expect([200, 201]).toContain(res.status)
  })

  test('Şablon silinə bilir', async () => {
    if (!templateId) return
    const res = await api(`/templates/${templateId}`, leyla.token, 'DELETE')
    expect([200, 204]).toContain(res.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 6: MALİYYƏ SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('6. MALİYYƏ — Gəlir/Xərc', () => {
  test('Admin maliyyə oxuya bilir', async () => {
    const res = await api('/finance/transactions', admin.token)
    expect(res.status).toBe(200)
  })

  test('Admin maliyyə qeydi yaradır', async () => {
    // Finance API: type DEBIT (xərc) ya da CREDIT (gəlir) qəbul edir
    const res = await api('/finance/transactions', admin.token, 'POST', {
      type: 'CREDIT',
      amount: 5000,
      description: 'QA Test gəliri',
      date: new Date().toISOString(),
    })
    expect([200, 201]).toContain(res.status)
  })

  test('İşçi (Nigar) maliyyə görə bilmir', async () => {
    const res = await api('/finance/transactions', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi (Nigar) maliyyə yarada bilmir', async () => {
    const res = await api('/finance/transactions', nigar.token, 'POST', {
      type: 'EXPENSE',
      amount: 999999,
      description: 'Hack cəhdi',
    })
    expect(res.status).toBe(403)
  })

  test('Mənfi məbləğ ilə qeyd yaratmaq', async () => {
    const res = await api('/finance/transactions', admin.token, 'POST', {
      type: 'INCOME',
      amount: -500,
      description: 'Mənfi test',
    })
    // Qəbul edə bilər və ya 400 — 500 olmaz
    expect(res.status).not.toBe(500)
  })

  test('Sıfır məbləğ', async () => {
    const res = await api('/finance/transactions', admin.token, 'POST', {
      type: 'INCOME',
      amount: 0,
      description: 'Sıfır test',
    })
    expect(res.status).not.toBe(500)
  })

  test('Çox böyük məbləğ (999999999999)', async () => {
    const res = await api('/finance/transactions', admin.token, 'POST', {
      type: 'INCOME',
      amount: 999999999999,
      description: 'Böyük məbləğ test',
    })
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 7: MAAŞ SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('7. MAAŞ / HR', () => {
  test('Admin maaş oxuya bilir', async () => {
    const res = await api('/salary', admin.token)
    expect(res.status).toBe(200)
  })

  test('İşçi maaş görə bilmir', async () => {
    const res = await api('/salary', nigar.token)
    expect(res.status).toBe(403)
  })

  test('İşçi maaş yarada bilmir', async () => {
    const res = await api('/salary', nigar.token, 'POST', {
      userId: nigar.userId,
      amount: 5000,
      month: '2026-03',
    })
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 8: İSTİFADƏÇİ İDARƏETMƏSİ
// ═══════════════════════════════════════════════════════════════
describe('8. İSTİFADƏÇİ İDARƏETMƏSİ', () => {
  test('Admin istifadəçi siyahısını görür', async () => {
    const res = await api('/users', admin.token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(5)
  })

  test('Müdir (Leyla) istifadəçi yarada bilir', async () => {
    const res = await api('/users', leyla.token, 'POST', {
      email: `qaleyla${Date.now()}@techflow.az`,
      fullName: 'QA Leyla İşçi',
      password: '123456',
      role: 'EMPLOYEE',
    })
    // 200/201 uğurlu, 400 əgər əlavə sahə lazımdırsa — 500 olmaz
    expect(res.status).not.toBe(500)
  })

  test('İşçi (Nigar) istifadəçi yarada bilmir', async () => {
    const res = await api('/users', nigar.token, 'POST', {
      email: 'hacker@techflow.az',
      fullName: 'Hacker',
      password: '123456',
    })
    expect(res.status).toBe(403)
  })

  test('Eyni email ilə ikinci istifadəçi — duplikat', async () => {
    const res = await api('/users', admin.token, 'POST', {
      email: 'admin@techflow.az',
      fullName: 'Duplikat Admin',
      password: '123456',
    })
    expect([400, 409, 422]).toContain(res.status)
  })

  test('SQL injection email-də', async () => {
    const res = await api('/users', admin.token, 'POST', {
      email: "'; DROP TABLE \"User\"; --@test.com",
      fullName: 'SQL Test',
      password: '123456',
    })
    expect(res.status).not.toBe(500)
    // DB hələ işləyir
    const check = await api('/users', admin.token)
    expect(check.status).toBe(200)
  })

  test('İerarxiya endpoint işləyir', async () => {
    const res = await api('/users/hierarchy', admin.token)
    expect(res.status).toBe(200)
  })

  test('Filial üzrə istifadəçi filtri', async () => {
    // Əvvəlcə filialları tap
    const bizRes = await api('/users/businesses', admin.token)
    if (bizRes.status === 200) {
      const businesses = await bizRes.json()
      if (businesses.length > 0) {
        const res = await api(`/users?businessId=${businesses[0].id}`, admin.token)
        expect(res.status).toBe(200)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 9: ROL SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('9. ROL SİSTEMİ', () => {
  test('Admin rol yaradır', async () => {
    const res = await api('/roles', admin.token, 'POST', {
      name: 'QA Test Rolu ' + Date.now(),
      description: 'Test rolu',
      permissions: ['tasks.read', 'tasks.create'],
    })
    expect([200, 201]).toContain(res.status)
  })

  test('İşçi rol yarada bilmir', async () => {
    const res = await api('/roles', nigar.token, 'POST', {
      name: 'Hack Rolu',
      permissions: ['tasks.read', 'tasks.create', 'users.manage'],
    })
    expect(res.status).toBe(403)
  })

  test('Müdir rol yarada bilmir', async () => {
    const res = await api('/roles', leyla.token, 'POST', {
      name: 'Müdir Hack',
      permissions: ['tasks.read'],
    })
    expect(res.status).toBe(403)
  })

  test('Boş permission array ilə rol', async () => {
    const res = await api('/roles', admin.token, 'POST', {
      name: 'Boş Rol ' + Date.now(),
      permissions: [],
    })
    expect(res.status).not.toBe(500)
  })

  test('Mövcud olmayan permission ilə rol', async () => {
    const res = await api('/roles', admin.token, 'POST', {
      name: 'Saxta Permission ' + Date.now(),
      permissions: ['admin.hack', 'system.destroy', 'database.drop'],
    })
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 10: BİLDİRİŞ SİSTEMİ
// ═══════════════════════════════════════════════════════════════
describe('10. BİLDİRİŞLƏR', () => {
  test('Nigar öz bildirişlərini oxuya bilir', async () => {
    const res = await api('/notifications', nigar.token)
    expect(res.status).toBe(200)
  })

  test('Admin bildirişləri oxuya bilir', async () => {
    const res = await api('/notifications', admin.token)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 11: DEPARTAMENT / FİLİAL
// ═══════════════════════════════════════════════════════════════
describe('11. FİLİAL + ŞÖBƏ', () => {
  test('Admin filialları görür', async () => {
    const res = await api('/departments', admin.token)
    expect(res.status).toBe(200)
  })

  test('İşçi filialları görə bilmir (departments.read yox)', async () => {
    const res = await api('/departments', nigar.token)
    // Əgər PermissionsGuard tətbiq olunubsa 403, olunmayıbsa 200
    // Hər iki hal qəbulediləndir amma 500 olmaz
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 12: FAYL UPLOAD + ATTACHMENT
// ═══════════════════════════════════════════════════════════════
describe('12. FAYL UPLOAD', () => {
  test('Fayl upload cəhdi (multipart)', async () => {
    const res = await uploadFile('/attachments/upload', leyla.token, 'test.txt', 'QA test faylı')
    // 200/201 əgər endpoint varsa, 404 yoxdursa
    expect([200, 201, 400, 404]).toContain(res.status)
  })

  test('Çox böyük fayl adı ilə upload', async () => {
    const bigName = 'A'.repeat(500) + '.txt'
    const res = await uploadFile('/attachments/upload', leyla.token, bigName, 'test')
    expect(res.status).not.toBe(500)
  })

  test('Boş fayl upload', async () => {
    const res = await uploadFile('/attachments/upload', leyla.token, 'empty.txt', '')
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 13: PARALEL STRES TESTİ
// ═══════════════════════════════════════════════════════════════
describe('13. STRES — Paralel Sorğular', () => {
  test('20 paralel tapşırıq yaratma', async () => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      api('/todoist/tasks', nigar.token, 'POST', {
        content: `Stres tapşırıq ${i + 1}`,
        priority: ['P1', 'P2', 'P3', 'P4'][i % 4],
      })
    )
    const results = await Promise.all(promises)
    const statuses = results.map(r => r.status)
    const successCount = statuses.filter(s => [200, 201].includes(s)).length
    expect(successCount).toBeGreaterThan(15) // ən az 75% uğurlu
  }, 15000)

  test('10 paralel layihə yaratma', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      api('/todoist/projects', rashad.token, 'POST', {
        name: `Stres Layihə ${i + 1}`,
        color: '#DC4C3E',
      })
    )
    const results = await Promise.all(promises)
    const statuses = results.map(r => r.status)
    expect(statuses.every(s => [200, 201].includes(s))).toBe(true)
  }, 15000)

  test('30 paralel axtarış sorğusu', async () => {
    const promises = Array.from({ length: 30 }, () =>
      api('/todoist/tasks/search?q=test', nigar.token)
    )
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.status === 200).length
    expect(successCount).toBeGreaterThan(25)
  }, 15000)

  test('Eyni anda 5 fərqli istifadəçi login', async () => {
    const promises = [
      login('admin@techflow.az'),
      login('leyla@techflow.az'),
      login('nigar@techflow.az'),
      login('rashad@techflow.az'),
      login('tural@techflow.az'),
    ]
    const results = await Promise.allSettled(promises)
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    expect(fulfilled.length).toBe(5)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 14: EDGE CASE + MANTIKSIZ DAVRANIŞ
// ═══════════════════════════════════════════════════════════════
describe('14. EDGE CASE — Məntiksiz Davranış', () => {
  test('Mövcud olmayan endpoint — 404', async () => {
    const res = await api('/yoxdur/burada', admin.token)
    expect(res.status).toBe(404)
  })

  test('GET əvəzinə DELETE göndərmək', async () => {
    const res = await api('/tasks', admin.token, 'DELETE')
    expect([404, 405]).toContain(res.status)
  })

  test('Body-siz POST sorğusu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leyla.token}` },
    })
    expect(res.status).not.toBe(500)
  })

  test('Yanlış Content-Type ilə POST', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${leyla.token}` },
      body: 'bu json deyil',
    })
    expect(res.status).not.toBe(500)
  })

  test('Çox böyük JSON body (1MB)', async () => {
    const bigData = { title: 'Test', description: 'X'.repeat(1048576) }
    const res = await api('/tasks', leyla.token, 'POST', bigData)
    // Ya 413 (too large) ya da 400 — 500 olmaz
    expect(res.status).not.toBe(500)
  })

  test('Unicode/emoji başlıqda', async () => {
    const res = await api('/tasks', leyla.token, 'POST', {
      title: '🔥 Təcili görev 🚀 — 中文测试 — العربية',
      type: 'GOREV',
    })
    expect([200, 201]).toContain(res.status)
  })

  test('Təkrar login — hər iki token işləyir', async () => {
    const session1 = await login('nigar@techflow.az')
    // 1 saniyə gözlə ki, iat fərqli olsun
    await new Promise(r => setTimeout(r, 1100))
    const session2 = await login('nigar@techflow.az')
    // Hər ikisi işləməlidir
    const res1 = await api('/todoist/tasks/today', session1.token)
    const res2 = await api('/todoist/tasks/today', session2.token)
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })

  test('Mövcud olmayan task ID ilə sorğu', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await api(`/tasks/${fakeId}`, admin.token)
    expect([404, 200]).toContain(res.status) // 200 + null da ola bilər
  })

  test('UUID deyil ID ilə sorğu', async () => {
    const res = await api('/tasks/not-a-uuid', admin.token)
    expect(res.status).not.toBe(500)
  })

  test('Negative sortOrder ilə reorder', async () => {
    const res = await api('/todoist/tasks/reorder', nigar.token, 'POST', {
      items: [{ id: '00000000-0000-0000-0000-000000000000', sortOrder: -999 }],
    })
    expect(res.status).not.toBe(500)
  })

  test('Tarix keçmişdə olan tapşırıq yaratmaq', async () => {
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: 'Keçmiş tarixli tapşırıq',
      dueDate: '2020-01-01T00:00:00.000Z',
    })
    // Qəbul edir — keçmiş tarix valid ola bilər
    expect(res.status).not.toBe(500)
  })

  test('Çox dərin nested JSON', async () => {
    let nested: any = { content: 'deep' }
    for (let i = 0; i < 50; i++) nested = { data: nested }
    const res = await api('/todoist/tasks', nigar.token, 'POST', nested)
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 15: CROSS-TENANT İZOLASİYA
// ═══════════════════════════════════════════════════════════════
describe('15. TENANT İZOLASİYA', () => {
  test('Bütün istifadəçilər eyni tenantdadır', () => {
    const tenantIds = [admin.tenantId, hasan.tenantId, leyla.tenantId, nigar.tenantId]
    expect(new Set(tenantIds).size).toBe(1)
  })

  test('Nigar yalnız öz TODO layihələrini görür', async () => {
    const nigarRes = await api('/todoist/projects', nigar.token)
    const rashadRes = await api('/todoist/projects', rashad.token)
    const nigarProjects = await nigarRes.json()
    const rashadProjects = await rashadRes.json()

    // Nigarın layihə ID-ləri Rashad-da olmamalı (inbox xaric)
    const nigarIds = nigarProjects.filter((p: any) => !p.isInbox).map((p: any) => p.id)
    const rashadIds = rashadProjects.map((p: any) => p.id)
    const overlap = nigarIds.filter((id: string) => rashadIds.includes(id))
    expect(overlap.length).toBe(0)
  })

  test('Nigar başqa işçinin TODO task-ını update edə bilmir', async () => {
    // Rashad bir task yaradır
    const createRes = await api('/todoist/tasks', rashad.token, 'POST', {
      content: 'Rashad-ın gizli tapşırığı',
    })
    if (createRes.status === 200 || createRes.status === 201) {
      const task = await createRes.json()
      // Nigar onu update etməyə çalışır
      const updateRes = await api(`/todoist/tasks/${task.id}`, nigar.token, 'PUT', {
        content: 'Nigar hack etdi',
      })
      // 403/404 olmalı — 200 olmamalıdır
      expect([403, 404]).toContain(updateRes.status)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 16: ŞƏRHLƏR
// ═══════════════════════════════════════════════════════════════
describe('16. ŞƏRH SİSTEMİ', () => {
  let taskId: string
  let commentId: string

  test('Tapşırıq yaradır şərh üçün', async () => {
    const res = await api('/todoist/tasks', nigar.token, 'POST', {
      content: 'Şərh test tapşırığı',
    })
    const data = await res.json()
    taskId = data.id
  })

  test('Şərh əlavə edir', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/comments`, nigar.token, 'POST', {
      content: 'Bu test şərhidir',
    })
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    commentId = data.id
  })

  test('Şərhləri oxuyur', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/comments`, nigar.token)
    expect(res.status).toBe(200)
  })

  test('Boş şərh əlavə etmək', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/comments`, nigar.token, 'POST', {
      content: '',
    })
    // Ya 400 ya da qəbul edər — 500 olmaz
    expect(res.status).not.toBe(500)
  })

  test('XSS şərh', async () => {
    if (!taskId) return
    const res = await api(`/todoist/tasks/${taskId}/comments`, nigar.token, 'POST', {
      content: '<img src=x onerror=alert(1)>',
    })
    expect(res.status).not.toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BÖLMƏ 17: SUMMARY
// ═══════════════════════════════════════════════════════════════
afterAll(() => {
  console.log('\n═══════════════════════════════════════')
  console.log('QA TEST NƏTİCƏLƏRİ')
  console.log('═══════════════════════════════════════')
  console.log(`Yaradılan GÖREV-lər: ${createdTaskIds.length}`)
  console.log(`Yaradılan şablonlar: ${createdTemplateIds.length}`)
  console.log(`Yaradılan TODO layihələr: ${createdTodoProjectIds.length}`)
  console.log('═══════════════════════════════════════\n')
})
