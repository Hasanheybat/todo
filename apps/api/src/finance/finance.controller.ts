import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { FinanceService } from './finance.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  // ── Kateqoriyalar ──
  @Post('categories')
  @RequirePermissions('finance.manage')
  createCategory(@Body() body: { name: string; color?: string }, @Req() req: any) {
    return this.financeService.createCategory(body, req.user.tenantId)
  }

  @Get('categories')
  @RequirePermissions('finance.manage')
  getCategories(@Req() req: any) {
    return this.financeService.getCategories(req.user.tenantId)
  }

  @Delete('categories/:id')
  @RequirePermissions('finance.manage')
  deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.financeService.deleteCategory(id, req.user.tenantId)
  }

  // ── Kassa əməliyyatları ──
  @Post('transactions')
  @RequirePermissions('finance.manage')
  createTransaction(@Body() body: any, @Req() req: any) {
    return this.financeService.createTransaction(body, req.user.sub, req.user.tenantId)
  }

  @Get('transactions')
  @RequirePermissions('finance.manage')
  getTransactions(@Req() req: any, @Query() filters: any) {
    return this.financeService.getTransactions(req.user.tenantId, filters)
  }

  @Put('transactions/:id')
  @RequirePermissions('finance.manage')
  updateTransaction(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.financeService.updateTransaction(id, body, req.user.tenantId)
  }

  @Delete('transactions/:id')
  @RequirePermissions('finance.manage')
  deleteTransaction(@Param('id') id: string, @Req() req: any) {
    return this.financeService.deleteTransaction(id, req.user.tenantId)
  }

  // ── Statistika ──
  @Get('summary')
  @RequirePermissions('finance.manage')
  getSummary(@Req() req: any) {
    return this.financeService.getSummary(req.user.tenantId)
  }

  // ── İşçi Bakiyəsi ──
  @Get('employee-ledger')
  @RequirePermissions('finance.manage')
  getEmployeeLedger(@Req() req: any, @Query('userId') userId?: string) {
    return this.financeService.getEmployeeLedger(req.user.tenantId, userId)
  }

  @Get('employee-balances')
  @RequirePermissions('finance.manage')
  getEmployeeBalances(@Req() req: any) {
    return this.financeService.getEmployeeBalances(req.user.tenantId)
  }

  @Post('employee-ledger/add-balance')
  @RequirePermissions('finance.manage')
  addEmployeeBalance(@Body() body: { userId: string; amount: number; category?: string; description?: string }, @Req() req: any) {
    return this.financeService.addEmployeeBalance(body, req.user.sub, req.user.tenantId)
  }

  // ── Maaş hesablama və ödəmə ──
  @Post('salary-calculate')
  @RequirePermissions('finance.manage')
  calculateSalaries(@Req() req: any, @Body() body?: { month?: number; year?: number }) {
    return this.financeService.calculateSalaries(req.user.tenantId, body?.month, body?.year)
  }

  @Post('salary-pay/:ledgerId')
  @RequirePermissions('finance.manage')
  paySalary(@Param('ledgerId') ledgerId: string, @Req() req: any) {
    return this.financeService.paySalary(ledgerId, req.user.sub, req.user.tenantId)
  }
}
