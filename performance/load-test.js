/**
 * WorkFlow Pro — Performans Testi (k6)
 * ─────────────────────────────────────
 * Ssenari: Login → Layihə yüklə → TODO əlavə et → Tapşırıq siyahısı
 *
 * İşə salmaq:
 *   k6 run performance/load-test.js
 *   k6 run --env SCENARIO=stress performance/load-test.js
 *   k6 run --env SCENARIO=soak   performance/load-test.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

// ─── Xüsusi metrikalar ────────────────────────────────────────────────────────
const todoCreated    = new Counter('todo_created')
const taskFetched    = new Counter('task_fetched')
const errorRate      = new Rate('error_rate')
const loginDuration  = new Trend('login_duration', true)
const todoCreateTime = new Trend('todo_create_time', true)

// ─── Konfiqurasiya ────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
const SCENARIO = __ENV.SCENARIO || 'load'

const SCENARIOS = {
  smoke: {
    vus: 2, duration: '30s',
    thresholds: { http_req_duration: ['p(95)<2000'], error_rate: ['rate<0.05'] },
  },
  load: {
    stages: [
      { duration: '1m',  target: 20  }, // qızınma
      { duration: '3m',  target: 50  }, // normal yük
      { duration: '1m',  target: 0   }, // soyuma
    ],
    thresholds: { http_req_duration: ['p(95)<1500'], error_rate: ['rate<0.01'] },
  },
  stress: {
    stages: [
      { duration: '2m',  target: 100 },
      { duration: '5m',  target: 200 },
      { duration: '2m',  target: 0   },
    ],
    thresholds: { http_req_duration: ['p(95)<3000'], error_rate: ['rate<0.05'] },
  },
  soak: {
    stages: [
      { duration: '5m',  target: 30  },
      { duration: '30m', target: 30  }, // uzun müddət sabit yük
      { duration: '5m',  target: 0   },
    ],
    thresholds: { http_req_duration: ['p(99)<2000'], error_rate: ['rate<0.01'] },
  },
}

export const options = {
  scenarios: {
    default: {
      executor: SCENARIOS[SCENARIO].stages
        ? 'ramping-vus'
        : 'constant-vus',
      ...(SCENARIOS[SCENARIO].stages
        ? { stages: SCENARIOS[SCENARIO].stages }
        : { vus: SCENARIOS[SCENARIO].vus, duration: SCENARIOS[SCENARIO].duration }),
    },
  },
  thresholds: SCENARIOS[SCENARIO].thresholds,
}

// ─── Test istifadəçiləri ──────────────────────────────────────────────────────
const TEST_USERS = [
  { email: 'leyla@workflow.com',  password: '123456' },
  { email: 'aynur@workflow.com',  password: '123456' },
  { email: 'nigar@workflow.com',  password: '123456' },
]

// ─── Köməkçilər ───────────────────────────────────────────────────────────────
function getUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)]
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ─── Ana test funksiyası ──────────────────────────────────────────────────────
export default function () {
  const user = getUser()
  let token = null
  let inboxId = null

  // ── 1. LOGIN ──────────────────────────────────────────────────────────────
  group('1. Login', () => {
    const start = Date.now()
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    loginDuration.add(Date.now() - start)

    const ok = check(res, {
      'login 200': r => r.status === 200 || r.status === 201,
      'token var': r => {
        try { return !!JSON.parse(r.body).accessToken } catch { return false }
      },
    })
    errorRate.add(!ok)

    if (ok) {
      try { token = JSON.parse(res.body).accessToken } catch {}
    }
  })

  if (!token) {
    sleep(1)
    return
  }

  sleep(0.5)

  // ── 2. LAYİHƏLƏRİ YÜKLƏ ──────────────────────────────────────────────────
  group('2. Layihələri yüklə', () => {
    const res = http.get(`${BASE_URL}/todoist/projects`, { headers: authHeaders(token) })

    const ok = check(res, {
      'projects 200': r => r.status === 200,
      'array döndü': r => { try { return Array.isArray(JSON.parse(r.body)) } catch { return false } },
    })
    errorRate.add(!ok)

    if (ok) {
      try {
        const projects = JSON.parse(res.body)
        const inbox = projects.find(p => p.isInbox)
        if (inbox) inboxId = inbox.id
      } catch {}
    }
  })

  sleep(0.3)

  // ── 3. TODO SIYAHISINI YÜKLƏ ─────────────────────────────────────────────
  group('3. TODO siyahısını yüklə', () => {
    const res = http.get(`${BASE_URL}/todoist/tasks`, { headers: authHeaders(token) })

    const ok = check(res, {
      'tasks 200': r => r.status === 200,
    })
    errorRate.add(!ok)
    if (ok) taskFetched.add(1)
  })

  sleep(0.5)

  // ── 4. YENİ TODO ƏLAVƏ ET ────────────────────────────────────────────────
  if (inboxId) {
    group('4. TODO əlavə et', () => {
      const start = Date.now()
      const res = http.post(
        `${BASE_URL}/todoist/tasks`,
        JSON.stringify({
          content: `Yük testi tapşırığı ${Date.now()}`,
          projectId: inboxId,
          priority: 'P4',
          todoStatus: 'WAITING',
        }),
        { headers: authHeaders(token) }
      )
      todoCreateTime.add(Date.now() - start)

      const ok = check(res, {
        'task created': r => r.status === 200 || r.status === 201,
        'id var': r => { try { return !!JSON.parse(r.body).id } catch { return false } },
      })
      errorRate.add(!ok)
      if (ok) todoCreated.add(1)
    })

    sleep(0.3)
  }

  // ── 5. BUGÜNKÜ TODO YÜKLƏ ────────────────────────────────────────────────
  group('5. Bugünkü TODO', () => {
    const res = http.get(`${BASE_URL}/todoist/tasks/today`, { headers: authHeaders(token) })
    const ok = check(res, { 'today 200': r => r.status === 200 })
    errorRate.add(!ok)
  })

  sleep(0.3)

  // ── 6. TAPŞIRIQLAR SIYAHISI ───────────────────────────────────────────────
  group('6. GÖREV siyahısı', () => {
    const res = http.get(`${BASE_URL}/tasks`, { headers: authHeaders(token) })
    const ok = check(res, { 'tasks 200': r => r.status === 200 || r.status === 403 })
    errorRate.add(!ok)
  })

  sleep(0.5)

  // ── 7. AKTİVLİK LOG ───────────────────────────────────────────────────────
  group('7. Aktivlik loqu', () => {
    const res = http.get(`${BASE_URL}/todoist/activities?limit=20`, { headers: authHeaders(token) })
    const ok = check(res, { 'activities 200': r => r.status === 200 })
    errorRate.add(!ok)
  })

  sleep(1)
}

// ─── Hazırlıq (setup) ─────────────────────────────────────────────────────────
export function setup() {
  console.log(`🚀 WorkFlow Pro Performans Testi: ${SCENARIO.toUpperCase()}`)
  console.log(`📍 Hədəf: ${BASE_URL}`)

  // Server işləyirmi?
  const res = http.get(`${BASE_URL}/`)
  if (res.status !== 200 && res.status !== 404) {
    console.warn(`⚠️ Server əlçatmaz: ${res.status}`)
  }
}

// ─── Nəticə (teardown) ────────────────────────────────────────────────────────
export function teardown(data) {
  console.log('✅ Performans testi tamamlandı')
}
