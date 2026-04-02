import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ActivityService } from './activity.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('Activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.findAll(req.user.tenantId, {
      entityType,
      userId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })
  }

  @Get('entity/:type/:id')
  findByEntity(
    @Param('type') type: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.activityService.findByEntity(type, id, req.user.tenantId)
  }
}
