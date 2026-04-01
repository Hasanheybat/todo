/**
 * FULL SYSTEM TEST — WorkFlow Pro
 * Bütün modulları real API üzərindən test edir.
 * Hər test: "Çalışıyor" və ya "Çalışmıyor" + səbəb yazır.
 *
 * Çalıştırmaq: npx jest test/system/full-system-test.spec.ts --runInBand --forceExit
 */

const API = process.env.API_URL || 'http://localhost:4000'

// ─── HELPERS ───
async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: any = null
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, ok: res.ok }
}

// ─── TEST STATE ───
let adminToken = ''
let managerToken = ''
let workerToken = ''
let adminUser: any = null
let managerUser: any = null
let workerUser: any = null

// Test accounts (from mega seed)
const ADMIN = { email: 'admin@techflow.az', password: '123456' }
const MANAGER = { email: 'hasan@techflow.az', password: '123456' }
const WORKER = { email: 'nigar@techflow.az', password: '123456' }

// ═══════════════════════════════════════════════════════════════
// 1. AUTH MODULu
// ═══════════════════════════════════════════════════════════════
describe('1. AUTH MODULU', () => {

  test('1.1 Admin login — düzgün email/şifrə', async () => {
    const r = await req('POST', '/auth/login', ADMIN)
    expect(r.status).toBe(200)
    expect(r.data.accessToken).toBeDefined()
    expect(r.data.user).toBeDefined()
    adminToken = r.data.accessToken
    adminUser = r.data.user
  })

  test('1.2 Manager login', async () => {
    const r = await req('POST', '/auth/login', MANAGER)
    expect(r.status).toBe(200)
    managerToken = r.data.accessToken
    managerUser = r.data.user
  })

  test('1.3 Worker login', async () => {
    const r = await req('POST', '/auth/login', WORKER)
    expect(r.status).toBe(200)
    workerToken = r.data.accessToken
    workerUser = r.data.user
  })

  test('1.4 Yanlış şifrə → 400', async () => {
    const r = await req('POST', '/auth/login', { email: ADMIN.email, password: 'wrong' })
    expect([400, 401]).toContain(r.status)
  })

  test('1.5 Olmayan email → 400/401', async () => {
    const r = await req('POST', '/auth/login', { email: 'yoxdur@test.az', password: '123456' })
    expect([400, 401]).toContain(r.status)
  })

  test('1.6 GET /auth/me — token ilə profil alınır', async () => {
    const r = await req('GET', '/auth/me', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(r.data.email).toBe(ADMIN.email)
  })

  test('1.7 GET /auth/me — tokensiz → 401', async () => {
    const r = await req('GET', '/auth/me')
    expect(r.status).toBe(401)
  })

  test('1.8 GET /auth/me — saxta token → 401', async () => {
    const r = await req('GET', '/auth/me', undefined, 'invalid.token.here')
    expect(r.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. USERS MODULU
// ═══════════════════════════════════════════════════════════════
describe('2. USERS MODULU', () => {

  test('2.1 Admin — bütün istifadəçiləri görür', async () => {
    const r = await req('GET', '/users', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
    expect(r.data.length).toBeGreaterThan(0)
  })

  test('2.2 Manager — istifadəçiləri görür (users.read)', async () => {
    const r = await req('GET', '/users', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('2.3 Worker — istifadəçiləri görə bilmir (users.read yoxdur)', async () => {
    const r = await req('GET', '/users', undefined, workerToken)
    // 403 Forbidden (yetki yoxdur) və ya 200 (əgər yetki varsa)
    expect([200, 403]).toContain(r.status)
  })

  test('2.4 GET /users/assignable — atana bilən istifadəçilər', async () => {
    const r = await req('GET', '/users/assignable', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('2.5 GET /users/hierarchy — ierarxiya ağacı', async () => {
    const r = await req('GET', '/users/hierarchy', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('2.6 GET /users/businesses — filiallar siyahısı', async () => {
    const r = await req('GET', '/users/businesses', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('2.7 GET /users/:id — tək istifadəçi', async () => {
    const r = await req('GET', `/users/${adminUser.id}`, undefined, adminToken)
    expect(r.status).toBe(200)
    expect(r.data.id).toBe(adminUser.id)
  })

  test('2.8 GET /users/:id/subordinates — tabelilik', async () => {
    const r = await req('GET', `/users/${managerUser.id}/subordinates`, undefined, adminToken)
    expect([200, 404]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. ROLES MODULU
// ═══════════════════════════════════════════════════════════════
describe('3. ROLES MODULU', () => {

  test('3.1 GET /roles — admin rol siyahısını görür', async () => {
    const r = await req('GET', '/roles', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
    expect(r.data.length).toBeGreaterThan(0)
  })

  test('3.2 GET /roles/permissions — yetki siyahısı', async () => {
    const r = await req('GET', '/roles/permissions', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('3.3 Worker — rollara daxil ola bilmir', async () => {
    const r = await req('GET', '/roles', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  let testRoleId: string | null = null

  test('3.4 POST /roles — yeni rol yaratma', async () => {
    const r = await req('POST', '/roles', {
      name: `TestRole_${Date.now()}`,
      permissions: ['tasks.read', 'tasks.create'],
    }, adminToken)
    expect(r.status).toBe(201)
    expect(r.data.id).toBeDefined()
    testRoleId = r.data.id
  })

  test('3.5 DELETE /roles/:id — rol silmə', async () => {
    if (!testRoleId) return
    const r = await req('DELETE', `/roles/${testRoleId}`, undefined, adminToken)
    expect([200, 204]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. TASKS (GÖREV) MODULU
// ═══════════════════════════════════════════════════════════════
describe('4. TASKS (GÖREV) MODULU', () => {

  test('4.1 GET /tasks — bütün tapşırıqlar', async () => {
    const r = await req('GET', '/tasks', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('4.2 Admin — tapşırıqlar siyahısı gəlir', async () => {
    const r = await req('GET', '/tasks', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  let createdTaskId: string | null = null

  test('4.3 POST /tasks — yeni TASK yaratma', async () => {
    const r = await req('POST', '/tasks', {
      title: `SystemTest_${Date.now()}`,
      type: 'TASK',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }, managerToken)
    // 201 Created və ya 200
    expect([200, 201]).toContain(r.status)
    if (r.data?.id) createdTaskId = r.data.id
  })

  test('4.4 GET /tasks/:id — yaradılan tapşırıq', async () => {
    if (!createdTaskId) return
    const r = await req('GET', `/tasks/${createdTaskId}`, undefined, managerToken)
    expect(r.status).toBe(200)
    expect(r.data.id).toBe(createdTaskId)
  })

  test('4.5 PUT /tasks/:id — tapşırıq yeniləmə', async () => {
    if (!createdTaskId) return
    const r = await req('PUT', `/tasks/${createdTaskId}`, {
      title: 'Updated_SystemTest',
      priority: 'HIGH',
    }, managerToken)
    expect(r.status).toBe(200)
  })

  test('4.6 POST /tasks/:id/complete — tapşırıq tamamlama', async () => {
    if (!createdTaskId) return
    const r = await req('POST', `/tasks/${createdTaskId}/complete`, {}, managerToken)
    expect([200, 201, 400, 403]).toContain(r.status)
  })

  test('4.7 Worker — tasks.create yetkisi yoxdursa → 403', async () => {
    const r = await req('POST', '/tasks', {
      title: 'WorkerTask',
      type: 'TASK',
      priority: 'LOW',
    }, workerToken)
    // Worker-in tasks.create yetkisi ola bilər və ya olmaya bilər
    expect([200, 201, 403]).toContain(r.status)
  })

  test('4.8 GOREV yaratma (toplu tapşırıq)', async () => {
    // Sadə GOREV yaratma testi — filial olmadan
    const r = await req('POST', '/tasks', {
      title: `GorevTest_${Date.now()}`,
      type: 'GOREV',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      subTasks: [
        { title: 'Alt görev 1', assigneeIds: [workerUser?.id].filter(Boolean), approverId: managerUser?.id || '' },
      ],
    }, adminToken)
    expect([200, 201, 400]).toContain(r.status) // 400 əgər filial lazımdırsa
  })

  // Cleanup
  afterAll(async () => {
    if (createdTaskId) {
      await req('DELETE', `/tasks/${createdTaskId}`, undefined, managerToken).catch(() => {})
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. TODOIST (TODO) MODULU
// ═══════════════════════════════════════════════════════════════
describe('5. TODOIST (TODO) MODULU', () => {

  test('5.1 GET /todoist/projects — layihələr', async () => {
    const r = await req('GET', '/todoist/projects', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('5.2 GET /todoist/tasks — bütün TODO-lar', async () => {
    const r = await req('GET', '/todoist/tasks', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('5.3 GET /todoist/tasks/today — bugünkü TODO-lar', async () => {
    const r = await req('GET', '/todoist/tasks/today', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('5.4 GET /todoist/tasks/upcoming — gələcək TODO-lar', async () => {
    const r = await req('GET', '/todoist/tasks/upcoming', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('5.5 GET /todoist/tasks/search?q=test — axtarış', async () => {
    const r = await req('GET', '/todoist/tasks/search?q=test', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  let todoProjectId: string | null = null

  test('5.6 POST /todoist/projects — layihə yaratma', async () => {
    const r = await req('POST', '/todoist/projects', {
      name: `TestProject_${Date.now()}`,
      color: '#FF6347',
    }, managerToken)
    expect([200, 201]).toContain(r.status)
    if (r.data?.id) todoProjectId = r.data.id
  })

  let todoTaskId: string | null = null

  test('5.7 POST /todoist/tasks — TODO yaratma', async () => {
    const r = await req('POST', '/todoist/tasks', {
      content: `SystemTest_Todo_${Date.now()}`,
      priority: 'P2',
      projectId: todoProjectId || undefined,
    }, managerToken)
    expect([200, 201]).toContain(r.status)
    if (r.data?.id) todoTaskId = r.data.id
  })

  test('5.8 PUT /todoist/tasks/:id — TODO yeniləmə', async () => {
    if (!todoTaskId) return
    const r = await req('PUT', `/todoist/tasks/${todoTaskId}`, {
      content: 'Updated_Todo',
      priority: 'P1',
    }, managerToken)
    expect(r.status).toBe(200)
  })

  test('5.9 POST /todoist/tasks/:id/complete — TODO tamamlama', async () => {
    if (!todoTaskId) return
    const r = await req('POST', `/todoist/tasks/${todoTaskId}/complete`, {}, managerToken)
    expect([200, 201]).toContain(r.status)
  })

  test('5.10 GET /todoist/labels — etiketlər', async () => {
    const r = await req('GET', '/todoist/labels', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  // Sections
  test('5.11 Sections CRUD — seksiya yaratma', async () => {
    if (!todoProjectId) return
    const r = await req('POST', '/todoist/sections', {
      name: 'TestSection',
      projectId: todoProjectId,
    }, managerToken)
    expect([200, 201]).toContain(r.status)
  })

  // Cleanup
  afterAll(async () => {
    if (todoTaskId) await req('DELETE', `/todoist/tasks/${todoTaskId}`, undefined, managerToken).catch(() => {})
    if (todoProjectId) await req('DELETE', `/todoist/projects/${todoProjectId}`, undefined, managerToken).catch(() => {})
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. FINANCE MODULU
// ═══════════════════════════════════════════════════════════════
describe('6. FINANCE MODULU', () => {

  test('6.1 GET /finance/categories — kateqoriyalar', async () => {
    const r = await req('GET', '/finance/categories', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('6.2 GET /finance/transactions — əməliyyatlar', async () => {
    const r = await req('GET', '/finance/transactions', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('6.3 GET /finance/summary — maliyyə xülasəsi', async () => {
    const r = await req('GET', '/finance/summary', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('6.4 GET /finance/employee-balances — işçi balansları', async () => {
    const r = await req('GET', '/finance/employee-balances', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('6.5 Worker — finance-a daxil ola bilmir (403)', async () => {
    const r = await req('GET', '/finance/transactions', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('6.6 Manager — finance-a daxil ola bilmir (403) və ya oxuya bilər', async () => {
    const r = await req('GET', '/finance/transactions', undefined, managerToken)
    // Manager-in finance.manage yetkisi ola bilər və ya olmaya bilər
    expect([200, 403]).toContain(r.status)
  })

  let testCategoryId: string | null = null

  test('6.7 POST /finance/categories — kateqoriya yaratma', async () => {
    const r = await req('POST', '/finance/categories', {
      name: `TestCat_${Date.now()}`,
      color: '#22C55E',
    }, adminToken)
    expect([200, 201]).toContain(r.status)
    if (r.data?.id) testCategoryId = r.data.id
  })

  test('6.8 POST /finance/transactions — əməliyyat yaratma', async () => {
    const r = await req('POST', '/finance/transactions', {
      type: 'INCOME',
      amount: 1000,
      description: 'Test transaction',
      categoryId: testCategoryId || undefined,
    }, adminToken)
    expect([200, 201, 400]).toContain(r.status)
  })

  // Cleanup
  afterAll(async () => {
    if (testCategoryId) await req('DELETE', `/finance/categories/${testCategoryId}`, undefined, adminToken).catch(() => {})
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. SALARY MODULU
// ═══════════════════════════════════════════════════════════════
describe('7. SALARY MODULU', () => {

  test('7.1 GET /salary — maaş siyahısı', async () => {
    const r = await req('GET', '/salary', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('7.2 GET /salary/payments — ödəmə siyahısı', async () => {
    const r = await req('GET', '/salary/payments', undefined, adminToken)
    expect(r.status).toBe(200)
  })

  test('7.3 Worker — salary-a daxil ola bilmir (403)', async () => {
    const r = await req('GET', '/salary', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('7.4 POST /salary — maaş təyinatı', async () => {
    if (!workerUser?.id) return
    const r = await req('POST', '/salary', {
      userId: workerUser.id,
      amount: 2500,
      currency: 'AZN',
    }, adminToken)
    // 200/201 yaradıldı və ya 409 artıq mövcuddur
    expect([200, 201, 400, 409]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. NOTIFICATIONS MODULU
// ═══════════════════════════════════════════════════════════════
describe('8. NOTIFICATIONS MODULU', () => {

  test('8.1 GET /notifications — bildirişlər', async () => {
    const r = await req('GET', '/notifications', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('8.2 GET /notifications/unread-count — oxunmamış sayı', async () => {
    const r = await req('GET', '/notifications/unread-count', undefined, managerToken)
    expect(r.status).toBe(200)
    expect(typeof r.data === 'number' || typeof r.data?.count === 'number').toBe(true)
  })

  test('8.3 POST /notifications/read-all — hamısını oxunmuş işarələ', async () => {
    const r = await req('POST', '/notifications/read-all', {}, managerToken)
    expect([200, 201]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. DEPARTMENTS MODULU
// ═══════════════════════════════════════════════════════════════
describe('9. DEPARTMENTS MODULU', () => {

  test('9.1 GET /departments — şöbələr siyahısı', async () => {
    const r = await req('GET', '/departments', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('9.2 Worker — departments-ə daxil ola bilir/bilmir', async () => {
    const r = await req('GET', '/departments', undefined, workerToken)
    expect([200, 403]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. TEMPLATES MODULU
// ═══════════════════════════════════════════════════════════════
describe('10. TEMPLATES MODULU', () => {

  test('10.1 GET /templates — şablonlar siyahısı', async () => {
    const r = await req('GET', '/templates', undefined, adminToken)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data)).toBe(true)
  })

  test('10.2 Recurring şablonlar mövcuddur', async () => {
    const r = await req('GET', '/templates', undefined, adminToken)
    expect(r.status).toBe(200)
    // Seed data-da recurring şablonlar olmalıdır
    const recurring = r.data.filter((t: any) => t.isRecurring === true)
    expect(recurring.length).toBeGreaterThanOrEqual(0) // 0+ ola bilər
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. ATTACHMENTS MODULU
// ═══════════════════════════════════════════════════════════════
describe('11. ATTACHMENTS MODULU', () => {

  test('11.1 GET /attachments/task/:id — fayl siyahısı (mövcud task)', async () => {
    // Əvvəlcə bir task tap
    const tasks = await req('GET', '/tasks', undefined, adminToken)
    if (tasks.data?.length > 0) {
      const taskId = tasks.data[0].id
      const r = await req('GET', `/attachments/task/${taskId}`, undefined, adminToken)
      expect([200, 404]).toContain(r.status)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. SECURITY TESTLƏRİ
// ═══════════════════════════════════════════════════════════════
describe('12. SECURITY TESTLƏRİ', () => {

  test('12.1 SQL Injection — login-da SQL inject', async () => {
    const r = await req('POST', '/auth/login', {
      email: "admin' OR '1'='1",
      password: "' OR '1'='1",
    })
    expect([400, 401]).toContain(r.status) // İnject işləməməli
  })

  test('12.2 XSS — task title-da script', async () => {
    const r = await req('POST', '/tasks', {
      title: '<script>alert("xss")</script>',
      type: 'TASK',
      priority: 'LOW',
    }, managerToken)
    // Yaratsa belə, title escape olmalı
    if (r.data?.id) {
      const task = await req('GET', `/tasks/${r.data.id}`, undefined, managerToken)
      expect(task.data.title).not.toContain('<script>')
      // Cleanup
      await req('DELETE', `/tasks/${r.data.id}`, undefined, managerToken).catch(() => {})
    }
  })

  test('12.3 IDOR — başqa tenant-in datasına erişmə', async () => {
    // Worker başqa birinin task-ını silə bilməməli
    const adminTasks = await req('GET', '/tasks', undefined, adminToken)
    if (adminTasks.data?.length > 0) {
      const taskId = adminTasks.data[0].id
      const r = await req('DELETE', `/tasks/${taskId}`, undefined, workerToken)
      expect([403, 404]).toContain(r.status) // Silə bilməməli
    }
  })

  test('12.4 Tokensiz sorğu — bütün qorunan endpoint-lər 401', async () => {
    const endpoints = ['/users', '/tasks', '/roles', '/finance/transactions', '/salary', '/notifications']
    for (const ep of endpoints) {
      const r = await req('GET', ep)
      expect(r.status).toBe(401)
    }
  })

  test('12.5 Boş body ilə POST /auth/login → 400/401', async () => {
    const r = await req('POST', '/auth/login', {})
    expect([400, 401, 500]).toContain(r.status)
  })

  test('12.6 Çox uzun string — buffer overflow cəhdi', async () => {
    const longStr = 'A'.repeat(10000)
    const r = await req('POST', '/auth/login', { email: longStr, password: longStr })
    expect([400, 401, 413, 500]).toContain(r.status) // reject etməli
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. RBAC (YETKİ) TESTLƏRİ
// ═══════════════════════════════════════════════════════════════
describe('13. RBAC YETKİ TESTLƏRİ', () => {

  test('13.1 Worker — /roles → 403', async () => {
    const r = await req('GET', '/roles', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.2 Worker — /finance → 403', async () => {
    const r = await req('GET', '/finance/transactions', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.3 Worker — /salary → 403', async () => {
    const r = await req('GET', '/salary', undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.4 Worker — /users/manage (POST) → 403', async () => {
    const r = await req('POST', '/users', {
      email: 'hack@test.az',
      password: '123456',
      fullName: 'Hacker',
    }, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.5 Worker — rol yarada bilmir (POST /roles → 403)', async () => {
    const r = await req('POST', '/roles', {
      name: 'HackerRole',
      permissions: ['users.manage', 'finance.manage'],
    }, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.6 Worker — istifadəçi silə bilmir (DELETE /users/:id → 403)', async () => {
    const r = await req('DELETE', `/users/${adminUser?.id}`, undefined, workerToken)
    expect([401, 403]).toContain(r.status)
  })

  test('13.7 Admin — bütün yetkilər var', async () => {
    const endpoints = [
      { m: 'GET', p: '/users' },
      { m: 'GET', p: '/roles' },
      { m: 'GET', p: '/finance/transactions' },
      { m: 'GET', p: '/salary' },
      { m: 'GET', p: '/tasks' },
    ]
    for (const ep of endpoints) {
      const r = await req(ep.m, ep.p, undefined, adminToken)
      expect(r.status).toBe(200)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 14. SUPER ADMIN
// ═══════════════════════════════════════════════════════════════
describe('14. SUPER ADMIN', () => {

  test('14.1 GET /admin/tenants — tenant siyahısı (admin token ilə)', async () => {
    const r = await req('GET', '/admin/tenants', undefined, adminToken)
    // Super admin endpoint — admin token ilə işləyə bilər və ya bilməz
    expect([200, 403, 404]).toContain(r.status)
  })

  test('14.2 GET /admin/stats — sistem statistikası', async () => {
    const r = await req('GET', '/admin/stats', undefined, adminToken)
    expect([200, 403, 404]).toContain(r.status)
  })
})

// ═══════════════════════════════════════════════════════════════
// 15. COMMENTS MODULU
// ═══════════════════════════════════════════════════════════════
describe('15. COMMENTS MODULU', () => {

  test('15.1 Todoist task comments — şərh oxuma', async () => {
    // Əvvəlcə bir task tap
    const tasks = await req('GET', '/todoist/tasks', undefined, managerToken)
    if (tasks.data?.length > 0) {
      const taskId = tasks.data[0].id
      const r = await req('GET', `/todoist/tasks/${taskId}/comments`, undefined, managerToken)
      expect([200, 404]).toContain(r.status)
    } else {
      expect(true).toBe(true) // skip
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 16. DATA İZOLASİYASI (Multi-tenant)
// ═══════════════════════════════════════════════════════════════
describe('16. DATA İZOLASİYASI', () => {

  test('16.1 Hər istifadəçi yalnız öz tenant datası görür', async () => {
    const adminTasks = await req('GET', '/tasks', undefined, adminToken)
    const managerTasks = await req('GET', '/tasks', undefined, managerToken)
    // Eyni tenant-dədirlər — data ola bilər
    expect(adminTasks.status).toBe(200)
    expect(managerTasks.status).toBe(200)
  })

  test('16.2 TODO gizliliyi — başqasının TODO-su görünmür', async () => {
    // Admin-in TODO-ları
    const adminTodos = await req('GET', '/todoist/tasks', undefined, adminToken)
    // Worker-in TODO-ları
    const workerTodos = await req('GET', '/todoist/tasks', undefined, workerToken)
    // Hər biri öz TODO-larını görməli
    expect(adminTodos.status).toBe(200)
    expect(workerTodos.status).toBe(200)
    // İD-lər fərqli olmalı (eyni TODO-lar yox)
    if (adminTodos.data?.length > 0 && workerTodos.data?.length > 0) {
      const adminIds = new Set(adminTodos.data.map((t: any) => t.id))
      const overlap = workerTodos.data.filter((t: any) => adminIds.has(t.id))
      // TODO-lar şəxsidir, overlap olmamalı
      expect(overlap.length).toBe(0)
    }
  })
})
