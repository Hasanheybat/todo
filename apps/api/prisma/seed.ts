import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Köhnə data silinir...')
  // Sıra ilə sil (foreign key-lərə görə)
  await prisma.comment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.salaryPayment.deleteMany()
  await prisma.salary.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.financeCategory.deleteMany()
  await prisma.templateAssignee.deleteMany()
  await prisma.templateItem.deleteMany()
  await prisma.taskTemplate.deleteMany()
  await prisma.taskAssigneeFile.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.taskAssignee.deleteMany()
  await prisma.task.deleteMany()
  await prisma.todo.deleteMany()
  // Todoist modulu
  await prisma.todoistTaskLabel.deleteMany().catch(() => {})
  await prisma.todoistComment.deleteMany().catch(() => {})
  await prisma.todoistActivity.deleteMany().catch(() => {})
  await prisma.todoistFilter.deleteMany().catch(() => {})
  await prisma.todoistTemplate.deleteMany().catch(() => {})
  await prisma.todoistLabel.deleteMany().catch(() => {})
  await prisma.todoistTask.deleteMany().catch(() => {})
  await prisma.todoistSection.deleteMany().catch(() => {})
  await prisma.todoistProject.deleteMany().catch(() => {})
  await prisma.businessDepartment.deleteMany()
  await prisma.department.deleteMany()
  await prisma.customRole.deleteMany()
  await prisma.userBusiness.deleteMany()
  await prisma.user.deleteMany()
  await prisma.business.deleteMany()
  await prisma.tenant.deleteMany()

  console.log('🏢 TechFlow MMC yaradılır...')
  const pw = await bcrypt.hash('123456', 10)

  // Tenant
  const tenant = await prisma.tenant.create({
    data: { name: 'TechFlow MMC', subdomain: 'techflow', plan: 'pro' },
  })

  // İşletmələr
  const baku = await prisma.business.create({ data: { name: 'Bakı Filialı', tenantId: tenant.id } })
  const ganja = await prisma.business.create({ data: { name: 'Gəncə Filialı', tenantId: tenant.id } })

  // ─── Şirkət Sahibi ───
  const hasan = await prisma.user.create({
    data: { email: 'hasan@techflow.az', password: pw, fullName: 'Həsən Əliyev', role: 'TENANT_ADMIN', tenantId: tenant.id, status: 'active' },
  })

  // ─── Bakı Filialı ───
  const leyla = await prisma.user.create({
    data: { email: 'leyla@techflow.az', password: pw, fullName: 'Leyla Hüseynova', role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id, status: 'active' },
  })
  const tural = await prisma.user.create({
    data: { email: 'tural@techflow.az', password: pw, fullName: 'Tural Qasımov', role: 'TEAM_MANAGER', parentId: leyla.id, tenantId: tenant.id, status: 'active' },
  })
  const bakuWorkers = await Promise.all([
    prisma.user.create({ data: { email: 'nigar@techflow.az', password: pw, fullName: 'Nigar Əhmədova', role: 'EMPLOYEE', parentId: tural.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'rashad@techflow.az', password: pw, fullName: 'Rəşad İsmayılov', role: 'EMPLOYEE', parentId: tural.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'elvin@techflow.az', password: pw, fullName: 'Elvin Həsənov', role: 'EMPLOYEE', parentId: tural.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'gunel@techflow.az', password: pw, fullName: 'Günel Əlizadə', role: 'EMPLOYEE', parentId: tural.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'orxan@techflow.az', password: pw, fullName: 'Orxan Babayev', role: 'EMPLOYEE', parentId: leyla.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'sebine@techflow.az', password: pw, fullName: 'Səbinə Quliyeva', role: 'EMPLOYEE', parentId: leyla.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'murad@techflow.az', password: pw, fullName: 'Murad Əsgərov', role: 'EMPLOYEE', parentId: leyla.id, tenantId: tenant.id, status: 'active' } }),
  ])

  // Bakı işçilərini business-ə bağla (departmentId və customRoleId sonra təyin ediləcək)
  const bakuAll = [leyla, tural, ...bakuWorkers]

  // ─── Gəncə Filialı ───
  const aynur = await prisma.user.create({
    data: { email: 'aynur@techflow.az', password: pw, fullName: 'Aynur Nəsirova', role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id, status: 'active' },
  })
  const kamran = await prisma.user.create({
    data: { email: 'kamran@techflow.az', password: pw, fullName: 'Kamran Həsənli', role: 'TEAM_MANAGER', parentId: aynur.id, tenantId: tenant.id, status: 'active' },
  })
  const ganjaWorkers = await Promise.all([
    prisma.user.create({ data: { email: 'zaur@techflow.az', password: pw, fullName: 'Zaur Məmmədli', role: 'EMPLOYEE', parentId: kamran.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'nermin@techflow.az', password: pw, fullName: 'Nərmin Cavadova', role: 'EMPLOYEE', parentId: kamran.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'ekber@techflow.az', password: pw, fullName: 'Əkbər Hüseynli', role: 'EMPLOYEE', parentId: kamran.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'ulviyye@techflow.az', password: pw, fullName: 'Ülviyyə Kərimova', role: 'EMPLOYEE', parentId: kamran.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'rauf@techflow.az', password: pw, fullName: 'Rauf Əliyev', role: 'EMPLOYEE', parentId: aynur.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'lamiye@techflow.az', password: pw, fullName: 'Lamiyə Həsənova', role: 'EMPLOYEE', parentId: aynur.id, tenantId: tenant.id, status: 'active' } }),
    prisma.user.create({ data: { email: 'togrul@techflow.az', password: pw, fullName: 'Toğrul Nağıyev', role: 'EMPLOYEE', parentId: aynur.id, tenantId: tenant.id, status: 'active' } }),
  ])

  const ganjaAll = [aynur, kamran, ...ganjaWorkers]

  // ─── Default Rollar ───
  console.log('🛡️ Default rollar yaradılır...')
  const allPerms = [
    'tasks.read', 'tasks.create', 'gorev.create', 'gorev.approve', 'tasks.assign_upward',
    'users.read', 'users.manage',
    'finance.manage',
    'salary.manage',
  ]
  const ownerRole = await prisma.customRole.create({
    data: { name: 'Şirkət Sahibi', description: 'Tam yetki — bütün modullar', permissions: allPerms, isDefault: true, tenantId: tenant.id },
  })
  const managerRole = await prisma.customRole.create({
    data: {
      name: 'Müdir', description: 'Tapşırıq, istifadəçi, hesabat idarəetməsi', isDefault: true, tenantId: tenant.id,
      permissions: [
        'tasks.read', 'tasks.create', 'gorev.create', 'gorev.approve', 'tasks.assign_upward',
        'users.read',
      ],
    },
  })
  const employeeRole = await prisma.customRole.create({
    data: { name: 'İşçi', description: 'Tapşırıq oxuma/yaratma, bildirişlər', isDefault: true, tenantId: tenant.id, permissions: ['tasks.read'] },
  })

  // Rollları istifadəçilərə ata
  // Həsən şirkət sahibidir — tam yetki (ownerRole)
  await prisma.user.update({ where: { id: hasan.id }, data: { customRoleId: ownerRole.id } })
  await prisma.user.update({ where: { id: leyla.id }, data: { customRoleId: managerRole.id } })
  await prisma.user.update({ where: { id: aynur.id }, data: { customRoleId: managerRole.id } })
  await prisma.user.update({ where: { id: tural.id }, data: { customRoleId: managerRole.id } })
  await prisma.user.update({ where: { id: kamran.id }, data: { customRoleId: managerRole.id } })
  for (const w of [...bakuWorkers, ...ganjaWorkers]) {
    await prisma.user.update({ where: { id: w.id }, data: { customRoleId: employeeRole.id } })
  }

  // ─── Admin İstifadəçi (şirkət admini) ───
  const admin = await prisma.user.create({
    data: { email: 'admin@techflow.az', password: pw, fullName: 'Admin Nəzərli', role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id, status: 'active', isSystemAdmin: true, customRoleId: ownerRole.id },
  })

  // ─── Şöbələr ───
  console.log('🏬 Şöbələr yaradılır...')
  const [deptIT, deptSatis, deptMarketinq, deptHR, deptMaliyye, deptMusteri] = await Promise.all([
    prisma.department.create({ data: { name: 'İT', color: '#246FE0', tenantId: tenant.id } }),
    prisma.department.create({ data: { name: 'Satış', color: '#058527', tenantId: tenant.id } }),
    prisma.department.create({ data: { name: 'Marketinq', color: '#9333EA', tenantId: tenant.id } }),
    prisma.department.create({ data: { name: 'HR', color: '#EB8909', tenantId: tenant.id } }),
    prisma.department.create({ data: { name: 'Maliyyə', color: '#DC4C3E', tenantId: tenant.id } }),
    prisma.department.create({ data: { name: 'Müştəri Xidmətləri', color: '#14B8A6', tenantId: tenant.id } }),
  ])
  const departments = [deptIT, deptSatis, deptMarketinq, deptHR, deptMaliyye, deptMusteri]

  // ─── Filial-Şöbə əlaqələri (BusinessDepartment) ───
  console.log('🔗 Filial-Şöbə əlaqələri yaradılır...')
  // Bakı: bütün 6 şöbə
  for (const dept of departments) {
    await prisma.businessDepartment.create({ data: { businessId: baku.id, departmentId: dept.id } })
  }
  // Gəncə: 4 şöbə (İT, Satış, HR, Müştəri Xidmətləri)
  for (const dept of [deptIT, deptSatis, deptHR, deptMusteri]) {
    await prisma.businessDepartment.create({ data: { businessId: ganja.id, departmentId: dept.id } })
  }

  // ─── UserBusiness (filial + şöbə + vəzifə + rol) ───
  console.log('👥 İstifadəçi-Filial əlaqələri yaradılır...')
  // Həsən — hər iki filial, şöbəsiz (şirkət sahibi)
  await prisma.userBusiness.create({ data: { userId: hasan.id, businessId: baku.id, customRoleId: ownerRole.id } })
  await prisma.userBusiness.create({ data: { userId: hasan.id, businessId: ganja.id, customRoleId: ownerRole.id } })
  // Admin — hər iki filial
  await prisma.userBusiness.create({ data: { userId: admin.id, businessId: baku.id, customRoleId: ownerRole.id } })
  await prisma.userBusiness.create({ data: { userId: admin.id, businessId: ganja.id, customRoleId: ownerRole.id } })
  // Bakı
  await prisma.userBusiness.create({ data: { userId: leyla.id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'Filial Müdürü', customRoleId: managerRole.id } })
  await prisma.userBusiness.create({ data: { userId: tural.id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'Komanda Lideri', customRoleId: managerRole.id } })
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[0].id, businessId: baku.id, departmentId: deptSatis.id, positionTitle: 'Satış Meneceri', customRoleId: employeeRole.id } })      // Nigar
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[1].id, businessId: baku.id, departmentId: deptMarketinq.id, positionTitle: 'Marketoloq', customRoleId: employeeRole.id } })      // Rəşad
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[2].id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'Backend Developer', customRoleId: employeeRole.id } })       // Elvin
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[3].id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'Frontend Developer', customRoleId: employeeRole.id } })      // Günel
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[4].id, businessId: baku.id, departmentId: deptHR.id, positionTitle: 'HR Mütəxəssis', customRoleId: employeeRole.id } })           // Orxan
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[5].id, businessId: baku.id, departmentId: deptMaliyye.id, positionTitle: 'Mühasib', customRoleId: employeeRole.id } })             // Səbinə
  await prisma.userBusiness.create({ data: { userId: bakuWorkers[6].id, businessId: baku.id, departmentId: deptMusteri.id, positionTitle: 'Dəstək Mütəxəssis', customRoleId: employeeRole.id } })  // Murad
  // Gəncə
  await prisma.userBusiness.create({ data: { userId: aynur.id, businessId: ganja.id, departmentId: deptIT.id, positionTitle: 'Filial Müdürü', customRoleId: managerRole.id } })
  await prisma.userBusiness.create({ data: { userId: kamran.id, businessId: ganja.id, departmentId: deptSatis.id, positionTitle: 'Komanda Lideri', customRoleId: managerRole.id } })
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[0].id, businessId: ganja.id, departmentId: deptIT.id, positionTitle: 'Sistem Administratoru', customRoleId: employeeRole.id } })   // Zaur
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[1].id, businessId: ganja.id, departmentId: deptSatis.id, positionTitle: 'Satış Nümayəndəsi', customRoleId: employeeRole.id } })    // Nərmin
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[2].id, businessId: ganja.id, departmentId: deptIT.id, positionTitle: 'IT Dəstək', customRoleId: employeeRole.id } })                // Əkbər
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[3].id, businessId: ganja.id, departmentId: deptHR.id, positionTitle: 'HR Əməkdaş', customRoleId: employeeRole.id } })               // Ülviyyə
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[4].id, businessId: ganja.id, departmentId: deptMusteri.id, positionTitle: 'Müştəri Təmsilçisi', customRoleId: employeeRole.id } })  // Rauf
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[5].id, businessId: ganja.id, departmentId: deptSatis.id, positionTitle: 'Satış Meneceri', customRoleId: employeeRole.id } })        // Lamiyə
  await prisma.userBusiness.create({ data: { userId: ganjaWorkers[6].id, businessId: ganja.id, departmentId: deptMusteri.id, positionTitle: 'Dəstək Mütəxəssis', customRoleId: employeeRole.id } })  // Toğrul

  console.log('📋 Tapşırıqlar yaradılır...')
  // Bakı tapşırıqları
  const tasks = [
    { title: 'Aylıq satış hesabatı hazırla', desc: 'Mart ayının satış rəqəmlərini analiz et və müdiriyyətə təqdim et', priority: 'HIGH', status: 'IN_PROGRESS', assignees: [bakuWorkers[0].id], business: baku.id, creator: leyla.id, due: '2026-03-25' },
    { title: 'Server təhlükəsizlik auditi', desc: 'Penetrasiya testi keçir, log analizi et', priority: 'CRITICAL', status: 'PENDING_APPROVAL', assignees: [bakuWorkers[2].id], business: baku.id, creator: tural.id, due: '2026-03-20' },
    { title: 'Müştəri məmnuniyyət sorğusu', desc: 'Online sorğu hazırla və müştərilərə göndər', priority: 'MEDIUM', status: 'CREATED', assignees: [bakuWorkers[1].id, bakuWorkers[5].id], business: baku.id, creator: leyla.id, due: '2026-03-28' },
    { title: 'İşçi təlim proqramı', desc: 'Yeni işçilər üçün onboarding materialları hazırla', priority: 'MEDIUM', status: 'IN_PROGRESS', assignees: [tural.id], business: baku.id, creator: leyla.id, due: '2026-03-30' },
    { title: 'Ofis avadanlıq inventarı', desc: 'Bütün avadanlıqların siyahısını yenilə', priority: 'LOW', status: 'COMPLETED', assignees: [bakuWorkers[4].id], business: baku.id, creator: tural.id, due: '2026-03-18' },
    // Gəncə tapşırıqları
    { title: 'Yeni müştəri bazası yaratma', desc: 'CRM sistemini Gəncə filialı üçün konfiqurasiya et', priority: 'HIGH', status: 'IN_PROGRESS', assignees: [ganjaWorkers[0].id, ganjaWorkers[1].id], business: ganja.id, creator: aynur.id, due: '2026-03-26' },
    { title: 'Gəncə filialı açılış tədbiri', desc: 'Marketing materialları və dəvətnamələr hazırla', priority: 'CRITICAL', status: 'CREATED', assignees: [ganjaWorkers[4].id, ganjaWorkers[5].id], business: ganja.id, creator: aynur.id, due: '2026-04-01' },
    { title: 'Lokal partnyor müqavilələri', desc: 'Gəncə regionunda partnyor şirkətlərlə müqavilə bağla', priority: 'HIGH', status: 'PENDING_APPROVAL', assignees: [kamran.id], business: ganja.id, creator: aynur.id, due: '2026-03-22' },
  ]

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title, description: t.desc, priority: t.priority as any, status: t.status as any,
        dueDate: new Date(t.due), businessId: t.business, creatorId: t.creator, tenantId: tenant.id,
        assignees: { create: t.assignees.map(id => ({ userId: id })) },
      },
    })
  }

  console.log('✅ Todo-lar yaradılır...')
  const todos = [
    { title: 'Həftəlik komanda görüşünü planla', priority: 'HIGH', status: 'PENDING', user: hasan.id, vis: 'TEAM', biz: baku.id },
    { title: 'Maliyyə hesabatını yoxla', priority: 'CRITICAL', status: 'IN_PROGRESS', user: hasan.id, vis: 'PRIVATE', biz: null },
    { title: 'İşçi performans qiymətləndirməsi', priority: 'MEDIUM', status: 'PENDING', user: leyla.id, vis: 'BUSINESS', biz: baku.id },
    { title: 'Server monitorinq yoxla', priority: 'MEDIUM', status: 'COMPLETED', user: tural.id, vis: 'PRIVATE', biz: null },
    { title: 'Müqavilə şərtlərini yenilə', priority: 'HIGH', status: 'PENDING_APPROVAL', user: hasan.id, vis: 'PRIVATE', biz: null },
    { title: 'Gəncə filialı büdcəsini hazırla', priority: 'HIGH', status: 'PENDING', user: aynur.id, vis: 'BUSINESS', biz: ganja.id },
  ]

  for (const t of todos) {
    await prisma.todo.create({
      data: {
        title: t.title, priority: t.priority as any, status: t.status as any,
        visibility: t.vis as any, userId: t.user, tenantId: tenant.id,
        businessId: t.biz,
      },
    })
  }

  console.log('💰 Maliyyə kateqoriyaları...')
  const catSatis = await prisma.financeCategory.create({ data: { name: 'Satış', color: '#058527', tenantId: tenant.id } })
  const catXidmet = await prisma.financeCategory.create({ data: { name: 'Xidmət', color: '#246FE0', tenantId: tenant.id } })
  const catMaas = await prisma.financeCategory.create({ data: { name: 'Maaş', color: '#DC4C3E', tenantId: tenant.id } })
  const catOfis = await prisma.financeCategory.create({ data: { name: 'Ofis xərcləri', color: '#EB8909', tenantId: tenant.id } })
  const catReklam = await prisma.financeCategory.create({ data: { name: 'Reklam', color: '#9333EA', tenantId: tenant.id } })

  console.log('💵 Maliyyə əməliyyatları...')
  const txs = [
    { amount: 15000, type: 'CREDIT', desc: 'Mart ayı satışları', date: '2026-03-15', cat: catSatis.id, biz: baku.id },
    { amount: 8000, type: 'CREDIT', desc: 'Konsaltinq xidməti', date: '2026-03-10', cat: catXidmet.id, biz: baku.id },
    { amount: 5000, type: 'CREDIT', desc: 'Gəncə region satışları', date: '2026-03-12', cat: catSatis.id, biz: ganja.id },
    { amount: 12000, type: 'DEBIT', desc: 'Mart maaşları — Bakı', date: '2026-03-01', cat: catMaas.id, biz: baku.id },
    { amount: 8000, type: 'DEBIT', desc: 'Mart maaşları — Gəncə', date: '2026-03-01', cat: catMaas.id, biz: ganja.id },
    { amount: 2500, type: 'DEBIT', desc: 'Ofis icarəsi', date: '2026-03-01', cat: catOfis.id, biz: baku.id },
    { amount: 3000, type: 'DEBIT', desc: 'Google Ads kampaniyası', date: '2026-03-05', cat: catReklam.id, biz: null },
    { amount: 1200, type: 'DEBIT', desc: 'Ofis avadanlığı', date: '2026-03-08', cat: catOfis.id, biz: ganja.id },
  ]

  for (const t of txs) {
    await prisma.transaction.create({
      data: { amount: t.amount, type: t.type as any, description: t.desc, date: new Date(t.date), categoryId: t.cat, businessId: t.biz, createdBy: hasan.id, tenantId: tenant.id },
    })
  }

  console.log('💳 Maaşlar təyin edilir...')
  const salaryData = [
    { user: leyla.id, amount: 2500 }, { user: tural.id, amount: 2000 },
    { user: bakuWorkers[0].id, amount: 1500 }, { user: bakuWorkers[1].id, amount: 1500 },
    { user: bakuWorkers[2].id, amount: 1400 }, { user: bakuWorkers[3].id, amount: 1400 },
    { user: bakuWorkers[4].id, amount: 1300 }, { user: bakuWorkers[5].id, amount: 1300 },
    { user: bakuWorkers[6].id, amount: 1200 },
    { user: aynur.id, amount: 2500 }, { user: kamran.id, amount: 2000 },
    { user: ganjaWorkers[0].id, amount: 1400 }, { user: ganjaWorkers[1].id, amount: 1400 },
    { user: ganjaWorkers[2].id, amount: 1300 }, { user: ganjaWorkers[3].id, amount: 1300 },
    { user: ganjaWorkers[4].id, amount: 1200 }, { user: ganjaWorkers[5].id, amount: 1200 },
    { user: ganjaWorkers[6].id, amount: 1200 },
  ]

  for (const s of salaryData) {
    const salary = await prisma.salary.create({ data: { userId: s.user, amount: s.amount, tenantId: tenant.id } })
    // İlk 10 nəfərə mart ödəməsi et
    if (salaryData.indexOf(s) < 10) {
      await prisma.salaryPayment.create({
        data: { salaryId: salary.id, amount: s.amount, bonus: 0, month: 3, year: 2026, method: 'bank', paidBy: hasan.id, tenantId: tenant.id },
      })
    }
  }

  console.log('🔔 Bildirişlər yaradılır...')
  const notifs = [
    { type: 'TASK_COMPLETED', title: 'Tapşırıq tamamlandı', message: '"Ofis avadanlıq inventarı" tamamlanıb', userId: leyla.id, senderId: bakuWorkers[4].id },
    { type: 'TASK_ASSIGNED', title: 'Yeni tapşırıq', message: 'Sizə "Müştəri sorğusu" tapşırığı atandı', userId: bakuWorkers[1].id, senderId: leyla.id },
    { type: 'SALARY_PAID', title: 'Maaş ödənildi', message: '1500 ₼ maaşınız ödənildi', userId: bakuWorkers[0].id, senderId: hasan.id },
    { type: 'TASK_ASSIGNED', title: 'Yeni tapşırıq', message: '"Server auditi" tapşırığı atandı', userId: bakuWorkers[2].id, senderId: tural.id },
    { type: 'COMMENT_ADDED', title: 'Yeni şərh', message: 'Tural "İşçi təlimi" tapşırığına şərh yazdı', userId: leyla.id, senderId: tural.id },
  ]

  for (const n of notifs) {
    await prisma.notification.create({
      data: { type: n.type as any, title: n.title, message: n.message, userId: n.userId, senderId: n.senderId, tenantId: tenant.id, link: '/tasks' },
    })
  }

  // Həsənə bildirişlər
  await prisma.notification.create({ data: { type: 'TASK_COMPLETED' as any, title: 'Tapşırıq tamamlandı', message: '"Server auditi" tamamlanıb, onayınız gözlənilir', userId: hasan.id, senderId: bakuWorkers[2].id, tenantId: tenant.id, link: '/tasks' } })
  await prisma.notification.create({ data: { type: 'TASK_COMPLETED' as any, title: 'Tapşırıq onay gözləyir', message: '"Lokal partnyor müqavilələri" onayınızı gözləyir', userId: hasan.id, senderId: kamran.id, tenantId: tenant.id, link: '/tasks' } })

  // ─── Təkrarlanan Görev Şablonları ───
  console.log('🔁 Təkrarlanan görev şablonları yaradılır...')

  // Bakı Satış şöbəsinin BusinessDepartment id-sini tap
  const bakuSatisDept = await prisma.businessDepartment.findFirst({
    where: { businessId: baku.id, departmentId: deptSatis.id }
  })
  const ganjaSatisDept = await prisma.businessDepartment.findFirst({
    where: { businessId: ganja.id, departmentId: deptSatis.id }
  })

  // Şablon 1: Aylıq Satış Hesabatı (Bakı, aylıq, aktiv)
  await prisma.taskTemplate.create({
    data: {
      name: 'Aylıq Satış Hesabatı',
      description: 'Hər ay satış rəqəmlərini toplayıb hesabat şablonunu doldurun',
      isRecurring: true,
      isActive: true,
      scheduleType: 'MONTHLY',
      scheduleTime: '09:00',
      dayOfMonth: 10,
      notificationDay: 13,
      deadlineDay: 15,
      nextRunAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10, 9, 0),
      lastRunAt: new Date(new Date().getFullYear(), new Date().getMonth(), 10, 9, 0),
      creatorId: leyla.id,
      tenantId: tenant.id,
      businessId: baku.id,
      departmentId: bakuSatisDept?.id,
      items: {
        create: [
          { title: 'Satış məlumatlarını CRM-dən yüklə', priority: 'HIGH', sortOrder: 0 },
          { title: 'Excel şablonunu doldur', priority: 'MEDIUM', sortOrder: 1 },
          { title: 'Müdürə e-poçt ilə göndər', priority: 'MEDIUM', sortOrder: 2 },
        ]
      },
      assignees: {
        create: [
          { userId: bakuWorkers[0].id },  // Nigar
          { userId: bakuWorkers[1].id },  // Rəşad
          { userId: bakuWorkers[2].id },  // Elvin
        ]
      },
    }
  })

  // Şablon 2: Həftəlik Görüş Notu (Bakı, həftəlik, aktiv)
  await prisma.taskTemplate.create({
    data: {
      name: 'Həftəlik Görüş Notu',
      description: 'Hər həftə komanda görüşünün qeydlərini hazırlayın',
      isRecurring: true,
      isActive: true,
      scheduleType: 'WEEKLY',
      scheduleTime: '09:00',
      dayOfWeek: 1, // Bazar ertəsi
      notificationDay: null,
      deadlineDay: null,
      nextRunAt: (() => { const d = new Date(); d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7)); d.setHours(9,0,0,0); return d })(),
      creatorId: leyla.id,
      tenantId: tenant.id,
      businessId: baku.id,
      items: {
        create: [
          { title: 'Keçən həftənin nəticələrini yazın', priority: 'MEDIUM', sortOrder: 0 },
          { title: 'Bu həftənin hədəflərini müəyyən edin', priority: 'HIGH', sortOrder: 1 },
        ]
      },
      assignees: {
        create: [
          { userId: bakuWorkers[0].id },  // Nigar
          { userId: bakuWorkers[1].id },  // Rəşad
        ]
      },
    }
  })

  // Şablon 3: Aylıq Stok Sayımı (Gəncə, aylıq, dayandırılmış)
  await prisma.taskTemplate.create({
    data: {
      name: 'Aylıq Stok Sayımı',
      description: 'Hər ayın əvvəlində anbar stokunu sayın və hesabat verin',
      isRecurring: true,
      isActive: false, // Dayandırılmış
      scheduleType: 'MONTHLY',
      scheduleTime: '09:00',
      dayOfMonth: 1,
      notificationDay: 3,
      deadlineDay: 5,
      creatorId: aynur.id,
      tenantId: tenant.id,
      businessId: ganja.id,
      departmentId: ganjaSatisDept?.id,
      items: {
        create: [
          { title: 'Anbar stokunu say', priority: 'HIGH', sortOrder: 0 },
          { title: 'Stok cədvəlini yenilə', priority: 'MEDIUM', sortOrder: 1 },
          { title: 'Fərqləri hesabatda qeyd et', priority: 'MEDIUM', sortOrder: 2 },
          { title: 'Müdürə təhvil ver', priority: 'LOW', sortOrder: 3 },
        ]
      },
      assignees: {
        create: [
          { userId: ganjaWorkers[0].id },  // Zaur
          { userId: ganjaWorkers[1].id },  // Nərmin
          { userId: ganjaWorkers[2].id },  // Əkbər
          { userId: ganjaWorkers[5].id },  // Lamiyə
        ]
      },
    }
  })

  console.log('✅ 3 təkrarlanan görev şablonu yaradıldı')

  // ═══════════════════════════════════════════════════════════
  // BÖYÜK DEMO DATA — Qarışıq Senaryolar
  // ═══════════════════════════════════════════════════════════

  console.log('📊 Böyük demo data yaradılır...')

  // ─── Əlavə GÖREV-lər (toplu, alt görevli, qarışıq statuslu) ───
  console.log('📋 Kapsamlı tapşırıqlar yaradılır...')

  // Toplu görev — Müştəri CRM miqrasiyası (5 alt görev, 3 işçi)
  const crmTask = await prisma.task.create({
    data: {
      title: 'Müştəri CRM Miqrasiyası — Q1 2026',
      description: 'Köhnə Excel bazasından yeni CRM sisteminə bütün müştəri datalarının miqrasiyası. 2500+ müştəri, 15000+ əlaqə nöqtəsi. Mərhələli keçid planı tətbiq ediləcək.',
      priority: 'CRITICAL', status: 'IN_PROGRESS', type: 'GOREV',
      dueDate: new Date('2026-04-01'), businessId: baku.id, creatorId: leyla.id, tenantId: tenant.id,
      departmentId: deptIT.id,
      assignees: { create: [{ userId: bakuWorkers[2].id }, { userId: bakuWorkers[3].id }, { userId: bakuWorkers[0].id }] },
      subTasks: {
        create: [
          { title: 'Köhnə bazanı CSV-yə export et', priority: 'HIGH', status: 'COMPLETED', tenantId: tenant.id, creatorId: leyla.id },
          { title: 'Data təmizləmə və dublikat silmə', priority: 'HIGH', status: 'COMPLETED', tenantId: tenant.id, creatorId: leyla.id },
          { title: 'Test mühitinə import et', priority: 'MEDIUM', status: 'IN_PROGRESS', tenantId: tenant.id, creatorId: leyla.id },
          { title: 'Data validasiya və düzəliş', priority: 'MEDIUM', status: 'CREATED', tenantId: tenant.id, creatorId: leyla.id },
          { title: 'Canlı keçid və köhnə sistemi bağla', priority: 'CRITICAL', status: 'CREATED', tenantId: tenant.id, creatorId: leyla.id },
        ]
      }
    }
  })

  // Toplu görev — Yeni Veb Sayt Layihəsi (6 alt görev, 4 işçi)
  await prisma.task.create({
    data: {
      title: 'Korporativ Veb Sayt Yenilənməsi',
      description: 'Mövcud veb saytın tam yenidən dizayn və development-i. Next.js 15 + Tailwind CSS. SEO optimizasiya, çoxdilli dəstək (AZ/EN/RU), mobil uyğunluq.',
      priority: 'HIGH', status: 'IN_PROGRESS', type: 'GOREV',
      dueDate: new Date('2026-04-15'), businessId: baku.id, creatorId: tural.id, tenantId: tenant.id,
      departmentId: deptIT.id,
      assignees: { create: [{ userId: bakuWorkers[2].id }, { userId: bakuWorkers[3].id }, { userId: bakuWorkers[1].id }, { userId: bakuWorkers[6].id }] },
      subTasks: {
        create: [
          { title: 'UI/UX dizayn (Figma)', priority: 'HIGH', status: 'COMPLETED', tenantId: tenant.id, creatorId: tural.id },
          { title: 'Frontend development (Next.js)', priority: 'HIGH', status: 'IN_PROGRESS', tenantId: tenant.id, creatorId: tural.id },
          { title: 'Backend API-lar', priority: 'HIGH', status: 'IN_PROGRESS', tenantId: tenant.id, creatorId: tural.id },
          { title: 'Kontent hazırlanması (AZ/EN/RU)', priority: 'MEDIUM', status: 'CREATED', tenantId: tenant.id, creatorId: tural.id },
          { title: 'SEO optimizasiya', priority: 'MEDIUM', status: 'CREATED', tenantId: tenant.id, creatorId: tural.id },
          { title: 'Test və deploy', priority: 'HIGH', status: 'CREATED', tenantId: tenant.id, creatorId: tural.id },
        ]
      }
    }
  })

  // Gecikmiş tapşırıqlar
  await prisma.task.create({
    data: {
      title: 'ISO 9001 Sertifikasiya Sənədləri',
      description: 'Keyfiyyət idarəetmə sisteminin sənədləşdirilməsi. Audit üçün bütün prosedurlar yazılmalı.',
      priority: 'CRITICAL', status: 'IN_PROGRESS', type: 'GOREV',
      dueDate: new Date('2026-03-15'), businessId: baku.id, creatorId: leyla.id, tenantId: tenant.id,
      assignees: { create: [{ userId: bakuWorkers[4].id }, { userId: bakuWorkers[5].id }] },
    }
  })

  await prisma.task.create({
    data: {
      title: 'Aylıq Maliyyə Hesabatı — Fevral',
      description: 'Fevral ayının gəlir-xərc balansı, P&L, cashflow hesabatı',
      priority: 'HIGH', status: 'PENDING_APPROVAL', type: 'GOREV',
      dueDate: new Date('2026-03-10'), businessId: baku.id, creatorId: hasan.id, tenantId: tenant.id,
      assignees: { create: [{ userId: bakuWorkers[5].id, status: 'COMPLETED' }] },
    }
  })

  // Gəncə — böyük tapşırıq
  await prisma.task.create({
    data: {
      title: 'Gəncə Filialı Marketinq Strategiyası 2026',
      description: 'İllik marketinq planı: büdcə bölgüsü, kanal strategiyası, KPI-lar, kampaniya təqvimi. Hədəf: regional bazarda 25% pay artımı.',
      priority: 'HIGH', status: 'CREATED', type: 'GOREV',
      dueDate: new Date('2026-04-10'), businessId: ganja.id, creatorId: aynur.id, tenantId: tenant.id,
      assignees: { create: [{ userId: ganjaWorkers[1].id }, { userId: ganjaWorkers[5].id }, { userId: kamran.id }] },
      subTasks: {
        create: [
          { title: 'Bazar araşdırması və rəqib analizi', priority: 'HIGH', status: 'IN_PROGRESS', tenantId: tenant.id, creatorId: aynur.id },
          { title: 'SWOT analizi', priority: 'MEDIUM', status: 'CREATED', tenantId: tenant.id, creatorId: aynur.id },
          { title: 'Büdcə planlaması', priority: 'HIGH', status: 'CREATED', tenantId: tenant.id, creatorId: aynur.id },
          { title: 'Kampaniya təqvimi hazırla', priority: 'MEDIUM', status: 'CREATED', tenantId: tenant.id, creatorId: aynur.id },
        ]
      }
    }
  })

  // Rədd edilmiş tapşırıq
  await prisma.task.create({
    data: {
      title: 'Ofis mebel sifarişi — Premium',
      description: 'Yeni ofis üçün premium mebel sifarişi. Büdcə: 15,000 AZN',
      priority: 'LOW', status: 'REJECTED', type: 'GOREV',
      dueDate: new Date('2026-03-20'), businessId: ganja.id, creatorId: kamran.id, tenantId: tenant.id,
      assignees: { create: [{ userId: ganjaWorkers[3].id, status: 'DECLINED' }] },
    }
  })

  // Tamamlanmış tapşırıqlar
  for (const t of [
    { title: 'Ofis internet xəttini yenilə', desc: 'Fiber optik keçid — 100Mbps', biz: baku.id, cr: tural.id, a: bakuWorkers[2].id },
    { title: 'İşçi ID kartları hazırla', desc: 'Bütün işçilər üçün yeni dizaynda', biz: baku.id, cr: leyla.id, a: bakuWorkers[4].id },
    { title: 'Müştəri feedback formu yarat', desc: 'Google Forms ilə', biz: ganja.id, cr: aynur.id, a: ganjaWorkers[4].id },
    { title: 'Server backup sistemi qur', desc: 'Gündəlik avtomatik backup', biz: baku.id, cr: tural.id, a: bakuWorkers[2].id },
  ]) {
    await prisma.task.create({
      data: {
        title: t.title, description: t.desc, priority: 'MEDIUM', status: 'COMPLETED', type: 'GOREV',
        dueDate: new Date('2026-03-18'), businessId: t.biz, creatorId: t.cr, tenantId: tenant.id,
        assignees: { create: [{ userId: t.a, status: 'COMPLETED' }] },
      }
    })
  }

  // ─── Şərhlər ───
  console.log('💬 Şərhlər yaradılır...')
  const allTasks = await prisma.task.findMany({ where: { tenantId: tenant.id }, take: 5 })
  for (const task of allTasks) {
    await prisma.comment.create({
      data: { content: 'Bu tapşırıq üzərində işləyirəm, yarın yenilik verəcəm.', taskId: task.id, authorId: bakuWorkers[0].id, tenantId: tenant.id },
    })
    await prisma.comment.create({
      data: { content: 'Deadline yaxınlaşır, status yeniləyin zəhmət olmasa.', taskId: task.id, authorId: leyla.id, tenantId: tenant.id },
    })
  }

  // ─── Todoist Layihələr + Tapşırıqlar ───
  console.log('✅ Todoist layihələr yaradılır...')

  // Leyla üçün layihələr
  const projVebDizayn = await prisma.todoistProject.create({
    data: { name: 'Veb Dizayn', color: '#7C3AED', viewType: 'LIST', isFavorite: true, sortOrder: 0, userId: leyla.id, tenantId: tenant.id }
  })
  const projMobilApp = await prisma.todoistProject.create({
    data: { name: 'Mobil Tətbiq', color: '#059669', viewType: 'BOARD', isFavorite: true, sortOrder: 1, userId: leyla.id, tenantId: tenant.id }
  })
  const projMarketinq = await prisma.todoistProject.create({
    data: { name: 'Marketinq Planı', color: '#F97316', viewType: 'LIST', isFavorite: false, sortOrder: 2, userId: leyla.id, tenantId: tenant.id }
  })
  const projShexsi = await prisma.todoistProject.create({
    data: { name: 'Şəxsi', color: '#EC4899', viewType: 'LIST', isFavorite: false, sortOrder: 3, userId: leyla.id, tenantId: tenant.id }
  })
  const projInbox = await prisma.todoistProject.create({
    data: { name: 'Inbox', color: '#808080', viewType: 'LIST', isInbox: true, sortOrder: -1, userId: leyla.id, tenantId: tenant.id }
  })

  // Seksiyalar — Veb Dizayn
  const secDesign = await prisma.todoistSection.create({ data: { name: 'Dizayn', sortOrder: 0, projectId: projVebDizayn.id } })
  const secDev = await prisma.todoistSection.create({ data: { name: 'Development', sortOrder: 1, projectId: projVebDizayn.id } })
  const secTest = await prisma.todoistSection.create({ data: { name: 'Test & Deploy', sortOrder: 2, projectId: projVebDizayn.id } })

  // Seksiyalar — Mobil App (Board görünüşü üçün)
  const secBacklog = await prisma.todoistSection.create({ data: { name: 'Backlog', sortOrder: 0, projectId: projMobilApp.id } })
  const secInProg = await prisma.todoistSection.create({ data: { name: 'İşdə', sortOrder: 1, projectId: projMobilApp.id } })
  const secDone = await prisma.todoistSection.create({ data: { name: 'Tamamlandı', sortOrder: 2, projectId: projMobilApp.id } })

  // Labels
  const labelUrgent = await prisma.todoistLabel.create({ data: { name: 'təcili', color: '#DC4C3E', userId: leyla.id, tenantId: tenant.id } })
  const labelWork = await prisma.todoistLabel.create({ data: { name: 'iş', color: '#246FE0', userId: leyla.id, tenantId: tenant.id } })
  const labelMeeting = await prisma.todoistLabel.create({ data: { name: 'görüş', color: '#9333EA', userId: leyla.id, tenantId: tenant.id } })
  const labelDesign = await prisma.todoistLabel.create({ data: { name: 'dizayn', color: '#059669', userId: leyla.id, tenantId: tenant.id } })
  const labelBug = await prisma.todoistLabel.create({ data: { name: 'bug', color: '#EF4444', userId: leyla.id, tenantId: tenant.id } })

  // ─── Todoist Tapşırıqlar ───
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  // Inbox
  const inboxTasks = [
    { content: 'Dünənki görüş qeydlərini paylaş', desc: 'Zoom görüşünün qeydlərini komandaya forward et', priority: "P2" as any, due: today, labels: [labelWork.id, labelMeeting.id] },
    { content: 'Freelancer-ə dizayn brief göndər', desc: '', priority: "P3" as any, due: tomorrow, labels: [labelDesign.id] },
    { content: 'VPN hesabını yenilə', desc: '', priority: "P4" as any, due: null, labels: [] },
  ]
  for (const t of inboxTasks) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, description: t.desc, priority: t.priority, dueDate: t.due, sortOrder: inboxTasks.indexOf(t), projectId: projInbox.id, userId: leyla.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) {
      await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } })
    }
  }

  // Veb Dizayn — Dizayn seksiyası
  const designTasks = [
    { content: 'Ana səhifə wireframe', desc: 'Desktop + mobil versiya', priority: "P1" as any, due: yesterday, completed: true, labels: [labelDesign.id, labelUrgent.id] },
    { content: 'Rəng paleti və tipografiya sistemi', desc: 'Brand guidelines-a uyğun', priority: "P2" as any, due: today, labels: [labelDesign.id] },
    { content: 'Komponent kitabxanası (Storybook)', desc: 'Button, Input, Card, Modal, Table komponentləri', priority: "P2" as any, due: tomorrow, labels: [labelDesign.id, labelWork.id] },
    { content: 'Dark mode dizayn adaptasiyası', desc: '', priority: "P3" as any, due: nextWeek, labels: [labelDesign.id] },
  ]
  for (const t of designTasks) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, description: t.desc, priority: t.priority, dueDate: t.due, isCompleted: !!t.completed, sortOrder: designTasks.indexOf(t), projectId: projVebDizayn.id, sectionId: secDesign.id, userId: leyla.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) {
      await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } })
    }
    // Alt tapşırıqlar — Komponent kitabxanası
    if (t.content.includes('Komponent')) {
      for (const sub of ['Button variants', 'Input + form controls', 'Modal + Dialog', 'Table + pagination', 'Toast notifications']) {
        await prisma.todoistTask.create({
          data: { content: sub, priority: "P3" as any, sortOrder: 0, projectId: projVebDizayn.id, sectionId: secDesign.id, parentId: task.id, userId: leyla.id, tenantId: tenant.id, isCompleted: sub.includes('Button') }
        })
      }
    }
  }

  // Veb Dizayn — Development seksiyası
  const devTasks = [
    { content: 'Next.js 15 layihə strukturu', desc: 'App router, middleware, API routes', priority: "P1" as any, due: yesterday, completed: true, labels: [labelWork.id] },
    { content: 'Auth sistemi (JWT + Refresh)', desc: 'Login, register, forgot password, token refresh', priority: "P1" as any, due: today, labels: [labelWork.id, labelUrgent.id] },
    { content: 'REST API endpointləri', desc: 'CRUD əməliyyatlar, filtrlər, pagination', priority: "P2" as any, due: new Date(today.getTime() + 2*86400000), labels: [labelWork.id] },
    { content: 'WebSocket real-time bildirişlər', desc: 'Socket.io ilə canlı bildirim', priority: "P3" as any, due: nextWeek, labels: [labelWork.id] },
    { content: 'Dashboard analytics chartlar', desc: 'Chart.js ilə satış, gəlir, performans qrafikləri', priority: "P3" as any, due: new Date(today.getTime() + 10*86400000), labels: [labelWork.id, labelDesign.id] },
  ]
  for (const t of devTasks) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, description: t.desc, priority: t.priority, dueDate: t.due, isCompleted: !!t.completed, sortOrder: devTasks.indexOf(t), projectId: projVebDizayn.id, sectionId: secDev.id, userId: leyla.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) {
      await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } })
    }
  }

  // Test & Deploy seksiyası
  for (const t of ['Unit testlər yaz (Jest)', 'E2E testlər (Playwright)', 'CI/CD pipeline qur', 'Staging deploy', 'Production deploy + DNS']) {
    await prisma.todoistTask.create({
      data: { content: t, priority: "P3" as any, dueDate: new Date(today.getTime() + 14*86400000), sortOrder: 0, projectId: projVebDizayn.id, sectionId: secTest.id, userId: leyla.id, tenantId: tenant.id }
    })
  }

  // Mobil App — Board (Backlog/İşdə/Tamamlandı)
  for (const t of ['Push notification sistemi', 'Offline mode + sync', 'Biometric login', 'Deep linking']) {
    await prisma.todoistTask.create({
      data: { content: t, priority: "P3" as any, sortOrder: 0, projectId: projMobilApp.id, sectionId: secBacklog.id, userId: leyla.id, tenantId: tenant.id }
    })
  }
  for (const t of ['Login/Register ekranları', 'Dashboard ekranı']) {
    await prisma.todoistTask.create({
      data: { content: t, priority: "P2" as any, sortOrder: 0, projectId: projMobilApp.id, sectionId: secInProg.id, userId: leyla.id, tenantId: tenant.id }
    })
  }
  for (const t of ['React Native boilerplate', 'Navigation (React Navigation)']) {
    await prisma.todoistTask.create({
      data: { content: t, priority: "P2" as any, isCompleted: true, sortOrder: 0, projectId: projMobilApp.id, sectionId: secDone.id, userId: leyla.id, tenantId: tenant.id }
    })
  }

  // Marketinq Planı
  for (const t of [
    { content: 'LinkedIn kontenti planla (4 həftə)', p: "P2" as any, due: tomorrow },
    { content: 'Bloq yazısı: "SaaS 2026 trendləri"', p: "P3" as any, due: nextWeek },
    { content: 'Email kampaniya dizaynı', p: "P2" as any, due: new Date(today.getTime() + 3*86400000) },
    { content: 'Google Analytics 4 quraşdır', p: "P1" as any, due: today },
    { content: 'Competitor analysis sənədi', p: "P3" as any, due: new Date(today.getTime() + 5*86400000) },
  ]) {
    await prisma.todoistTask.create({
      data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: projMarketinq.id, userId: leyla.id, tenantId: tenant.id }
    })
  }

  // Şəxsi layihə
  for (const t of [
    { content: 'Kitab oxu: "Atomic Habits"', p: "P4" as any, due: null },
    { content: 'Diş həkimi randevusu — 28 Mart', p: "P2" as any, due: new Date('2026-03-28') },
    { content: 'Ev üçün sığorta yenilə', p: "P3" as any, due: new Date('2026-04-01') },
    { content: 'Maşın texniki baxışı', p: "P2" as any, due: new Date('2026-03-30') },
  ]) {
    await prisma.todoistTask.create({
      data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: projShexsi.id, userId: leyla.id, tenantId: tenant.id }
    })
  }

  // Todoist Comments
  const todoTasks = await prisma.todoistTask.findMany({ where: { tenantId: tenant.id, isCompleted: false }, take: 3 })
  for (const t of todoTasks) {
    await prisma.todoistComment.create({ data: { content: 'Bu tapşırıq üzərində irəliləyiş var, sabaha qədər bitirəcəm.', taskId: t.id, userId: leyla.id } })
  }

  // ─── Əlavə Maliyyə Əməliyyatları ───
  console.log('💰 Əlavə maliyyə əməliyyatları...')
  const extraTxs = [
    { amount: 25000, type: 'CREDIT', desc: 'Böyük korporativ müqavilə — DataTech', date: '2026-03-18', cat: catSatis.id, biz: baku.id },
    { amount: 7500, type: 'CREDIT', desc: 'Veb dizayn xidməti — SmartMall', date: '2026-03-20', cat: catXidmet.id, biz: baku.id },
    { amount: 3200, type: 'CREDIT', desc: 'Gəncə region satışları — Mart 2-ci yarı', date: '2026-03-22', cat: catSatis.id, biz: ganja.id },
    { amount: 4500, type: 'DEBIT', desc: 'AWS server xərcləri — Q1', date: '2026-03-15', cat: catOfis.id, biz: baku.id },
    { amount: 2800, type: 'DEBIT', desc: 'Facebook/Instagram reklamları', date: '2026-03-12', cat: catReklam.id, biz: baku.id },
    { amount: 1500, type: 'DEBIT', desc: 'Ofis təmiri — Gəncə', date: '2026-03-10', cat: catOfis.id, biz: ganja.id },
    { amount: 800, type: 'DEBIT', desc: 'İşçi təlim kursu — Udemy Business', date: '2026-03-08', cat: catOfis.id, biz: baku.id },
    { amount: 12500, type: 'CREDIT', desc: 'Aylıq retainer — AzərEnerji', date: '2026-03-05', cat: catXidmet.id, biz: baku.id },
  ]
  for (const t of extraTxs) {
    await prisma.transaction.create({
      data: { amount: t.amount, type: t.type as any, description: t.desc, date: new Date(t.date), categoryId: t.cat, businessId: t.biz, createdBy: hasan.id, tenantId: tenant.id },
    })
  }

  // ─── Əlavə Bildirişlər ───
  console.log('🔔 Əlavə bildirişlər...')
  const extraNotifs = [
    { type: 'TASK_ASSIGNED', title: 'Yeni toplu görev', message: '"CRM Miqrasiyası" layihəsi sizə atandı — 5 alt görev', userId: bakuWorkers[2].id, senderId: leyla.id },
    { type: 'TASK_COMPLETED', title: '2/5 alt görev tamamlandı', message: '"CRM Miqrasiyası" — CSV export və data təmizləmə bitdi', userId: leyla.id, senderId: bakuWorkers[2].id },
    { type: 'COMMENT_ADDED', title: 'Şərh əlavə edildi', message: 'Nigar "Satış hesabatı" tapşırığına şərh yazdı', userId: leyla.id, senderId: bakuWorkers[0].id },
    { type: 'TODO_DUE', title: 'Tapşırıq vaxtı yaxınlaşır', message: '"Auth sistemi" sabah deadline-dır', userId: leyla.id, senderId: leyla.id },
    { type: 'SYSTEM', title: 'Sistem yeniləməsi', message: 'WorkFlow Pro v2.1 yeniləndi — yeni tema sistemi əlavə edildi', userId: leyla.id, senderId: admin.id },
    { type: 'TASK_ASSIGNED', title: 'Təkrarlanan görev', message: '"Aylıq Satış Hesabatı" mart dövrü üçün atandı', userId: bakuWorkers[0].id, senderId: leyla.id },
    { type: 'SALARY_PAID', title: 'Bonus ödənildi', message: '500 ₼ performans bonusu hesabınıza köçürüldü', userId: bakuWorkers[2].id, senderId: hasan.id },
    { type: 'TASK_REJECTED', title: 'Tapşırıq rədd edildi', message: '"Premium mebel sifarişi" büdcə səbəbiylə rədd edildi', userId: ganjaWorkers[3].id, senderId: aynur.id },
  ]
  for (const n of extraNotifs) {
    await prisma.notification.create({
      data: { type: n.type as any, title: n.title, message: n.message, userId: n.userId, senderId: n.senderId, tenantId: tenant.id, link: '/tasks' },
    })
  }

  // Nigar üçün TODO layihələr
  const nigarInbox = await prisma.todoistProject.create({
    data: { name: 'Inbox', color: '#808080', viewType: 'LIST', isInbox: true, sortOrder: -1, userId: bakuWorkers[0].id, tenantId: tenant.id }
  })
  const nigarSatis = await prisma.todoistProject.create({
    data: { name: 'Satış Hədəfləri', color: '#058527', viewType: 'LIST', isFavorite: true, sortOrder: 0, userId: bakuWorkers[0].id, tenantId: tenant.id }
  })
  for (const t of [
    { content: 'Q1 satış raporunu tamamla', p: "P1" as any, due: today },
    { content: 'Yeni müştəri prospektlər siyahısı', p: "P2" as any, due: tomorrow },
    { content: 'CRM datalarını yenilə', p: "P2" as any, due: nextWeek },
    { content: 'Rəqib qiymət analizi', p: "P3" as any, due: new Date(today.getTime() + 5*86400000) },
  ]) {
    await prisma.todoistTask.create({
      data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: nigarSatis.id, userId: bakuWorkers[0].id, tenantId: tenant.id }
    })
  }

  // ═══════════════════════════════════════════════════════════
  // HƏSƏN ÜÇÜN BÖYÜK DATA (Şirkət Sahibi görünüşü)
  // ═══════════════════════════════════════════════════════════
  console.log('👑 Həsən üçün data yaradılır...')

  // Həsən TODO layihələri
  const hasanInbox = await prisma.todoistProject.create({
    data: { name: 'Inbox', color: '#808080', viewType: 'LIST', isInbox: true, sortOrder: -1, userId: hasan.id, tenantId: tenant.id }
  })
  const hasanStrateji = await prisma.todoistProject.create({
    data: { name: 'Strateji Plan 2026', color: '#DC2626', viewType: 'LIST', isFavorite: true, sortOrder: 0, userId: hasan.id, tenantId: tenant.id }
  })
  const hasanMaliyye = await prisma.todoistProject.create({
    data: { name: 'Maliyyə İdarəetmə', color: '#F97316', viewType: 'LIST', isFavorite: true, sortOrder: 1, userId: hasan.id, tenantId: tenant.id }
  })
  const hasanHR = await prisma.todoistProject.create({
    data: { name: 'İşçi İdarəetmə', color: '#059669', viewType: 'BOARD', isFavorite: false, sortOrder: 2, userId: hasan.id, tenantId: tenant.id }
  })
  const hasanShexsi = await prisma.todoistProject.create({
    data: { name: 'Şəxsi', color: '#EC4899', viewType: 'LIST', isFavorite: false, sortOrder: 3, userId: hasan.id, tenantId: tenant.id }
  })

  // Seksiyalar — Strateji Plan
  const secQ1 = await prisma.todoistSection.create({ data: { name: 'Q1 (Yanvar-Mart)', sortOrder: 0, projectId: hasanStrateji.id } })
  const secQ2 = await prisma.todoistSection.create({ data: { name: 'Q2 (Aprel-İyun)', sortOrder: 1, projectId: hasanStrateji.id } })
  const secQ3 = await prisma.todoistSection.create({ data: { name: 'Q3 (İyul-Sentyabr)', sortOrder: 2, projectId: hasanStrateji.id } })

  // Seksiyalar — İşçi İdarəetmə (Board)
  const secHRPlanning = await prisma.todoistSection.create({ data: { name: 'Planlaşdırma', sortOrder: 0, projectId: hasanHR.id } })
  const secHRActive = await prisma.todoistSection.create({ data: { name: 'Aktiv', sortOrder: 1, projectId: hasanHR.id } })
  const secHRDone = await prisma.todoistSection.create({ data: { name: 'Tamamlandı', sortOrder: 2, projectId: hasanHR.id } })

  // Həsən labels
  const hLblUrgent = await prisma.todoistLabel.create({ data: { name: 'təcili', color: '#DC4C3E', userId: hasan.id, tenantId: tenant.id } })
  const hLblMeeting = await prisma.todoistLabel.create({ data: { name: 'görüş', color: '#9333EA', userId: hasan.id, tenantId: tenant.id } })
  const hLblFinance = await prisma.todoistLabel.create({ data: { name: 'maliyyə', color: '#F97316', userId: hasan.id, tenantId: tenant.id } })
  const hLblStrategy = await prisma.todoistLabel.create({ data: { name: 'strateji', color: '#2563EB', userId: hasan.id, tenantId: tenant.id } })
  const hLblHR = await prisma.todoistLabel.create({ data: { name: 'HR', color: '#059669', userId: hasan.id, tenantId: tenant.id } })

  // Strateji Plan Q1 tapşırıqları
  const strategyTasks = [
    { content: 'İllik büdcə planını təsdiqlə', desc: '2026 büdcəsi — bütün filiallar, 2.5M AZN limit', p: 'P1' as any, sec: secQ1.id, due: yesterday, done: true, labels: [hLblFinance.id, hLblStrategy.id] },
    { content: 'Q1 KPI hədəflərini müəyyən et', desc: 'Satış: +15%, müştəri: +20%, retention: >85%', p: 'P1' as any, sec: secQ1.id, due: yesterday, done: true, labels: [hLblStrategy.id] },
    { content: 'Gəncə filialı genişlənmə planı', desc: '3 yeni işçi, ofis genişləndirilməsi, avadanlıq sifarişi', p: 'P2' as any, sec: secQ1.id, due: today, done: false, labels: [hLblStrategy.id, hLblHR.id] },
    { content: 'CRM miqrasiya layihəsini nəzarətdə saxla', desc: 'Elvin və Günel 5 alt görev ilə çalışır — 2/5 hazır', p: 'P1' as any, sec: secQ1.id, due: today, done: false, labels: [hLblUrgent.id] },
    { content: 'ISO 9001 audit tarixini təsdiqlə', desc: 'Auditin Aprel sonuna qədər keçirilməsi vacibdir', p: 'P2' as any, sec: secQ1.id, due: tomorrow, done: false, labels: [hLblUrgent.id] },
    { content: 'Q1 maliyyə hesabatını yoxla', desc: 'Səbinə hazırladı — gəlir/xərc analizi', p: 'P2' as any, sec: secQ1.id, due: new Date(today.getTime() + 3*86400000), done: false, labels: [hLblFinance.id] },
  ]
  for (const t of strategyTasks) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, description: t.desc, priority: t.p, dueDate: t.due, isCompleted: !!t.done, sortOrder: strategyTasks.indexOf(t), projectId: hasanStrateji.id, sectionId: t.sec, userId: hasan.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) { await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } }) }
  }

  // Q2 tapşırıqları
  for (const t of [
    { content: 'SaaS pricing modeli yaratma', p: 'P2' as any, due: new Date(today.getTime() + 14*86400000), labels: [hLblStrategy.id, hLblFinance.id] },
    { content: 'Bakı+Gəncə birgə team building', p: 'P3' as any, due: new Date(today.getTime() + 30*86400000), labels: [hLblHR.id] },
    { content: 'Yeni CRM sistemi tam keçid', p: 'P1' as any, due: new Date(today.getTime() + 21*86400000), labels: [hLblStrategy.id, hLblUrgent.id] },
    { content: 'Marketinq büdcəsi 2-ci yarım il', p: 'P3' as any, due: new Date(today.getTime() + 45*86400000), labels: [hLblFinance.id] },
  ]) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: hasanStrateji.id, sectionId: secQ2.id, userId: hasan.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) { await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } }) }
  }

  // Maliyyə İdarəetmə tapşırıqları
  for (const t of [
    { content: 'Mart maaşlarını təsdiqlə (18 nəfər)', p: 'P1' as any, due: today, labels: [hLblFinance.id, hLblUrgent.id] },
    { content: 'AWS server xərclərini optimallaşdır', p: 'P2' as any, due: tomorrow, labels: [hLblFinance.id] },
    { content: 'Reklam ROI hesabatını yoxla', p: 'P3' as any, due: new Date(today.getTime() + 5*86400000), labels: [hLblFinance.id] },
    { content: 'Vergi bəyannaməsi hazırlığı', p: 'P1' as any, due: new Date(today.getTime() + 10*86400000), labels: [hLblFinance.id, hLblUrgent.id] },
    { content: 'İnvestor prezentasiyası üçün P&L', p: 'P2' as any, due: new Date(today.getTime() + 7*86400000), labels: [hLblFinance.id, hLblStrategy.id] },
  ]) {
    const task = await prisma.todoistTask.create({
      data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: hasanMaliyye.id, userId: hasan.id, tenantId: tenant.id }
    })
    for (const lid of t.labels) { await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } }) }
  }

  // HR Board tapşırıqları
  for (const t of ['Senior Developer axtarışı', 'Gəncə HR müdür namizədi', 'İşçi memnuniyyət sorğusu nəticələri']) {
    await prisma.todoistTask.create({ data: { content: t, priority: 'P3' as any, sortOrder: 0, projectId: hasanHR.id, sectionId: secHRPlanning.id, userId: hasan.id, tenantId: tenant.id } })
  }
  for (const t of ['Performans qiymətləndirmə Q1', 'Yeni işçi onboarding (3 nəfər)']) {
    await prisma.todoistTask.create({ data: { content: t, priority: 'P2' as any, sortOrder: 0, projectId: hasanHR.id, sectionId: secHRActive.id, userId: hasan.id, tenantId: tenant.id } })
  }
  for (const t of ['İşçi kartları hazırlandı', 'Ofis internet yeniləndi']) {
    await prisma.todoistTask.create({ data: { content: t, priority: 'P3' as any, isCompleted: true, sortOrder: 0, projectId: hasanHR.id, sectionId: secHRDone.id, userId: hasan.id, tenantId: tenant.id } })
  }

  // Şəxsi layihə
  for (const t of [
    { content: 'Ailəvi səyahət planla — İyun', p: 'P3' as any, due: new Date(today.getTime() + 60*86400000) },
    { content: 'Uşaq üçün məktəb seçimi araşdır', p: 'P2' as any, due: new Date(today.getTime() + 14*86400000) },
    { content: 'Stomatoloq randevusu — 28 Mart', p: 'P2' as any, due: new Date('2026-03-28') },
    { content: 'Maşın texniki baxış — Aprel', p: 'P3' as any, due: new Date('2026-04-05') },
    { content: 'Kitab bitir: "Zero to One"', p: 'P4' as any, due: null },
  ]) {
    await prisma.todoistTask.create({ data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: hasanShexsi.id, userId: hasan.id, tenantId: tenant.id } })
  }

  // Inbox tapşırıqları
  for (const t of [
    { content: 'Müdirlərlə həftəlik görüş agendası hazırla', p: 'P2' as any, due: today, labels: [hLblMeeting.id] },
    { content: 'Partner şirkətdən gələn təklifi yoxla', p: 'P2' as any, due: today, labels: [hLblUrgent.id] },
    { content: 'Yeni ofis mebel kataloqu seç', p: 'P4' as any, due: null, labels: [] },
  ]) {
    const task = await prisma.todoistTask.create({ data: { content: t.content, priority: t.p, dueDate: t.due, sortOrder: 0, projectId: hasanInbox.id, userId: hasan.id, tenantId: tenant.id } })
    for (const lid of t.labels) { await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } }) }
  }

  // Həsən üçün əlavə GÖREV-lər (Həsən assignee olaraq)
  console.log('📋 Həsən görevləri yaradılır...')
  // Həsənin özünün yaratdığı + Həsənə atanan görevlər
  for (const t of [
    { title: 'İllik hesabat prezentasiyası — Board toplantısı', desc: 'Board üzvləri üçün 2025 nəticələri + 2026 planı. 45 slayd, infographic-lər.', pr: 'CRITICAL', st: 'IN_PROGRESS', cr: hasan.id, assignees: [hasan.id, leyla.id], biz: baku.id, due: '2026-03-25' },
    { title: 'Gəncə filialı genişlənmə təsdiqi', desc: 'Büdcə: 50,000 AZN. 3 yeni vəzifə, ofis genişləndirilməsi.', pr: 'HIGH', st: 'PENDING_APPROVAL', cr: aynur.id, assignees: [hasan.id], biz: ganja.id, due: '2026-03-24' },
    { title: 'Yeni müştəri müqaviləsi — AzərEnerji', desc: '12 aylıq retainer müqavilə, 150K AZN/il. Hüquq yoxlaması lazım.', pr: 'CRITICAL', st: 'CREATED', cr: hasan.id, assignees: [hasan.id, leyla.id, kamran.id], biz: baku.id, due: '2026-03-28' },
    { title: 'İT infrastruktur yeniləmə planı', desc: 'Server, firewall, backup sistemi, VPN — bütün filiallar', pr: 'HIGH', st: 'IN_PROGRESS', cr: tural.id, assignees: [hasan.id, tural.id], biz: baku.id, due: '2026-04-01' },
    { title: 'Reklam kampaniyası büdcə təsdiqi', desc: 'Q2 digital marketing: Google + Facebook + LinkedIn = 15K AZN', pr: 'MEDIUM', st: 'PENDING_APPROVAL', cr: leyla.id, assignees: [hasan.id], biz: baku.id, due: '2026-03-26' },
  ]) {
    await prisma.task.create({
      data: {
        title: t.title, description: t.desc, priority: t.pr as any, status: t.st as any, type: 'GOREV',
        dueDate: new Date(t.due), businessId: t.biz, creatorId: t.cr, tenantId: tenant.id,
        assignees: { create: t.assignees.map(id => ({ userId: id })) },
      }
    })
  }

  // Həsənə bildirişlər
  const hasanNotifs = [
    { type: 'TASK_ASSIGNED', title: 'Yeni GÖREV atandı', message: '"İllik hesabat prezentasiyası" tapşırığı sizə atandı', senderId: hasan.id },
    { type: 'TASK_ASSIGNED', title: 'Onay gözləyir', message: '"Gəncə genişlənmə təsdiqi" — Aynur onayınızı gözləyir', senderId: aynur.id },
    { type: 'TASK_ASSIGNED', title: 'Büdcə təsdiqi', message: '"Reklam kampaniyası büdcəsi" — Leyla təsdiqlətmək istəyir', senderId: leyla.id },
    { type: 'TASK_COMPLETED', title: '2/5 tamamlandı', message: '"CRM Miqrasiyası" — CSV export və data təmizləmə bitdi', senderId: bakuWorkers[2].id },
    { type: 'COMMENT_ADDED', title: 'Şərh əlavə edildi', message: 'Tural "İT infrastruktur" tapşırığına şərh yazdı', senderId: tural.id },
    { type: 'SALARY_PAID', title: 'Maaşlar ödənildi', message: '10 nəfərin mart maaşı uğurla köçürüldü', senderId: admin.id },
    { type: 'TODO_DUE', title: 'Bugün deadline', message: '"Mart maaşlarını təsdiqlə" bugün tamamlanmalıdır', senderId: hasan.id },
    { type: 'SYSTEM', title: 'Sistem yeniləməsi', message: 'WorkFlow Pro v2.1 — yeni tema sistemi əlavə edildi', senderId: admin.id },
    { type: 'TASK_COMPLETED', title: 'Görev tamamlandı', message: '"Server backup sistemi" Elvin tərəfindən tamamlandı', senderId: bakuWorkers[2].id },
    { type: 'TASK_ASSIGNED', title: 'Təkrarlanan görev', message: '"Aylıq Satış Hesabatı" Mart dövrü başladı — 3 işçi', senderId: leyla.id },
  ]
  for (const n of hasanNotifs) {
    await prisma.notification.create({
      data: { type: n.type as any, title: n.title, message: n.message, userId: hasan.id, senderId: n.senderId, tenantId: tenant.id, link: '/tasks' },
    })
  }

  // Todoist comments — Həsən
  const hasanTodos = await prisma.todoistTask.findMany({ where: { userId: hasan.id, isCompleted: false }, take: 3 })
  for (const t of hasanTodos) {
    await prisma.todoistComment.create({ data: { content: 'Bu mövzu ilə bağlı Leyla ilə danışdım, sabah yenilik olacaq.', taskId: t.id, userId: hasan.id } })
  }

  console.log('📊 Demo data yaradıldı!')
  console.log('   📋 Tapşırıqlar: 20+ (toplu, alt görevli, qarışıq status)')
  console.log('   ✅ Todoist: 5 layihə, 6 seksiya, 30+ tapşırıq, 5 etiket')
  console.log('   💰 Maliyyə: 16 əməliyyat')
  console.log('   🔔 Bildirişlər: 15+')
  console.log('   💬 Şərhlər: 10+')

  console.log('')
  console.log('✅ SEED TAMAMLANDI!')
  console.log('')
  console.log('👤 Login: hasan@techflow.az / 123456 (Şirkət Sahibi — TENANT_ADMIN)')
  console.log('👤 Login: admin@techflow.az / 123456 (Admin — tam yetki, Şirkət Sahibi rolu)')
  console.log('👤 Login: leyla@techflow.az / 123456 (Bakı Müdiri — Müdir rolu)')
  console.log('👤 Login: aynur@techflow.az / 123456 (Gəncə Müdiri — Müdir rolu)')
  console.log('👤 Login: nigar@techflow.az / 123456 (İşçi — İşçi rolu)')
  console.log('')
  console.log(`🏢 Tenant: ${tenant.name} (${tenant.id})`)
  console.log(`🏗️  Bakı: ${baku.name} — ${bakuAll.length} işçi`)
  console.log(`🏗️  Gəncə: ${ganja.name} — ${ganjaAll.length} işçi`)
  console.log(`📊 Toplam: ${1 + bakuAll.length + ganjaAll.length} istifadəçi, ${tasks.length} tapşırıq, ${todos.length} todo`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
