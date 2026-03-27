import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════
  // KATEQORİYALAR (tip yox — universal)
  // ══════════════════════════════════════

  async createCategory(data: { name: string; color?: string }, tenantId: string) {
    return this.prisma.financeCategory.create({
      data: { name: data.name, color: data.color || '#6366f1', tenantId },
    })
  }

  async getCategories(tenantId: string) {
    return this.prisma.financeCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async deleteCategory(id: string, tenantId: string) {
    const cat = await this.prisma.financeCategory.findFirst({ where: { id, tenantId } })
    if (!cat) throw new NotFoundException('Kateqoriya tapılmadı')
    await this.prisma.financeCategory.delete({ where: { id } })
    return { message: 'Kateqoriya silindi' }
  }

  // ══════════════════════════════════════
  // KASSA ƏMƏLİYYATLARI (Debit/Kredit)
  // ══════════════════════════════════════

  async createTransaction(data: {
    amount: number; type: string; description?: string; date: string;
    categoryId?: string; businessId?: string; employeeId?: string
  }, createdBy: string, tenantId: string) {
    if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount))) {
      throw new BadRequestException('Məbləğ düzgün deyil')
    }
    if (Number(data.amount) < 0) throw new BadRequestException('Məbləğ mənfi ola bilməz')
    if (Number(data.amount) > 99999999999) throw new BadRequestException('Məbləğ çox böyükdür')
    if (!data.type || !['DEBIT', 'CREDIT'].includes(data.type)) {
      throw new BadRequestException('Tip DEBIT və ya CREDIT olmalıdır')
    }
    if (!data.date) throw new BadRequestException('Tarix tələb olunur')

    return this.prisma.transaction.create({
      data: {
        amount: data.amount,
        type: data.type as any,
        description: data.description,
        date: new Date(data.date),
        categoryId: data.categoryId || null,
        businessId: data.businessId || null,
        employeeId: data.employeeId || null,
        createdBy,
        tenantId,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        business: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
      },
    })
  }

  async getTransactions(tenantId: string, filters?: { type?: string; businessId?: string; startDate?: string; endDate?: string }) {
    const where: any = { tenantId }
    if (filters?.type && ['DEBIT', 'CREDIT'].includes(filters.type)) where.type = filters.type
    if (filters?.businessId) where.businessId = filters.businessId
    if (filters?.startDate || filters?.endDate) {
      where.date = {}
      if (filters.startDate) where.date.gte = new Date(filters.startDate)
      if (filters.endDate) where.date.lte = new Date(filters.endDate)
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        business: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
      },
      orderBy: { date: 'desc' },
    })
  }

  async updateTransaction(id: string, data: { amount?: number; description?: string; date?: string; categoryId?: string }, tenantId: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, tenantId } })
    if (!tx) throw new NotFoundException('Əməliyyat tapılmadı')
    const updateData: any = {}
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.description !== undefined) updateData.description = data.description
    if (data.date) updateData.date = new Date(data.date)
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null
    return this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: { select: { id: true, name: true, color: true } }, employee: { select: { id: true, fullName: true } } },
    })
  }

  async deleteTransaction(id: string, tenantId: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, tenantId } })
    if (!tx) throw new NotFoundException('Əməliyyat tapılmadı')
    await this.prisma.transaction.delete({ where: { id } })
    return { message: 'Əməliyyat silindi' }
  }

  // ══════════════════════════════════════
  // KASSA STATİSTİKA
  // ══════════════════════════════════════

  async getSummary(tenantId: string) {
    const [debit, credit] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { tenantId, type: 'DEBIT' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { tenantId, type: 'CREDIT' }, _sum: { amount: true } }),
    ])

    // İşçi borcları (gözləyən debit-lər)
    const pendingDebits = await this.prisma.employeeLedger.findMany({
      where: { tenantId, type: 'DEBIT' },
    })
    const paidCredits = await this.prisma.employeeLedger.findMany({
      where: { tenantId, type: 'CREDIT' },
    })
    const totalEmployeeDebit = pendingDebits.reduce((s, e) => s + e.amount, 0)
    const totalEmployeeCredit = paidCredits.reduce((s, e) => s + e.amount, 0)
    const totalEmployeeDebt = totalEmployeeDebit - totalEmployeeCredit

    return {
      totalDebit: debit._sum.amount || 0,
      totalCredit: credit._sum.amount || 0,
      balance: (debit._sum.amount || 0) - (credit._sum.amount || 0),
      totalEmployeeDebt: totalEmployeeDebt > 0 ? totalEmployeeDebt : 0,
    }
  }

  // ══════════════════════════════════════
  // İŞÇİ BAKİYƏSİ (EmployeeLedger)
  // ══════════════════════════════════════

  // Bütün işçi hərəkətləri
  async getEmployeeLedger(tenantId: string, userId?: string) {
    const where: any = { tenantId }
    if (userId) where.userId = userId

    return this.prisma.employeeLedger.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Hər işçinin bakiyəsi
  async getEmployeeBalances(tenantId: string) {
    const entries = await this.prisma.employeeLedger.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    })

    const balanceMap = new Map<string, { user: any; debit: number; credit: number }>()
    for (const e of entries) {
      if (!balanceMap.has(e.userId)) {
        balanceMap.set(e.userId, { user: e.user, debit: 0, credit: 0 })
      }
      const b = balanceMap.get(e.userId)!
      if (e.type === 'DEBIT') b.debit += e.amount
      else b.credit += e.amount
    }

    return Array.from(balanceMap.values()).map(b => ({
      ...b.user,
      totalDebit: b.debit,
      totalCredit: b.credit,
      balance: b.debit - b.credit,
    }))
  }

  // Manual bakiyə əlavə (bonus, avans)
  async addEmployeeBalance(data: {
    userId: string; amount: number; category?: string; description?: string
  }, createdBy: string, tenantId: string) {
    if (!data.amount || data.amount <= 0) throw new BadRequestException('Məbləğ müsbət olmalıdır')

    return this.prisma.employeeLedger.create({
      data: {
        userId: data.userId,
        type: 'DEBIT',
        amount: data.amount,
        description: data.description || null,
        category: data.category || 'BONUS',
        tenantId,
        createdBy,
      },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // ══════════════════════════════════════
  // MAAŞ HESABLAMA
  // ══════════════════════════════════════

  // Aylıq maaş hesabla — hər UserBusiness üçün DEBIT yarat
  async calculateSalaries(tenantId: string, month?: number, year?: number) {
    const now = new Date()
    const m = month || now.getMonth() + 1
    const y = year || now.getFullYear()
    const months = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

    // UserBusiness salary != null
    const assignments = await this.prisma.userBusiness.findMany({
      where: { salary: { not: null }, user: { tenantId, status: 'active' } },
      include: {
        user: { select: { id: true, fullName: true, tenantId: true } },
        business: { select: { name: true } },
        department: { select: { name: true } },
      },
    })

    // Bu ay artıq hesablanıb?
    const existing = await this.prisma.employeeLedger.findMany({
      where: { tenantId, type: 'DEBIT', category: 'MAAS', month: m, year: y },
    })
    const existingUBIds = new Set(existing.map(e => e.userBusinessId))

    let created = 0
    for (const a of assignments) {
      if (a.user.tenantId !== tenantId) continue
      if (existingUBIds.has(a.id)) continue // artıq hesablanıb

      const desc = `${a.user.fullName} — ${a.business.name}${a.department ? '/' + a.department.name : ''} ${a.positionTitle || ''} ${months[m]} maaşı`.trim()

      await this.prisma.employeeLedger.create({
        data: {
          userId: a.userId,
          userBusinessId: a.id,
          type: 'DEBIT',
          amount: a.salary!,
          description: desc,
          category: 'MAAS',
          month: m,
          year: y,
          tenantId,
          createdBy: 'system',
        },
      })
      created++
    }

    return { message: `${created} maaş hesablandı (${months[m]} ${y})`, created, month: m, year: y }
  }

  // ══════════════════════════════════════
  // MAAŞ ÖDƏMƏ
  // ══════════════════════════════════════

  // Ledger DEBIT-i ödə → Ledger CREDIT + Kassa CREDIT
  async paySalary(ledgerId: string, paidBy: string, tenantId: string) {
    const debitEntry = await this.prisma.employeeLedger.findFirst({
      where: { id: ledgerId, tenantId, type: 'DEBIT' },
      include: { user: { select: { id: true, fullName: true } } },
    })
    if (!debitEntry) throw new NotFoundException('Giriş tapılmadı')

    // Artıq ödənilib? (eyni userBusinessId + month + year üçün CREDIT var?)
    if (debitEntry.userBusinessId && debitEntry.month && debitEntry.year) {
      const existingCredit = await this.prisma.employeeLedger.findFirst({
        where: {
          tenantId, type: 'CREDIT', userBusinessId: debitEntry.userBusinessId,
          month: debitEntry.month, year: debitEntry.year, category: 'MAAS',
        },
      })
      if (existingCredit) throw new ConflictException('Bu maaş artıq ödənilib')
    }

    // Maaşlar kateqoriyasını tap/yarat
    let salaryCat = await this.prisma.financeCategory.findFirst({
      where: { tenantId, name: 'Maaşlar' },
    })
    if (!salaryCat) {
      salaryCat = await this.prisma.financeCategory.create({
        data: { name: 'Maaşlar', color: '#EF4444', tenantId },
      })
    }

    // 1. Kassa CREDIT yarat (pul çıxır)
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: debitEntry.amount,
        type: 'CREDIT',
        description: debitEntry.description?.replace('maaşı', 'maaş ödəməsi') || `${debitEntry.user.fullName} maaş ödəməsi`,
        date: new Date(),
        categoryId: salaryCat.id,
        employeeId: debitEntry.userId,
        userBusinessId: debitEntry.userBusinessId,
        salaryMonth: debitEntry.month,
        salaryYear: debitEntry.year,
        createdBy: paidBy,
        tenantId,
      },
    })

    // 2. İşçi bakiyəsindən CREDIT yarat
    const credit = await this.prisma.employeeLedger.create({
      data: {
        userId: debitEntry.userId,
        userBusinessId: debitEntry.userBusinessId,
        type: 'CREDIT',
        amount: debitEntry.amount,
        description: debitEntry.description?.replace('maaşı', 'maaş ödəməsi') || `${debitEntry.user.fullName} maaş ödəməsi`,
        category: 'MAAS',
        month: debitEntry.month,
        year: debitEntry.year,
        transactionId: transaction.id,
        tenantId,
        createdBy: paidBy,
      },
      include: { user: { select: { id: true, fullName: true } } },
    })

    return credit
  }
}
