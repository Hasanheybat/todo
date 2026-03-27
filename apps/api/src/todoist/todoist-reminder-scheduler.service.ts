import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class TodoistReminderSchedulerService {
  private readonly logger = new Logger(TodoistReminderSchedulerService.name)

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Hər dəqiqə — vaxtı gələn xatırlatmaları yoxla
  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
    this.logger.log(`Reminder yoxlanılır: ${now.toISOString()} — window: ${twoMinutesAgo.toISOString()} ~ ${now.toISOString()}`)

    try {
      const tasks = await this.prisma.todoistTask.findMany({
        where: {
          reminder: { lte: now, gte: twoMinutesAgo },
          reminderSent: false,
          isCompleted: false,
        },
        include: {
          user: { select: { id: true, tenantId: true } },
          project: { select: { name: true } },
        },
      })

      if (tasks.length === 0) return

      this.logger.log(`${tasks.length} xatırlatma göndəriləcək`)

      for (const task of tasks) {
        try {
          await this.notificationsService.create({
            type: 'TODO_DUE',
            title: 'Xatırlatma',
            message: `"${task.content}" tapşırığının vaxtı çatdı`,
            userId: task.userId,
            link: `/todo?projectId=${task.projectId}`,
            tenantId: task.user.tenantId,
          })

          await this.prisma.todoistTask.update({
            where: { id: task.id },
            data: { reminderSent: true },
          })

          this.logger.log(`✓ Xatırlatma göndərildi: "${task.content}" → ${task.userId}`)
        } catch (error) {
          this.logger.error(`Xatırlatma xətası: ${task.content}`, error)
        }
      }
    } catch (error) {
      this.logger.error('Reminder scheduler xətası', error)
    }
  }
}
