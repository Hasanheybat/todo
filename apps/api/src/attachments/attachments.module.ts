import { Module } from '@nestjs/common'
import { AttachmentsService } from './attachments.service'
import { AttachmentsController } from './attachments.controller'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PermissionsGuard],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
