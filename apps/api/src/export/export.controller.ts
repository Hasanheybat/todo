import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { ExportService } from './export.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('Export')
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('tasks')
  async exportTasks(@Req() req: any, @Res() res: Response) {
    const buffer = await this.exportService.exportTasks(req.user.tenantId, req.user.sub)
    const filename = `tapshiriqlar_${new Date().toISOString().split('T')[0]}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }

  @Get('finance')
  async exportFinance(@Req() req: any, @Res() res: Response) {
    const buffer = await this.exportService.exportFinance(req.user.tenantId)
    const filename = `maliyye_${new Date().toISOString().split('T')[0]}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }
}
