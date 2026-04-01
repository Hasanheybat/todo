import { Module, Global } from '@nestjs/common'
import { EmailService } from './email.service'
import { TaskReminderCron } from './task-reminder.cron'

@Global()
@Module({
  providers: [EmailService, TaskReminderCron],
  exports: [EmailService],
})
export class EmailModule {}
