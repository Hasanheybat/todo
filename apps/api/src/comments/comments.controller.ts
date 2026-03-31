import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { CommentsService } from './comments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @RequirePermissions('tasks.read')
  create(@Body() body: { taskId: string; content: string }, @Req() req: any) {
    return this.commentsService.create(body.taskId, body.content, req.user.sub, req.user.tenantId)
  }

  @Get('task/:taskId')
  @RequirePermissions('tasks.read')
  findByTask(@Param('taskId') taskId: string, @Req() req: any) {
    return this.commentsService.findByTask(taskId, req.user.tenantId)
  }

  @Put(':id')
  @RequirePermissions('tasks.read')
  update(@Param('id') id: string, @Body() body: { content: string }, @Req() req: any) {
    return this.commentsService.update(id, body.content, req.user.sub, req.user.tenantId)
  }

  @Delete(':id')
  @RequirePermissions('tasks.read')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.commentsService.remove(id, req.user.sub, req.user.tenantId)
  }
}
