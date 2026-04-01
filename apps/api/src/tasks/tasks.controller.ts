import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @RequirePermissions('tasks.create')
  create(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.tasksService.create(dto, req.user.sub, req.user.tenantId)
  }

  @Get()
  @RequirePermissions('tasks.read')
  findAll(@Req() req: any, @Query('projectId') projectId?: string, @Query('labelId') labelId?: string) {
    return this.tasksService.findAll(req.user.tenantId, req.user.sub, { projectId, labelId })
  }

  @Get(':id')
  @RequirePermissions('tasks.read')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.findOne(id, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('tasks.create')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    return this.tasksService.update(id, dto, req.user.sub, req.user.tenantId)
  }

  @Patch(':id/my-status')
  @RequirePermissions('tasks.read')
  updateMyStatus(@Param('id') id: string, @Body() body: { status: string; note?: string }, @Req() req: any) {
    return this.tasksService.updateAssigneeStatus(id, req.user.sub, body.status, body.note)
  }

  // Mesajlaşma — service-dəki yoxlamalar əsas qorunmadır (approverId/creatorId/assignee yoxlanılır)
  @Patch(':id/assignee-note')
  @RequirePermissions('tasks.read')
  updateAssigneeNote(@Param('id') id: string, @Body() body: { userId: string; approverNote: string; fileId?: string; fileName?: string; fileSize?: number }, @Req() req: any) {
    return this.tasksService.updateApproverNote(id, req.user.sub, body.userId, body.approverNote, body.fileId, body.fileName, body.fileSize)
  }

  @Patch(':id/worker-note')
  @RequirePermissions('tasks.read')
  addWorkerNote(@Param('id') id: string, @Body() body: { note: string; fileId?: string; fileName?: string; fileSize?: number }, @Req() req: any) {
    return this.tasksService.addWorkerNote(id, req.user.sub, body.note, body.fileId, body.fileName, body.fileSize)
  }

  @Patch(':id/bulk-note')
  @RequirePermissions('tasks.read')
  addBulkNote(@Param('id') id: string, @Body() body: { note: string; fileId?: string; fileName?: string; fileSize?: number }, @Req() req: any) {
    return this.tasksService.addBulkNote(id, req.user.sub, body.note, body.fileId, body.fileName, body.fileSize)
  }

  @Patch(':id/edit-note')
  @RequirePermissions('tasks.read')
  editNote(@Param('id') id: string, @Body() body: { noteType: 'worker' | 'approver' | 'bulk'; noteIndex: number; userId?: string; newText: string }, @Req() req: any) {
    return this.tasksService.editNote(id, req.user.sub, body)
  }

  @Patch(':id/delete-note')
  @RequirePermissions('tasks.read')
  deleteNote(@Param('id') id: string, @Body() body: { noteType: 'worker' | 'approver' | 'bulk'; noteIndex: number; userId?: string }, @Req() req: any) {
    return this.tasksService.deleteNote(id, req.user.sub, body)
  }

  @Patch(':id/close-chat')
  @RequirePermissions('tasks.read')
  toggleChatClosed(@Param('id') id: string, @Body() body: { userId: string; closed: boolean }, @Req() req: any) {
    return this.tasksService.toggleChatClosed(id, req.user.sub, body.userId, body.closed)
  }

  @Patch(':id/change-assignee-status')
  @RequirePermissions('tasks.read')
  changeAssigneeStatus(@Param('id') id: string, @Body() body: { userId: string; status: string }, @Req() req: any) {
    return this.tasksService.changeAssigneeStatusByApprover(id, req.user.sub, body.userId, body.status)
  }

  @Patch(':id/finalize')
  @RequirePermissions('gorev.create|gorev.approve')
  finalizeTask(@Param('id') id: string, @Body() body: { note?: string; fileId?: string; fileName?: string; fileSize?: number; files?: { fileId: string; fileName: string; fileSize: number }[] }, @Req() req: any) {
    return this.tasksService.finalizeTask(id, req.user.sub, req.user.tenantId, body?.note, body?.fileId, body?.fileName, body?.fileSize, body?.files)
  }

  @Patch(':id/creator-approve')
  @RequirePermissions('tasks.create')
  creatorApprove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.creatorApproveTask(id, req.user.sub, req.user.tenantId)
  }

  @Post(':id/complete')
  @RequirePermissions('tasks.read')
  complete(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.complete(id, req.user.sub, req.user.tenantId)
  }

  @Post(':id/approve')
  @RequirePermissions('tasks.create')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.approve(id, req.user.sub, req.user.tenantId)
  }

  @Post(':id/reject')
  @RequirePermissions('tasks.create')
  reject(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.reject(id, req.user.sub, req.user.tenantId)
  }

  @Post(':id/close')
  @RequirePermissions('tasks.create')
  closeTask(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.closeTask(id, req.user.sub, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('tasks.create')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.remove(id, req.user.tenantId)
  }
}
