import { Module } from '@nestjs/common'
import { TaskAssigneeFilesController } from './task-assignee-files.controller'
import { TaskAssigneeFilesService } from './task-assignee-files.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TaskAssigneeFilesController],
  providers: [TaskAssigneeFilesService, PermissionsGuard],
  exports: [TaskAssigneeFilesService],
})
export class TaskAssigneeFilesModule {}
