import { Controller, Post, Get, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, Res } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { Response } from 'express'
import { AttachmentsService } from './attachments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'
import * as path from 'path'
import * as crypto from 'crypto'
import { secureFileFilter } from '../common/file-filter'

@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('upload')
  @RequirePermissions('files.upload')
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
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('taskId') taskId: string,
    @Query('todoId') todoId: string,
    @Req() req: any,
  ) {
    return this.attachmentsService.upload(file, req.user.sub, req.user.tenantId, taskId, todoId)
  }

  @Get('task/:taskId')
  @RequirePermissions('files.download')
  findByTask(@Param('taskId') taskId: string, @Req() req: any) {
    return this.attachmentsService.findByTask(taskId, req.user.tenantId)
  }

  @Get('todo/:todoId')
  findByTodo(@Param('todoId') todoId: string, @Req() req: any) {
    return this.attachmentsService.findByTodo(todoId, req.user.tenantId)
  }

  @Get(':id/download')
  @RequirePermissions('files.download')
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const attachments = await this.attachmentsService.findByTask(id, req.user.tenantId)
    const att = await (this.attachmentsService as any).prisma.attachment.findFirst({
      where: { id, tenantId: req.user.tenantId },
    })
    if (!att) return res.status(404).json({ message: 'Fayl tapılmadı' })
    const filePath = this.attachmentsService.getFilePath(att.storagePath)
    res.download(filePath, att.filename)
  }

  @Delete(':id')
  @RequirePermissions('files.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.attachmentsService.remove(id, req.user.tenantId)
  }
}
