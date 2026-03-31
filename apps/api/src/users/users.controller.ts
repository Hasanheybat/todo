import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.manage')
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(dto, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('users.read')
  findAll(@Req() req: any, @Query('businessId') businessId?: string, @Query('departmentId') departmentId?: string) {
    return this.usersService.findAll(req.user.tenantId, businessId, departmentId)
  }

  @Get('assignable')
  @RequirePermissions('tasks.create')
  getAssignableUsers(@Req() req: any) {
    return this.usersService.getAssignableUsers(req.user.sub, req.user.tenantId)
  }

  @Get('hierarchy')
  @RequirePermissions('users.read')
  getHierarchy(@Req() req: any) {
    return this.usersService.getHierarchy(req.user.tenantId)
  }

  @Get('businesses')
  @RequirePermissions('users.read')
  getBusinesses(@Req() req: any) {
    return this.usersService.getBusinesses(req.user.tenantId)
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req.user.tenantId)
  }

  @Get(':id/subordinates')
  @RequirePermissions('users.read')
  getSubordinates(@Param('id') id: string, @Req() req: any) {
    return this.usersService.getSubordinates(id, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.usersService.update(id, dto, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user.tenantId)
  }
}
