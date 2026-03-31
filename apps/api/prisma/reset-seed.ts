import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const TENANT_ID = '6ab89395-a4ac-4eb1-8b2a-a19f6026d3fa'
const HASAN_ID = 'b0f6cb82-4447-45ed-8ca3-30eb9f392c9c'
const DEFAULT_PASSWORD = '123456'

// Azərbaycan adları
const NAMES = {
  male: ['Elşən','Tural','Orxan','Elvin','Samir','Murad','Zaur','Emil','Fuad','Kamil','Elnur','Cavid','Tahir','Anar','Pərviz','Vasif','Elçin','Bəhruz','Hikmət','Rəşad','Nicat','Fərid','Sənan','Ramin','Ruslan','Əli','Vüsal','Ceyhun','İlkin','Şəhriyar','Xəyal','Nurlan','Toğrul','Ülvi','Rüfət','Babək','Namiq','Qismət','Aqşin','Cəlil','Yaşar','Etibar','Mövsüm','Nəsib','Kənan'],
  female: ['Aynur','Leyla','Nigar','Günel','Türkan','Sabina','Sevinc','Aysel','Sevda','Fidan','Afət','Samra','Zəmfira','Nürgün','Ləman','Könül','Röya','Aygün','Nərmin','Lalə','Ülviyyə','Gülay','Validə','Turanə','İlahə','Nahidə','Cəmilə','Pərvin','Tamara','Şəfəq','Xatirə','Vüsalə','Yeganə','Mehriban','Şəbnəm','Aytən','Lalə','Arzu','Gülnarə','Dilbər','Jalə','Sədaqət','Nəzrin','Fatimə','Mələk'],
  last: ['Əliyev','Hüseynov','Həsənov','Quliyev','Musayev','İbrahimov','Rzayev','Babayev','Hacıyev','Məmmədov','İsmayılov','Nəsirov','Kərimov','Əhmədov','Rüstəmov']
}

function randomName(gender: 'male' | 'female'): string {
  const first = NAMES[gender][Math.floor(Math.random() * NAMES[gender].length)]
  const last = NAMES.last[Math.floor(Math.random() * NAMES.last.length)]
  return `${first} ${gender === 'female' ? last.replace('ov', 'ova').replace('ev', 'eva') : last}`
}

function emailFromName(name: string, suffix: string): string {
  return name.toLowerCase()
    .replace(/ə/g,'e').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g')
    .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ı/g,'i').replace(/İ/g,'i')
    .replace(/Ə/g,'e').replace(/Ç/g,'c').replace(/Ş/g,'s').replace(/Ğ/g,'g')
    .replace(/Ö/g,'o').replace(/Ü/g,'u')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12) + suffix + '@techflow.az'
}

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  console.log('🗑️  Bütün test məlumatları silinir...')

  // Sıra ilə sil (FK constraint-lər)
  await prisma.todoistTaskLabel.deleteMany({ where: { task: { userId: { not: HASAN_ID } } } })
  await prisma.todoistComment.deleteMany({ where: { task: { userId: { not: HASAN_ID } } } })
  await prisma.todoistTask.deleteMany({ where: { userId: { not: HASAN_ID } } })
  await prisma.todoistSection.deleteMany({ where: { project: { userId: { not: HASAN_ID } } } })
  await prisma.todoistProject.deleteMany({ where: { userId: { not: HASAN_ID } } })
  await prisma.todoistLabel.deleteMany({ where: { userId: { not: HASAN_ID } } })
  await prisma.todoistFilter.deleteMany({ where: { userId: { not: HASAN_ID } } })
  await prisma.todoistActivity.deleteMany({ where: { userId: { not: HASAN_ID } } })
  await prisma.todoistTemplate.deleteMany({ where: { userId: { not: HASAN_ID } } })

  // Task əlaqələri
  await prisma.taskAssignee.deleteMany({ where: { task: { tenantId: TENANT_ID } } })
  await prisma.attachment.deleteMany({ where: { task: { tenantId: TENANT_ID } } })
  await prisma.comment.deleteMany({ where: { task: { tenantId: TENANT_ID } } })
  await prisma.task.deleteMany({ where: { tenantId: TENANT_ID, parentId: { not: null } } })
  await prisma.task.deleteMany({ where: { tenantId: TENANT_ID } })

  // Template əlaqələri
  try { await prisma.templateAssignee.deleteMany({ where: { template: { tenantId: TENANT_ID } } }) } catch {}
  try { await prisma.templateItem.deleteMany({ where: { template: { tenantId: TENANT_ID } } }) } catch {}
  try { await (prisma as any).recurringTemplate?.deleteMany({ where: { tenantId: TENANT_ID } }) } catch {}

  // Raw SQL ilə bütün əlaqəli cədvəlləri təmizlə (Həsən xaric)
  await prisma.$executeRawUnsafe(`DELETE FROM "UserBusiness" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}')`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}')`)
  await prisma.$executeRawUnsafe(`DELETE FROM "SalaryPayment" WHERE "salaryId" IN (SELECT id FROM "Salary" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}'))`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Salary" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}')`)
  await prisma.$executeRawUnsafe(`DELETE FROM "EmployeeLedger" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}')`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE "createdBy" IN (SELECT id FROM "User" WHERE "tenantId" = '${TENANT_ID}')`)

  // Həsən xaric bütün istifadəçiləri sil
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = '${TENANT_ID}' AND id != '${HASAN_ID}'`)

  // Köhnə department-business əlaqələri və əsas cədvəllər
  await prisma.$executeRawUnsafe(`DELETE FROM "BusinessDepartment" WHERE "businessId" IN (SELECT id FROM "Business" WHERE "tenantId" = '${TENANT_ID}')`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE "tenantId" = '${TENANT_ID}'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Business" WHERE "tenantId" = '${TENANT_ID}'`)

  // Həsən və CEO xaric rolları sil
  const ceoRoleId = 'd1c330e1-3ca7-45ee-8045-bba7a62ab43f'
  await prisma.customRole.deleteMany({ where: { tenantId: TENANT_ID, id: { not: ceoRoleId } } })

  console.log('✅ Köhnə data silindi')

  // ═══ ROLLAR ═══
  console.log('📋 Rollar yaradılır...')

  const mudirRole = await prisma.customRole.create({
    data: {
      name: 'Müdir', tenantId: TENANT_ID,
      description: 'Filial müdiri — tapşırıq, maliyyə, istifadəçi idarəsi',
      permissions: [
        'tasks.read','tasks.create','gorev.create','gorev.approve','tasks.assign_upward',
        'users.read',
      ],
    },
  })

  const teamLeadRole = await prisma.customRole.create({
    data: {
      name: 'Komanda Lideri', tenantId: TENANT_ID,
      description: 'Şöbə rəhbəri — tapşırıq yaratma, izləmə',
      permissions: [
        'tasks.read','tasks.create',
      ],
    },
  })

  const isciRole = await prisma.customRole.create({
    data: {
      name: 'İşçi', tenantId: TENANT_ID,
      description: 'Adi işçi — tapşırıq oxu/yaz',
      permissions: [
        'tasks.read',
      ],
    },
  })

  console.log('✅ Rollar yaradıldı: Müdir, Komanda Lideri, İşçi')

  // ═══ FİLİALLAR (3) ═══
  console.log('🏢 Filiallar yaradılır...')

  const filiallar = await Promise.all([
    prisma.business.create({ data: { name: 'Bakı Filialı', tenantId: TENANT_ID } }),
    prisma.business.create({ data: { name: 'Gəncə Filialı', tenantId: TENANT_ID } }),
    prisma.business.create({ data: { name: 'Sumqayıt Filialı', tenantId: TENANT_ID } }),
  ])

  // ═══ ŞÖBƏLƏR (6 — hər filialda 2) ═══
  console.log('📁 Şöbələr yaradılır...')

  const sobeAdlari = [
    { name: 'IT', color: '#246FE0' },
    { name: 'Satış', color: '#058527' },
    { name: 'Maliyyə', color: '#EB8909' },
    { name: 'Marketinq', color: '#AF38EB' },
    { name: 'HR', color: '#DC4C3E' },
    { name: 'Logistika', color: '#14AAF5' },
  ]

  const sobeler: any[] = []
  for (let i = 0; i < filiallar.length; i++) {
    const s1 = await prisma.department.create({ data: { name: sobeAdlari[i * 2].name, color: sobeAdlari[i * 2].color, tenantId: TENANT_ID } })
    await prisma.businessDepartment.create({ data: { businessId: filiallar[i].id, departmentId: s1.id } })
    const s2 = await prisma.department.create({ data: { name: sobeAdlari[i * 2 + 1].name, color: sobeAdlari[i * 2 + 1].color, tenantId: TENANT_ID } })
    await prisma.businessDepartment.create({ data: { businessId: filiallar[i].id, departmentId: s2.id } })
    sobeler.push({ ...s1, businessIdx: i }, { ...s2, businessIdx: i })
  }

  console.log('✅ 3 filial, 6 şöbə yaradıldı')

  // ═══ İSTİFADƏÇİLƏR ═══
  console.log('👥 İstifadəçilər yaradılır...')

  // Həsənin UserBusiness əlaqəsi (CEO — bütün filiallara)
  await prisma.userBusiness.create({
    data: { userId: HASAN_ID, businessId: filiallar[0].id, departmentId: sobeler[0].id, positionTitle: 'CEO', salary: 5000, payDay: 1 }
  })

  // 3 Filial Müdiri (Həsənin altında)
  const mudirler: any[] = []
  const mudirEmails = ['leyla@techflow.az', 'aynur@techflow.az', 'farid@techflow.az']
  const mudirNames = ['Leyla Hüseynova', 'Aynur Nəsirova', 'Fərid Məmmədov']

  for (let i = 0; i < 3; i++) {
    const mudir = await prisma.user.create({
      data: {
        email: mudirEmails[i], fullName: mudirNames[i], password: hashedPassword,
        role: 'BUSINESS_MANAGER', tenantId: TENANT_ID, parentId: HASAN_ID,
        customRoleId: mudirRole.id, status: 'active',
      },
    })
    await prisma.userBusiness.create({
      data: { userId: mudir.id, businessId: filiallar[i].id, departmentId: sobeler[i * 2].id, positionTitle: 'Filial Müdiri', salary: 3500, payDay: 1 }
    })
    mudirler.push(mudir)
  }

  console.log('✅ 3 filial müdiri yaradıldı')

  // 6 Komanda Lideri (hər şöbəyə 1, müdirin altında)
  const liderler: any[] = []
  for (let i = 0; i < 6; i++) {
    const gender = i % 2 === 0 ? 'male' : 'female' as 'male' | 'female'
    const name = randomName(gender)
    const mudirIdx = Math.floor(i / 2) // 0,0,1,1,2,2
    const lider = await prisma.user.create({
      data: {
        email: emailFromName(name, String(i)), fullName: name, password: hashedPassword,
        role: 'TEAM_MANAGER', tenantId: TENANT_ID, parentId: mudirler[mudirIdx].id,
        customRoleId: teamLeadRole.id, status: 'active',
      },
    })
    await prisma.userBusiness.create({
      data: { userId: lider.id, businessId: filiallar[mudirIdx].id, departmentId: sobeler[i].id, positionTitle: 'Şöbə Rəhbəri', salary: 2500, payDay: 5 }
    })
    liderler.push(lider)
  }

  console.log('✅ 6 komanda lideri yaradıldı')

  // 81 İşçi (hər şöbəyə ~13-14 nəfər, liderin altında)
  // 90 - 3 müdir - 6 lider = 81 işçi
  const usedEmails = new Set(mudirEmails)
  let isciCount = 0

  for (let sobeIdx = 0; sobeIdx < 6; sobeIdx++) {
    const count = sobeIdx < 3 ? 14 : 13 // İlk 3 şöbəyə 14, son 3-ə 13 = 42+39=81
    const mudirIdx = Math.floor(sobeIdx / 2)

    for (let j = 0; j < count; j++) {
      const gender = (isciCount % 3 === 0) ? 'female' : 'male' as 'male' | 'female'
      const name = randomName(gender)
      let email = emailFromName(name, String(isciCount))
      while (usedEmails.has(email)) {
        email = emailFromName(name, String(isciCount) + 'x')
      }
      usedEmails.add(email)

      const isci = await prisma.user.create({
        data: {
          email, fullName: name, password: hashedPassword,
          role: 'EMPLOYEE', tenantId: TENANT_ID, parentId: liderler[sobeIdx].id,
          customRoleId: isciRole.id, status: 'active',
        },
      })
      await prisma.userBusiness.create({
        data: { userId: isci.id, businessId: filiallar[mudirIdx].id, departmentId: sobeler[sobeIdx].id, positionTitle: 'İşçi', salary: 800 + Math.floor(Math.random() * 700), payDay: 10 }
      })
      isciCount++
    }
  }

  console.log(`✅ ${isciCount} işçi yaradıldı`)

  // ═══ XÜLASƏ ═══
  const totalUsers = await prisma.user.count({ where: { tenantId: TENANT_ID } })
  console.log('\n═══════════════════════════════════')
  console.log(`📊 XÜLASƏ:`)
  console.log(`   Tenant: TechFlow MMC`)
  console.log(`   CEO: Həsən Əliyev (hasan@techflow.az)`)
  console.log(`   Filiallar: ${filiallar.map(f => f.name).join(', ')}`)
  console.log(`   Şöbələr: ${sobeAdlari.map(s => s.name).join(', ')}`)
  console.log(`   Müdirlər: ${mudirNames.join(', ')}`)
  console.log(`   Komanda Liderləri: ${liderler.map(l => l.fullName).join(', ')}`)
  console.log(`   İşçilər: ${isciCount} nəfər`)
  console.log(`   TOPLAM: ${totalUsers} istifadəçi`)
  console.log(`   Şifrə: ${DEFAULT_PASSWORD}`)
  console.log('═══════════════════════════════════')
  console.log('\n🏗️ İERARXİYA:')
  console.log(`Həsən (CEO)`)
  for (let i = 0; i < 3; i++) {
    console.log(`  ├── ${mudirNames[i]} (Müdir) — ${filiallar[i].name}`)
    for (let j = i * 2; j < i * 2 + 2; j++) {
      const prefix = j === i * 2 + 1 ? '└' : '├'
      const isciSay = j < 3 ? 14 : 13
      console.log(`  │   ${prefix}── ${liderler[j].fullName} (Lider) — ${sobeAdlari[j].name} [${isciSay} işçi]`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
