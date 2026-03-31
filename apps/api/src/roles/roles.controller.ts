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
  @RequirePermissions('users.manage')
  getPermissions(@Req() req: any) {
    return this.rolesService.getAllowedPermissions(req.user.tenantId)
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.rolesService.create(dto, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('users.manage')
  findAll(@Req() req: any) {
    return this.rolesService.findAll(req.user.tenantId)
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.findOne(id, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('users.manage')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>, @Req() req: any) {
    return this.rolesService.update(id, dto, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.remove(id, req.user.tenantId)
  }

  @Post(':id/assign/:userId')
  @RequirePermissions('users.manage')
  assignRole(@Param('id') roleId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.rolesService.assignRole(userId, roleId, req.user.tenantId)
  }
}
