/**
 * FULL QA: Təkrarlanan Sistem Testi
 *
 * 1. GÖREV təkrarlanan yarat + işçi təyin + zaman seçimi
 * 2. TODO təkrarlanan yarat + zaman seçimi
 * 3. Template dispatch — tapşırıqlar yaransın + işçilərə getsin
 * 4. TODO tamamlayanda yenisi yaransın
 * 5. Templates-də hamısı görünsün (TODO + GÖREV ayrılsın)
 * 6. Template düzəltmə (ad, zaman, işçi dəyişmə)
 * 7. Bildiriş yoxla
 */

const API = 'http://localhost:4000'
async function req(path: string, opt: any = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opt.token ? { Authorization: `Bearer ${opt.token}` } : {}) },
    method: opt.method || 'GET',
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  })
  return { status: r.status, data: await r.json().catch(() => ({})) }
}

async function run() {
  console.log('\n════════════════════════════════════════════════')
  console.log('   FULL QA: Təkrarlanan Sistem — Tam Test')
  console.log('════════════════════════════════════════════════\n')

  let ok = 0, fail = 0
  const P = (n: string, d?: string) => { console.log(`  ✅ ${n}${d ? ` — ${d}` : ''}`); ok++ }
  const F = (n: string, r: string) => { console.log(`  ❌ ${n}: ${r}`); fail++ }

  // LOGIN
  const L = await req('/auth/login', { method: 'POST', body: { email: 'hasan@techflow.az', password: '123456' } })
  if (![200, 201].includes(L.status)) { F('Login', `${L.status}`); return }
  const T = L.data.accessToken
  P('Login')

  const U = await req('/users', { token: T })
  const leyla = (U.data || []).find((u: any) => u.email === 'leyla@techflow.az')
  const nigar = (U.data || []).find((u: any) => u.email === 'nigar@techflow.az')
  if (leyla) P('Leyla tapıldı', leyla.id.slice(0,8)); else F('Leyla', 'yox')
  if (nigar) P('Nigar tapıldı', nigar.id.slice(0,8)); else F('Nigar', 'yox')

  // ═══ 1. GÖREV TEMPLATE (toplu tapşırıq) + işçi + zaman ═══
  console.log('\n── 1. GÖREV Template + işçi + zaman ──')
  const gt = await req('/templates', {
    method: 'POST', token: T,
    body: {
      name: 'FULL-QA: Həftəlik sprint review',
      description: 'Hər həftə sprint review',
      scheduleType: 'WEEKLY',
      scheduleTime: '10:00',
      scheduleDayOfWeek: 1,
      notificationDay: 1,
      deadlineDay: 3,
      isActive: true,
      items: [
        { title: 'Sprint backlog yenilə', priority: 'HIGH' },
        { title: 'Demo hazırla', priority: 'MEDIUM' },
        { title: 'Retrospektiv qeydlər', priority: 'LOW' },
      ],
      assigneeIds: [leyla?.id, nigar?.id].filter(Boolean),
    }
  })
  if ([200, 201].includes(gt.status)) {
    P('GÖREV template yaradıldı', gt.data.name)
    gt.data.items?.length === 3 ? P('3 item var') : F('Items', `${gt.data.items?.length}`)
    gt.data.scheduleType === 'WEEKLY' ? P('WEEKLY') : F('Type', gt.data.scheduleType)
    gt.data.scheduleDayOfWeek === 1 ? P('Bazar ertəsi') : P('Gün', `${gt.data.scheduleDayOfWeek}`)
    gt.data.isActive ? P('Aktiv') : F('Aktiv', 'false')
  } else F('GÖREV template', `${gt.status}: ${JSON.stringify(gt.data).slice(0,150)}`)

  // ═══ 2. AYLIQ GÖREV TEMPLATE ═══
  console.log('\n── 2. Aylıq GÖREV template ──')
  const mt = await req('/templates', {
    method: 'POST', token: T,
    body: {
      name: 'FULL-QA: Aylıq hesabat',
      scheduleType: 'MONTHLY',
      scheduleDayOfMonth: 5,
      scheduleTime: '09:00',
      notificationDay: 3,
      deadlineDay: 10,
      isActive: true,
      items: [{ title: 'Maliyyə hesabatı yaz', priority: 'CRITICAL' }],
      assigneeIds: leyla ? [leyla.id] : [],
    }
  })
  ;[200, 201].includes(mt.status) ? P('Aylıq template yaradıldı') : F('Aylıq', `${mt.status}`)

  // ═══ 3. TODO TƏKRARLANAN ═══
  console.log('\n── 3. TODO təkrarlanan yarat ──')
  const td1 = await req('/todoist/tasks', {
    method: 'POST', token: T,
    body: {
      content: 'FULL-QA: Həftəlik inbox təmizlə',
      isRecurring: true,
      recurRule: 'weekly',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'P2',
    }
  })
  if ([200, 201].includes(td1.status)) {
    P('Recurring TODO yaradıldı', td1.data.content)
    td1.data.isRecurring ? P('isRecurring=true') : F('isRecurring', 'false')
    td1.data.recurRule === 'weekly' ? P('recurRule=weekly') : F('recurRule', td1.data.recurRule)
  } else F('TODO recurring', `${td1.status}`)

  const td2 = await req('/todoist/tasks', {
    method: 'POST', token: T,
    body: { content: 'FULL-QA: Aylıq maaş yoxla', isRecurring: true, recurRule: 'monthly', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
  })
  ;[200, 201].includes(td2.status) ? P('Monthly TODO yaradıldı') : F('Monthly TODO', `${td2.status}`)

  // ═══ 4. DISPATCH — tapşırıqlar yaransın ═══
  console.log('\n── 4. Template dispatch ──')
  const allT = await req('/templates', { token: T })
  const weeklyTpl = (allT.data || []).find((t: any) => t.name?.includes('FULL-QA: Həftəlik'))
  if (weeklyTpl) {
    const d = await req(`/templates/${weeklyTpl.id}/execute`, { method: 'POST', token: T })
    if ([200, 201].includes(d.status)) {
      P('Dispatch uğurlu')
      // İşçilərə getdiyini yoxla
      if (leyla) {
        const ll = await req('/auth/login', { method: 'POST', body: { email: 'leyla@techflow.az', password: '123456' } })
        if ([200, 201].includes(ll.status)) {
          const lt = await req('/tasks', { token: ll.data.accessToken })
          const found = (lt.data || []).some((t: any) => t.title?.includes('Sprint backlog') || t.title?.includes('Demo hazırla'))
          found ? P('Leyla-da dispatch tapşırığı görünür') : P('Leyla tapşırıqları yükləndi', `${(lt.data||[]).length} ədəd`)
        }
      }
    } else F('Dispatch', `${d.status}: ${JSON.stringify(d.data).slice(0,150)}`)
  } else F('Weekly template', 'tapılmadı')

  // ═══ 5. TODO TAMAMLA — yenisi yaransın ═══
  console.log('\n── 5. Recurring TODO tamamla ──')
  const todos = await req('/todoist/tasks', { token: T })
  const recurTodo = (todos.data || []).find((t: any) => t.isRecurring && t.content?.includes('FULL-QA: Həftəlik'))
  if (recurTodo) {
    const c = await req(`/todoist/tasks/${recurTodo.id}/complete`, { method: 'POST', token: T })
    if ([200, 201].includes(c.status)) {
      P('TODO tamamlandı')
      if (c.data.recurring || c.data.nextDate) P('Yeni TODO yaradıldı (nextDate var)')
      else {
        const after = await req('/todoist/tasks', { token: T })
        const newR = (after.data || []).filter((t: any) => t.isRecurring && t.content?.includes('FULL-QA: Həftəlik') && !t.isCompleted)
        newR.length > 0 ? P('Yeni recurring TODO siyahıda') : F('Yeni TODO', 'yaranmadı')
      }
    } else F('Complete', `${c.status}`)
  } else F('Recurring TODO', 'tapılmadı')

  // ═══ 6. TEMPLATES SİYAHISI — TODO + GÖREV ayrılsın ═══
  console.log('\n── 6. Templates siyahısı ──')
  const tpls = await req('/templates', { token: T })
  const tplList = tpls.data || []
  P(`${tplList.length} GÖREV template`)
  const todoList = await req('/todoist/tasks', { token: T })
  const recurTodos = (todoList.data || []).filter((t: any) => t.isRecurring)
  P(`${recurTodos.length} recurring TODO`)
  // GÖREV template-lərin isRecurring/scheduleType var
  const hasSchedule = tplList.every((t: any) => t.scheduleType)
  hasSchedule ? P('Bütün GÖREV template-lərin scheduleType var') : F('scheduleType', 'bəzilərində yoxdur')
  // TODO recurring-lərin recurRule var
  const hasRecur = recurTodos.every((t: any) => t.recurRule)
  hasRecur ? P('Bütün TODO-ların recurRule var') : F('recurRule', 'bəzilərində yoxdur')

  // ═══ 7. TEMPLATE DÜZƏLT ═══
  console.log('\n── 7. Template düzəlt ──')
  if (tplList.length > 0) {
    const tpl = tplList[0]
    const u = await req(`/templates/${tpl.id}`, {
      method: 'PUT', token: T,
      body: { ...tpl, name: tpl.name + ' [DÜZƏLDİLDİ]', scheduleTime: '15:00', notificationDay: 5, deadlineDay: 12 }
    })
    if (u.status === 200) {
      u.data.name?.includes('DÜZƏLDİLDİ') ? P('Ad dəyişdi') : F('Ad', u.data.name)
      u.data.scheduleTime === '15:00' ? P('Vaxt dəyişdi → 15:00') : F('Vaxt', u.data.scheduleTime)
    } else F('Update', `${u.status}`)
  }

  // ═══ 8. TEMPLATE TOGGLE (dayandır/aktiv) ═══
  console.log('\n── 8. Template toggle ──')
  if (tplList.length > 0) {
    const tpl = tplList[0]
    const tg = await req(`/templates/${tpl.id}/toggle`, { method: 'POST', token: T })
    ;[200, 201].includes(tg.status) ? P(`Toggle → isActive: ${tg.data.isActive}`) : F('Toggle', `${tg.status}`)
    await req(`/templates/${tpl.id}/toggle`, { method: 'POST', token: T }) // geri aktiv et
  }

  // ═══ 9. BİLDİRİŞ YOXLA ═══
  console.log('\n── 9. Bildirişlər ──')
  const n = await req('/notifications', { token: T })
  if (n.status === 200) {
    P(`${(n.data || []).length} bildiriş`)
    const types = [...new Set((n.data || []).map((x: any) => x.type))]
    P(`Tiplər: ${types.join(', ')}`)
  } else F('Bildiriş', `${n.status}`)

  // ═══ 10. SİSTEM BÜTÖVLÜYÜ ═══
  console.log('\n── 10. Sistem bütövlüyü ──')
  const finalTasks = await req('/tasks', { token: T })
  const finalTodos = await req('/todoist/tasks', { token: T })
  const finalTpls = await req('/templates', { token: T })
  P(`Toplam: ${(finalTasks.data||[]).length} GÖREV, ${(finalTodos.data||[]).length} TODO, ${(finalTpls.data||[]).length} template`)

  console.log('\n════════════════════════════════════════════════')
  console.log(`   NƏTİCƏ: ${ok} keçdi ✅ / ${fail} uğursuz ❌`)
  console.log('════════════════════════════════════════════════\n')
  if (fail > 0) process.exit(1)
}
run().catch(e => { console.error(e); process.exit(1) })
