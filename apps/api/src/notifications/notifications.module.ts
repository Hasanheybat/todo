import { Module, Global } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsGateway } from './notifications.gateway'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Global()
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, PermissionsGuard],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
