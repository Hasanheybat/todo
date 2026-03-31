import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { TemplatesService } from './templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  @RequirePermissions('tasks.create')
  create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    return this.templatesService.create(dto, req.user.sub, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('tasks.create')
  findAll(@Req() req: any) {
    return this.templatesService.findAll(req.user.tenantId, req.user.sub)
  }

  @Get(':id')
  @RequirePermissions('tasks.create')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.findOne(id, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('tasks.create')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>, @Req() req: any) {
    return this.templatesService.update(id, dto, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('tasks.create')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.remove(id, req.user.tenantId)
  }

  @Post(':id/toggle')
  @RequirePermissions('tasks.create')
  toggleActive(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.toggleActive(id, req.user.tenantId)
  }

  @Post(':id/execute')
  @RequirePermissions('tasks.create')
  executeNow(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.executeNow(id, req.user.tenantId)
  }
}
