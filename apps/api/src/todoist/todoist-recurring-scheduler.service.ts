import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TodoistRecurringSchedulerService {
  private readonly logger = new Logger(TodoistRecurringSchedulerService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Hər saat yoxlayır: təkrarlanan tapşırıqların tarixi keçibsə
   * amma hələ tamamlanmayıbsa — yeni tapşırıq yaradır.
   * Köhnə tapşırıq "gecikmiş" olaraq qalır.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async dispatchRecurringTasks() {
    try {
      const now = new Date()

      // Tarixi keçmiş, tamamlanmamış, təkrarlanan tapşırıqlar
      const overdueTasks = await this.prisma.todoistTask.findMany({
        where: {
          isRecurring: true,
          isCompleted: false,
          recurRule: { not: null },
          dueDate: { lt: now },
        },
        include: {
          labels: true,
        },
      })

      if (overdueTasks.length === 0) return

      this.logger.log(`${overdueTasks.length} gecikmiş təkrarlanan tapşırıq tapıldı`)

      for (const task of overdueTasks) {
        // Növbəti tarixi hesabla
        const nextDate = this.calculateNextDate(task.dueDate!, task.recurRule!)

        // Əgər növbəti tarix hələ gələcəkdədirsə — yalnız 1 yeni yarat
        // Əgər çox geridədirsə — ən yaxın gələcək tarixə qədər sürüşdür
        let targetDate = nextDate
        while (targetDate < now) {
          targetDate = this.calculateNextDate(targetDate, task.recurRule!)
        }

        // Artıq bu tarix üçün yaradılıb? (dublikat qoruma)
        const exists = await this.prisma.todoistTask.findFirst({
          where: {
            userId: task.userId,
            tenantId: task.tenantId,
            content: task.content,
            isRecurring: true,
            isCompleted: false,
            dueDate: targetDate,
          },
        })

        if (exists) continue

        // Yeni tapşırıq yarat
        const newTask = await this.prisma.todoistTask.create({
          data: {
            content: task.content,
            description: task.description,
            priority: task.priority,
            projectId: task.projectId,
            sectionId: task.sectionId,
            parentId: task.parentId,
            userId: task.userId,
            tenantId: task.tenantId,
            dueDate: targetDate,
            isRecurring: true,
            recurRule: task.recurRule,
            duration: task.duration,
            reminder: task.reminder ? this.calculateNextDate(task.reminder, task.recurRule!) : null,
            sortOrder: task.sortOrder,
          },
        })

        // Label-ları kopyala
        if (task.labels.length > 0) {
          await this.prisma.todoistTaskLabel.createMany({
            data: task.labels.map(l => ({ taskId: newTask.id, labelId: l.labelId })),
          })
        }

        this.logger.log(`Yeni recurring: "${task.content}" → ${targetDate.toISOString().split('T')[0]}`)
      }
    } catch (error) {
      this.logger.error('Recurring scheduler xətası', error)
    }
  }

  private calculateNextDate(currentDate: Date, recurRule: string): Date {
    const d = new Date(currentDate)
    switch (recurRule) {
      case 'daily': case 'DAILY': d.setDate(d.getDate() + 1); break
      case 'weekly': case 'WEEKLY': d.setDate(d.getDate() + 7); break
      case 'monthly': case 'MONTHLY': d.setMonth(d.getMonth() + 1); break
      case 'weekdays': case 'WEEKDAYS':
        d.setDate(d.getDate() + 1)
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
        break
      default:
        const match = recurRule.match(/custom:(\d+)([dwm])/i)
        if (match) {
          const num = parseInt(match[1])
          if (match[2] === 'd') d.setDate(d.getDate() + num)
          else if (match[2] === 'w') d.setDate(d.getDate() + num * 7)
          else if (match[2] === 'm') d.setMonth(d.getMonth() + num)
        } else {
          d.setDate(d.getDate() + 1)
        }
    }
    return d
  }
}
