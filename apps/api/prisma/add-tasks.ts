import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({ where: { role: { in: ['EMPLOYEE', 'TEAM_MANAGER'] } }, select: { id: true, tenantId: true, businesses: { select: { businessId: true } } } })
  const creators = await p.user.findMany({ where: { role: { in: ['BUSINESS_MANAGER', 'TENANT_ADMIN'] } }, select: { id: true, tenantId: true, businesses: { select: { businessId: true } } } })
  const tenantId = users[0]?.tenantId
  if (!tenantId) { console.log('Tenant yoxdur'); return }

  const tasks = [
    { title: 'Q1 maliyyə hesabatını tamamla', desc: 'İlk rüb maliyyə hesabatı hazırlanmalı', priority: 'CRITICAL', status: 'IN_PROGRESS', days: -3 },
    { title: 'Müştəri şikayətlərini araşdır', desc: 'Son ayda gələn bütün şikayətlər', priority: 'HIGH', status: 'CREATED', days: -5 },
    { title: 'Ofis təmizlik müqaviləsini yenilə', desc: 'Təmizlik şirkəti ilə müqavilə', priority: 'MEDIUM', status: 'IN_PROGRESS', days: -1 },
    { title: 'İT infrastruktur auditi keçir', desc: 'Server, şəbəkə və təhlükəsizlik', priority: 'CRITICAL', status: 'PENDING_APPROVAL', days: -2 },
    { title: 'Günlük standup görüşü keçir', desc: 'Komanda ilə qısa görüş', priority: 'HIGH', status: 'CREATED', days: 0 },
    { title: 'Partnyor təklifi hazırla', desc: 'Yeni partnyor üçün əməkdaşlıq təklifi', priority: 'HIGH', status: 'IN_PROGRESS', days: 0 },
    { title: 'Dizayn fayllarını yenilə', desc: 'Logo, banner və vizitka', priority: 'MEDIUM', status: 'CREATED', days: 0 },
    { title: 'Marketinq strategiyası yaz', desc: 'Növbəti rüb üçün plan', priority: 'HIGH', status: 'CREATED', days: 1 },
    { title: 'İşçi təlim materialları hazırla', desc: 'Yeni işçilər üçün video təlim', priority: 'MEDIUM', status: 'IN_PROGRESS', days: 2 },
    { title: 'CRM datanı təmizlə', desc: 'Köhnə kontaktları arxivlə', priority: 'LOW', status: 'CREATED', days: 3 },
    { title: 'Sosial media kontenti planla', desc: 'Instagram və LinkedIn', priority: 'MEDIUM', status: 'CREATED', days: 2 },
    { title: 'Yeni ofis avadanlığı sifariş et', desc: 'Kompüter, monitor, printer', priority: 'MEDIUM', status: 'CREATED', days: 4 },
    { title: 'Müştəri zəngləri analizi', desc: 'Aylıq zəng hesabatı hazırla', priority: 'LOW', status: 'CREATED', days: 5 },
    { title: 'Sayt SEO optimizasiyası', desc: 'Meta tag və sürət optimallaşdırma', priority: 'HIGH', status: 'IN_PROGRESS', days: 4 },
    { title: 'Rüblük prezentasiya hazırla', desc: 'İdarə heyəti üçün təqdimat', priority: 'CRITICAL', status: 'CREATED', days: 6 },
    { title: 'Yeni layihə büdcəsi yaz', desc: 'Gəncə genişlənmə layihəsi büdcəsi', priority: 'HIGH', status: 'CREATED', days: 7 },
    { title: 'Mobil tətbiq tələblərini hazırla', desc: 'PRD sənədi yazılmalı', priority: 'MEDIUM', status: 'CREATED', days: 14 },
    { title: 'İllik strategiya planı', desc: '2027 strategiyası hazırlanmalı', priority: 'HIGH', status: 'CREATED', days: 21 },
    { title: 'ISO sertifikatlaşdırma hazırlığı', desc: 'ISO 9001 üçün sənədlər', priority: 'CRITICAL', status: 'CREATED', days: 30 },
    { title: 'Yeni filial açılış planı', desc: 'Şəki filialı üçün biznes plan', priority: 'HIGH', status: 'CREATED', days: 45 },
  ]

  const now = new Date()
  let count = 0

  for (const t of tasks) {
    const due = new Date(now)
    due.setDate(due.getDate() + t.days)
    const assignee = users[count % users.length]
    const creator = creators[count % creators.length]
    const bizId = assignee.businesses[0]?.businessId || null

    await p.task.create({
      data: {
        title: t.title, description: t.desc, priority: t.priority as any, status: t.status as any,
        dueDate: due, businessId: bizId, creatorId: creator.id, tenantId,
        assignees: { create: [{ userId: assignee.id }] },
      },
    })
    count++
  }

  const total = await p.task.count({ where: { tenantId } })
  console.log(`✅ ${count} yeni tapşırıq əlavə edildi. Toplam: ${total}`)
}

main().catch(console.error).finally(() => p.$disconnect())
