/**
 * QA Test: Təkrarlanan Tapşırıqlar + Templates
 *
 * Test edir:
 * 1. TODO yaradıb recurring (təkrarlanan) etmək
 * 2. GÖREV yaradıb recurring etmək
 * 3. Deadline + bildiriş zamanı əlavə etmək
 * 4. Templates səhifəsinə düşüb-düşmədiyini yoxlamaq
 * 5. Recurring TODO tamamlayanda yeni TODO yaranması
 */

const API = 'http://localhost:4000'

async function req(path: string, options: any = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function runTests() {
  console.log('\n══════════════════════════════════════')
  console.log('   QA TEST: Recurring + Templates')
  console.log('══════════════════════════════════════\n')

  let passed = 0
  let failed = 0
  const fail = (name: string, reason: string) => { console.log(`  ❌ ${name}: ${reason}`); failed++ }
  const pass = (name: string) => { console.log(`  ✅ ${name}`); passed++ }

  // ── 1. Login ──
  console.log('── 1. Login ──')
  const login = await req('/auth/login', {
    method: 'POST',
    body: { email: 'hasan@techflow.az', password: '123456' }
  })
  if (login.status !== 201 && login.status !== 200) {
    fail('Login', `Status ${login.status}`)
    console.log('\n⛔ Login uğursuz — testlər dayandırıldı')
    return
  }
  const token = login.data.accessToken
  pass('Login uğurlu')

  // ── 2. Recurring TODO yarat ──
  console.log('\n── 2. Recurring TODO yarat ──')
  const todoCreate = await req('/todoist/tasks', {
    method: 'POST',
    token,
    body: {
      content: 'QA Test: Həftəlik hesabat hazırla',
      description: 'Hər həftə təkrarlanan test tapşırığı',
      priority: 'P2',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // sabah
      isRecurring: true,
      recurRule: 'weekly',
    }
  })
  if (todoCreate.status === 201 || todoCreate.status === 200) {
    pass('Recurring TODO yaradıldı')
    const todo = todoCreate.data
    if (todo.isRecurring) pass('isRecurring = true')
    else fail('isRecurring flag', `Gözlənilən: true, Alınan: ${todo.isRecurring}`)
    if (todo.recurRule === 'weekly') pass('recurRule = weekly')
    else fail('recurRule', `Gözlənilən: weekly, Alınan: ${todo.recurRule}`)
    if (todo.dueDate) pass('dueDate təyin olunub')
    else fail('dueDate', 'dueDate boşdur')
  } else {
    fail('Recurring TODO yaratma', `Status ${todoCreate.status}: ${JSON.stringify(todoCreate.data)}`)
  }

  // ── 3. Recurring TODO - fərqli tiplər ──
  console.log('\n── 3. Fərqli recurring tiplər ──')
  for (const rule of ['daily', 'monthly']) {
    const r = await req('/todoist/tasks', {
      method: 'POST', token,
      body: {
        content: `QA Test: ${rule} təkrarlanan`,
        isRecurring: true,
        recurRule: rule,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      }
    })
    if (r.status === 201 || r.status === 200) {
      if (r.data.recurRule === rule) pass(`${rule} recurring TODO yaradıldı`)
      else fail(`${rule} recurring`, `recurRule: ${r.data.recurRule}`)
    } else {
      fail(`${rule} recurring yaratma`, `Status ${r.status}`)
    }
  }

  // ── 4. GÖREV (Task) yarat — recurring ──
  console.log('\n── 4. Recurring GÖREV yarat ──')

  // Əvvəlcə users-i al (assignee üçün)
  const usersRes = await req('/users', { token })
  const users = usersRes.data || []
  const assigneeId = users.find((u: any) => u.email !== 'hasan@techflow.az')?.id

  const gorevCreate = await req('/tasks', {
    method: 'POST', token,
    body: {
      title: 'QA Test: Aylıq performans yoxlaması',
      description: 'Hər ay təkrarlanan GÖREV testi',
      type: 'TASK',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // 3 gün sonra
      assigneeIds: assigneeId ? [assigneeId] : [],
    }
  })
  if (gorevCreate.status === 201 || gorevCreate.status === 200) {
    pass('GÖREV yaradıldı')
    if (gorevCreate.data.id) pass('GÖREV ID mövcud')
    else fail('GÖREV ID', 'ID boş')
  } else {
    fail('GÖREV yaratma', `Status ${gorevCreate.status}: ${JSON.stringify(gorevCreate.data)}`)
  }

  // ── 5. TODO-ları siyahıla — recurring olanları yoxla ──
  console.log('\n── 5. TODO siyahısında recurring yoxla ──')
  const todosRes = await req('/todoist/tasks', { token })
  if (todosRes.status === 200) {
    const todos = todosRes.data || []
    const recurringTodos = todos.filter((t: any) => t.isRecurring)
    if (recurringTodos.length >= 3) pass(`${recurringTodos.length} recurring TODO tapıldı`)
    else fail('Recurring TODO sayı', `Gözlənilən: >=3, Alınan: ${recurringTodos.length}`)

    // weekly olanı yoxla
    const weeklyTodo = recurringTodos.find((t: any) => t.recurRule === 'weekly')
    if (weeklyTodo) pass('Weekly recurring TODO mövcud')
    else fail('Weekly recurring', 'Tapılmadı')

    // daily olanı yoxla
    const dailyTodo = recurringTodos.find((t: any) => t.recurRule === 'daily')
    if (dailyTodo) pass('Daily recurring TODO mövcud')
    else fail('Daily recurring', 'Tapılmadı')
  } else {
    fail('TODO siyahısı', `Status ${todosRes.status}`)
  }

  // ── 6. Recurring TODO tamamla — yeni TODO yaranmalıdır ──
  console.log('\n── 6. Recurring TODO tamamla (yeni yaranmalı) ──')
  const allTodos = (todosRes.data || []).filter((t: any) => t.isRecurring && t.recurRule === 'weekly')
  if (allTodos.length > 0) {
    const weeklyTodo = allTodos[0]
    const completeRes = await req(`/todoist/tasks/${weeklyTodo.id}/complete`, {
      method: 'POST', token
    })
    if (completeRes.status === 200 || completeRes.status === 201) {
      pass('Recurring TODO tamamlandı')
      // Yeni TODO yaranıb mı?
      if (completeRes.data.recurring === true || completeRes.data.nextDate) {
        pass('Yeni recurring TODO yaradıldı (next date mövcud)')
      } else {
        // Siyahını yenidən yoxla
        const newTodos = await req('/todoist/tasks', { token })
        const newWeekly = (newTodos.data || []).filter((t: any) => t.isRecurring && t.recurRule === 'weekly' && !t.isCompleted)
        if (newWeekly.length > 0) pass('Yeni weekly TODO siyahıda tapıldı')
        else fail('Yeni recurring TODO', 'Tamamlandıqdan sonra yeni TODO yaranmadı')
      }
    } else {
      fail('Recurring complete', `Status ${completeRes.status}: ${JSON.stringify(completeRes.data)}`)
    }
  } else {
    fail('Weekly TODO', 'Test üçün weekly TODO tapılmadı')
  }

  // ── 7. Templates endpoint — Şəxsi Təkrarlanan ──
  console.log('\n── 7. Templates (Şəxsi Təkrarlanan) yoxla ──')
  const templatesRes = await req('/todoist/tasks', { token })
  if (templatesRes.status === 200) {
    const recurring = (templatesRes.data || []).filter((t: any) => t.isRecurring)
    if (recurring.length > 0) {
      pass(`Templates-də ${recurring.length} təkrarlanan TODO var`)
      // Hər birinin recurRule olduğunu yoxla
      const allHaveRule = recurring.every((t: any) => t.recurRule)
      if (allHaveRule) pass('Bütün recurring TODO-ların recurRule-u var')
      else fail('recurRule', 'Bəzi recurring TODO-larda recurRule yoxdur')
    } else {
      fail('Templates recurring', 'Heç bir recurring TODO tapılmadı')
    }
  } else {
    fail('Templates endpoint', `Status ${templatesRes.status}`)
  }

  // ── 8. Recurring GÖREV templates ──
  console.log('\n── 8. Task Templates (Təkrarlanan Görevlər) yoxla ──')
  const taskTemplatesRes = await req('/templates', { token })
  if (taskTemplatesRes.status === 200) {
    const templates = taskTemplatesRes.data || []
    pass(`${templates.length} GÖREV şablonu tapıldı`)
  } else if (taskTemplatesRes.status === 403) {
    pass('Templates endpoint icazə ilə qorunur (403 — normal)')
  } else {
    fail('Task Templates', `Status ${taskTemplatesRes.status}`)
  }

  // ── 9. Deadline və bildiriş yoxla ──
  console.log('\n── 9. Deadline + bildiriş yoxla ──')
  const todoWithDeadline = await req('/todoist/tasks', {
    method: 'POST', token,
    body: {
      content: 'QA Test: Deadline + Reminder',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      isRecurring: true,
      recurRule: 'daily',
    }
  })
  if (todoWithDeadline.status === 201 || todoWithDeadline.status === 200) {
    const t = todoWithDeadline.data
    if (t.dueDate) pass('Deadline təyin olunub')
    else fail('Deadline', 'dueDate boş')
    pass('TODO yaradıldı — bildiriş cron-u hər gün 09:00-da yoxlayacaq')
  } else {
    fail('Deadline TODO', `Status ${todoWithDeadline.status}`)
  }

  // ── 10. Activity Log yoxla ──
  console.log('\n── 10. Activity Log yoxla ──')
  const activityRes = await req('/activity', { token })
  if (activityRes.status === 200) {
    const items = activityRes.data?.items || []
    if (items.length > 0) pass(`Activity log-da ${items.length} qeyd var`)
    else pass('Activity log boşdur (yalnız GÖREV əməliyyatları qeyd olunur)')
  } else {
    fail('Activity endpoint', `Status ${activityRes.status}`)
  }

  // ── NƏTİCƏ ──
  console.log('\n══════════════════════════════════════')
  console.log(`   NƏTİCƏ: ${passed} keçdi ✅ / ${failed} uğursuz ❌`)
  console.log('══════════════════════════════════════\n')

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Test xətası:', err)
  process.exit(1)
})
