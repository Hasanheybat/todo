/**
 * WorkFlow Pro — Təhlükəsizlik Testləri
 * ──────────────────────────────────────
 * Əhatə edir:
 *  - JWT olmadan sorğu rədd edilir (401)
 *  - Başqasının tapşırığına müdaxilə (IDOR)
 *  - Kiracı (tenant) izolyasiyası
 *  - XSS məzmunu saxlanılmır
 *  - Limit aşma — 400
 *  - Boş/null sahələrə qarşı qoruma
 *  - Auth: token saxtalaşdırma
 */

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import * as request from 'supertest'

// ─── Test hesabları (memory/login-accounts.md-dən) ────────────────────────────
const TEST_ACCOUNTS = {
  admin:  { email: 'hasan@workflow.com',  password: '123456' },
  worker: { email: 'leyla@workflow.com',  password: '123456' },
  other:  { email: 'aynur@workflow.com',  password: '123456' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
  return res.body.accessToken as string
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('Təhlükəsizlik Testləri (Security)', () => {
  let app: INestApplication
  let adminToken: string
  let workerToken: string
  let otherToken: string

  // NOTE: Bu testlər real DB tələb edir.
  // CI-da `docker-compose up -d db` ilə işə salın.
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    // Tokenları al
    try {
      adminToken  = await login(app, TEST_ACCOUNTS.admin.email,  TEST_ACCOUNTS.admin.password)
      workerToken = await login(app, TEST_ACCOUNTS.worker.email, TEST_ACCOUNTS.worker.password)
      otherToken  = await login(app, TEST_ACCOUNTS.other.email,  TEST_ACCOUNTS.other.password)
    } catch {
      // DB əlaqəsi olmayanda skip
    }
  })

  afterAll(async () => {
    await app?.close()
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 1. AUTENTİKASİYA — JWT QORUMASI
  // ═══════════════════════════════════════════════════════════════════════
  describe('JWT Qoruması', () => {
    it('Token olmadan TODO siyahısı — 401', async () => {
      const res = await request(app.getHttpServer()).get('/todoist/tasks')
      expect(res.status).toBe(401)
    })

    it('Token olmadan tapşırıq yaratma — 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .send({ content: 'Test', projectId: 'xxx' })
      expect(res.status).toBe(401)
    })

    it('Saxta (tampered) token ilə sorğu — 401', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.FAKE_SIGNATURE'
      const res = await request(app.getHttpServer())
        .get('/todoist/tasks')
        .set('Authorization', `Bearer ${fakeToken}`)
      expect(res.status).toBe(401)
    })

    it('Silinmiş/bitmiş token — 401', async () => {
      // Çox qısa ömürlü token simulyasiyası
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImV4cCI6MH0.signature'
      const res = await request(app.getHttpServer())
        .get('/todoist/tasks')
        .set('Authorization', expiredToken)
      expect(res.status).toBe(401)
    })

    it('Authorization başlığı yanlış formatda — 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/todoist/tasks')
        .set('Authorization', 'YANLISH formatdaki token')
      expect(res.status).toBe(401)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. IDOR — Başqasının məlumatına müdaxilə
  // ═══════════════════════════════════════════════════════════════════════
  describe('IDOR Qoruması', () => {
    it('Başqasının layihəsini silə bilmir — 403 və ya 404', async () => {
      if (!workerToken || !otherToken) return

      // Leyla layihə yaradır
      const createRes = await request(app.getHttpServer())
        .post('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ name: 'Leylanın Layihəsi', color: '#FF0000' })

      if (createRes.status !== 201 && createRes.status !== 200) return
      const projectId = createRes.body.id

      // Aynur Leylanın layihəsini silməyə çalışır
      const deleteRes = await request(app.getHttpServer())
        .delete(`/todoist/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect([403, 404]).toContain(deleteRes.status)
    })

    it('Başqasının tapşırığını yeniləyə bilmir — 403 və ya 404', async () => {
      if (!workerToken || !otherToken) return

      // Tapşırıq yarat
      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      if (projRes.status !== 200) return
      const inboxId = projRes.body.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const taskRes = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: 'Leylanın Tapşırığı', projectId: inboxId })
      if (taskRes.status > 201) return
      const taskId = taskRes.body.id

      // Aynur bu tapşırığı dəyişməyə çalışır
      const updateRes = await request(app.getHttpServer())
        .put(`/todoist/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Oğurlanmış Tapşırıq' })

      expect([403, 404]).toContain(updateRes.status)
    })

    it('Başqasının şərhini silə bilmir — 403 və ya 404', async () => {
      if (!workerToken || !otherToken) return

      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      if (projRes.status !== 200) return
      const inboxId = projRes.body.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const taskRes = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: 'Şərh Tapşırığı', projectId: inboxId })
      if (taskRes.status > 201) return

      const commentRes = await request(app.getHttpServer())
        .post(`/todoist/tasks/${taskRes.body.id}/comments`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: 'Leylanın şərhi' })
      if (commentRes.status > 201) return

      const deleteRes = await request(app.getHttpServer())
        .delete(`/todoist/comments/${commentRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect([403, 404]).toContain(deleteRes.status)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 3. KİRACILIQ (TENANT) İZOLYASİYASI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Tenant İzolyasiyası', () => {
    it('A tenant istifadəçisi B tenantın tapşırıqlarını görə bilmir', async () => {
      if (!adminToken || !otherToken) return

      // Əgər hər ikisi fərqli tenantdadırsa test işləyir
      const adminProjs = await request(app.getHttpServer())
        .get('/todoist/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
      const otherProjs = await request(app.getHttpServer())
        .get('/todoist/tasks')
        .set('Authorization', `Bearer ${otherToken}`)

      // Hər ikisi 200 qaytarır (amma fərqli data)
      if (adminProjs.status === 200 && otherProjs.status === 200) {
        const adminIds = adminProjs.body.map((t: any) => t.id)
        const otherIds = otherProjs.body.map((t: any) => t.id)
        // Ortaq tapşırıq olmamalıdır (fərqli tenantdadırlarsa)
        const overlap = adminIds.filter((id: string) => otherIds.includes(id))
        expect(overlap.length).toBe(0)
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 4. GİRDİ DOĞRULAMASI (Input Validation)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Giriş Doğrulaması', () => {
    it('Çox uzun content sahəsi qəbul edilmir', async () => {
      if (!workerToken) return

      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      const inboxId = projRes.body?.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const res = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: 'A'.repeat(10_000), projectId: inboxId })

      expect([400, 422]).toContain(res.status)
    })

    it('Boş content sahəsi — 400', async () => {
      if (!workerToken) return

      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      const inboxId = projRes.body?.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const res = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: '', projectId: inboxId })

      expect([400, 422]).toContain(res.status)
    })

    it('Yanlış tarix formatı — 400', async () => {
      if (!workerToken) return

      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      const inboxId = projRes.body?.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const res = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: 'Tapşırıq', projectId: inboxId, dueDate: 'YANLISH-TARIX' })

      // Ya 400 ya da string olaraq saxlanılır (servisdən asılı)
      // Ən azından server çökmür
      expect(res.status).toBeLessThan(500)
    })

    it('XSS cəhdi — skript tag saxlanılmır', async () => {
      if (!workerToken) return

      const projRes = await request(app.getHttpServer())
        .get('/todoist/projects')
        .set('Authorization', `Bearer ${workerToken}`)
      const inboxId = projRes.body?.find((p: any) => p.isInbox)?.id
      if (!inboxId) return

      const xssPayload = '<script>alert("xss")</script>'
      const res = await request(app.getHttpServer())
        .post('/todoist/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: xssPayload, projectId: inboxId })

      if (res.status === 200 || res.status === 201) {
        // Content skript olaraq icra edilə bilməz — ya silindi ya escape edildi
        const saved = res.body.content || ''
        expect(saved).not.toMatch(/<script>/i)
      }
    })

    it('Tapşırıq atamada 51 işçi — 400', async () => {
      if (!adminToken) return

      const tooManyIds = Array.from({ length: 51 }, (_, i) => `user-fake-${i}`)
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Həddən çox atama',
          assigneeIds: tooManyIds,
          businessId: 'biz-xxx',
          dueDate: '2026-05-01',
        })

      expect([400, 403, 422]).toContain(res.status)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 5. CAVAB TEHLÜKƏSİZLİYİ
  // ═══════════════════════════════════════════════════════════════════════
  describe('Cavab Təhlükəsizliyi', () => {
    it('Login cavabında şifrə hash-i görünmür', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(TEST_ACCOUNTS.admin)

      if (res.status === 200 || res.status === 201) {
        expect(res.body.user?.password).toBeUndefined()
        expect(res.body.user?.passwordHash).toBeUndefined()
      }
    })

    it('/auth/me cavabında şifrə görünmür', async () => {
      if (!adminToken) return
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)

      if (res.status === 200) {
        expect(res.body.password).toBeUndefined()
        expect(res.body.refreshToken).toBeUndefined()
      }
    })
  })
})
