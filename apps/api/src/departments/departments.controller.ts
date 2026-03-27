import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('departments.create')
  create(@Body() body: { name: string; color?: string }, @Req() req: any) {
    return this.departmentsService.create(body, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('departments.read')
  findAll(@Req() req: any, @Query('businessId') businessId?: string) {
    return this.departmentsService.findAll(req.user.tenantId, businessId)
  }

  @Post('assign-business')
  @RequirePermissions('departments.update')
  assignToBusiness(@Body() body: { businessId: string; departmentId: string }) {
    return this.departmentsService.assignToBusiness(body.businessId, body.departmentId)
  }

  @Delete('unassign-business')
  @RequirePermissions('departments.update')
  unassignFromBusiness(@Body() body: { businessId: string; departmentId: string }) {
    return this.departmentsService.unassignFromBusiness(body.businessId, body.departmentId)
  }

  @Delete(':id')
  @RequirePermissions('departments.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.departmentsService.remove(id, req.user.tenantId)
  }
}
