import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { SalaryService } from './salary.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('salary')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalaryController {
  constructor(private salaryService: SalaryService) {}

  @Post()
  @RequirePermissions('salary.create')
  assignSalary(@Body() body: { userId: string; amount: number; currency?: string }, @Req() req: any) {
    return this.salaryService.assignSalary(body, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('salary.read')
  findAll(@Req() req: any) {
    return this.salaryService.findAll(req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('salary.update')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.salaryService.update(id, body, req.user.tenantId)
  }

  @Get('payments')
  @RequirePermissions('salary.payments')
  getPayments(@Req() req: any, @Query('month') month?: string) {
    return this.salaryService.getPayments(req.user.tenantId, month)
  }

  @Post('payments')
  @RequirePermissions('salary.payments')
  createPayment(@Body() body: any, @Req() req: any) {
    return this.salaryService.createPayment(body, req.user.tenantId)
  }
}
