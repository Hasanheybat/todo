import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTemplateDto } from './dto/create-template.dto'

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto, creatorId: string, tenantId: string) {
    // Validation — array size limits
    if (dto.assigneeIds && dto.assigneeIds.length > 50) {
      throw new NotFoundException('Maksimum 50 işçi atana bilərsiniz')
    }
    if (dto.items && dto.items.length > 30) {
      throw new NotFoundException('Maksimum 30 alt görev əlavə edə bilərsiniz')
    }
    // AssigneeIds validation
    if (dto.assigneeIds?.length) {
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: dto.assigneeIds }, tenantId },
        select: { id: true },
      })
      const existingIds = new Set(existingUsers.map(u => u.id))
      const invalid = dto.assigneeIds.filter(id => !existingIds.has(id))
      if (invalid.length > 0) {
        throw new NotFoundException(`Bu istifadəçilər tapılmadı: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '...' : ''}`)
      }
    }

    const nextRunAt = this.calculateNextRun(dto)

    const template = await this.prisma.taskTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        isRecurring: dto.isRecurring || false,
        scheduleType: dto.scheduleType as any,
        scheduleTime: dto.scheduleTime || '09:00',
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        customDays: dto.customDays,
        nextRunAt,
        creatorId,
        tenantId,
        businessId: dto.businessId || undefined,
        departmentId: dto.departmentId || undefined,
        notificationDay: dto.notificationDay,
        deadlineDay: dto.deadlineDay,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        items: {
          create: dto.items.map((item, i) => ({
            title: item.title,
            priority: (item.priority || 'MEDIUM') as any,
            sortOrder: item.sortOrder ?? i,
          })),
        },
        assignees: dto.assigneeIds?.length ? {
          create: dto.assigneeIds.map(userId => ({ userId })),
        } : undefined,
      },
      include: this.includeRelations(),
    })

    return template
  }

  async findAll(tenantId: string, userId?: string) {
    return this.prisma.taskTemplate.findMany({
      where: {
        tenantId,
        ...(userId ? { creatorId: userId } : {}),
      },
      include: this.includeRelations(),
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const template = await this.prisma.taskTemplate.findFirst({
      where: { id, tenantId },
      include: this.includeRelations(),
    })
    if (!template) throw new NotFoundException('Şablon tapılmadı')
    return template
  }

  async update(id: string, dto: Partial<CreateTemplateDto>, tenantId: string) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, tenantId } })
    if (!template) throw new NotFoundException('Şablon tapılmadı')

    // Items yeniləmə — köhnələri sil, yenilərini yarat
    if (dto.items) {
      await this.prisma.templateItem.deleteMany({ where: { templateId: id } })
    }
    if (dto.assigneeIds) {
      await this.prisma.templateAssignee.deleteMany({ where: { templateId: id } })
    }

    const nextRunAt = dto.scheduleType ? this.calculateNextRun(dto as CreateTemplateDto) : undefined

    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isRecurring: dto.isRecurring,
        scheduleType: dto.scheduleType as any,
        scheduleTime: dto.scheduleTime,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        customDays: dto.customDays,
        businessId: dto.businessId,
        departmentId: dto.departmentId,
        notificationDay: dto.notificationDay,
        deadlineDay: dto.deadlineDay,
        endDate: dto.endDate ? new Date(dto.endDate) : dto.endDate === null ? null : undefined,
        ...(nextRunAt !== undefined ? { nextRunAt } : {}),
        items: dto.items ? {
          create: dto.items.map((item, i) => ({
            title: item.title,
            priority: (item.priority || 'MEDIUM') as any,
            sortOrder: item.sortOrder ?? i,
          })),
        } : undefined,
        assignees: dto.assigneeIds ? {
          create: dto.assigneeIds.map(userId => ({ userId })),
        } : undefined,
      },
      include: this.includeRelations(),
    })
  }

  async remove(id: string, tenantId: string) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, tenantId } })
    if (!template) throw new NotFoundException('Şablon tapılmadı')
    await this.prisma.taskTemplate.delete({ where: { id } })
    return { message: 'Şablon silindi' }
  }

  async toggleActive(id: string, tenantId: string) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, tenantId } })
    if (!template) throw new NotFoundException('Şablon tapılmadı')

    const nextRunAt = !template.isActive ? this.calculateNextRun({
      scheduleType: template.scheduleType,
      scheduleTime: template.scheduleTime,
      dayOfWeek: template.dayOfWeek ?? undefined,
      dayOfMonth: template.dayOfMonth ?? undefined,
      customDays: template.customDays ?? undefined,
    } as any) : null

    return this.prisma.taskTemplate.update({
      where: { id },
      data: { isActive: !template.isActive, nextRunAt },
      include: this.includeRelations(),
    })
  }

  // Şablonu indi icra et — tapşırıqlar yarat
  async executeNow(id: string, tenantId: string) {
    const template = await this.prisma.taskTemplate.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, assignees: true },
    })
    if (!template) throw new NotFoundException('Şablon tapılmadı')

    const createdTasks = []

    for (const item of template.items) {
      const task = await this.prisma.task.create({
        data: {
          title: item.title,
          description: `Şablon: ${template.name}`,
          priority: item.priority,
          status: 'CREATED',
          creatorId: template.creatorId,
          tenantId,
          assignees: template.assignees.length > 0 ? {
            create: template.assignees.map(a => ({ userId: a.userId })),
          } : undefined,
        },
      })
      createdTasks.push(task)
    }

    // lastRunAt və nextRunAt yenilə
    const nextRunAt = this.calculateNextRun({
      scheduleType: template.scheduleType,
      scheduleTime: template.scheduleTime,
      dayOfWeek: template.dayOfWeek ?? undefined,
      dayOfMonth: template.dayOfMonth ?? undefined,
      customDays: template.customDays ?? undefined,
    } as any)

    await this.prisma.taskTemplate.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: template.scheduleType === 'ONCE' ? null : nextRunAt,
        isActive: template.scheduleType === 'ONCE' ? false : template.isActive,
      },
    })

    return { message: `${createdTasks.length} tapşırıq yaradıldı`, tasks: createdTasks }
  }

  // Növbəti icra vaxtını hesabla
  private calculateNextRun(dto: { scheduleType: string; scheduleTime?: string; dayOfWeek?: number; dayOfMonth?: number; customDays?: number }): Date {
    const now = new Date()
    const [hours, minutes] = (dto.scheduleTime || '09:00').split(':').map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)

    switch (dto.scheduleType) {
      case 'DAILY':
        if (next <= now) next.setDate(next.getDate() + 1)
        break
      case 'WEEKLY':
        const targetDay = dto.dayOfWeek ?? 1
        const currentDay = now.getDay()
        let daysUntil = targetDay - currentDay
        if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) daysUntil += 7
        next.setDate(now.getDate() + daysUntil)
        break
      case 'MONTHLY':
        next.setDate(dto.dayOfMonth ?? 1)
        if (next <= now) next.setMonth(next.getMonth() + 1)
        break
      case 'CUSTOM':
        next.setDate(now.getDate() + (dto.customDays ?? 7))
        break
      case 'ONCE':
        if (next <= now) next.setDate(next.getDate() + 1)
        break
    }
    return next
  }

  private includeRelations() {
    return {
      items: { orderBy: { sortOrder: 'asc' as const } },
      assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      creator: { select: { id: true, fullName: true } },
      business: { select: { id: true, name: true } },
      department: { include: { department: { select: { id: true, name: true } } } },
    }
  }
}
