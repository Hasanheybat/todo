import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications.read')
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.sub, req.user.tenantId)
  }

  @Get('unread-count')
  @RequirePermissions('notifications.read')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.sub, req.user.tenantId)
  }

  @Post(':id/read')
  @RequirePermissions('notifications.read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.sub)
  }

  @Post('read-all')
  @RequirePermissions('notifications.read')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.sub, req.user.tenantId)
  }
}
