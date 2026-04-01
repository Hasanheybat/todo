import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../auth/guards/super-admin.guard'

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  // ── Login (guard yox) ──
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Yanlış məlumat formatı')
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new BadRequestException('Yanlış məlumat formatı')
    }
    if (!body.email.trim() || !body.password) {
      throw new BadRequestException('E-poçt və şifrə tələb olunur')
    }
    if (body.email.length > 255 || body.password.length > 128) {
      throw new BadRequestException('Məlumat həddən artıq uzundur')
    }
    return this.service.login(body.email.trim().toLowerCase(), body.password)
  }

  // ── Dashboard ──
  @Get('stats')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getStats() {
    return this.service.getStats()
  }

  // ── Tenants ──
  @Get('tenants')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getTenants() {
    return this.service.getTenants()
  }

  @Get('tenants/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getTenant(@Param('id') id: string) {
    return this.service.getTenant(id)
  }

  @Post('tenants')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  createTenant(@Body() body: { name: string; plan?: string; adminEmail: string; adminPassword: string; adminName: string }, @Req() req: any) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Yanlış məlumat formatı')
    if (!body.name?.trim()) throw new BadRequestException('İşletmə adı tələb olunur')
    if (!body.adminEmail?.trim()) throw new BadRequestException('Admin e-poçtu tələb olunur')
    if (!body.adminPassword || body.adminPassword.length < 6) throw new BadRequestException('Şifrə ən az 6 simvol olmalıdır')
    if (!body.adminName?.trim()) throw new BadRequestException('Admin adı tələb olunur')
    if (body.plan && !['starter', 'pro', 'enterprise'].includes(body.plan)) {
      throw new BadRequestException('Yanlış plan: starter, pro, enterprise olmalıdır')
    }
    return this.service.createTenant(body, req.user.sub, req.user.email)
  }

  @Put('tenants/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  updateTenant(@Param('id') id: string, @Body() body: { name?: string; plan?: string; maxUsers?: number; maxBranches?: number; maxDepartments?: number }, @Req() req: any) {
    if (body.plan && !['starter', 'pro', 'enterprise'].includes(body.plan)) {
      throw new BadRequestException('Yanlış plan: starter, pro, enterprise olmalıdır')
    }
    return this.service.updateTenant(id, body, req.user.sub, req.user.email)
  }

  @Patch('tenants/:id/status')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  toggleTenantStatus(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleTenantStatus(id, req.user.sub, req.user.email)
  }

  @Delete('tenants/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  deleteTenant(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteTenant(id, req.user.sub, req.user.email)
  }

  // ── Logs ──
  @Get('logs')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getLogs(@Query('action') action?: string, @Query('limit') limit?: string) {
    return this.service.getLogs({ action, limit: limit ? parseInt(limit) : 50 })
  }

  // ── Settings ──
  @Get('settings')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getSettings() {
    return this.service.getDefaultSettings()
  }

  // ── Health — sistem sağlamlığı ──
  @Get('health')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getHealth() {
    return this.service.getHealth()
  }

  // ── Test error (dev only) ──
  @Get('test-error')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  testError() {
    throw new Error('Test xətası — monitoring yoxlaması')
  }
}
