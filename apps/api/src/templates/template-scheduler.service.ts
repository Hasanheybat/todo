import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { TemplatesService } from './templates.service'
import { randomUUID } from 'crypto'

@Injectable()
export class TemplateSchedulerService {
  private readonly logger = new Logger(TemplateSchedulerService.name)

  constructor(
    private prisma: PrismaService,
    private templatesService: TemplatesService,
  ) {}

  // Hər dəqiqə yoxla — vaxtı gələn şablonları icra et
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledTemplates() {
    const now = new Date()

    // Aktiv olan və nextRunAt vaxtı keçmiş şablonları tap
    const dueTemplates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        assignees: true,
      },
    })

    if (dueTemplates.length === 0) return

    this.logger.log(`${dueTemplates.length} şablon icra ediləcək`)

    for (const template of dueTemplates) {
      try {
        // endDate yoxla — keçibsə deaktiv et
        if (template.endDate && now > template.endDate) {
          await this.prisma.taskTemplate.update({
            where: { id: template.id },
            data: { isActive: false },
          })
          this.logger.log(`Şablon bitiş tarixi keçib, deaktiv edildi: ${template.name}`)
          continue
        }

        // Dispatch period hesabla (2026-03 formatında)
        const dispatchPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        // Deadline tarixi hesabla
        let dueDate: Date | undefined
        if (template.deadlineDay) {
          dueDate = new Date(now.getFullYear(), now.getMonth(), template.deadlineDay, 23, 59, 59)
          // Deadline keçmiş ayda olarsa gələn aya keçir
          if (dueDate < now) {
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, template.deadlineDay, 23, 59, 59)
          }
        }

        if (template.isRecurring) {
          // ═══ TƏKRARLANAN GÖREV DISPATCH ═══
          // Hər assignee üçün ayrı task instance yarat
          const groupId = randomUUID()

          for (const assignee of template.assignees) {
            // Ana görev yarat
            const task = await this.prisma.task.create({
              data: {
                title: template.name,
                description: template.description || `Avtomatik şablon: ${template.name}`,
                type: 'GOREV',
                priority: 'MEDIUM',
                status: 'CREATED',
                dueDate,
                creatorId: template.creatorId,
                tenantId: template.tenantId,
                businessId: template.businessId || undefined,
                departmentId: undefined, // BusinessDepartment id-dir, Task-da Department id lazımdır
                sourceTemplateId: template.id,
                dispatchPeriod,
                groupId,
                assignees: {
                  create: [{ userId: assignee.userId }],
                },
              },
            })

            // Alt görevlər yarat (sub-task olaraq)
            for (const item of template.items) {
              await this.prisma.task.create({
                data: {
                  title: item.title,
                  priority: item.priority,
                  status: 'CREATED',
                  dueDate,
                  creatorId: template.creatorId,
                  tenantId: template.tenantId,
                  parentId: task.id,
                  sourceTemplateId: template.id,
                  dispatchPeriod,
                  assignees: {
                    create: [{ userId: assignee.userId }],
                  },
                },
              })
            }
          }

          this.logger.log(`Təkrarlanan görev dispatch edildi: ${template.name} — ${template.assignees.length} işçiyə, ${template.items.length} alt görev`)
        } else {
          // ═══ STANDART ŞABLON İCRASI (köhnə məntiq) ═══
          for (const item of template.items) {
            await this.prisma.task.create({
              data: {
                title: item.title,
                description: `Avtomatik şablon: ${template.name}`,
                priority: item.priority,
                status: 'CREATED',
                creatorId: template.creatorId,
                tenantId: template.tenantId,
                sourceTemplateId: template.id,
                dispatchPeriod,
                assignees: template.assignees.length > 0 ? {
                  create: template.assignees.map(a => ({ userId: a.userId })),
                } : undefined,
              },
            })
          }
          this.logger.log(`Şablon icra edildi: ${template.name} — ${template.items.length} tapşırıq yaradıldı`)
        }

        // Növbəti icra vaxtını hesabla
        const nextRunAt = this.calculateNextRun(template)

        // endDate yoxla — növbəti icra bitiş tarixindən sonradırsa deaktiv et
        const shouldDeactivate = template.scheduleType === 'ONCE' ||
          (template.endDate && nextRunAt > template.endDate)

        await this.prisma.taskTemplate.update({
          where: { id: template.id },
          data: {
            lastRunAt: now,
            nextRunAt: shouldDeactivate ? null : nextRunAt,
            isActive: !shouldDeactivate,
          },
        })

      } catch (error) {
        this.logger.error(`Şablon icra xətası: ${template.name}`, error)
      }
    }
  }

  // Hər saat — bildirim günü yoxla (notificationDay)
  @Cron(CronExpression.EVERY_HOUR)
  async handleNotificationReminders() {
    const now = new Date()
    const today = now.getDate()

    // Bu gün notificationDay olan aktiv təkrarlanan şablonları tap
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        isRecurring: true,
        notificationDay: today,
      },
      include: {
        assignees: { include: { user: true } },
      },
    })

    if (templates.length === 0) return

    // Yalnız saat 9:00-da göndər (hər saat çağrılır amma yalnız 9-da işləsin)
    if (now.getHours() !== 9) return

    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    for (const template of templates) {
      // Bu dövrdə tamamlamamış assignee-ləri tap
      for (const assignee of template.assignees) {
        const incompleteTask = await this.prisma.task.findFirst({
          where: {
            sourceTemplateId: template.id,
            dispatchPeriod: currentPeriod,
            assignees: { some: { userId: assignee.userId } },
            status: { notIn: ['COMPLETED', 'APPROVED'] },
          },
        })

        if (incompleteTask) {
          // Bildirim yarat
          try {
            await this.prisma.notification.create({
              data: {
                type: 'TASK_REMINDER' as any,
                title: `Xatırlatma: ${template.name}`,
                message: `"${template.name}" təkrarlanan görevini tamamlayın. Son tarix: ayın ${template.deadlineDay}-i`,
                userId: assignee.userId,
                senderId: template.creatorId,
                tenantId: template.tenantId,
                link: '/tasks',
              },
            })
          } catch (e) {
            // NotificationType-da TASK_REMINDER olmaya bilər, ignore
          }
        }
      }
      this.logger.log(`Bildirim göndərildi: ${template.name} — tamamlamamış işçilərə xatırlatma`)
    }
  }

  private calculateNextRun(template: any): Date {
    const now = new Date()
    const [hours, minutes] = (template.scheduleTime || '09:00').split(':').map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)

    switch (template.scheduleType) {
      case 'DAILY':
        next.setDate(next.getDate() + 1)
        break
      case 'WEEKLY':
        next.setDate(next.getDate() + 7)
        break
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1)
        next.setDate(template.dayOfMonth ?? 1)
        break
      case 'CUSTOM':
        next.setDate(next.getDate() + (template.customDays ?? 7))
        break
    }
    return next
  }
}
