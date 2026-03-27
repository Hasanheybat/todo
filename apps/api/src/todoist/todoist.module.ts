import { Module } from '@nestjs/common'
import { TodoistService } from './todoist.service'
import { TodoistController } from './todoist.controller'
import { SyncController } from './sync.controller'
import { SyncService } from './sync.service'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { TodoistReminderSchedulerService } from './todoist-reminder-scheduler.service'
import { TodoistRecurringSchedulerService } from './todoist-recurring-scheduler.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TodoistController, SyncController],
  providers: [TodoistService, SyncService, PermissionsGuard, TodoistReminderSchedulerService, TodoistRecurringSchedulerService],
})
export class TodoistModule {}
