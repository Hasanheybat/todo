import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from './email.service'

@Injectable()
export class TaskReminderCron {
  private readonly logger = new Logger(TaskReminderCron.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Her gun seher 9:00-da gecikhmish tapshiriqlar uchun xatirlatma gonder
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyReminder() {
    this.logger.log('Gundelik tapshiriq xatirlatmasi bashladi...')

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    // Son tarixi bugun ve ya sabah olan, tamamlanmamish tapshiriqlar
    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lte: tomorrow },
        status: { notIn: ['COMPLETED', 'APPROVED'] },
      },
      include: {
        assignees: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
    })

    let sent = 0
    for (const task of tasks) {
      for (const assignee of task.assignees) {
        if (assignee.user?.email) {
          const dueStr = task.dueDate
            ? new Date(task.dueDate).toLocaleDateString('az-AZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Teyin edilmeyib'
          await this.email.sendTaskReminder(
            assignee.user.email,
            assignee.user.fullName || 'Istifadeci',
            task.title,
            dueStr,
          )
          sent++
        }
      }
    }

    this.logger.log(`${sent} xatirlatma e-poctu gonderildi (${tasks.length} tapshiriq)`)
  }
}
