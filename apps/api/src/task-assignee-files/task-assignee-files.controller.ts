import { Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Body, Req, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'
import { TaskAssigneeFilesService } from './task-assignee-files.service'
import { secureFileFilter } from '../common/file-filter'

@Controller('task-assignee-files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskAssigneeFilesController {
  constructor(private service: TaskAssigneeFilesService) {}

  @Post('upload')
  @RequirePermissions('files.upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1572864 }, // 1.5 MB
    fileFilter: secureFileFilter,
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('taskAssigneeId') taskAssigneeId: string,
    @Body('slotNumber') slotNumber: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Fayl seçilməyib')
    if (!taskAssigneeId) throw new BadRequestException('taskAssigneeId tələb olunur')
    if (!slotNumber) throw new BadRequestException('slotNumber tələb olunur')
    const cleanName = (file.originalname || '').replace(/[\x00-\x1f]/g, '').replace(/\.\./g, '')
    file.originalname = cleanName || 'unnamed'
    return this.service.upload(taskAssigneeId, parseInt(slotNumber), file, req.user.sub)
  }

  @Get(':taskAssigneeId')
  @RequirePermissions('files.download')
  async getFiles(@Param('taskAssigneeId') taskAssigneeId: string) {
    return this.service.getFiles(taskAssigneeId)
  }

  @Get(':taskAssigneeId/history')
  @RequirePermissions('files.download')
  async getHistory(@Param('taskAssigneeId') taskAssigneeId: string) {
    return this.service.getHistory(taskAssigneeId)
  }

  @Delete(':id')
  @RequirePermissions('files.delete')
  async deleteFile(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteFile(id, req.user.sub)
  }
}
