import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common'
import { SyncService } from './sync.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post()
  @HttpCode(200)
  async sync(@Req() req: any, @Body() body: {
    sync_token?: string | null
    commands?: { type: string; temp_id?: string; args: Record<string, any> }[]
  }) {
    return this.syncService.sync(
      req.user.sub,
      req.user.tenantId,
      body.sync_token || null,
      body.commands || [],
    )
  }
}
