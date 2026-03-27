import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { TodoistService } from './todoist.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto'
import { CreateSectionDto } from './dto/create-section.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'
import * as path from 'path'
import * as crypto from 'crypto'
import { secureFileFilter } from '../common/file-filter'

@Controller('todoist')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('todo.access')
export class TodoistController {
  constructor(private service: TodoistService) {}

  // ── Projects ──
  @Get('projects')
  getProjects(@Req() req: any) {
    return this.service.getProjects(req.user.sub, req.user.tenantId)
  }

  @Post('projects')
  createProject(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.service.createProject(dto, req.user.sub, req.user.tenantId)
  }

  @Put('projects/:id')
  updateProject(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.updateProject(id, dto, req.user.sub)
  }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteProject(id, req.user.sub, req.user.tenantId)
  }

  // ── Sections ──
  @Get('projects/:projectId/sections')
  getSections(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.getSections(projectId, req.user.sub)
  }

  @Post('sections')
  createSection(@Body() dto: CreateSectionDto, @Req() req: any) {
    return this.service.createSection(dto, req.user.sub)
  }

  @Put('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.updateSection(id, dto, req.user.sub)
  }

  @Delete('sections/:id')
  deleteSection(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteSection(id, req.user.sub)
  }

  // ── Tasks ──
  @Get('tasks')
  getTasks(@Req() req: any, @Query() query: any) {
    return this.service.getTasks(req.user.sub, req.user.tenantId, query)
  }

  @Get('tasks/search')
  searchTasks(@Req() req: any, @Query('q') q: string) {
    return this.service.searchTasks(req.user.sub, req.user.tenantId, q || '')
  }

  @Get('tasks/today')
  getTasksToday(@Req() req: any) {
    return this.service.getTasksToday(req.user.sub, req.user.tenantId)
  }

  @Get('tasks/upcoming')
  getTasksUpcoming(@Req() req: any) {
    return this.service.getTasksUpcoming(req.user.sub, req.user.tenantId)
  }

  @Get('tasks/:taskId')
  getTaskById(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getTaskById(taskId, req.user.sub, req.user.tenantId)
  }

  @Post('tasks')
  @RequirePermissions('todo.access', 'todo.create')
  createTask(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.service.createTask(dto, req.user.sub, req.user.tenantId)
  }

  @Put('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    return this.service.updateTask(id, dto, req.user.sub)
  }

  @Post('tasks/:id/complete')
  completeTask(@Param('id') id: string, @Req() req: any) {
    return this.service.completeTask(id, req.user.sub)
  }

  @Post('tasks/:id/uncomplete')
  uncompleteTask(@Param('id') id: string, @Req() req: any) {
    return this.service.uncompleteTask(id, req.user.sub)
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteTask(id, req.user.sub)
  }

  // ── Labels ──
  @Get('labels')
  getLabels(@Req() req: any) {
    return this.service.getLabels(req.user.sub, req.user.tenantId)
  }

  @Post('labels')
  createLabel(@Body() dto: { name: string; color?: string }, @Req() req: any) {
    return this.service.createLabel(dto, req.user.sub, req.user.tenantId)
  }

  @Put('labels/:id')
  updateLabel(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.updateLabel(id, dto, req.user.sub)
  }

  @Delete('labels/:id')
  deleteLabel(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteLabel(id, req.user.sub)
  }

  // ── Comments ──
  @Get('tasks/:taskId/comments')
  getComments(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getComments(taskId, req.user.sub)
  }

  @Post('tasks/:taskId/comments')
  createComment(@Param('taskId') taskId: string, @Body() dto: { content: string }, @Req() req: any) {
    return this.service.createComment(taskId, dto.content, req.user.sub)
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteComment(id, req.user.sub)
  }

  // ── Attachments ──
  @Post('tasks/:taskId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`
          cb(null, uniqueName)
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: secureFileFilter,
    }),
  )
  uploadTodoistAttachment(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.uploadAttachment(taskId, file, req.user.sub, req.user.tenantId)
  }

  @Get('tasks/:taskId/attachments')
  getTodoistAttachments(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getAttachments(taskId, req.user.tenantId)
  }

  @Delete('attachments/:id')
  deleteTodoistAttachment(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteAttachment(id, req.user.tenantId)
  }

  // ── Reorder ──
  @Post('tasks/reorder')
  reorderTasks(@Body() body: { items: { id: string; sortOrder: number; projectId?: string; sectionId?: string }[] }, @Req() req: any) {
    return this.service.reorderTasks(req.user.sub, body.items)
  }

  // ── Bulk Actions ──
  @Post('tasks/bulk')
  async bulkAction(@Body() body: { taskIds: string[]; action: string; payload?: any }, @Req() req: any) {
    try {
      return await this.service.bulkAction(req.user.sub, req.user.tenantId, body)
    } catch (e: any) {
      if (e.status) throw e // NestJS exception — olduğu kimi at
      throw new (require('@nestjs/common').BadRequestException)(e.message || 'Bulk əməliyyat xətası')
    }
  }

  // ── Activity Log ──
  @Get('activities')
  getActivities(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.getActivities(req.user.sub, req.user.tenantId, limit ? parseInt(limit) : 50)
  }

  // ── Templates ──
  @Get('templates')
  getTemplates(@Req() req: any) {
    return this.service.getTemplates(req.user.sub, req.user.tenantId)
  }

  @Post('templates')
  createTemplate(@Body() body: { name: string; description?: string; tasks: string; color?: string }, @Req() req: any) {
    return this.service.createTemplate(req.user.sub, req.user.tenantId, body)
  }

  @Post('templates/:id/use')
  useTemplate(@Param('id') id: string, @Body() body: { projectName: string }, @Req() req: any) {
    return this.service.createProjectFromTemplate(req.user.sub, req.user.tenantId, id, body.projectName)
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteTemplate(id, req.user.sub)
  }
}
