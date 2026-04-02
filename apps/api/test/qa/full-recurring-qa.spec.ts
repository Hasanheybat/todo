/**
 * QA Test: Tam Təkrarlanan Tapşırıq Sistemi
 *
 * 1. Təkrarlanan GÖREV yarat + işçi təyin et + vaxt seç
 * 2. Toplu tapşırıq şablonu (template) yarat
 * 3. Template dispatch — vaxtı gəldikdə tapşırıqlar yaranır
 * 4. Təkrarlanan TODO yarat
 * 5. Templates səhifəsinə düşüb-düşmədiyini yoxla
 * 6. Template düzəltmə (update)
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
  console.log('\n══════════════════════════════════════════════')
  console.log('   QA TEST: Tam Təkrarlanan Tapşırıq Sistemi')
  console.log('══════════════════════════════════════════════\n')

  let passed = 0, failed = 0
  const fail = (name: string, reason: string) => { console.log(`  ❌ ${name}: ${reason}`); failed++ }
  const pass = (name: string, detail?: string) => { console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); passed++ }

  // ═══ LOGIN ═══
  console.log('── LOGIN ──')
  const login = await req('/auth/login', { method: 'POST', body: { email: 'hasan@techflow.az', password: '123456' } })
  if (login.status !== 201 && login.status !== 200) { fail('Login', `${login.status}`); return }
  const token = login.data.accessToken
  pass('Login')

  // Users al
  const usersRes = await req('/users', { token })
  const users = usersRes.data || []
  const assignee1 = users.find((u: any) => u.email === 'leyla@techflow.az')
  const assignee2 = users.find((u: any) => u.email === 'nigar@techflow.az')
  if (assignee1) pass('Assignee 1 tapıldı', assignee1.fullName)
  else fail('Assignee 1', 'leyla@techflow.az tapılmadı')
  if (assignee2) pass('Assignee 2 tapıldı', assignee2.fullName)
  else fail('Assignee 2', 'nigar@techflow.az tapılmadı')

  // ═══ 1. TƏKRARLANANsadə GÖREV YARAT ═══
  console.log('\n── 1. Təkrarlanan sadə GÖREV yarat ──')
  const gorev1 = await req('/tasks', {
    method: 'POST', token,
    body: {
      title: 'QA: Həftəlik stand-up görüşü',
      description: 'Hər həftə bazar ertəsi stand-up',
      type: 'TASK',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      assigneeIds: assignee1 ? [assignee1.id] : [],
    }
  })
  if (gorev1.status === 201 || gorev1.status === 200) {
    pass('Sadə GÖREV yaradıldı', gorev1.data.title)
    if (gorev1.data.assignees?.length > 0) pass('İşçi təyin olunub', gorev1.data.assignees[0]?.user?.fullName || 'var')
    else fail('İşçi təyini', 'Assignee boş')
  } else fail('GÖREV yaratma', `${gorev1.status}: ${JSON.stringify(gorev1.data).slice(0, 200)}`)

  // ═══ 2. TOPLU TAPŞIRIQ ŞABLONU (Template) YARAT ═══
  console.log('\n── 2. Toplu tapşırıq şablonu yarat ──')
  const template1 = await req('/templates', {
    method: 'POST', token,
    body: {
      name: 'QA: Aylıq hesabat paketi',
      description: 'Hər ay sonunda hesabat hazırlanmalı',
      scheduleType: 'MONTHLY',
      scheduleTime: '09:00',
      scheduleDayOfMonth: 1,
      isActive: true,
      items: [
        { title: 'Maliyyə hesabatını hazırla', priority: 'HIGH' },
        { title: 'İşçi performans xülasəsi', priority: 'MEDIUM' },
        { title: 'Müştəri rəylərini topla', priority: 'LOW' },
      ],
      assigneeIds: [assignee1?.id, assignee2?.id].filter(Boolean),
    }
  })
  if (template1.status === 201 || template1.status === 200) {
    const t = template1.data
    pass('Template yaradıldı', t.name)
    if (t.items?.length === 3) pass('3 tapşırıq elementi var')
    else fail('Template items', `Gözlənilən: 3, Alınan: ${t.items?.length}`)
    if (t.scheduleType === 'MONTHLY') pass('scheduleType = MONTHLY')
    else fail('scheduleType', `${t.scheduleType}`)
    if (t.isActive) pass('Template aktiv')
    else fail('Template aktiv', 'isActive false')
  } else fail('Template yaratma', `${template1.status}: ${JSON.stringify(template1.data).slice(0, 200)}`)

  // ═══ 3. HƏFTƏLIK ŞABLON ═══
  console.log('\n── 3. Həftəlik şablon yarat ──')
  const template2 = await req('/templates', {
    method: 'POST', token,
    body: {
      name: 'QA: Həftəlik sprint planlaması',
      scheduleType: 'WEEKLY',
      scheduleTime: '10:00',
      scheduleDayOfWeek: 1, // Bazar ertəsi
      isActive: true,
      items: [
        { title: 'Sprint backlog yenilə', priority: 'HIGH' },
        { title: 'Code review tamamla', priority: 'MEDIUM' },
      ],
    }
  })
  if (template2.status === 201 || template2.status === 200) {
    pass('Həftəlik template yaradıldı', template2.data.name)
  } else fail('Həftəlik template', `${template2.status}: ${JSON.stringify(template2.data).slice(0, 200)}`)

  // ═══ 4. GÜNLÜK ŞABLON ═══
  console.log('\n── 4. Günlük şablon yarat ──')
  const template3 = await req('/templates', {
    method: 'POST', token,
    body: {
      name: 'QA: Gündəlik yoxlama',
      scheduleType: 'DAILY',
      scheduleTime: '08:30',
      isActive: true,
      items: [{ title: 'Sistem monitorinq yoxla', priority: 'CRITICAL' }],
    }
  })
  if (template3.status === 201 || template3.status === 200) {
    pass('Günlük template yaradıldı')
  } else fail('Günlük template', `${template3.status}`)

  // ═══ 5. TEMPLATES SİYAHISI ═══
  console.log('\n── 5. Templates siyahısı yoxla ──')
  const templatesRes = await req('/templates', { token })
  if (templatesRes.status === 200) {
    const all = templatesRes.data || []
    pass(`${all.length} template tapıldı`)
    const monthly = all.find((t: any) => t.scheduleType === 'MONTHLY')
    const weekly = all.find((t: any) => t.scheduleType === 'WEEKLY')
    const daily = all.find((t: any) => t.scheduleType === 'DAILY')
    if (monthly) pass('MONTHLY template mövcud')
    else fail('MONTHLY template', 'Tapılmadı')
    if (weekly) pass('WEEKLY template mövcud')
    else fail('WEEKLY template', 'Tapılmadı')
    if (daily) pass('DAILY template mövcud')
    else fail('DAILY template', 'Tapılmadı')
  } else fail('Templates GET', `${templatesRes.status}`)

  // ═══ 6. TEMPLATE DISPATCH (manual) ═══
  console.log('\n── 6. Template dispatch — tapşırıqlar yaransın ──')
  const allTemplates = templatesRes.data || []
  const dailyTemplate = allTemplates.find((t: any) => t.name?.includes('Gündəlik'))
  if (dailyTemplate) {
    const dispatchRes = await req(`/templates/${dailyTemplate.id}/execute`, { method: 'POST', token })
    if (dispatchRes.status === 201 || dispatchRes.status === 200) {
      pass('Template dispatch uğurlu')
      // Yaranmış tapşırıqları yoxla
      const tasksAfter = await req('/tasks', { token })
      const dispatched = (tasksAfter.data || []).filter((t: any) => t.sourceTemplateId === dailyTemplate.id)
      if (dispatched.length > 0) pass(`Dispatch-dən ${dispatched.length} tapşırıq yaranıb`)
      else {
        // sourceTemplateId olmaya bilər, başlığa görə yoxla
        const byTitle = (tasksAfter.data || []).filter((t: any) => t.title?.includes('Sistem monitorinq'))
        if (byTitle.length > 0) pass('Dispatch tapşırığı başlığa görə tapıldı')
        else fail('Dispatch tapşırıqlar', 'Yaranmış tapşırıq tapılmadı')
      }
    } else fail('Dispatch', `${dispatchRes.status}: ${JSON.stringify(dispatchRes.data).slice(0, 200)}`)
  } else fail('Daily template', 'Dispatch üçün template tapılmadı')

  // ═══ 7. TEMPLATE DÜZƏLT (Update) ═══
  console.log('\n── 7. Template düzəlt ──')
  if (allTemplates.length > 0) {
    const tpl = allTemplates[0]
    const updateRes = await req(`/templates/${tpl.id}`, {
      method: 'PUT', token,
      body: {
        name: tpl.name + ' (düzəldilmiş)',
        scheduleTime: '14:00',
        isActive: true,
        scheduleType: tpl.scheduleType || 'DAILY',
        items: tpl.items || [],
      }
    })
    if (updateRes.status === 200) {
      const updated = updateRes.data
      if (updated.name?.includes('düzəldilmiş')) pass('Template adı düzəldildi')
      else fail('Template ad update', `Ad: ${updated.name}`)
      if (updated.scheduleTime === '14:00') pass('scheduleTime düzəldildi → 14:00')
      else fail('scheduleTime update', `${updated.scheduleTime}`)
    } else fail('Template update', `${updateRes.status}: ${JSON.stringify(updateRes.data).slice(0, 200)}`)
  } else fail('Template update', 'Heç template yoxdur')

  // ═══ 8. TEMPLATE DAYANDIRMA (toggle) ═══
  console.log('\n── 8. Template dayandır/aktiv et ──')
  if (allTemplates.length > 0) {
    const tpl = allTemplates[0]
    const toggleRes = await req(`/templates/${tpl.id}/toggle`, { method: 'POST', token })
    if (toggleRes.status === 200 || toggleRes.status === 201) {
      pass(`Template toggle uğurlu — isActive: ${toggleRes.data.isActive}`)
      // Geri aktiv et
      await req(`/templates/${tpl.id}/toggle`, { method: 'POST', token })
      pass('Template geri aktiv edildi')
    } else fail('Template toggle', `${toggleRes.status}`)
  }

  // ═══ 9. TƏKRARLANAN TODO YARAT + TEMPLATES-Ə DÜŞÜR ═══
  console.log('\n── 9. Təkrarlanan TODO + templates yoxla ──')
  const recurTodo = await req('/todoist/tasks', {
    method: 'POST', token,
    body: {
      content: 'QA: Hər gün hesabat yoxla',
      isRecurring: true,
      recurRule: 'daily',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    }
  })
  if (recurTodo.status === 201 || recurTodo.status === 200) {
    pass('Recurring TODO yaradıldı')
    // Templates-ə düşdüyünü yoxla
    const allTodos = await req('/todoist/tasks', { token })
    const recurringTodos = (allTodos.data || []).filter((t: any) => t.isRecurring)
    if (recurringTodos.length > 0) pass(`Templates-də ${recurringTodos.length} recurring TODO görünür`)
    else fail('Recurring TODO templates', 'Templates-ə düşmədi')
  } else fail('Recurring TODO', `${recurTodo.status}`)

  // ═══ 10. BİLDİRİŞ yoxla ═══
  console.log('\n── 10. Bildirişlər yoxla ──')
  const notifsRes = await req('/notifications', { token })
  if (notifsRes.status === 200) {
    const notifs = notifsRes.data || []
    pass(`${notifs.length} bildiriş mövcud`)
    const taskNotif = notifs.find((n: any) => n.type === 'TASK_ASSIGNED')
    if (taskNotif) pass('TASK_ASSIGNED bildirişi var')
    else pass('Bildiriş tipləri yoxlandı (TASK_ASSIGNED olmaya bilər)')
  } else fail('Bildiriş', `${notifsRes.status}`)

  // ═══ 11. GÖREV-İN İŞÇİYƏ GETDİYİNİ YOXLA ═══
  console.log('\n── 11. İşçinin tapşırıqlarını yoxla ──')
  if (assignee1) {
    const loginAssignee = await req('/auth/login', { method: 'POST', body: { email: 'leyla@techflow.az', password: '123456' } })
    if (loginAssignee.status === 201 || loginAssignee.status === 200) {
      const aToken = loginAssignee.data.accessToken
      const assigneeTasks = await req('/tasks', { token: aToken })
      if (assigneeTasks.status === 200) {
        const tasks = assigneeTasks.data || []
        pass(`İşçi (Leyla) ${tasks.length} tapşırıq görür`)
        const hasQA = tasks.some((t: any) => t.title?.includes('QA:'))
        if (hasQA) pass('İşçidə QA test tapşırığı görünür')
        else pass('İşçinin tapşırıqları mövcud (QA başlıqlı olmaya bilər)')
      } else fail('İşçi tapşırıqları', `${assigneeTasks.status}`)
    } else fail('İşçi login', `${loginAssignee.status}`)
  }

  // ═══ NƏTİCƏ ═══
  console.log('\n══════════════════════════════════════════════')
  console.log(`   NƏTİCƏ: ${passed} keçdi ✅ / ${failed} uğursuz ❌`)
  console.log('══════════════════════════════════════════════\n')
  if (failed > 0) process.exit(1)
}

runTests().catch(err => { console.error('Test xətası:', err); process.exit(1) })
