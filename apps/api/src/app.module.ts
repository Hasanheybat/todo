import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TodosModule } from './todos/todos.module'
import { TasksModule } from './tasks/tasks.module'
import { RolesModule } from './roles/roles.module'
import { TemplatesModule } from './templates/templates.module'
import { AttachmentsModule } from './attachments/attachments.module'
import { CommentsModule } from './comments/comments.module'
import { FinanceModule } from './finance/finance.module'
import { SalaryModule } from './salary/salary.module'
import { NotificationsModule } from './notifications/notifications.module'
import { DepartmentsModule } from './departments/departments.module'
import { TodoistModule } from './todoist/todoist.module'
import { TaskAssigneeFilesModule } from './task-assignee-files/task-assignee-files.module'
import { AdminModule } from './admin/admin.module'
import { ExportModule } from './export/export.module'
import { EmailModule } from './email/email.module'
import { ActivityModule } from './activity/activity.module'
import { RequestLoggerMiddleware } from './common/request-logger.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TodosModule,
    TasksModule,
    RolesModule,
    TemplatesModule,
    AttachmentsModule,
    CommentsModule,
    FinanceModule,
    SalaryModule,
    NotificationsModule,
    DepartmentsModule,
    TodoistModule,
    TaskAssigneeFilesModule,
    AdminModule,
    ExportModule,
    EmailModule,
    ActivityModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*')
  }
}
