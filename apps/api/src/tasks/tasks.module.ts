import { Module } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [AuthModule, PrismaModule, UsersModule],
  controllers: [TasksController],
  providers: [TasksService, PermissionsGuard],
})
export class TasksModule {}
