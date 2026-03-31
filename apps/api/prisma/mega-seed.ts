import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d
}

function daysAgo(days: number): Date {
  return daysFromNow(-days)
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

function dateStr(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 9, 0, 0)
}

async function main() {
  console.log('========================================')
  console.log('  MEGA SEED - WorkFlow Pro Demo Data')
  console.log('========================================')
  console.log('')

  // ═══════════════════════════════════════════════════════════
  // 1. DELETE ALL EXISTING DATA
  // ═══════════════════════════════════════════════════════════
  console.log('Kohne data silinir...')

  await prisma.taskLabel.deleteMany().catch(() => {})
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
  await prisma.adminAuditLog.deleteMany().catch(() => {})
  await prisma.tenantSettings.deleteMany().catch(() => {})
  await prisma.businessDepartment.deleteMany()
  await prisma.department.deleteMany()
  await prisma.userBusiness.deleteMany()
  await prisma.user.deleteMany()
  await prisma.customRole.deleteMany()
  await prisma.business.deleteMany()
  await prisma.tenant.deleteMany()

  console.log('Kohne data silindi.')

  // ═══════════════════════════════════════════════════════════
  // 2. TENANT
  // ═══════════════════════════════════════════════════════════
  console.log('TechFlow MMC yaradilir...')
  const pw = await bcrypt.hash('123456', 10)

  const tenant = await prisma.tenant.create({
    data: { name: 'TechFlow MMC', subdomain: 'techflow', plan: 'pro', isActive: true },
  })

  // TenantSettings
  await prisma.tenantSettings.create({
    data: { tenantId: tenant.id, maxUsers: 100, maxBranches: 5, maxDepartments: 20 },
  })

  // ═══════════════════════════════════════════════════════════
  // SUPER ADMIN USER
  // ═══════════════════════════════════════════════════════════
  console.log('Super Admin yaradilir...')
  await prisma.user.create({
    data: {
      email: 'super@workflowpro.az',
      password: pw,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      isSystemAdmin: false,
      tenantId: tenant.id,
    },
  })

  // ═══════════════════════════════════════════════════════════
  // 3. BUSINESSES (3 FILIAL)
  // ═══════════════════════════════════════════════════════════
  console.log('Filiallar yaradilir...')
  const baku = await prisma.business.create({ data: { name: 'Baki Filiali', tenantId: tenant.id } })
  const ganja = await prisma.business.create({ data: { name: 'Gence Filiali', tenantId: tenant.id } })
  const sumqayit = await prisma.business.create({ data: { name: 'Sumqayit Filiali', tenantId: tenant.id } })

  const businesses = [baku, ganja, sumqayit]

  // ═══════════════════════════════════════════════════════════
  // 4. DEPARTMENTS (10)
  // ═══════════════════════════════════════════════════════════
  console.log('Sobeler yaradilir...')
  const deptIT = await prisma.department.create({ data: { name: 'IT', color: '#246FE0', tenantId: tenant.id } })
  const deptSatis = await prisma.department.create({ data: { name: 'Satis', color: '#058527', tenantId: tenant.id } })
  const deptMarketinq = await prisma.department.create({ data: { name: 'Marketinq', color: '#9333EA', tenantId: tenant.id } })
  const deptHR = await prisma.department.create({ data: { name: 'HR', color: '#EB8909', tenantId: tenant.id } })
  const deptMaliyye = await prisma.department.create({ data: { name: 'Maliyye', color: '#DC4C3E', tenantId: tenant.id } })
  const deptMusteri = await prisma.department.create({ data: { name: 'Musteri Xidmeti', color: '#14B8A6', tenantId: tenant.id } })
  const deptLogistika = await prisma.department.create({ data: { name: 'Logistika', color: '#6366F1', tenantId: tenant.id } })
  const deptHuquq = await prisma.department.create({ data: { name: 'Huquq', color: '#78716C', tenantId: tenant.id } })
  const deptKeyfiyyet = await prisma.department.create({ data: { name: 'Keyfiyyet', color: '#0EA5E9', tenantId: tenant.id } })
  const deptEmeliyyat = await prisma.department.create({ data: { name: 'Emeliyyat', color: '#F43F5E', tenantId: tenant.id } })

  const allDepts = [deptIT, deptSatis, deptMarketinq, deptHR, deptMaliyye, deptMusteri, deptLogistika, deptHuquq, deptKeyfiyyet, deptEmeliyyat]

  // ═══════════════════════════════════════════════════════════
  // 5. ROLES (4)
  // ═══════════════════════════════════════════════════════════
  console.log('Rollar yaradilir...')

  const allPerms = [
    'tasks.read', 'tasks.create', 'gorev.create', 'tasks.assign_upward',
    'users.read', 'users.manage',
    'finance.manage',
    'salary.manage',
  ]

  const ceoRole = await prisma.customRole.create({
    data: {
      name: 'CEO',
      description: 'Tam yetki - butun modullar',
      permissions: allPerms,
      isDefault: true,
      tenantId: tenant.id,
    },
  })

  const mudirRole = await prisma.customRole.create({
    data: {
      name: 'Mudir',
      description: 'Filial mudiri - tapshiriq, istifadeci, hesabat idareetmesi',
      isDefault: true,
      tenantId: tenant.id,
      permissions: [
        'tasks.read', 'tasks.create', 'gorev.create', 'tasks.assign_upward',
        'users.read',
      ],
    },
  })

  const sobeRehberiRole = await prisma.customRole.create({
    data: {
      name: 'Sobe Rehberi',
      description: 'Komanda lideri - tapshiriq idareetmesi, limited finance',
      isDefault: true,
      tenantId: tenant.id,
      permissions: [
        'tasks.read', 'tasks.create',
      ],
    },
  })

  const isciRole = await prisma.customRole.create({
    data: {
      name: 'Isci',
      description: 'Isci - tapshiriq oxuma, TODO yaratma, bildirisher',
      isDefault: true,
      tenantId: tenant.id,
      permissions: [
        'tasks.read',
      ],
    },
  })

  // ═══════════════════════════════════════════════════════════
  // 6. USERS (~50)
  // ═══════════════════════════════════════════════════════════
  console.log('Istifadeciler yaradilir...')

  // CEO
  const hasan = await prisma.user.create({
    data: {
      email: 'hasan@techflow.az', password: pw, fullName: 'Hesen Eliyev',
      role: 'TENANT_ADMIN', tenantId: tenant.id, status: 'active', customRoleId: ceoRole.id,
    },
  })

  // Admin (isSystemAdmin)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@techflow.az', password: pw, fullName: 'Admin Nezerli',
      role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id,
      status: 'active', isSystemAdmin: true, customRoleId: ceoRole.id,
    },
  })

  // ─── BAKI FİLIALI ───
  // Filial Mudiri
  const leyla = await prisma.user.create({
    data: {
      email: 'leyla@techflow.az', password: pw, fullName: 'Leyla Huseynova',
      role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id,
      status: 'active', customRoleId: mudirRole.id,
    },
  })

  // Sobe Rehberleri - Baki
  const tural = await prisma.user.create({
    data: {
      email: 'tural@techflow.az', password: pw, fullName: 'Tural Qasimov',
      role: 'TEAM_MANAGER', parentId: leyla.id, tenantId: tenant.id,
      status: 'active', customRoleId: sobeRehberiRole.id,
    },
  })
  const farid = await prisma.user.create({
    data: {
      email: 'farid@techflow.az', password: pw, fullName: 'Farid Memmedov',
      role: 'TEAM_MANAGER', parentId: leyla.id, tenantId: tenant.id,
      status: 'active', customRoleId: sobeRehberiRole.id,
    },
  })

  // Isciler - Baki (14 nefer)
  const bakuWorkerData = [
    { email: 'nigar@techflow.az', name: 'Nigar Ehmedova', parent: tural.id },
    { email: 'rashad@techflow.az', name: 'Reshad Ismayilov', parent: tural.id },
    { email: 'elvin@techflow.az', name: 'Elvin Hesenov', parent: tural.id },
    { email: 'gunel@techflow.az', name: 'Gunel Elizade', parent: tural.id },
    { email: 'orxan@techflow.az', name: 'Orxan Babayev', parent: farid.id },
    { email: 'sebine@techflow.az', name: 'Sebine Quliyeva', parent: farid.id },
    { email: 'murad@techflow.az', name: 'Murad Esgerov', parent: farid.id },
    { email: 'ulker@techflow.az', name: 'Ulker Rehimova', parent: tural.id },
    { email: 'samir@techflow.az', name: 'Samir Veliyev', parent: farid.id },
    { email: 'aysel@techflow.az', name: 'Aysel Novruzova', parent: tural.id },
    { email: 'ceyhun@techflow.az', name: 'Ceyhun Hesenli', parent: farid.id },
    { email: 'naile@techflow.az', name: 'Naile Ismayilova', parent: tural.id },
    { email: 'vugar@techflow.az', name: 'Vugar Qurbanov', parent: farid.id },
    { email: 'turkan@techflow.az', name: 'Turkan Mehdiyeva', parent: leyla.id },
  ]

  const bakuWorkers = await Promise.all(
    bakuWorkerData.map(w =>
      prisma.user.create({
        data: {
          email: w.email, password: pw, fullName: w.name,
          role: 'EMPLOYEE', parentId: w.parent, tenantId: tenant.id,
          status: 'active', customRoleId: isciRole.id,
        },
      })
    )
  )

  // ─── GENCE FİLIALI ───
  const aynur = await prisma.user.create({
    data: {
      email: 'aynur@techflow.az', password: pw, fullName: 'Aynur Nesirova',
      role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id,
      status: 'active', customRoleId: mudirRole.id,
    },
  })

  // Sobe Rehberleri - Gence
  const kamran = await prisma.user.create({
    data: {
      email: 'kamran@techflow.az', password: pw, fullName: 'Kamran Hesenli',
      role: 'TEAM_MANAGER', parentId: aynur.id, tenantId: tenant.id,
      status: 'active', customRoleId: sobeRehberiRole.id,
    },
  })
  const sevda = await prisma.user.create({
    data: {
      email: 'sevda@techflow.az', password: pw, fullName: 'Sevda Aliyeva',
      role: 'TEAM_MANAGER', parentId: aynur.id, tenantId: tenant.id,
      status: 'active', customRoleId: sobeRehberiRole.id,
    },
  })

  // Isciler - Gence (12 nefer)
  const ganjaWorkerData = [
    { email: 'zaur@techflow.az', name: 'Zaur Memmedli', parent: kamran.id },
    { email: 'nermin@techflow.az', name: 'Nermin Cavadova', parent: kamran.id },
    { email: 'ekber@techflow.az', name: 'Ekber Huseynli', parent: kamran.id },
    { email: 'ulviyye@techflow.az', name: 'Ulviyye Kerimova', parent: sevda.id },
    { email: 'rauf@techflow.az', name: 'Rauf Eliyev', parent: sevda.id },
    { email: 'lamiye@techflow.az', name: 'Lamiye Hesenova', parent: kamran.id },
    { email: 'togrul@techflow.az', name: 'Togrul Nagiyev', parent: sevda.id },
    { email: 'elnur@techflow.az', name: 'Elnur Seferov', parent: kamran.id },
    { email: 'sevinc@techflow.az', name: 'Sevinc Mehdiyeva', parent: sevda.id },
    { email: 'ilkin@techflow.az', name: 'Ilkin Abbasov', parent: kamran.id },
    { email: 'gunay@techflow.az', name: 'Gunay Veliyeva', parent: sevda.id },
    { email: 'nihad@techflow.az', name: 'Nihad Hasanov', parent: sevda.id },
  ]

  const ganjaWorkers = await Promise.all(
    ganjaWorkerData.map(w =>
      prisma.user.create({
        data: {
          email: w.email, password: pw, fullName: w.name,
          role: 'EMPLOYEE', parentId: w.parent, tenantId: tenant.id,
          status: 'active', customRoleId: isciRole.id,
        },
      })
    )
  )

  // ─── SUMQAYIT FİLIALI ───
  const elshan = await prisma.user.create({
    data: {
      email: 'elshan@techflow.az', password: pw, fullName: 'Elshan Mehdiyev',
      role: 'BUSINESS_MANAGER', parentId: hasan.id, tenantId: tenant.id,
      status: 'active', customRoleId: mudirRole.id,
    },
  })

  // Sobe Rehberi - Sumqayit
  const vusal = await prisma.user.create({
    data: {
      email: 'vusal@techflow.az', password: pw, fullName: 'Vusal Agayev',
      role: 'TEAM_MANAGER', parentId: elshan.id, tenantId: tenant.id,
      status: 'active', customRoleId: sobeRehberiRole.id,
    },
  })

  // Isciler - Sumqayit (10 nefer)
  const sumqayitWorkerData = [
    { email: 'konul@techflow.az', name: 'Konul Hasanova', parent: vusal.id },
    { email: 'eldar@techflow.az', name: 'Eldar Ibrahimov', parent: vusal.id },
    { email: 'nuray@techflow.az', name: 'Nuray Guliyeva', parent: vusal.id },
    { email: 'kanan@techflow.az', name: 'Kenan Rzayev', parent: elshan.id },
    { email: 'samira@techflow.az', name: 'Samire Bayramova', parent: vusal.id },
    { email: 'ruslan@techflow.az', name: 'Ruslan Mikayilov', parent: vusal.id },
    { email: 'gulnar@techflow.az', name: 'Gulnar Maharremova', parent: elshan.id },
    { email: 'namiq@techflow.az', name: 'Namiq Ceferov', parent: vusal.id },
    { email: 'xatire@techflow.az', name: 'Xatire Ehmedli', parent: elshan.id },
    { email: 'cavid@techflow.az', name: 'Cavid Mustafayev', parent: vusal.id },
  ]

  const sumqayitWorkers = await Promise.all(
    sumqayitWorkerData.map(w =>
      prisma.user.create({
        data: {
          email: w.email, password: pw, fullName: w.name,
          role: 'EMPLOYEE', parentId: w.parent, tenantId: tenant.id,
          status: 'active', customRoleId: isciRole.id,
        },
      })
    )
  )

  const allUsers = [hasan, admin, leyla, tural, farid, ...bakuWorkers, aynur, kamran, sevda, ...ganjaWorkers, elshan, vusal, ...sumqayitWorkers]
  const allWorkers = [...bakuWorkers, ...ganjaWorkers, ...sumqayitWorkers]

  console.log(`  ${allUsers.length} istifadeci yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // 7. BUSINESS-DEPARTMENT LINKS
  // ═══════════════════════════════════════════════════════════
  console.log('Filial-Sobe elaqeleri yaradilir...')

  // Baki: butun 10 sobe
  const bakuBDs: Record<string, any> = {}
  for (const dept of allDepts) {
    const bd = await prisma.businessDepartment.create({ data: { businessId: baku.id, departmentId: dept.id } })
    bakuBDs[dept.id] = bd
  }

  // Gence: 7 sobe
  const ganjaDepts = [deptIT, deptSatis, deptMarketinq, deptHR, deptMusteri, deptLogistika, deptEmeliyyat]
  const ganjaBDs: Record<string, any> = {}
  for (const dept of ganjaDepts) {
    const bd = await prisma.businessDepartment.create({ data: { businessId: ganja.id, departmentId: dept.id } })
    ganjaBDs[dept.id] = bd
  }

  // Sumqayit: 6 sobe
  const sumqayitDepts = [deptIT, deptSatis, deptMusteri, deptLogistika, deptEmeliyyat, deptKeyfiyyet]
  const sumqayitBDs: Record<string, any> = {}
  for (const dept of sumqayitDepts) {
    const bd = await prisma.businessDepartment.create({ data: { businessId: sumqayit.id, departmentId: dept.id } })
    sumqayitBDs[dept.id] = bd
  }

  // ═══════════════════════════════════════════════════════════
  // 8. USER-BUSINESS ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════
  console.log('Istifadeci-Filial elaqeleri yaradilir...')

  // Hesen + Admin - her uc filial
  for (const biz of businesses) {
    await prisma.userBusiness.create({ data: { userId: hasan.id, businessId: biz.id, customRoleId: ceoRole.id } })
    await prisma.userBusiness.create({ data: { userId: admin.id, businessId: biz.id, customRoleId: ceoRole.id } })
  }

  // Baki
  await prisma.userBusiness.create({ data: { userId: leyla.id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'Filial Mudiru', customRoleId: mudirRole.id } })
  await prisma.userBusiness.create({ data: { userId: tural.id, businessId: baku.id, departmentId: deptIT.id, positionTitle: 'IT Sobe Rehberi', customRoleId: sobeRehberiRole.id } })
  await prisma.userBusiness.create({ data: { userId: farid.id, businessId: baku.id, departmentId: deptSatis.id, positionTitle: 'Satis Sobe Rehberi', customRoleId: sobeRehberiRole.id } })

  const bakuAssignments = [
    { idx: 0, dept: deptSatis.id, pos: 'Satis Meneceri' },       // Nigar
    { idx: 1, dept: deptMarketinq.id, pos: 'Marketoloq' },       // Reshad
    { idx: 2, dept: deptIT.id, pos: 'Backend Developer' },        // Elvin
    { idx: 3, dept: deptIT.id, pos: 'Frontend Developer' },       // Gunel
    { idx: 4, dept: deptHR.id, pos: 'HR Mutexessis' },            // Orxan
    { idx: 5, dept: deptMaliyye.id, pos: 'Muhasib' },             // Sebine
    { idx: 6, dept: deptMusteri.id, pos: 'Destek Mutexessis' },   // Murad
    { idx: 7, dept: deptKeyfiyyet.id, pos: 'QA Muhendis' },       // Ulker
    { idx: 8, dept: deptEmeliyyat.id, pos: 'Emeliyyat Meneceri' }, // Samir
    { idx: 9, dept: deptMarketinq.id, pos: 'Kontent Meneceri' },  // Aysel
    { idx: 10, dept: deptLogistika.id, pos: 'Logistik' },         // Ceyhun
    { idx: 11, dept: deptHuquq.id, pos: 'Huquqshinas' },          // Naile
    { idx: 12, dept: deptMaliyye.id, pos: 'Maliyye Analitik' },   // Vugar
    { idx: 13, dept: deptHR.id, pos: 'HR Koordinator' },          // Turkan
  ]
  for (const a of bakuAssignments) {
    await prisma.userBusiness.create({
      data: { userId: bakuWorkers[a.idx].id, businessId: baku.id, departmentId: a.dept, positionTitle: a.pos, customRoleId: isciRole.id },
    })
  }

  // Gence
  await prisma.userBusiness.create({ data: { userId: aynur.id, businessId: ganja.id, departmentId: deptIT.id, positionTitle: 'Filial Mudiru', customRoleId: mudirRole.id } })
  await prisma.userBusiness.create({ data: { userId: kamran.id, businessId: ganja.id, departmentId: deptSatis.id, positionTitle: 'Satis Sobe Rehberi', customRoleId: sobeRehberiRole.id } })
  await prisma.userBusiness.create({ data: { userId: sevda.id, businessId: ganja.id, departmentId: deptMusteri.id, positionTitle: 'Musteri Xidmeti Rehberi', customRoleId: sobeRehberiRole.id } })

  const ganjaAssignments = [
    { idx: 0, dept: deptIT.id, pos: 'Sistem Administratoru' },        // Zaur
    { idx: 1, dept: deptSatis.id, pos: 'Satis Numayendesi' },         // Nermin
    { idx: 2, dept: deptIT.id, pos: 'IT Destek' },                    // Ekber
    { idx: 3, dept: deptHR.id, pos: 'HR Emedash' },                   // Ulviyye
    { idx: 4, dept: deptMusteri.id, pos: 'Musteri Temsilcisi' },      // Rauf
    { idx: 5, dept: deptSatis.id, pos: 'Satis Meneceri' },            // Lamiye
    { idx: 6, dept: deptMusteri.id, pos: 'Destek Mutexessis' },       // Togrul
    { idx: 7, dept: deptLogistika.id, pos: 'Anbar Meneceri' },        // Elnur
    { idx: 8, dept: deptEmeliyyat.id, pos: 'Emeliyyat Koordinatoru' }, // Sevinc
    { idx: 9, dept: deptMarketinq.id, pos: 'Marketinq Asistenti' },   // Ilkin
    { idx: 10, dept: deptMusteri.id, pos: 'Call Center Operatoru' },   // Gunay
    { idx: 11, dept: deptEmeliyyat.id, pos: 'Saha Meneceri' },        // Nihad
  ]
  for (const a of ganjaAssignments) {
    await prisma.userBusiness.create({
      data: { userId: ganjaWorkers[a.idx].id, businessId: ganja.id, departmentId: a.dept, positionTitle: a.pos, customRoleId: isciRole.id },
    })
  }

  // Sumqayit
  await prisma.userBusiness.create({ data: { userId: elshan.id, businessId: sumqayit.id, departmentId: deptSatis.id, positionTitle: 'Filial Mudiru', customRoleId: mudirRole.id } })
  await prisma.userBusiness.create({ data: { userId: vusal.id, businessId: sumqayit.id, departmentId: deptIT.id, positionTitle: 'IT Sobe Rehberi', customRoleId: sobeRehberiRole.id } })

  const sumqayitAssignments = [
    { idx: 0, dept: deptMusteri.id, pos: 'Musteri Meneceri' },        // Konul
    { idx: 1, dept: deptIT.id, pos: 'Junior Developer' },             // Eldar
    { idx: 2, dept: deptSatis.id, pos: 'Satis Numayendesi' },         // Nuray
    { idx: 3, dept: deptLogistika.id, pos: 'Logistik' },              // Kenan
    { idx: 4, dept: deptEmeliyyat.id, pos: 'Emeliyyat Asistenti' },   // Samire
    { idx: 5, dept: deptIT.id, pos: 'Sistem Admini' },                // Ruslan
    { idx: 6, dept: deptKeyfiyyet.id, pos: 'Keyfiyyet Inspektoru' },  // Gulnar
    { idx: 7, dept: deptSatis.id, pos: 'Satis Asistenti' },           // Namiq
    { idx: 8, dept: deptMusteri.id, pos: 'Musteri Destek' },          // Xatire
    { idx: 9, dept: deptEmeliyyat.id, pos: 'Emeliyyat Meneceri' },    // Cavid
  ]
  for (const a of sumqayitAssignments) {
    await prisma.userBusiness.create({
      data: { userId: sumqayitWorkers[a.idx].id, businessId: sumqayit.id, departmentId: a.dept, positionTitle: a.pos, customRoleId: isciRole.id },
    })
  }

  // ═══════════════════════════════════════════════════════════
  // 9. TODOIST PROJECTS, LABELS, SECTIONS
  // ═══════════════════════════════════════════════════════════
  console.log('Todoist layiheler yaradilir...')

  // Hesen layiheleri
  const hasanInbox = await prisma.todoistProject.create({ data: { name: 'Inbox', color: '#808080', viewType: 'LIST', isInbox: true, sortOrder: -1, userId: hasan.id, tenantId: tenant.id } })
  const projStrateji = await prisma.todoistProject.create({ data: { name: 'Strateji Plan 2026', color: '#DC2626', viewType: 'LIST', isFavorite: true, sortOrder: 0, userId: hasan.id, tenantId: tenant.id } })
  const projMaliyye = await prisma.todoistProject.create({ data: { name: 'Maliyye Idareetme', color: '#F97316', viewType: 'LIST', isFavorite: true, sortOrder: 1, userId: hasan.id, tenantId: tenant.id } })
  const projIsciIdareetme = await prisma.todoistProject.create({ data: { name: 'Isci Idareetme', color: '#059669', viewType: 'BOARD', isFavorite: false, sortOrder: 2, userId: hasan.id, tenantId: tenant.id } })
  const projShexsi = await prisma.todoistProject.create({ data: { name: 'Sexsi', color: '#EC4899', viewType: 'LIST', isFavorite: false, sortOrder: 3, userId: hasan.id, tenantId: tenant.id } })

  // Hesen labels
  const hLblUrgent = await prisma.todoistLabel.create({ data: { name: 'tecili', color: '#DC4C3E', userId: hasan.id, tenantId: tenant.id } })
  const hLblMeeting = await prisma.todoistLabel.create({ data: { name: 'gorus', color: '#9333EA', userId: hasan.id, tenantId: tenant.id } })
  const hLblHR = await prisma.todoistLabel.create({ data: { name: 'HR', color: '#059669', userId: hasan.id, tenantId: tenant.id } })
  const hLblFinance = await prisma.todoistLabel.create({ data: { name: 'maliyye', color: '#F97316', userId: hasan.id, tenantId: tenant.id } })
  const hLblStrategy = await prisma.todoistLabel.create({ data: { name: 'strateji', color: '#2563EB', userId: hasan.id, tenantId: tenant.id } })

  // Sections - Strateji Plan
  const secQ1 = await prisma.todoistSection.create({ data: { name: 'Q1 (Yanvar-Mart)', sortOrder: 0, projectId: projStrateji.id } })
  const secQ2 = await prisma.todoistSection.create({ data: { name: 'Q2 (Aprel-Iyun)', sortOrder: 1, projectId: projStrateji.id } })
  const secQ3 = await prisma.todoistSection.create({ data: { name: 'Q3 (Iyul-Sentyabr)', sortOrder: 2, projectId: projStrateji.id } })
  const secQ4 = await prisma.todoistSection.create({ data: { name: 'Q4 (Oktyabr-Dekabr)', sortOrder: 3, projectId: projStrateji.id } })

  // Sections - Maliyye
  const secGelir = await prisma.todoistSection.create({ data: { name: 'Gelirler', sortOrder: 0, projectId: projMaliyye.id } })
  const secXerc = await prisma.todoistSection.create({ data: { name: 'Xercler', sortOrder: 1, projectId: projMaliyye.id } })
  const secHesabat = await prisma.todoistSection.create({ data: { name: 'Hesabatlar', sortOrder: 2, projectId: projMaliyye.id } })

  // Sections - Isci Idareetme (Board)
  const secHRPlan = await prisma.todoistSection.create({ data: { name: 'Planlashdirilir', sortOrder: 0, projectId: projIsciIdareetme.id } })
  const secHRActive = await prisma.todoistSection.create({ data: { name: 'Aktiv', sortOrder: 1, projectId: projIsciIdareetme.id } })
  const secHRDone = await prisma.todoistSection.create({ data: { name: 'Tamamlandi', sortOrder: 2, projectId: projIsciIdareetme.id } })

  // ═══════════════════════════════════════════════════════════
  // 10. ~200 GOREV TASKS
  // ═══════════════════════════════════════════════════════════
  console.log('GOREV tapshiriqlar yaradilir (~200)...')

  const gorevCounter = { count: 0 }

  // Helper to create a GOREV task
  async function createGorev(opts: {
    title: string; desc?: string; priority: string; status: string;
    businessId: string; departmentId?: string; creatorId: string;
    assigneeIds: string[]; dueDate?: Date; type?: string;
    approverId?: string; projectId?: string;
    subtasks?: Array<{ title: string; priority: string; status: string }>;
    assigneeStatuses?: string[];
  }) {
    const task = await prisma.task.create({
      data: {
        title: opts.title,
        description: opts.desc || null,
        priority: opts.priority as any,
        status: opts.status as any,
        type: (opts.type || 'GOREV') as any,
        dueDate: opts.dueDate || null,
        businessId: opts.businessId,
        departmentId: opts.departmentId || null,
        creatorId: opts.creatorId,
        approverId: opts.approverId || null,
        tenantId: tenant.id,
        projectId: opts.projectId || null,
        assignees: {
          create: opts.assigneeIds.map((id, i) => ({
            userId: id,
            status: (opts.assigneeStatuses?.[i] || 'PENDING') as any,
          })),
        },
        subTasks: opts.subtasks
          ? {
              create: opts.subtasks.map(st => ({
                title: st.title,
                priority: st.priority as any,
                status: st.status as any,
                tenantId: tenant.id,
                creatorId: opts.creatorId,
              })),
            }
          : undefined,
      },
    })
    gorevCounter.count++
    return task
  }

  // ─── BAKI GOREV-LERI ───

  // IT Sobesinin tasklar (30+)
  await createGorev({
    title: 'Musteri CRM Miqrasiyasi - Q1 2026', desc: 'Kohne Excel bazasindan yeni CRM sistemine butun musteri datalarinin miqrasiyasi. 2500+ musteri, 15000+ elaqe noqtesi.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptIT.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[2].id, bakuWorkers[3].id, bakuWorkers[0].id],
    dueDate: daysFromNow(10),
    subtasks: [
      { title: 'Kohne bazani CSV-ye export et', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Data temizleme ve dublikat silme', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Test muhitine import et', priority: 'MEDIUM', status: 'IN_PROGRESS' },
      { title: 'Data validasiya ve duzelis', priority: 'MEDIUM', status: 'CREATED' },
      { title: 'Canli kecid ve kohne sistemi bagla', priority: 'CRITICAL', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Korporativ Veb Sayt Yenilenmesi', desc: 'Movcud veb saytin tam yeniden dizayn ve development-i. Next.js 15 + Tailwind CSS.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id, bakuWorkers[3].id, bakuWorkers[1].id],
    dueDate: daysFromNow(25),
    subtasks: [
      { title: 'UI/UX dizayn (Figma)', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Frontend development (Next.js)', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Backend API-lar', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Kontent hazirligi (AZ/EN/RU)', priority: 'MEDIUM', status: 'CREATED' },
      { title: 'SEO optimizasiya', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Server tehlukesizlik auditi', desc: 'Penetrasiya testi kecir, log analizi et. Butun serverlerin tehlukesizlik yoxlamasi.',
    priority: 'CRITICAL', status: 'PENDING_APPROVAL', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(3), approverId: leyla.id,
  })

  await createGorev({
    title: 'CI/CD Pipeline qurashdirmasi', desc: 'GitHub Actions ile avtomatik test ve deploy sistemi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id, bakuWorkers[7].id],
    dueDate: daysFromNow(7),
  })

  await createGorev({
    title: 'Mobil tetbiq MVP', desc: 'React Native ile musteri portalinin mobil versiyasi.',
    priority: 'HIGH', status: 'CREATED', businessId: baku.id, departmentId: deptIT.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[3].id, bakuWorkers[2].id],
    dueDate: daysFromNow(45),
    subtasks: [
      { title: 'Wireframe ve prototip', priority: 'HIGH', status: 'CREATED' },
      { title: 'Auth modulu', priority: 'HIGH', status: 'CREATED' },
      { title: 'Dashboard ekrani', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Database performance optimizasiyasi', desc: 'PostgreSQL query-lerini optimize et, indexler elave et.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(5),
  })

  await createGorev({
    title: 'VPN infrastrukturu yenilenmesi', desc: 'Butun filiallari birlesdiren yeni VPN sistemi.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Backup ve disaster recovery plani', desc: 'Avtomatik backup sistemi ve berpa proseduru.',
    priority: 'HIGH', status: 'COMPLETED', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[2].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(10),
  })

  // Satis sobesinin tasklari
  await createGorev({
    title: 'Aylik satis hesabati hazirla', desc: 'Mart ayinin satis reqemlerini analiz et ve mudiriyyete teqdim et.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptSatis.id, creatorId: farid.id,
    assigneeIds: [bakuWorkers[0].id],
    dueDate: daysFromNow(2),
  })

  await createGorev({
    title: 'Yeni musteri prospektleri - Q2', desc: '50 yeni potensial musteri taplmali ve elaqe saxlanmali.',
    priority: 'HIGH', status: 'CREATED', businessId: baku.id, departmentId: deptSatis.id, creatorId: farid.id,
    assigneeIds: [bakuWorkers[0].id, bakuWorkers[8].id],
    dueDate: daysFromNow(30),
    subtasks: [
      { title: 'LinkedIn ile prospekt axtarishi', priority: 'HIGH', status: 'CREATED' },
      { title: 'Cold email kampaniyasi', priority: 'MEDIUM', status: 'CREATED' },
      { title: 'Telefon zenglerinin plani', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'CRM sisteminde musteri seqmentasiyasi', desc: 'Musterileri kateqoriyalara bol: A/B/C tierleri.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptSatis.id, creatorId: farid.id,
    assigneeIds: [bakuWorkers[0].id],
    dueDate: daysFromNow(5),
  })

  await createGorev({
    title: 'Partner muqavileleri yenilenmesi', desc: '5 esas partnyor ile muqavile sertlerini yenile.',
    priority: 'HIGH', status: 'PENDING_APPROVAL', businessId: baku.id, departmentId: deptSatis.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[0].id, bakuWorkers[11].id],
    assigneeStatuses: ['COMPLETED', 'COMPLETED'],
    dueDate: daysAgo(1), approverId: leyla.id,
  })

  await createGorev({
    title: 'Satis komandasi treninq proqrami', desc: 'Yeni satis texnikalari ve CRM istifadesi uzre trening.',
    priority: 'MEDIUM', status: 'CREATED', businessId: baku.id, departmentId: deptSatis.id, creatorId: farid.id,
    assigneeIds: [bakuWorkers[0].id, bakuWorkers[8].id],
    dueDate: daysFromNow(14),
  })

  // Marketinq sobesinin tasklari
  await createGorev({
    title: 'Musteri memnuniyyet sorgusu', desc: 'Online sorgu hazirla ve musterilere gonder. En az 200 cavab topla.',
    priority: 'MEDIUM', status: 'CREATED', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[1].id, bakuWorkers[9].id],
    dueDate: daysFromNow(10),
  })

  await createGorev({
    title: 'Social media strategiya 2026', desc: 'LinkedIn, Instagram, Facebook ucun kontent plani ve kampaniya teqvimi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[1].id, bakuWorkers[9].id],
    dueDate: daysFromNow(5),
    subtasks: [
      { title: 'Reqib analizi', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Kontent teqvimi hazirla', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Dizayn sablonlari yarat', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Google Ads kampaniyasi - Mart', desc: 'Ayliq budje: 3000 AZN. Hedefe: B2B musteriler.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[1].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(7),
  })

  await createGorev({
    title: 'Korporativ video istehsali', desc: 'Sirket tanitim videosu - 3 deqiqelik. Cekilis + montaj.',
    priority: 'LOW', status: 'CREATED', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[9].id],
    dueDate: daysFromNow(30),
  })

  await createGorev({
    title: 'Email marketing avtomatizasiyasi', desc: 'Mailchimp ile avtomatik email funnel qurashdirmasi.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: farid.id,
    assigneeIds: [bakuWorkers[9].id],
    dueDate: daysFromNow(7),
  })

  // HR sobesinin tasklari
  await createGorev({
    title: 'Isci telim proqrami', desc: 'Yeni isciler ucun onboarding materiallari hazirla.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptHR.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[4].id, bakuWorkers[13].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Q1 performans qiymetlendirmesi', desc: 'Butun iscilerin Q1 performansini qiymetlendir.',
    priority: 'HIGH', status: 'CREATED', businessId: baku.id, departmentId: deptHR.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[4].id, bakuWorkers[13].id],
    dueDate: daysFromNow(10),
    subtasks: [
      { title: 'Qiymetlendirme formalari hazirla', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Mudirlerden geri bildirim topla', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Neticeleri cem et ve hesabat yaz', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Yeni isci axtarishi - Senior Developer', desc: '3+ il tecrube, React + Node.js bilgi. Maash: 2500-3500 AZN.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptHR.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[13].id],
    dueDate: daysFromNow(21),
  })

  await createGorev({
    title: 'Isci memnuniyyet anketi', desc: 'Anonim anket ile isci memnuniyyetini olc. Hedefe: 80%+ istirak.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: baku.id, departmentId: deptHR.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[4].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(5),
  })

  // Maliyye sobesinin tasklari
  await createGorev({
    title: 'Aylik Maliyye Hesabati - Fevral', desc: 'Fevral ayinin gelir-xerc balansi, P&L, cashflow hesabati.',
    priority: 'HIGH', status: 'PENDING_APPROVAL', businessId: baku.id, departmentId: deptMaliyye.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[5].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(13), approverId: hasan.id,
  })

  await createGorev({
    title: 'Vergi beyannamesi hazirligi - Q1', desc: 'Butun filiallar ucun Q1 vergi beyannamesi.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptMaliyye.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[5].id, bakuWorkers[12].id],
    dueDate: daysFromNow(10),
  })

  await createGorev({
    title: 'Budje planlasmasi - Q2', desc: 'Butun sobelerin Q2 bujdesini planla.',
    priority: 'HIGH', status: 'CREATED', businessId: baku.id, departmentId: deptMaliyye.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[5].id, bakuWorkers[12].id],
    dueDate: daysFromNow(15),
  })

  await createGorev({
    title: 'Investor prezentasiyasi ucun P&L', desc: 'Son 12 ayin gelir-xerc analizi, investor formatinda.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptMaliyye.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[12].id],
    dueDate: daysFromNow(7),
  })

  // Musteri xidmeti
  await createGorev({
    title: 'Musteri sikayetleri analizi - Mart', desc: 'Butun sikayetleri kateqoriyalashdir ve trend analizi et.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptMusteri.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[6].id],
    dueDate: daysFromNow(3),
  })

  await createGorev({
    title: 'FAQ senedi yenile', desc: 'Musteri xidmeti ucun yeni FAQ hazirla. 50+ sual-cavab.',
    priority: 'LOW', status: 'CREATED', businessId: baku.id, departmentId: deptMusteri.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[6].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Call center performans hesabati', desc: 'Ortalama cavab mudeti, memnuniyyet derecesi, hell olunan saylar.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: baku.id, departmentId: deptMusteri.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[6].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(2),
  })

  // Logistika
  await createGorev({
    title: 'Anbar inventar sayimi - Mart', desc: 'Butun anbarlarin fiziki sayimi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptLogistika.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[10].id],
    dueDate: daysFromNow(2),
  })

  await createGorev({
    title: 'Tedarikcu muqavileleri yenile', desc: '3 esas tedarikcu ile yeni sertlerde muqavile.',
    priority: 'MEDIUM', status: 'CREATED', businessId: baku.id, departmentId: deptLogistika.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[10].id, bakuWorkers[11].id],
    dueDate: daysFromNow(20),
  })

  // Huquq
  await createGorev({
    title: 'GDPR uygunluq yoxlamasi', desc: 'Sexsi melumat emali proseslerini yoxla ve hesabat hazirla.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptHuquq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[11].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Is muqavileleri standartlashdirmasi', desc: 'Butun isci muqavilelerini yeni qanunvericiliye uygunlashdir.',
    priority: 'MEDIUM', status: 'CREATED', businessId: baku.id, departmentId: deptHuquq.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[11].id],
    dueDate: daysFromNow(30),
  })

  // Keyfiyyet
  await createGorev({
    title: 'ISO 9001 Sertifikasiya Senedleri', desc: 'Keyfiyyet idareetme sisteminin senedlesdirilmesi.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptKeyfiyyet.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[7].id, bakuWorkers[4].id],
    dueDate: daysAgo(8),
    subtasks: [
      { title: 'Prosedur senedlerini yaz', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Is axini diaqramlarini hazirla', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Daxili audit kecir', priority: 'CRITICAL', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Mehsul keyfiyyet testi proseduru', desc: 'Standart test prosedurlarini senedlesdir.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: baku.id, departmentId: deptKeyfiyyet.id, creatorId: tural.id,
    assigneeIds: [bakuWorkers[7].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(3),
  })

  // Emeliyyat
  await createGorev({
    title: 'Ofis avadanliq inventari', desc: 'Butun avadanliqlarin siyahisini yenile ve etiketle.',
    priority: 'LOW', status: 'COMPLETED', businessId: baku.id, departmentId: deptEmeliyyat.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[8].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(7),
  })

  await createGorev({
    title: 'Ofis renovasiyasi plani', desc: 'Yeni mebel sifarisi, boyama isleri, aydinlatma yenilenmesi.',
    priority: 'LOW', status: 'CREATED', businessId: baku.id, departmentId: deptEmeliyyat.id, creatorId: leyla.id,
    assigneeIds: [bakuWorkers[8].id],
    dueDate: daysFromNow(45),
  })

  // ─── GENCE GOREV-LERI ───

  await createGorev({
    title: 'Gence Filiali Marketinq Strategiyasi 2026', desc: 'Illik marketinq plani: budje bolgsu, kanal strategiyasi.',
    priority: 'HIGH', status: 'CREATED', businessId: ganja.id, departmentId: deptMarketinq.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[1].id, ganjaWorkers[5].id, ganjaWorkers[9].id],
    dueDate: daysFromNow(20),
    subtasks: [
      { title: 'Bazar arashdirmasi ve reqib analizi', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'SWOT analizi', priority: 'MEDIUM', status: 'CREATED' },
      { title: 'Budje planlamasi', priority: 'HIGH', status: 'CREATED' },
      { title: 'Kampaniya teqvimi hazirla', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Yeni musteri bazasi yaratma', desc: 'CRM sistemini Gence filiali ucun konfiqurasiya et.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: ganja.id, departmentId: deptSatis.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[0].id, ganjaWorkers[1].id],
    dueDate: daysFromNow(5),
  })

  await createGorev({
    title: 'Gence filiali acilish tedbiri', desc: 'Marketing materiallari ve devetnameler hazirla.',
    priority: 'CRITICAL', status: 'CREATED', businessId: ganja.id, departmentId: deptMarketinq.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[4].id, ganjaWorkers[5].id, ganjaWorkers[9].id],
    dueDate: daysFromNow(10),
  })

  await createGorev({
    title: 'Lokal partnyor muqavileleri', desc: 'Gence regionunda partnyor sirketlerle muqavile bagla.',
    priority: 'HIGH', status: 'PENDING_APPROVAL', businessId: ganja.id, departmentId: deptSatis.id, creatorId: aynur.id,
    assigneeIds: [kamran.id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(1), approverId: aynur.id,
  })

  await createGorev({
    title: 'Gence IT infrastrukturu', desc: 'Serverler, shebekeler, isguzar tetbiqlerin qurashdirmasi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: ganja.id, departmentId: deptIT.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[0].id, ganjaWorkers[2].id],
    dueDate: daysFromNow(14),
    subtasks: [
      { title: 'Server qurashdirmasi', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'Shebeke konfiqurasiyasi', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'VPN baglantisi (Baki ile)', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Gence anbar sistemi qurashdirmasi', desc: 'Anbar idare sistemi yazilimi ve barkod okuyucu qurashdirmasi.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: ganja.id, departmentId: deptLogistika.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[7].id],
    dueDate: daysFromNow(7),
  })

  await createGorev({
    title: 'Musteri xidmeti call center', desc: 'Gence regionu ucun call center qurashdirmasi.',
    priority: 'MEDIUM', status: 'CREATED', businessId: ganja.id, departmentId: deptMusteri.id, creatorId: sevda.id,
    assigneeIds: [ganjaWorkers[4].id, ganjaWorkers[6].id, ganjaWorkers[10].id],
    dueDate: daysFromNow(21),
  })

  await createGorev({
    title: 'Gence isci axtarishi - 5 yeni vezife', desc: 'Satis, IT, HR sobelerine yeni isciler.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: ganja.id, departmentId: deptHR.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[3].id],
    dueDate: daysFromNow(30),
    subtasks: [
      { title: 'Is elanlari hazirla', priority: 'HIGH', status: 'COMPLETED' },
      { title: 'CV-leri deyerlendir', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Musahibe kecir', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Gence ofis mebel sifarishi', desc: '20 is masasi, 20 oturacaq, 5 toplanti masasi.',
    priority: 'LOW', status: 'COMPLETED', businessId: ganja.id, departmentId: deptEmeliyyat.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[8].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(14),
  })

  await createGorev({
    title: 'Gence region satis hedefleri', desc: 'Q2 satis hedifleri: 250K AZN.',
    priority: 'HIGH', status: 'CREATED', businessId: ganja.id, departmentId: deptSatis.id, creatorId: kamran.id,
    assigneeIds: [ganjaWorkers[1].id, ganjaWorkers[5].id],
    dueDate: daysFromNow(7),
  })

  await createGorev({
    title: 'Ofis internet xettini yenile - Gence', desc: 'Fiber optik kecid - 200Mbps.',
    priority: 'MEDIUM', status: 'COMPLETED', businessId: ganja.id, departmentId: deptIT.id, creatorId: kamran.id,
    assigneeIds: [ganjaWorkers[0].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(5),
  })

  await createGorev({
    title: 'Gence filiali emeliyyat proseduru', desc: 'Standart emeliyyat prosedurlarini yazilmasi.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: ganja.id, departmentId: deptEmeliyyat.id, creatorId: aynur.id,
    assigneeIds: [ganjaWorkers[8].id, ganjaWorkers[11].id],
    dueDate: daysFromNow(10),
  })

  // ─── SUMQAYIT GOREV-LERI ───

  await createGorev({
    title: 'Sumqayit filiali acilish hazirligi', desc: 'Yeni filialin acilishi ucun butun hazirliqlar.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', businessId: sumqayit.id, departmentId: deptEmeliyyat.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[4].id, sumqayitWorkers[9].id],
    dueDate: daysFromNow(14),
    subtasks: [
      { title: 'Ofis icaresi muqavilesi', priority: 'CRITICAL', status: 'COMPLETED' },
      { title: 'Mebel ve avadanliq sifarishi', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'IT infrastruktur qurashdirmasi', priority: 'HIGH', status: 'CREATED' },
      { title: 'Isci axtarishi ve ise qebul', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Acilish tedbiri planla', priority: 'MEDIUM', status: 'CREATED' },
    ],
  })

  await createGorev({
    title: 'Sumqayit IT shebekesi qurashdirmasi', desc: 'Lokal shebeke, internet, VPN qurashdirmasi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: sumqayit.id, departmentId: deptIT.id, creatorId: vusal.id,
    assigneeIds: [sumqayitWorkers[1].id, sumqayitWorkers[5].id],
    dueDate: daysFromNow(7),
  })

  await createGorev({
    title: 'Sumqayit satis hedefleri - Q2', desc: 'Yeni filial ucun ilk kvartal satis hedefleri.',
    priority: 'HIGH', status: 'CREATED', businessId: sumqayit.id, departmentId: deptSatis.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[2].id, sumqayitWorkers[7].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Musteri xidmeti prosedurlarinin yazilmasi', desc: 'Sumqayit filiali ucun musteri xidmeti standartlari.',
    priority: 'MEDIUM', status: 'CREATED', businessId: sumqayit.id, departmentId: deptMusteri.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[0].id, sumqayitWorkers[8].id],
    dueDate: daysFromNow(21),
  })

  await createGorev({
    title: 'Sumqayit logistika shebekesi', desc: 'Baki-Sumqayit-Gence arasi logistika marshrutlari.',
    priority: 'MEDIUM', status: 'IN_PROGRESS', businessId: sumqayit.id, departmentId: deptLogistika.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[3].id],
    dueDate: daysFromNow(10),
  })

  await createGorev({
    title: 'Keyfiyyet yoxlama sistemi qurashdirmasi', desc: 'Mehsul ve xidmet keyfiyyetini izleme sistemi.',
    priority: 'MEDIUM', status: 'CREATED', businessId: sumqayit.id, departmentId: deptKeyfiyyet.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[6].id],
    dueDate: daysFromNow(30),
  })

  await createGorev({
    title: 'Sumqayit isci ID kartlari', desc: 'Butun Sumqayit iscileri ucun ID kartlari hazirla.',
    priority: 'LOW', status: 'COMPLETED', businessId: sumqayit.id, departmentId: deptEmeliyyat.id, creatorId: vusal.id,
    assigneeIds: [sumqayitWorkers[4].id],
    assigneeStatuses: ['COMPLETED'],
    dueDate: daysAgo(3),
  })

  await createGorev({
    title: 'Sumqayit reklam kampaniyasi', desc: 'Yerli mediada reklam kampaniyasi - billboard ve radio.',
    priority: 'MEDIUM', status: 'CREATED', businessId: sumqayit.id, creatorId: elshan.id,
    assigneeIds: [sumqayitWorkers[2].id, sumqayitWorkers[7].id],
    dueDate: daysFromNow(21),
  })

  // ─── CROSS-FILIAL GOREV-LER ───

  await createGorev({
    title: 'Illik hesabat prezentasiyasi - Board toplantisi', desc: 'Board uzvleri ucun 2025 neticeleri + 2026 plani.',
    priority: 'CRITICAL', status: 'IN_PROGRESS', businessId: baku.id, creatorId: hasan.id,
    assigneeIds: [hasan.id, leyla.id, aynur.id, elshan.id],
    dueDate: daysFromNow(2),
  })

  await createGorev({
    title: 'Butun filiallarda CRM kecirilmesi', desc: '3 filialda eyni zamanda CRM sisteminin qurashdirmasi.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, creatorId: hasan.id,
    assigneeIds: [tural.id, kamran.id, vusal.id],
    dueDate: daysFromNow(30),
  })

  await createGorev({
    title: 'Filiallar arasi team building', desc: 'Baki+Gence+Sumqayit birge komanda tedbirleri.',
    priority: 'LOW', status: 'CREATED', businessId: baku.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[4].id, ganjaWorkers[3].id, sumqayitWorkers[4].id],
    dueDate: daysFromNow(45),
  })

  await createGorev({
    title: 'Vahid korporativ identiklik', desc: 'Logo, reng paleti, korporativ standart - butun filiallar ucun.',
    priority: 'MEDIUM', status: 'CREATED', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: hasan.id,
    assigneeIds: [bakuWorkers[1].id, bakuWorkers[9].id],
    dueDate: daysFromNow(35),
  })

  await createGorev({
    title: 'Yeni musteri muqavilesi - AzerEnerji', desc: '12 aylik retainer muqavile, 150K AZN/il.',
    priority: 'CRITICAL', status: 'CREATED', businessId: baku.id, creatorId: hasan.id,
    assigneeIds: [hasan.id, leyla.id, bakuWorkers[11].id],
    dueDate: daysFromNow(5),
  })

  await createGorev({
    title: 'IT infrastruktur yenileme plani', desc: 'Server, firewall, backup sistemi - butun filiallar.',
    priority: 'HIGH', status: 'IN_PROGRESS', businessId: baku.id, departmentId: deptIT.id, creatorId: tural.id,
    assigneeIds: [hasan.id, tural.id, ganjaWorkers[0].id, sumqayitWorkers[5].id],
    dueDate: daysFromNow(14),
  })

  await createGorev({
    title: 'Reklam kampaniyasi budje tesdiqi', desc: 'Q2 digital marketing: Google + Facebook + LinkedIn = 15K AZN.',
    priority: 'MEDIUM', status: 'PENDING_APPROVAL', businessId: baku.id, departmentId: deptMarketinq.id, creatorId: leyla.id,
    assigneeIds: [hasan.id],
    dueDate: daysFromNow(3), approverId: hasan.id,
  })

  await createGorev({
    title: 'Gence filiali genislendirme tesdiqi', desc: 'Budje: 50,000 AZN. 3 yeni vezife, ofis genislendirilmesi.',
    priority: 'HIGH', status: 'PENDING_APPROVAL', businessId: ganja.id, creatorId: aynur.id,
    assigneeIds: [hasan.id],
    dueDate: daysFromNow(1), approverId: hasan.id,
  })

  // Generate more tasks to reach ~200
  const extraGorevTitles = [
    { t: 'Ayliq server monitorinq hesabati', p: 'MEDIUM', s: 'COMPLETED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Email serverin yenilenmesi', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Musteri feedback formasi yenilensin', p: 'LOW', s: 'CREATED', b: baku.id, d: deptMusteri.id, c: leyla.id, a: [bakuWorkers[6].id] },
    { t: 'Tenderci xidmet kalkulyatoru', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id] },
    { t: 'Korporativ bloq meqaleleri', p: 'LOW', s: 'IN_PROGRESS', b: baku.id, d: deptMarketinq.id, c: leyla.id, a: [bakuWorkers[9].id] },
    { t: 'Isci saglamliq sigortalari', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptHR.id, c: leyla.id, a: [bakuWorkers[4].id] },
    { t: 'Maliyye proqrami lisenziya yenilemesi', p: 'MEDIUM', s: 'COMPLETED', b: baku.id, d: deptMaliyye.id, c: leyla.id, a: [bakuWorkers[5].id] },
    { t: 'Ofis tehlukesizlik kamerasi qurashdirmasi', p: 'HIGH', s: 'COMPLETED', b: baku.id, d: deptEmeliyyat.id, c: leyla.id, a: [bakuWorkers[8].id] },
    { t: 'Axtarish motoru optimizasiyasi (SEO)', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptMarketinq.id, c: leyla.id, a: [bakuWorkers[1].id] },
    { t: 'API documentasiya hazirligi', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id, bakuWorkers[3].id] },
    { t: 'Isci dovriyye analizi', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptHR.id, c: leyla.id, a: [bakuWorkers[13].id] },
    { t: 'Muqavile huquqi ekspertizasi', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptHuquq.id, c: leyla.id, a: [bakuWorkers[11].id] },
    { t: 'Anbar idareetme sistemi yenilenmesi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptLogistika.id, c: leyla.id, a: [bakuWorkers[10].id] },
    { t: 'Mehsul keyfiyyeti testi - seriya 47', p: 'MEDIUM', s: 'COMPLETED', b: baku.id, d: deptKeyfiyyet.id, c: tural.id, a: [bakuWorkers[7].id] },

    // Gence extra
    { t: 'Gence yerli media elaqeleri', p: 'MEDIUM', s: 'CREATED', b: ganja.id, d: deptMarketinq.id, c: aynur.id, a: [ganjaWorkers[9].id] },
    { t: 'Gence anbar temiri', p: 'LOW', s: 'COMPLETED', b: ganja.id, d: deptEmeliyyat.id, c: aynur.id, a: [ganjaWorkers[8].id] },
    { t: 'Regional satis trendinqleri analizi', p: 'MEDIUM', s: 'IN_PROGRESS', b: ganja.id, d: deptSatis.id, c: kamran.id, a: [ganjaWorkers[1].id] },
    { t: 'Musteri xidmeti treninq proqrami', p: 'MEDIUM', s: 'CREATED', b: ganja.id, d: deptMusteri.id, c: sevda.id, a: [ganjaWorkers[4].id, ganjaWorkers[6].id] },
    { t: 'Gence IT tehlukesizlik auditi', p: 'HIGH', s: 'CREATED', b: ganja.id, d: deptIT.id, c: aynur.id, a: [ganjaWorkers[0].id] },
    { t: 'Gence musteri database migrasiyas', p: 'HIGH', s: 'IN_PROGRESS', b: ganja.id, d: deptIT.id, c: kamran.id, a: [ganjaWorkers[0].id, ganjaWorkers[2].id] },
    { t: 'Logistika marshrutlarinin optimizasiyasi', p: 'MEDIUM', s: 'IN_PROGRESS', b: ganja.id, d: deptLogistika.id, c: aynur.id, a: [ganjaWorkers[7].id] },
    { t: 'Gence isci is geyimleri sifarishi', p: 'LOW', s: 'COMPLETED', b: ganja.id, d: deptHR.id, c: aynur.id, a: [ganjaWorkers[3].id] },

    // Sumqayit extra
    { t: 'Sumqayit musteri bazasi yaratma', p: 'HIGH', s: 'IN_PROGRESS', b: sumqayit.id, d: deptSatis.id, c: elshan.id, a: [sumqayitWorkers[2].id] },
    { t: 'Sumqayit ofis temiri ve boyama', p: 'MEDIUM', s: 'COMPLETED', b: sumqayit.id, d: deptEmeliyyat.id, c: elshan.id, a: [sumqayitWorkers[9].id] },
    { t: 'Sumqayit IT avadanliq sifarishi', p: 'HIGH', s: 'IN_PROGRESS', b: sumqayit.id, d: deptIT.id, c: vusal.id, a: [sumqayitWorkers[1].id] },
    { t: 'Sumqayit musteri xidmeti sistemi', p: 'MEDIUM', s: 'CREATED', b: sumqayit.id, d: deptMusteri.id, c: elshan.id, a: [sumqayitWorkers[0].id] },
    { t: 'Sumqayit anbar qurashdirmasi', p: 'MEDIUM', s: 'IN_PROGRESS', b: sumqayit.id, d: deptLogistika.id, c: elshan.id, a: [sumqayitWorkers[3].id] },
    { t: 'Sumqayit ilk ay satis hesabati', p: 'HIGH', s: 'CREATED', b: sumqayit.id, d: deptSatis.id, c: elshan.id, a: [sumqayitWorkers[7].id] },
    { t: 'Sumqayit emeliyyat instrukciyalari', p: 'MEDIUM', s: 'IN_PROGRESS', b: sumqayit.id, d: deptEmeliyyat.id, c: vusal.id, a: [sumqayitWorkers[9].id] },
    { t: 'Sumqayit keyfiyyet standartlari senedi', p: 'LOW', s: 'CREATED', b: sumqayit.id, d: deptKeyfiyyet.id, c: elshan.id, a: [sumqayitWorkers[6].id] },

    // More Baki
    { t: 'Pentest neticelerinin analizi', p: 'CRITICAL', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Printer ve skaner qurashdirmasi', p: 'LOW', s: 'COMPLETED', b: baku.id, d: deptEmeliyyat.id, c: leyla.id, a: [bakuWorkers[8].id] },
    { t: 'Korporativ email imza dizayni', p: 'LOW', s: 'COMPLETED', b: baku.id, d: deptMarketinq.id, c: leyla.id, a: [bakuWorkers[9].id] },
    { t: 'Partnyor sirketlerle networking tedbi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id] },
    { t: 'Isci dogum gunu hediyyesi sistemi', p: 'LOW', s: 'CREATED', b: baku.id, d: deptHR.id, c: leyla.id, a: [bakuWorkers[13].id] },
    { t: 'Maliyye sistemine yeni modul', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptMaliyye.id, c: hasan.id, a: [bakuWorkers[12].id] },
    { t: 'Dashboard analitika sistemi', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[3].id] },
    { t: 'Keyfiyyet auditi hesabati Q1', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptKeyfiyyet.id, c: leyla.id, a: [bakuWorkers[7].id] },
    { t: 'Logistika xercleri optimizasiyasi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptLogistika.id, c: leyla.id, a: [bakuWorkers[10].id] },
    { t: 'Texniki destek chatbot qurashdirmasi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[3].id] },
    { t: 'Reklam banner dizaynlari - Q2', p: 'LOW', s: 'CREATED', b: baku.id, d: deptMarketinq.id, c: farid.id, a: [bakuWorkers[9].id] },
    { t: 'Ofis temizlik sifarishi', p: 'LOW', s: 'COMPLETED', b: baku.id, d: deptEmeliyyat.id, c: leyla.id, a: [bakuWorkers[8].id] },
    { t: 'Musteri sorusu: DataTech hesabat', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptMusteri.id, c: farid.id, a: [bakuWorkers[6].id] },
    { t: 'Maas sistemi avtomatizasiyasi', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptMaliyye.id, c: hasan.id, a: [bakuWorkers[5].id, bakuWorkers[12].id] },
    { t: 'Huquqi risklerin qiymetlendirilmesi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptHuquq.id, c: leyla.id, a: [bakuWorkers[11].id] },
    { t: 'Satis pipeline dashboard-u', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id] },

    // More Gence
    { t: 'Gence musteri toplantisi - Aprel', p: 'MEDIUM', s: 'CREATED', b: ganja.id, d: deptSatis.id, c: kamran.id, a: [ganjaWorkers[1].id, ganjaWorkers[5].id] },
    { t: 'Gence ofis genislenmesi plani', p: 'HIGH', s: 'CREATED', b: ganja.id, d: deptEmeliyyat.id, c: aynur.id, a: [ganjaWorkers[8].id] },
    { t: 'Gence region KPI hedefleri', p: 'HIGH', s: 'IN_PROGRESS', b: ganja.id, d: deptSatis.id, c: aynur.id, a: [kamran.id] },
    { t: 'Gence server backup sistemi', p: 'MEDIUM', s: 'COMPLETED', b: ganja.id, d: deptIT.id, c: kamran.id, a: [ganjaWorkers[0].id] },
    { t: 'Gence satis komandasi treninqi', p: 'MEDIUM', s: 'CREATED', b: ganja.id, d: deptSatis.id, c: kamran.id, a: [ganjaWorkers[1].id] },

    // More Sumqayit
    { t: 'Sumqayit isci treninq plani', p: 'MEDIUM', s: 'CREATED', b: sumqayit.id, c: elshan.id, a: [sumqayitWorkers[4].id] },
    { t: 'Sumqayit server qurashdirmasi', p: 'HIGH', s: 'IN_PROGRESS', b: sumqayit.id, d: deptIT.id, c: vusal.id, a: [sumqayitWorkers[5].id] },
    { t: 'Sumqayit ofis aydinlatma sistemi', p: 'LOW', s: 'COMPLETED', b: sumqayit.id, d: deptEmeliyyat.id, c: elshan.id, a: [sumqayitWorkers[9].id] },
    { t: 'Sumqayit musteri sorgusu', p: 'MEDIUM', s: 'CREATED', b: sumqayit.id, d: deptMusteri.id, c: elshan.id, a: [sumqayitWorkers[0].id, sumqayitWorkers[8].id] },
    { t: 'Sumqayit logistika hesabati', p: 'LOW', s: 'CREATED', b: sumqayit.id, d: deptLogistika.id, c: elshan.id, a: [sumqayitWorkers[3].id] },

    // More cross-filial
    { t: 'Butun filiallarda is saatlari standartlashdirmasi', p: 'MEDIUM', s: 'CREATED', b: baku.id, c: hasan.id, a: [leyla.id, aynur.id, elshan.id] },
    { t: 'Korporativ email sistema kecirilmesi', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: hasan.id, a: [tural.id, ganjaWorkers[0].id, sumqayitWorkers[5].id] },
    { t: 'Vahid maas skalasinm tehlili', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptHR.id, c: hasan.id, a: [bakuWorkers[4].id, ganjaWorkers[3].id] },
    { t: 'Filiallar arasi datanin sinxronizasiyasi', p: 'HIGH', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id, ganjaWorkers[0].id, sumqayitWorkers[1].id] },

    // Even more Baki IT
    { t: 'SSL sertifikat yenilenmesi', p: 'CRITICAL', s: 'COMPLETED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Kod review prosesinin tetbiqi', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id, bakuWorkers[3].id] },
    { t: 'Unit test coverage artirmaq', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[3].id] },
    { t: 'Redis cache optimizasiyasi', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Docker containerization', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Monitoring ve alerting sistemi', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id, bakuWorkers[7].id] },

    // Baki Satis extra
    { t: 'Musteri retention strategiyasi', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id] },
    { t: 'Satis avtomatizasiya sistemi', p: 'MEDIUM', s: 'IN_PROGRESS', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id, bakuWorkers[8].id] },
    { t: 'Reqib analizi hesabati - Q1', p: 'MEDIUM', s: 'COMPLETED', b: baku.id, d: deptSatis.id, c: farid.id, a: [bakuWorkers[0].id] },

    // Gence extra
    { t: 'Gence yerli sponsor axtarishi', p: 'MEDIUM', s: 'CREATED', b: ganja.id, d: deptSatis.id, c: kamran.id, a: [ganjaWorkers[1].id] },
    { t: 'Gence isci orientasiya proqrami', p: 'LOW', s: 'CREATED', b: ganja.id, d: deptHR.id, c: sevda.id, a: [ganjaWorkers[3].id] },
    { t: 'Gence ofis tehlukesizlik sistemi', p: 'MEDIUM', s: 'IN_PROGRESS', b: ganja.id, d: deptIT.id, c: kamran.id, a: [ganjaWorkers[2].id] },
    { t: 'Gence musteri zenglerinin analizi', p: 'LOW', s: 'CREATED', b: ganja.id, d: deptMusteri.id, c: sevda.id, a: [ganjaWorkers[10].id] },

    // Sumqayit extra
    { t: 'Sumqayit internet qurashdirmasi', p: 'HIGH', s: 'COMPLETED', b: sumqayit.id, d: deptIT.id, c: vusal.id, a: [sumqayitWorkers[5].id] },
    { t: 'Sumqayit telefon sistemi qurashdirmasi', p: 'MEDIUM', s: 'IN_PROGRESS', b: sumqayit.id, d: deptIT.id, c: vusal.id, a: [sumqayitWorkers[1].id] },
    { t: 'Sumqayit ilk satis toplantisi', p: 'HIGH', s: 'CREATED', b: sumqayit.id, d: deptSatis.id, c: elshan.id, a: [sumqayitWorkers[2].id, sumqayitWorkers[7].id] },
    { t: 'Sumqayit musterilere tanitim mektubu', p: 'MEDIUM', s: 'CREATED', b: sumqayit.id, c: elshan.id, a: [sumqayitWorkers[0].id] },
    { t: 'Sumqayit emeliyyat hedefleri Q2', p: 'HIGH', s: 'CREATED', b: sumqayit.id, d: deptEmeliyyat.id, c: elshan.id, a: [sumqayitWorkers[9].id] },

    // More misc
    { t: 'Isci motivasiya proqrami hazirlanmasi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptHR.id, c: leyla.id, a: [bakuWorkers[4].id, bakuWorkers[13].id] },
    { t: 'Korporativ hediyye kataloqu yaradilmasi', p: 'LOW', s: 'CREATED', b: baku.id, d: deptMarketinq.id, c: leyla.id, a: [bakuWorkers[9].id] },
    { t: 'Daxili kommunikasiya portalinin yaradilmasi', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptIT.id, c: hasan.id, a: [bakuWorkers[2].id, bakuWorkers[3].id] },
    { t: 'Emeliyyat xerclerinin azaldilmasi plani', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptMaliyye.id, c: hasan.id, a: [bakuWorkers[5].id] },
    { t: 'Isci saglamliq yoxlamasi', p: 'LOW', s: 'CREATED', b: baku.id, d: deptHR.id, c: leyla.id, a: [bakuWorkers[4].id] },
    { t: 'Senedsaxtama ehtimali auditi', p: 'HIGH', s: 'CREATED', b: baku.id, d: deptMaliyye.id, c: hasan.id, a: [bakuWorkers[12].id] },
    { t: 'Tedarik zenciri optimizasiyasi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptLogistika.id, c: leyla.id, a: [bakuWorkers[10].id] },
    { t: 'Webhook integrasiya sistemi', p: 'MEDIUM', s: 'CREATED', b: baku.id, d: deptIT.id, c: tural.id, a: [bakuWorkers[2].id] },
    { t: 'Gence iscilerle gorusler sedulle et', p: 'LOW', s: 'CREATED', b: ganja.id, d: deptHR.id, c: aynur.id, a: [ganjaWorkers[3].id] },
    { t: 'Sumqayit dasinma logistikasi', p: 'HIGH', s: 'COMPLETED', b: sumqayit.id, d: deptLogistika.id, c: elshan.id, a: [sumqayitWorkers[3].id] },
  ]

  for (const g of extraGorevTitles) {
    const dueOffset = g.s === 'COMPLETED' ? -Math.floor(Math.random() * 14) : Math.floor(Math.random() * 30) + 1
    await createGorev({
      title: g.t,
      priority: g.p,
      status: g.s,
      businessId: g.b,
      departmentId: g.d || undefined,
      creatorId: g.c,
      assigneeIds: g.a,
      assigneeStatuses: g.s === 'COMPLETED' ? g.a.map(() => 'COMPLETED') : undefined,
      dueDate: g.s === 'COMPLETED' ? daysAgo(Math.abs(dueOffset)) : daysFromNow(dueOffset),
    })
  }

  console.log(`  ${gorevCounter.count} GOREV yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // 11. ~100 TODOIST TASKS
  // ═══════════════════════════════════════════════════════════
  console.log('Todoist tapshiriqlar yaradilir (~100)...')

  let todoistCount = 0

  async function createTodoistTask(opts: {
    content: string; desc?: string; priority: string;
    projectId: string; sectionId?: string; parentId?: string;
    userId: string; dueDate?: Date | null; isCompleted?: boolean;
    isRecurring?: boolean; recurRule?: string; dueString?: string;
    duration?: number; sortOrder?: number;
    labelIds?: string[];
  }) {
    const task = await prisma.todoistTask.create({
      data: {
        content: opts.content,
        description: opts.desc || null,
        priority: opts.priority as any,
        projectId: opts.projectId,
        sectionId: opts.sectionId || null,
        parentId: opts.parentId || null,
        userId: opts.userId,
        tenantId: tenant.id,
        dueDate: opts.dueDate || null,
        isCompleted: opts.isCompleted || false,
        completedAt: opts.isCompleted ? new Date() : null,
        isRecurring: opts.isRecurring || false,
        recurRule: opts.recurRule || null,
        dueString: opts.dueString || null,
        duration: opts.duration || null,
        sortOrder: opts.sortOrder || 0,
      },
    })
    if (opts.labelIds) {
      for (const lid of opts.labelIds) {
        await prisma.todoistTaskLabel.create({ data: { taskId: task.id, labelId: lid } })
      }
    }
    todoistCount++
    return task
  }

  // ─── HESEN TODOIST TAPSHIRIQLARI ───

  // Inbox
  await createTodoistTask({ content: 'Mudirlerle heftelik gorus agendasi hazirla', priority: 'P2', projectId: hasanInbox.id, userId: hasan.id, dueDate: daysFromNow(0), labelIds: [hLblMeeting.id] })
  await createTodoistTask({ content: 'Partner sirketden gelen teklifi yoxla', priority: 'P2', projectId: hasanInbox.id, userId: hasan.id, dueDate: daysFromNow(0), labelIds: [hLblUrgent.id] })
  await createTodoistTask({ content: 'Yeni ofis mebel kataloqu sec', priority: 'P4', projectId: hasanInbox.id, userId: hasan.id })
  await createTodoistTask({ content: 'Hefte sonu Sumqayit filialina get', priority: 'P3', projectId: hasanInbox.id, userId: hasan.id, dueDate: daysFromNow(3) })
  await createTodoistTask({ content: 'Yeni CRM sistemini yoxla', priority: 'P2', projectId: hasanInbox.id, userId: hasan.id, dueDate: daysFromNow(1), labelIds: [hLblUrgent.id] })

  // Strateji Plan Q1
  await createTodoistTask({ content: 'Illik budje planini tesdigle', desc: '2026 bujdesi - butun filiallar', priority: 'P1', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysAgo(5), isCompleted: true, labelIds: [hLblFinance.id, hLblStrategy.id] })
  await createTodoistTask({ content: 'Q1 KPI hediflerini mueyyen et', priority: 'P1', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysAgo(3), isCompleted: true, labelIds: [hLblStrategy.id] })
  await createTodoistTask({ content: 'Gence filiali genisleme plani', desc: '3 yeni isci, ofis genislendirilmesi', priority: 'P2', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysFromNow(0), labelIds: [hLblStrategy.id, hLblHR.id] })
  await createTodoistTask({ content: 'CRM miqrasiya layihesini nezerdetde saxla', priority: 'P1', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysFromNow(0), labelIds: [hLblUrgent.id] })
  await createTodoistTask({ content: 'ISO 9001 audit tarixini tesdigle', priority: 'P2', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysFromNow(1), labelIds: [hLblUrgent.id] })
  await createTodoistTask({ content: 'Q1 maliyye hesabatini yoxla', priority: 'P2', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysFromNow(3), labelIds: [hLblFinance.id] })
  await createTodoistTask({ content: 'Sumqayit filiali acilish plani', priority: 'P1', projectId: projStrateji.id, sectionId: secQ1.id, userId: hasan.id, dueDate: daysFromNow(7), labelIds: [hLblStrategy.id, hLblUrgent.id] })

  // Q2
  await createTodoistTask({ content: 'SaaS pricing modeli yaratma', priority: 'P2', projectId: projStrateji.id, sectionId: secQ2.id, userId: hasan.id, dueDate: daysFromNow(14), labelIds: [hLblStrategy.id, hLblFinance.id] })
  await createTodoistTask({ content: 'Baki+Gence+Sumqayit birge team building', priority: 'P3', projectId: projStrateji.id, sectionId: secQ2.id, userId: hasan.id, dueDate: daysFromNow(30), labelIds: [hLblHR.id] })
  await createTodoistTask({ content: 'Yeni CRM sistemi tam kecid', priority: 'P1', projectId: projStrateji.id, sectionId: secQ2.id, userId: hasan.id, dueDate: daysFromNow(21), labelIds: [hLblStrategy.id, hLblUrgent.id] })
  await createTodoistTask({ content: 'Marketinq bujdesi 2-ci yarim il', priority: 'P3', projectId: projStrateji.id, sectionId: secQ2.id, userId: hasan.id, dueDate: daysFromNow(45), labelIds: [hLblFinance.id] })
  await createTodoistTask({ content: 'Investor prezentasiyasi hazirla', priority: 'P2', projectId: projStrateji.id, sectionId: secQ2.id, userId: hasan.id, dueDate: daysFromNow(20), labelIds: [hLblStrategy.id, hLblFinance.id] })

  // Q3
  await createTodoistTask({ content: 'Beynelxalq bazar genislenmesi arashdirmasi', priority: 'P3', projectId: projStrateji.id, sectionId: secQ3.id, userId: hasan.id, dueDate: daysFromNow(90), labelIds: [hLblStrategy.id] })
  await createTodoistTask({ content: 'Illik sirket picniki', priority: 'P4', projectId: projStrateji.id, sectionId: secQ3.id, userId: hasan.id, dueDate: daysFromNow(120), labelIds: [hLblHR.id] })

  // Maliyye
  await createTodoistTask({ content: 'Mart maashlarini tesdigle (50 nefer)', priority: 'P1', projectId: projMaliyye.id, sectionId: secGelir.id, userId: hasan.id, dueDate: daysFromNow(0), labelIds: [hLblFinance.id, hLblUrgent.id] })
  await createTodoistTask({ content: 'AWS server xerclerini optimallasdirr', priority: 'P2', projectId: projMaliyye.id, sectionId: secXerc.id, userId: hasan.id, dueDate: daysFromNow(1), labelIds: [hLblFinance.id] })
  await createTodoistTask({ content: 'Reklam ROI hesabatini yoxla', priority: 'P3', projectId: projMaliyye.id, sectionId: secXerc.id, userId: hasan.id, dueDate: daysFromNow(5), labelIds: [hLblFinance.id] })
  await createTodoistTask({ content: 'Vergi beyannamesi hazirligi', priority: 'P1', projectId: projMaliyye.id, sectionId: secHesabat.id, userId: hasan.id, dueDate: daysFromNow(10), labelIds: [hLblFinance.id, hLblUrgent.id] })
  await createTodoistTask({ content: 'Investor ucun P&L hesabati', priority: 'P2', projectId: projMaliyye.id, sectionId: secHesabat.id, userId: hasan.id, dueDate: daysFromNow(7), labelIds: [hLblFinance.id, hLblStrategy.id] })
  await createTodoistTask({ content: 'Sumqayit acilish budjesi', priority: 'P2', projectId: projMaliyye.id, sectionId: secXerc.id, userId: hasan.id, dueDate: daysFromNow(3), labelIds: [hLblFinance.id] })

  // HR Board
  await createTodoistTask({ content: 'Senior Developer axtarishi', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRPlan.id, userId: hasan.id })
  await createTodoistTask({ content: 'Gence HR mudir namizedi', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRPlan.id, userId: hasan.id })
  await createTodoistTask({ content: 'Isci memnuniyyet sorgusu neticeleri', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRPlan.id, userId: hasan.id })
  await createTodoistTask({ content: 'Sumqayit 10 yeni isci axtarishi', priority: 'P2', projectId: projIsciIdareetme.id, sectionId: secHRPlan.id, userId: hasan.id })
  await createTodoistTask({ content: 'Performans qiymetlendirme Q1', priority: 'P2', projectId: projIsciIdareetme.id, sectionId: secHRActive.id, userId: hasan.id })
  await createTodoistTask({ content: 'Yeni isci onboarding (5 nefer)', priority: 'P2', projectId: projIsciIdareetme.id, sectionId: secHRActive.id, userId: hasan.id })
  await createTodoistTask({ content: 'Maas skalasi tehlili', priority: 'P2', projectId: projIsciIdareetme.id, sectionId: secHRActive.id, userId: hasan.id, labelIds: [hLblFinance.id] })
  await createTodoistTask({ content: 'Isci kartlari hazilrandi', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRDone.id, userId: hasan.id, isCompleted: true })
  await createTodoistTask({ content: 'Ofis internet yenilendi', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRDone.id, userId: hasan.id, isCompleted: true })
  await createTodoistTask({ content: 'Isci sigortalari yenilendi', priority: 'P3', projectId: projIsciIdareetme.id, sectionId: secHRDone.id, userId: hasan.id, isCompleted: true })

  // Sexsi
  await createTodoistTask({ content: 'Ailevi seyahet planla - Iyun', priority: 'P3', projectId: projShexsi.id, userId: hasan.id, dueDate: daysFromNow(60) })
  await createTodoistTask({ content: 'Ushaq ucun mekteb secimi arasdir', priority: 'P2', projectId: projShexsi.id, userId: hasan.id, dueDate: daysFromNow(14) })
  await createTodoistTask({ content: 'Stomatoloq randevusu - 28 Mart', priority: 'P2', projectId: projShexsi.id, userId: hasan.id, dueDate: dateStr(2026, 3, 28) })
  await createTodoistTask({ content: 'Mashin texniki baxish - Aprel', priority: 'P3', projectId: projShexsi.id, userId: hasan.id, dueDate: dateStr(2026, 4, 5) })
  await createTodoistTask({ content: 'Kitab bitir: "Zero to One"', priority: 'P4', projectId: projShexsi.id, userId: hasan.id })
  await createTodoistTask({ content: 'Ev ucun sigorta yenile', priority: 'P3', projectId: projShexsi.id, userId: hasan.id, dueDate: daysFromNow(20) })

  // Recurring tasks
  const recurWeekly = await createTodoistTask({
    content: 'Heftelik komanda icmali yaz', priority: 'P2', projectId: hasanInbox.id, userId: hasan.id,
    dueDate: daysFromNow(1), isRecurring: true, recurRule: 'FREQ=WEEKLY;BYDAY=MO', dueString: 'her bazar ertesi',
    labelIds: [hLblMeeting.id],
  })
  await createTodoistTask({
    content: 'Ayliq maliyye icmalini yoxla', priority: 'P1', projectId: projMaliyye.id, userId: hasan.id,
    dueDate: daysFromNow(7), isRecurring: true, recurRule: 'FREQ=MONTHLY;BYMONTHDAY=1', dueString: 'her ayin 1-i',
    labelIds: [hLblFinance.id],
  })
  await createTodoistTask({
    content: 'Gundelig is planini hazirla', priority: 'P3', projectId: hasanInbox.id, userId: hasan.id,
    dueDate: daysFromNow(0), isRecurring: true, recurRule: 'FREQ=DAILY', dueString: 'her gun',
  })

  // ─── LEYLA TODOIST ───
  const leylaInbox = await prisma.todoistProject.create({ data: { name: 'Inbox', color: '#808080', viewType: 'LIST', isInbox: true, sortOrder: -1, userId: leyla.id, tenantId: tenant.id } })
  const leylaVebDizayn = await prisma.todoistProject.create({ data: { name: 'Veb Dizayn', color: '#7C3AED', viewType: 'LIST', isFavorite: true, sortOrder: 0, userId: leyla.id, tenantId: tenant.id } })
  const leylaMobil = await prisma.todoistProject.create({ data: { name: 'Mobil Tetbiq', color: '#059669', viewType: 'BOARD', isFavorite: true, sortOrder: 1, userId: leyla.id, tenantId: tenant.id } })

  const lLblUrgent = await prisma.todoistLabel.create({ data: { name: 'tecili', color: '#DC4C3E', userId: leyla.id, tenantId: tenant.id } })
  const lLblWork = await prisma.todoistLabel.create({ data: { name: 'is', color: '#246FE0', userId: leyla.id, tenantId: tenant.id } })
  const lLblDesign = await prisma.todoistLabel.create({ data: { name: 'dizayn', color: '#059669', userId: leyla.id, tenantId: tenant.id } })
  const lLblMeeting = await prisma.todoistLabel.create({ data: { name: 'gorus', color: '#9333EA', userId: leyla.id, tenantId: tenant.id } })
  const lLblBug = await prisma.todoistLabel.create({ data: { name: 'bug', color: '#EF4444', userId: leyla.id, tenantId: tenant.id } })

  // Leyla Veb Dizayn sections
  const lSecDesign = await prisma.todoistSection.create({ data: { name: 'Dizayn', sortOrder: 0, projectId: leylaVebDizayn.id } })
  const lSecDev = await prisma.todoistSection.create({ data: { name: 'Development', sortOrder: 1, projectId: leylaVebDizayn.id } })
  const lSecTest = await prisma.todoistSection.create({ data: { name: 'Test & Deploy', sortOrder: 2, projectId: leylaVebDizayn.id } })

  // Leyla Mobil sections
  const lSecBacklog = await prisma.todoistSection.create({ data: { name: 'Backlog', sortOrder: 0, projectId: leylaMobil.id } })
  const lSecInProg = await prisma.todoistSection.create({ data: { name: 'Ishde', sortOrder: 1, projectId: leylaMobil.id } })
  const lSecDone = await prisma.todoistSection.create({ data: { name: 'Tamamlandi', sortOrder: 2, projectId: leylaMobil.id } })

  // Leyla tasks
  await createTodoistTask({ content: 'Dunenki gorus qeydlerini paylas', priority: 'P2', projectId: leylaInbox.id, userId: leyla.id, dueDate: daysFromNow(0), labelIds: [lLblWork.id, lLblMeeting.id] })
  await createTodoistTask({ content: 'Freelancer-e dizayn brief gonder', priority: 'P3', projectId: leylaInbox.id, userId: leyla.id, dueDate: daysFromNow(1), labelIds: [lLblDesign.id] })
  await createTodoistTask({ content: 'VPN hesabini yenile', priority: 'P4', projectId: leylaInbox.id, userId: leyla.id })
  await createTodoistTask({ content: 'Ana sehife wireframe', priority: 'P1', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, userId: leyla.id, dueDate: daysAgo(2), isCompleted: true, labelIds: [lLblDesign.id, lLblUrgent.id] })
  await createTodoistTask({ content: 'Reng paleti ve tipografiya sistemi', priority: 'P2', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, userId: leyla.id, dueDate: daysFromNow(0), labelIds: [lLblDesign.id] })

  const kompTask = await createTodoistTask({ content: 'Komponent kitabxanasi (Storybook)', priority: 'P2', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, userId: leyla.id, dueDate: daysFromNow(1), labelIds: [lLblDesign.id, lLblWork.id] })
  // Subtasks
  await createTodoistTask({ content: 'Button variants', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, parentId: kompTask.id, userId: leyla.id, isCompleted: true })
  await createTodoistTask({ content: 'Input + form controls', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, parentId: kompTask.id, userId: leyla.id })
  await createTodoistTask({ content: 'Modal + Dialog', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, parentId: kompTask.id, userId: leyla.id })
  await createTodoistTask({ content: 'Table + pagination', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDesign.id, parentId: kompTask.id, userId: leyla.id })

  await createTodoistTask({ content: 'Next.js 15 layihe strukturu', priority: 'P1', projectId: leylaVebDizayn.id, sectionId: lSecDev.id, userId: leyla.id, dueDate: daysAgo(3), isCompleted: true, labelIds: [lLblWork.id] })
  await createTodoistTask({ content: 'Auth sistemi (JWT + Refresh)', priority: 'P1', projectId: leylaVebDizayn.id, sectionId: lSecDev.id, userId: leyla.id, dueDate: daysFromNow(0), labelIds: [lLblWork.id, lLblUrgent.id] })
  await createTodoistTask({ content: 'REST API endpointleri', priority: 'P2', projectId: leylaVebDizayn.id, sectionId: lSecDev.id, userId: leyla.id, dueDate: daysFromNow(2), labelIds: [lLblWork.id] })
  await createTodoistTask({ content: 'WebSocket real-time bildirisher', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDev.id, userId: leyla.id, dueDate: daysFromNow(7) })
  await createTodoistTask({ content: 'Dashboard analytics chartlar', priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecDev.id, userId: leyla.id, dueDate: daysFromNow(10) })

  for (const t of ['Unit testler yaz (Jest)', 'E2E testler (Playwright)', 'CI/CD pipeline qur', 'Staging deploy', 'Production deploy + DNS']) {
    await createTodoistTask({ content: t, priority: 'P3', projectId: leylaVebDizayn.id, sectionId: lSecTest.id, userId: leyla.id, dueDate: daysFromNow(14) })
  }

  // Mobil board
  for (const t of ['Push notification sistemi', 'Offline mode + sync', 'Biometric login', 'Deep linking']) {
    await createTodoistTask({ content: t, priority: 'P3', projectId: leylaMobil.id, sectionId: lSecBacklog.id, userId: leyla.id })
  }
  for (const t of ['Login/Register ekranlari', 'Dashboard ekrani']) {
    await createTodoistTask({ content: t, priority: 'P2', projectId: leylaMobil.id, sectionId: lSecInProg.id, userId: leyla.id })
  }
  for (const t of ['React Native boilerplate', 'Navigation (React Navigation)']) {
    await createTodoistTask({ content: t, priority: 'P2', projectId: leylaMobil.id, sectionId: lSecDone.id, userId: leyla.id, isCompleted: true })
  }

  // Recurring for Leyla
  await createTodoistTask({
    content: 'Heftelik sprint review hazirla', priority: 'P2', projectId: leylaInbox.id, userId: leyla.id,
    dueDate: daysFromNow(2), isRecurring: true, recurRule: 'FREQ=WEEKLY;BYDAY=FR', dueString: 'her cume',
    labelIds: [lLblMeeting.id],
  })

  console.log(`  ${todoistCount} Todoist tapshiriq yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // 12. TASK TEMPLATES
  // ═══════════════════════════════════════════════════════════
  console.log('Tapshiriq shablonlari yaradilir...')

  await prisma.taskTemplate.create({
    data: {
      name: 'Aylik Satis Hesabati',
      description: 'Her ay satis reqemlerini toplayib hesabat shablonunu doldurun',
      isRecurring: true, isActive: true, scheduleType: 'MONTHLY', scheduleTime: '09:00',
      dayOfMonth: 10, notificationDay: 13, deadlineDay: 15,
      nextRunAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10, 9, 0),
      lastRunAt: new Date(new Date().getFullYear(), new Date().getMonth(), 10, 9, 0),
      creatorId: leyla.id, tenantId: tenant.id, businessId: baku.id,
      departmentId: bakuBDs[deptSatis.id]?.id,
      items: { create: [
        { title: 'Satis melumatlarini CRM-den yukle', priority: 'HIGH', sortOrder: 0 },
        { title: 'Excel shablonunu doldur', priority: 'MEDIUM', sortOrder: 1 },
        { title: 'Mudure e-poct ile gonder', priority: 'MEDIUM', sortOrder: 2 },
      ]},
      assignees: { create: [{ userId: bakuWorkers[0].id }, { userId: bakuWorkers[1].id }] },
    },
  })

  await prisma.taskTemplate.create({
    data: {
      name: 'Heftelik Gorus Notu',
      description: 'Her hefte komanda gorusunun qeydlerini hazirlayin',
      isRecurring: true, isActive: true, scheduleType: 'WEEKLY', scheduleTime: '09:00',
      dayOfWeek: 1,
      nextRunAt: (() => { const d = new Date(); d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); return d })(),
      creatorId: leyla.id, tenantId: tenant.id, businessId: baku.id,
      items: { create: [
        { title: 'Kecen heftenin neticelerini yazin', priority: 'MEDIUM', sortOrder: 0 },
        { title: 'Bu heftenin hedeflerini mueyyen edin', priority: 'HIGH', sortOrder: 1 },
      ]},
      assignees: { create: [{ userId: bakuWorkers[0].id }, { userId: bakuWorkers[1].id }] },
    },
  })

  await prisma.taskTemplate.create({
    data: {
      name: 'Aylik Stok Sayimi',
      description: 'Her ayin evvelinde anbar stokunu sayin',
      isRecurring: true, isActive: false, scheduleType: 'MONTHLY', scheduleTime: '09:00',
      dayOfMonth: 1, notificationDay: 3, deadlineDay: 5,
      creatorId: aynur.id, tenantId: tenant.id, businessId: ganja.id,
      departmentId: ganjaBDs[deptSatis.id]?.id,
      items: { create: [
        { title: 'Anbar stokunu say', priority: 'HIGH', sortOrder: 0 },
        { title: 'Stok cedvelini yenile', priority: 'MEDIUM', sortOrder: 1 },
        { title: 'Ferqleri hesabatda qeyd et', priority: 'MEDIUM', sortOrder: 2 },
      ]},
      assignees: { create: [{ userId: ganjaWorkers[0].id }, { userId: ganjaWorkers[7].id }] },
    },
  })

  await prisma.taskTemplate.create({
    data: {
      name: 'Gundelik Server Yoxlamasi',
      description: 'Her gun serverlerin saglam ishlediyini yoxlayin',
      isRecurring: true, isActive: true, scheduleType: 'DAILY', scheduleTime: '08:00',
      creatorId: tural.id, tenantId: tenant.id, businessId: baku.id,
      departmentId: bakuBDs[deptIT.id]?.id,
      items: { create: [
        { title: 'CPU ve RAM istifadesini yoxla', priority: 'HIGH', sortOrder: 0 },
        { title: 'Disk istifadesini yoxla', priority: 'MEDIUM', sortOrder: 1 },
        { title: 'Error loglari yoxla', priority: 'HIGH', sortOrder: 2 },
      ]},
      assignees: { create: [{ userId: bakuWorkers[2].id }] },
    },
  })

  await prisma.taskTemplate.create({
    data: {
      name: 'Sumqayit Heftelik Hesabat',
      description: 'Sumqayit filialinin heftelik emeliyyat hesabati',
      isRecurring: true, isActive: true, scheduleType: 'WEEKLY', scheduleTime: '17:00',
      dayOfWeek: 5,
      creatorId: elshan.id, tenantId: tenant.id, businessId: sumqayit.id,
      items: { create: [
        { title: 'Satis reqemlerini topla', priority: 'HIGH', sortOrder: 0 },
        { title: 'Musteri sikayetlerini cem et', priority: 'MEDIUM', sortOrder: 1 },
        { title: 'Hesabati Bakiya gonder', priority: 'MEDIUM', sortOrder: 2 },
      ]},
      assignees: { create: [{ userId: sumqayitWorkers[2].id }, { userId: sumqayitWorkers[0].id }] },
    },
  })

  // ═══════════════════════════════════════════════════════════
  // 13. FINANCE CATEGORIES & TRANSACTIONS
  // ═══════════════════════════════════════════════════════════
  console.log('Maliyye emeliyyatlari yaradilir...')

  const catSatis = await prisma.financeCategory.create({ data: { name: 'Satis', type: 'INCOME', color: '#058527', tenantId: tenant.id } })
  const catXidmet = await prisma.financeCategory.create({ data: { name: 'Xidmet', type: 'INCOME', color: '#246FE0', tenantId: tenant.id } })
  const catKonsaltinq = await prisma.financeCategory.create({ data: { name: 'Konsaltinq', type: 'INCOME', color: '#7C3AED', tenantId: tenant.id } })
  const catMaas = await prisma.financeCategory.create({ data: { name: 'Maas', type: 'EXPENSE', color: '#DC4C3E', tenantId: tenant.id } })
  const catOfis = await prisma.financeCategory.create({ data: { name: 'Ofis xercleri', type: 'EXPENSE', color: '#EB8909', tenantId: tenant.id } })
  const catReklam = await prisma.financeCategory.create({ data: { name: 'Reklam', type: 'EXPENSE', color: '#9333EA', tenantId: tenant.id } })
  const catIT = await prisma.financeCategory.create({ data: { name: 'IT xercleri', type: 'EXPENSE', color: '#246FE0', tenantId: tenant.id } })
  const catSeyahet = await prisma.financeCategory.create({ data: { name: 'Seyahet', type: 'EXPENSE', color: '#0EA5E9', tenantId: tenant.id } })

  const transactions = [
    // Baki gelirler
    { amount: 25000, type: 'INCOME', desc: 'Boyuk korporativ muqavile - DataTech', date: '2026-03-18', cat: catSatis.id, biz: baku.id },
    { amount: 15000, type: 'INCOME', desc: 'Mart ayi satishlari', date: '2026-03-15', cat: catSatis.id, biz: baku.id },
    { amount: 8000, type: 'INCOME', desc: 'Konsaltinq xidmeti', date: '2026-03-10', cat: catKonsaltinq.id, biz: baku.id },
    { amount: 12500, type: 'INCOME', desc: 'Aylik retainer - AzerEnerji', date: '2026-03-05', cat: catXidmet.id, biz: baku.id },
    { amount: 7500, type: 'INCOME', desc: 'Veb dizayn xidmeti - SmartMall', date: '2026-03-20', cat: catXidmet.id, biz: baku.id },
    { amount: 3500, type: 'INCOME', desc: 'Texniki destek muqavilesi', date: '2026-03-12', cat: catXidmet.id, biz: baku.id },
    { amount: 18000, type: 'INCOME', desc: 'Layihe odenihi - TechStart', date: '2026-03-22', cat: catXidmet.id, biz: baku.id },
    // Gence gelirler
    { amount: 5000, type: 'INCOME', desc: 'Gence region satishlari', date: '2026-03-12', cat: catSatis.id, biz: ganja.id },
    { amount: 3200, type: 'INCOME', desc: 'Gence region satishlari - Mart 2-ci yari', date: '2026-03-22', cat: catSatis.id, biz: ganja.id },
    { amount: 2000, type: 'INCOME', desc: 'Yerli konsaltinq xidmeti', date: '2026-03-15', cat: catKonsaltinq.id, biz: ganja.id },
    // Sumqayit gelirler
    { amount: 1500, type: 'INCOME', desc: 'Sumqayit ilk satishlar', date: '2026-03-20', cat: catSatis.id, biz: sumqayit.id },
    // Baki xercler
    { amount: 18000, type: 'EXPENSE', desc: 'Mart maashlari - Baki (17 nefer)', date: '2026-03-01', cat: catMaas.id, biz: baku.id },
    { amount: 4500, type: 'EXPENSE', desc: 'AWS server xercleri - Q1', date: '2026-03-15', cat: catIT.id, biz: baku.id },
    { amount: 2800, type: 'EXPENSE', desc: 'Facebook/Instagram reklamlari', date: '2026-03-12', cat: catReklam.id, biz: baku.id },
    { amount: 2500, type: 'EXPENSE', desc: 'Ofis icaresi', date: '2026-03-01', cat: catOfis.id, biz: baku.id },
    { amount: 1200, type: 'EXPENSE', desc: 'Ofis avadanliqi', date: '2026-03-08', cat: catOfis.id, biz: baku.id },
    { amount: 3000, type: 'EXPENSE', desc: 'Google Ads kampaniyasi', date: '2026-03-05', cat: catReklam.id, biz: baku.id },
    { amount: 800, type: 'EXPENSE', desc: 'Isci telim kursu - Udemy', date: '2026-03-08', cat: catOfis.id, biz: baku.id },
    { amount: 1500, type: 'EXPENSE', desc: 'LinkedIn Premium + InMail', date: '2026-03-10', cat: catReklam.id, biz: baku.id },
    { amount: 600, type: 'EXPENSE', desc: 'Domain ve hosting', date: '2026-03-01', cat: catIT.id, biz: baku.id },
    // Gence xercler
    { amount: 10000, type: 'EXPENSE', desc: 'Mart maashlari - Gence (14 nefer)', date: '2026-03-01', cat: catMaas.id, biz: ganja.id },
    { amount: 1500, type: 'EXPENSE', desc: 'Ofis temiri - Gence', date: '2026-03-10', cat: catOfis.id, biz: ganja.id },
    { amount: 1800, type: 'EXPENSE', desc: 'Gence ofis icaresi', date: '2026-03-01', cat: catOfis.id, biz: ganja.id },
    { amount: 500, type: 'EXPENSE', desc: 'Gence internet xercleri', date: '2026-03-05', cat: catIT.id, biz: ganja.id },
    { amount: 1200, type: 'EXPENSE', desc: 'Gence reklam kampaniyasi', date: '2026-03-15', cat: catReklam.id, biz: ganja.id },
    // Sumqayit xercler
    { amount: 8000, type: 'EXPENSE', desc: 'Mart maashlari - Sumqayit (12 nefer)', date: '2026-03-01', cat: catMaas.id, biz: sumqayit.id },
    { amount: 2200, type: 'EXPENSE', desc: 'Sumqayit ofis icaresi', date: '2026-03-01', cat: catOfis.id, biz: sumqayit.id },
    { amount: 3500, type: 'EXPENSE', desc: 'Sumqayit ofis mebel sifarishi', date: '2026-03-10', cat: catOfis.id, biz: sumqayit.id },
    { amount: 1800, type: 'EXPENSE', desc: 'Sumqayit IT avadanliq', date: '2026-03-12', cat: catIT.id, biz: sumqayit.id },
    { amount: 500, type: 'EXPENSE', desc: 'Sumqayit internet qurashdirmasi', date: '2026-03-08', cat: catIT.id, biz: sumqayit.id },
    // Umumi xercler
    { amount: 2000, type: 'EXPENSE', desc: 'Hesen - Gence seyaheti', date: '2026-03-14', cat: catSeyahet.id, biz: null, emp: hasan.id },
    { amount: 800, type: 'EXPENSE', desc: 'Aynur - Baki toplantisi seyaheti', date: '2026-03-18', cat: catSeyahet.id, biz: null, emp: aynur.id },
  ]

  for (const t of transactions) {
    await prisma.transaction.create({
      data: {
        amount: t.amount, type: t.type as any, description: t.desc,
        date: new Date(t.date), categoryId: t.cat,
        businessId: (t as any).biz || null,
        employeeId: (t as any).emp || null,
        createdBy: hasan.id, tenantId: tenant.id,
      },
    })
  }

  console.log(`  ${transactions.length} maliyye emeliyyati yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // 14. SALARY RECORDS
  // ═══════════════════════════════════════════════════════════
  console.log('Maashlar teyyin edilir...')

  const salaryData = [
    // Baki
    { user: leyla.id, amount: 3000 }, { user: tural.id, amount: 2500 }, { user: farid.id, amount: 2500 },
    ...bakuWorkers.map((w, i) => ({ user: w.id, amount: [1800, 1700, 2200, 2100, 1600, 1800, 1500, 1700, 1600, 1700, 1500, 1800, 1900, 1600][i] })),
    // Gence
    { user: aynur.id, amount: 3000 }, { user: kamran.id, amount: 2500 }, { user: sevda.id, amount: 2300 },
    ...ganjaWorkers.map((w, i) => ({ user: w.id, amount: [1700, 1600, 1500, 1500, 1400, 1600, 1400, 1500, 1500, 1400, 1300, 1400][i] })),
    // Sumqayit
    { user: elshan.id, amount: 3000 }, { user: vusal.id, amount: 2300 },
    ...sumqayitWorkers.map((w, i) => ({ user: w.id, amount: [1500, 1600, 1400, 1400, 1300, 1700, 1500, 1300, 1400, 1500][i] })),
  ]

  for (const s of salaryData) {
    const salary = await prisma.salary.create({ data: { userId: s.user, amount: s.amount, tenantId: tenant.id } })
    // Fevral odenihi - hamisi
    await prisma.salaryPayment.create({
      data: { salaryId: salary.id, amount: s.amount, bonus: 0, month: 2, year: 2026, method: 'bank', paidBy: hasan.id, tenantId: tenant.id },
    })
    // Mart odenihi - ilk 30 nefer
    if (salaryData.indexOf(s) < 30) {
      const bonus = Math.random() > 0.8 ? Math.floor(Math.random() * 500) + 100 : 0
      await prisma.salaryPayment.create({
        data: { salaryId: salary.id, amount: s.amount, bonus, month: 3, year: 2026, method: 'bank', paidBy: hasan.id, tenantId: tenant.id },
      })
    }
  }

  console.log(`  ${salaryData.length} maash qeydi yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // 15. COMMENTS
  // ═══════════════════════════════════════════════════════════
  console.log('Serhler yaradilir...')

  const allGorevTasks = await prisma.task.findMany({ where: { tenantId: tenant.id }, take: 20 })
  const commentTexts = [
    'Bu tapshiriq uzerinde isleyirem, sabah yenilik vereceyem.',
    'Deadline yaxinlashir, status yenileyin.',
    'Bu movzu ile bagli Mudirle danishdim, irelileme olacaq.',
    'Fayl elave etdim, yoxlayib reyinizi bildirin.',
    'Mesele hell olundu, test edile biler.',
    'Elave vaxt lazimdir, deadline uzadilmali?',
    'Musteri terefdenfeedback gozlenirik.',
    'Test edildikden sonra onaya gonderilecek.',
    'Bugun 3 saat bu is uzere islendim.',
    'Partnyordan cavab gozleyirem.',
  ]

  const commentUsers = [bakuWorkers[0], bakuWorkers[2], bakuWorkers[3], leyla, tural, aynur, kamran, hasan]
  for (const task of allGorevTasks) {
    const numComments = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numComments; i++) {
      await prisma.comment.create({
        data: {
          content: randomItem(commentTexts),
          taskId: task.id,
          authorId: randomItem(commentUsers).id,
          tenantId: tenant.id,
        },
      })
    }
  }

  // Todoist comments
  const todoTasks = await prisma.todoistTask.findMany({ where: { tenantId: tenant.id, isCompleted: false }, take: 10 })
  for (const t of todoTasks) {
    await prisma.todoistComment.create({
      data: { content: randomItem(commentTexts), taskId: t.id, userId: t.userId },
    })
  }

  // ═══════════════════════════════════════════════════════════
  // 16. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════
  console.log('Bildirisher yaradilir...')

  const notificationData = [
    // Hesen bildirishleri
    { type: 'TASK_ASSIGNED', title: 'Yeni GOREV atandi', message: '"Illik hesabat prezentasiyasi" tapshirigi size atandi', userId: hasan.id, senderId: hasan.id },
    { type: 'TASK_ASSIGNED', title: 'Onay gozleyir', message: '"Gence genisleme tesdiqi" - Aynur onayinizi gozleyir', userId: hasan.id, senderId: aynur.id },
    { type: 'TASK_ASSIGNED', title: 'Budje tesdiqi', message: '"Reklam kampaniyasi budjesi" - Leyla tesdiqletmek isteyir', userId: hasan.id, senderId: leyla.id },
    { type: 'TASK_COMPLETED', title: '2/5 tamamlandi', message: '"CRM Miqrasiyasi" - CSV export ve data temizleme bitdi', userId: hasan.id, senderId: bakuWorkers[2].id },
    { type: 'COMMENT_ADDED', title: 'Serh elave edildi', message: 'Tural "IT infrastruktur" tapshirigina serh yazdi', userId: hasan.id, senderId: tural.id },
    { type: 'SALARY_PAID', title: 'Maashlar odenildi', message: '30 neferin mart maashi ugurla kocuruldu', userId: hasan.id, senderId: admin.id },
    { type: 'TODO_DUE', title: 'Bugun deadline', message: '"Mart maashlarini tesdigle" bugun tamamlanmalidir', userId: hasan.id, senderId: hasan.id },
    { type: 'SYSTEM', title: 'Sistem yenilemesi', message: 'WorkFlow Pro v2.1 - yeni tema sistemi elave edildi', userId: hasan.id, senderId: admin.id },
    { type: 'TASK_COMPLETED', title: 'Gorev tamamlandi', message: '"Server backup sistemi" Elvin terefinden tamamlandi', userId: hasan.id, senderId: bakuWorkers[2].id },
    { type: 'TASK_ASSIGNED', title: 'Tekrarlanan gorev', message: '"Aylik Satis Hesabati" Mart dovru bashladi', userId: hasan.id, senderId: leyla.id },
    { type: 'TASK_ASSIGNED', title: 'Sumqayit filiali', message: '"Sumqayit acilish hazirligi" tapshirigi atandi', userId: hasan.id, senderId: elshan.id },
    // Leyla
    { type: 'TASK_COMPLETED', title: 'Tapshiriq tamamlandi', message: '"Ofis avadanliq inventari" tamamlanib', userId: leyla.id, senderId: bakuWorkers[8].id },
    { type: 'TASK_ASSIGNED', title: 'Yeni tapshiriq', message: '"CRM miqrasiya" layihesi basladi', userId: leyla.id, senderId: hasan.id },
    { type: 'COMMENT_ADDED', title: 'Serh elave edildi', message: 'Nigar "Satis hesabati" tapshirigina serh yazdi', userId: leyla.id, senderId: bakuWorkers[0].id },
    { type: 'SALARY_PAID', title: 'Maash odenildi', message: '3000 AZN maashiniz odenildi', userId: leyla.id, senderId: hasan.id },
    // Diger
    { type: 'TASK_ASSIGNED', title: 'Yeni tapshiriq', message: 'Size "Musteri sorgusu" tapshirigi atandi', userId: bakuWorkers[1].id, senderId: leyla.id },
    { type: 'SALARY_PAID', title: 'Maash odenildi', message: '1800 AZN maashiniz odenildi', userId: bakuWorkers[0].id, senderId: hasan.id },
    { type: 'TASK_ASSIGNED', title: 'Server auditi', message: '"Server auditi" tapshirigi atandi', userId: bakuWorkers[2].id, senderId: tural.id },
    { type: 'TASK_REJECTED', title: 'Tapshiriq redd edildi', message: '"Premium mebel sifarishi" budje sebebiyle redd edildi', userId: ganjaWorkers[3].id, senderId: aynur.id },
    { type: 'TASK_ASSIGNED', title: 'Yeni toplu gorev', message: '"Gence IT infrastrukturu" layihesi basladi', userId: ganjaWorkers[0].id, senderId: aynur.id },
    { type: 'SALARY_PAID', title: 'Bonus odenildi', message: '500 AZN performans bonusu hesabiniza kocuruldu', userId: bakuWorkers[2].id, senderId: hasan.id },
    { type: 'TEMPLATE_EXECUTED', title: 'Shablon icra edildi', message: '"Aylik Satis Hesabati" shablon icra edildi - 3 tapshiriq yaradildi', userId: bakuWorkers[0].id, senderId: leyla.id },
    { type: 'TASK_ASSIGNED', title: 'Sumqayit tapshiriq', message: '"IT shebekesi qurashdirmasi" size atandi', userId: sumqayitWorkers[1].id, senderId: vusal.id },
    { type: 'TASK_COMPLETED', title: 'Tapshiriq tamamlandi', message: '"Sumqayit ofis temiri" tamamlanib', userId: elshan.id, senderId: sumqayitWorkers[9].id },
    { type: 'SYSTEM', title: 'Yeni filial', message: 'Sumqayit filiali sisteme elave edildi', userId: elshan.id, senderId: admin.id },
    // Aynur
    { type: 'TASK_COMPLETED', title: 'Gorev tamamlandi', message: '"Gence ofis internet" yenilendi', userId: aynur.id, senderId: ganjaWorkers[0].id },
    { type: 'TASK_ASSIGNED', title: 'Yeni gorev', message: '"Gence marketinq strategiyasi" basladi', userId: aynur.id, senderId: hasan.id },
    { type: 'SALARY_PAID', title: 'Maash odenildi', message: '3000 AZN maashiniz odenildi', userId: aynur.id, senderId: hasan.id },
    // Elshan
    { type: 'TASK_ASSIGNED', title: 'Yeni gorev', message: '"Sumqayit acilish hazirligi" basladi', userId: elshan.id, senderId: hasan.id },
    { type: 'SALARY_PAID', title: 'Maash odenildi', message: '3000 AZN maashiniz odenildi', userId: elshan.id, senderId: hasan.id },
  ]

  for (const n of notificationData) {
    await prisma.notification.create({
      data: { type: n.type as any, title: n.title, message: n.message, userId: n.userId, senderId: n.senderId, tenantId: tenant.id, link: '/tasks' },
    })
  }

  console.log(`  ${notificationData.length} bildiris yaradildi`)

  // ═══════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════
  const totalUsers = allUsers.length
  const totalGorev = gorevCounter.count
  const totalTodoist = todoistCount

  console.log('')
  console.log('========================================')
  console.log('  MEGA SEED TAMAMLANDI!')
  console.log('========================================')
  console.log('')
  console.log(`  Istifadeciler: ${totalUsers}`)
  console.log(`  Filiallar: 3 (Baki, Gence, Sumqayit)`)
  console.log(`  Sobeler: 10`)
  console.log(`  Rollar: 4 (CEO, Mudir, Sobe Rehberi, Isci)`)
  console.log(`  GOREV tapshiriqlar: ${totalGorev}`)
  console.log(`  Todoist tapshiriqlar: ${totalTodoist}`)
  console.log(`  Maliyye emeliyyatlari: ${transactions.length}`)
  console.log(`  Maash qeydleri: ${salaryData.length}`)
  console.log(`  Bildirisher: ${notificationData.length}`)
  console.log(`  Shablonlar: 5`)
  console.log('')
  console.log('  LOGIN HESABLARI (hamisi shifre: 123456)')
  console.log('  ─────────────────────────────────────')
  console.log('  hasan@techflow.az    | CEO (TENANT_ADMIN)')
  console.log('  admin@techflow.az    | Admin (isSystemAdmin)')
  console.log('  leyla@techflow.az    | Baki Filial Mudiru')
  console.log('  aynur@techflow.az    | Gence Filial Mudiru')
  console.log('  elshan@techflow.az   | Sumqayit Filial Mudiru')
  console.log('  tural@techflow.az    | IT Sobe Rehberi (Baki)')
  console.log('  kamran@techflow.az   | Satis Sobe Rehberi (Gence)')
  console.log('  vusal@techflow.az    | IT Sobe Rehberi (Sumqayit)')
  console.log('  nigar@techflow.az    | Isci (Baki)')
  console.log('  zaur@techflow.az     | Isci (Gence)')
  console.log('  konul@techflow.az    | Isci (Sumqayit)')
  console.log('')
}

main()
  .catch((e) => {
    console.error('MEGA SEED ERROR:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
