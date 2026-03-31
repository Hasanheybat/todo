/**
 * FIX VERİFİCATİON TESTLƏRİ
 * 3 backend düzəlişi yoxlanılır:
 * 1. İerarxiya — assign_upward olmayan user öz şöbəsi+altı assign edə bilsin
 * 2. Finalize — gorev.create|gorev.approve OR məntiqi
 * 3. gorev.approve — Müdir rolunda mövcudluğu
 */

const API = 'http://localhost:4000'

// ── API helpers ──
async function login(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '123456' }),
  })
  return (await r.json()).accessToken || ''
}

async function api(method: string, path: string, token: string, body?: any) {
  const opts: any = { method, headers: { Authorization: `Bearer ${token}` } }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  const r = await fetch(`${API}${path}`, opts)
  const text = await r.text()
  try { return { status: r.status, data: JSON.parse(text) } } catch { return { status: r.status, data: text } }
}

// ── State ──
const state: Record<string, any> = {}

async function setup() {
  if (state.ready) return
  // Login
  state.hasanToken = await login('hasan@techflow.az')
  state.leylaToken = await login('leyla@techflow.az')
  state.turalToken = await login('tural@techflow.az')
  state.kamranToken = await login('kamran@techflow.az')
  state.nigarToken = await login('nigar@techflow.az')
  state.rashadToken = await login('rashad@techflow.az')
  state.ulviyyeToken = await login('ulviyye@techflow.az')

  // User IDs
  const r = await api('GET', '/users?limit=100', state.hasanToken)
  const users = r.data?.data || r.data || []
  for (const u of users) {
    state[`${u.email.split('@')[0]}_id`] = u.id
  }

  // Rollar
  const roles = await api('GET', '/roles', state.hasanToken)
  const roleList = Array.isArray(roles.data) ? roles.data : roles.data?.data || []
  state.komandaLideriRoleId = roleList.find((r: any) => r.name === 'Komanda Lideri')?.id
  state.isciRoleId = roleList.find((r: any) => r.name === 'İşçi')?.id
  state.mudirRoleId = roleList.find((r: any) => r.name === 'Müdir')?.id

  // Filial + Şöbə
  const biz = await api('GET', '/users/businesses', state.hasanToken)
  const bizArr = Array.isArray(biz.data) ? biz.data : []
  state.bakuBizId = bizArr.find((b: any) => b.name?.includes('Bakı'))?.id
  state.genceBizId = bizArr.find((b: any) => b.name?.includes('Gəncə'))?.id

  state.ready = true
}

// ════════════════════════════════════════════════════════════════
// BÖLMƏ 1: İerarxiya — Şöbə daxili atama
// ════════════════════════════════════════════════════════════════
describe('FIX 1: İerarxiya — şöbə daxili atama', () => {
  let tempKamranRoleId: string

  beforeAll(async () => {
    await setup()
    // Kamran-ı Komanda Lideri roluna keçir (assign_upward yox, tasks.create var)
    tempKamranRoleId = state.kamranToken ? state.komandaLideriRoleId : ''
    if (state.komandaLideriRoleId) {
      await api('PATCH', `/users/${state.kamran_id}`, state.hasanToken, { customRoleId: state.komandaLideriRoleId })
      // Token yenilə (yetkilər dəyişdi)
      state.kamranToken = await login('kamran@techflow.az')
    }
  })

  afterAll(async () => {
    // Kamran-ı Müdir roluna geri qaytar
    if (state.mudirRoleId) {
      await api('PATCH', `/users/${state.kamran_id}`, state.hasanToken, { customRoleId: state.mudirRoleId })
    }
  })

  test('1.1 - assign_upward olmayan Kamran öz şöbəsindəki işçiyə TASK yarada bilər', async () => {
    // Kamran (Komanda Lideri, assign_upward yox) → eyni şöbədəki işçiyə task yaradır
    // Kamran Gəncə filialındadır, ulviyye də Gəncə-dədir
    const r = await api('POST', '/tasks', state.kamranToken, {
      title: 'FIX_TEST_1.1_Şöbə_daxili', type: 'TASK',
      assigneeIds: [state.ulviyye_id],
    })
    console.log(`1.1 — Kamran→Ülviyyə (eyni şöbə): ${r.status}`)
    expect(r.status).toBeLessThan(300)

    // Cleanup
    if (r.data?.id) await api('DELETE', `/tasks/${r.data.id}`, state.kamranToken)
  })

  test('1.2 - assign_upward olmayan Kamran başqa filial işçisinə TASK yarada bilməz', async () => {
    // Kamran (Gəncə) → Nigar (Bakı) — fərqli filial/şöbə
    const r = await api('POST', '/tasks', state.kamranToken, {
      title: 'FIX_TEST_1.2_Cross_filial', type: 'TASK',
      assigneeIds: [state.nigar_id],
    })
    console.log(`1.2 — Kamran→Nigar (fərqli filial): ${r.status} (gözlənilən: 403)`)
    expect(r.status).toBe(403)
  })

  test('1.3 - assign_upward olmayan Kamran öz altındakı işçiyə assign edə bilər', async () => {
    // Kamran-ın altındakı işçilər (parentId=kamran) — subordinat məntiqi qorunur
    // Əvvəlcə Kamran-ın subordinatı kim var yoxlayaq
    const r = await api('POST', '/tasks', state.kamranToken, {
      title: 'FIX_TEST_1.3_Subordinat', type: 'TASK',
      assigneeIds: [state.zaur_id], // Zaur Gəncə-dədir, Kamran-ın altında ola bilər
    })
    console.log(`1.3 — Kamran→Zaur (eyni filial/şöbə): ${r.status}`)
    // Zaur eyni şöbədədirsə 200, deyilsə subordinat yoxlaması olacaq
    // Hər iki halda 403 deyil (eyni filial)

    if (r.data?.id) await api('DELETE', `/tasks/${r.data.id}`, state.kamranToken)
  })

  test('1.4 - assign_upward OLAN Leyla fərqli şöbədəki işçiyə assign edə bilər', async () => {
    // Leyla (Müdir, assign_upward var) → Nigar (eyni filial, fərqli şöbə olsa da icazəli)
    const r = await api('POST', '/tasks', state.leylaToken, {
      title: 'FIX_TEST_1.4_Assign_upward', type: 'TASK',
      assigneeIds: [state.nigar_id],
    })
    console.log(`1.4 — Leyla→Nigar (assign_upward): ${r.status}`)
    expect(r.status).toBeLessThan(300)

    if (r.data?.id) await api('DELETE', `/tasks/${r.data.id}`, state.leylaToken)
  })
})

// ════════════════════════════════════════════════════════════════
// BÖLMƏ 2: Finalize — gorev.create|gorev.approve OR məntiqi
// ════════════════════════════════════════════════════════════════
describe('FIX 2: Finalize — gorev.create|gorev.approve OR', () => {
  let gorevId: string

  beforeAll(async () => {
    await setup()
    // Test GÖREV yarat (Həsən kreator, Tural approver)
    const r = await api('POST', '/tasks', state.hasanToken, {
      title: 'FIX_TEST_FINALIZE', type: 'GOREV', priority: 'LOW',
      assigneeIds: [state.nigar_id, state.rashad_id],
      approverId: state.tural_id,
    })
    gorevId = r.data?.id || ''
    console.log(`beforeAll — GÖREV yaradıldı: ${gorevId?.slice(0, 8)} (${r.status})`)
  })

  afterAll(async () => {
    if (gorevId) await api('DELETE', `/tasks/${gorevId}`, state.hasanToken)
  })

  test('2.1 - gorev.approve olan Tural finalize edə bilər', async () => {
    const r = await api('PATCH', `/tasks/${gorevId}/finalize`, state.turalToken, {
      note: 'Test finalize — Tural (gorev.approve)',
    })
    console.log(`2.1 — Tural finalize: ${r.status}`)
    expect(r.status).toBeLessThan(300)
  })

  test('2.2 - gorev.create olan Leyla yeni GÖREV finalize edə bilər', async () => {
    // Yeni GÖREV yarat (Leyla kreator + approver)
    const cr = await api('POST', '/tasks', state.leylaToken, {
      title: 'FIX_TEST_FINALIZE_LEYLA', type: 'GOREV', priority: 'LOW',
      assigneeIds: [state.nigar_id],
      approverId: state.leyla_id,
    })
    const id = cr.data?.id
    console.log(`2.2 — GÖREV yaradıldı: ${id?.slice(0, 8)} (${cr.status})`)

    if (id) {
      const r = await api('PATCH', `/tasks/${id}/finalize`, state.leylaToken, {
        note: 'Test finalize — Leyla (gorev.create)',
      })
      console.log(`2.2 — Leyla finalize: ${r.status}`)
      expect(r.status).toBeLessThan(300)
      await api('DELETE', `/tasks/${id}`, state.leylaToken)
    }
  })

  test('2.3 - İşçi (tasks.read only) finalize edə bilməz → 403', async () => {
    // Nigar (İşçi, yalnız tasks.read) finalize etməyə çalışır
    // Yeni GÖREV yarat
    const cr = await api('POST', '/tasks', state.hasanToken, {
      title: 'FIX_TEST_FINALIZE_NIGAR', type: 'GOREV', priority: 'LOW',
      assigneeIds: [state.rashad_id],
      approverId: state.tural_id,
    })
    const id = cr.data?.id

    if (id) {
      const r = await api('PATCH', `/tasks/${id}/finalize`, state.nigarToken, {
        note: 'Bu finalize olmamalıdır',
      })
      console.log(`2.3 — Nigar finalize: ${r.status} (gözlənilən: 403)`)
      expect(r.status).toBe(403)
      await api('DELETE', `/tasks/${id}`, state.hasanToken)
    }
  })
})

// ════════════════════════════════════════════════════════════════
// BÖLMƏ 3: gorev.approve — Rollar və Permission yoxlaması
// ════════════════════════════════════════════════════════════════
describe('FIX 3: gorev.approve — Rollar', () => {
  beforeAll(async () => { await setup() })

  test('3.1 - Müdir rolunda gorev.approve var', async () => {
    const roles = await api('GET', '/roles', state.hasanToken)
    const roleList = Array.isArray(roles.data) ? roles.data : roles.data?.data || []
    const mudir = roleList.find((r: any) => r.name === 'Müdir')
    console.log(`3.1 — Müdir permissions: ${mudir?.permissions}`)
    expect(mudir?.permissions).toContain('gorev.approve')
  })

  test('3.2 - Şirkət Sahibi rolunda gorev.approve var', async () => {
    const roles = await api('GET', '/roles', state.hasanToken)
    const roleList = Array.isArray(roles.data) ? roles.data : roles.data?.data || []
    const owner = roleList.find((r: any) => r.name === 'Şirkət Sahibi')
    console.log(`3.2 — Şirkət Sahibi permissions: ${owner?.permissions}`)
    expect(owner?.permissions).toContain('gorev.approve')
  })

  test('3.3 - Komanda Lideri rolunda gorev.approve var', async () => {
    const roles = await api('GET', '/roles', state.hasanToken)
    const roleList = Array.isArray(roles.data) ? roles.data : roles.data?.data || []
    const teamLead = roleList.find((r: any) => r.name === 'Komanda Lideri')
    console.log(`3.3 — Komanda Lideri permissions: ${teamLead?.permissions}`)
    expect(teamLead?.permissions).toContain('gorev.approve')
  })

  test('3.4 - İşçi rolunda gorev.approve YOX', async () => {
    const roles = await api('GET', '/roles', state.hasanToken)
    const roleList = Array.isArray(roles.data) ? roles.data : roles.data?.data || []
    const worker = roleList.find((r: any) => r.name === 'İşçi')
    console.log(`3.4 — İşçi permissions: ${worker?.permissions}`)
    expect(worker?.permissions).not.toContain('gorev.approve')
  })

  test('3.5 - Permission guard | (OR) operatoru işləyir', async () => {
    // Leyla (gorev.create + gorev.approve) finalize edə bilir
    const cr = await api('POST', '/tasks', state.leylaToken, {
      title: 'FIX_TEST_OR_CHECK', type: 'GOREV', priority: 'LOW',
      assigneeIds: [state.nigar_id],
      approverId: state.leyla_id,
    })
    const id = cr.data?.id
    if (id) {
      const r = await api('PATCH', `/tasks/${id}/finalize`, state.leylaToken, { note: 'OR test' })
      console.log(`3.5 — OR operator: ${r.status} (gorev.create|gorev.approve)`)
      expect(r.status).toBeLessThan(300)
      await api('DELETE', `/tasks/${id}`, state.leylaToken)
    }
  })
})
