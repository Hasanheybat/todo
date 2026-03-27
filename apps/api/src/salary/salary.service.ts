import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  // İşçiyə maaş təyin et
  async assignSalary(data: { userId: string; amount: number; currency?: string }, tenantId: string) {
    return this.prisma.salary.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency || 'AZN',
        tenantId,
      },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    })
  }

  // Bütün maaşları gör
  async findAll(tenantId: string) {
    return this.prisma.salary.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true, status: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 3 },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Maaş yenilə
  async updateSalary(id: string, amount: number, tenantId: string) {
    const salary = await this.prisma.salary.findFirst({ where: { id, tenantId } })
    if (!salary) throw new NotFoundException('Maaş tapılmadı')
    return this.prisma.salary.update({
      where: { id },
      data: { amount },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // Ödəmə et
  async makePayment(data: { salaryId: string; amount: number; bonus?: number; month: number; year: number; method?: string; note?: string }, paidBy: string, tenantId: string) {
    const salary = await this.prisma.salary.findFirst({ where: { id: data.salaryId, tenantId } })
    if (!salary) throw new NotFoundException('Maaş tapılmadı')

    // Bu ay artıq ödənilib?
    const existing = await this.prisma.salaryPayment.findUnique({
      where: { salaryId_month_year: { salaryId: data.salaryId, month: data.month, year: data.year } },
    })
    if (existing) throw new ConflictException(`${data.year}/${data.month} ayı artıq ödənilib`)

    return this.prisma.salaryPayment.create({
      data: {
        salaryId: data.salaryId,
        amount: data.amount,
        bonus: data.bonus || 0,
        month: data.month,
        year: data.year,
        method: data.method || 'bank',
        note: data.note,
        paidBy,
        tenantId,
      },
      include: {
        salary: { include: { user: { select: { id: true, fullName: true } } } },
      },
    })
  }

  // Ödəmə tarixçəsi
  async getPayments(tenantId: string, filters?: { userId?: string; month?: number; year?: number }) {
    const where: any = { tenantId }
    if (filters?.month) where.month = Number(filters.month)
    if (filters?.year) where.year = Number(filters.year)
    if (filters?.userId) where.salary = { userId: filters.userId }

    return this.prisma.salaryPayment.findMany({
      where,
      include: {
        salary: { include: { user: { select: { id: true, fullName: true, role: true } } } },
        payer: { select: { id: true, fullName: true } },
      },
      orderBy: { paidAt: 'desc' },
    })
  }

  // Aylıq xülasə
  async getMonthlySummary(tenantId: string, month: number, year: number) {
    const payments = await this.prisma.salaryPayment.findMany({
      where: { tenantId, month, year },
      include: { salary: { include: { user: { select: { id: true, fullName: true } } } } },
    })
    const salaries = await this.prisma.salary.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, fullName: true, status: true } } },
    })

    const totalSalary = salaries.reduce((s, sal) => s + sal.amount, 0)
    const totalPaid = payments.reduce((s, p) => s + p.amount + p.bonus, 0)
    const totalBonus = payments.reduce((s, p) => s + p.bonus, 0)
    const paidCount = payments.length
    const unpaidCount = salaries.length - paidCount

    return { totalSalary, totalPaid, totalBonus, paidCount, unpaidCount, payments, salaries }
  }
}
