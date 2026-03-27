import { Module } from '@nestjs/common'
import { TemplatesService } from './templates.service'
import { TemplatesController } from './templates.controller'
import { TemplateSchedulerService } from './template-scheduler.service'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplateSchedulerService, PermissionsGuard],
  exports: [TemplatesService],
})
export class TemplatesModule {}
