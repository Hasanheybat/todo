import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { RolesService } from './roles.service'
import { CreateRoleDto } from './dto/create-role.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions('roles.read')
  getPermissions() {
    return this.rolesService.getPermissions()
  }

  @Post()
  @RequirePermissions('roles.create')
  create(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.rolesService.create(dto, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('roles.read')
  findAll(@Req() req: any) {
    return this.rolesService.findAll(req.user.tenantId)
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.findOne(id, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('roles.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>, @Req() req: any) {
    return this.rolesService.update(id, dto, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.remove(id, req.user.tenantId)
  }

  @Post(':id/assign/:userId')
  @RequirePermissions('roles.assign')
  assignRole(@Param('id') roleId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.rolesService.assignRole(userId, roleId, req.user.tenantId)
  }
}
