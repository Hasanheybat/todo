import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async upload(file: Express.Multer.File, uploaderId: string, tenantId: string, taskId?: string, todoId?: string) {
    const attachment = await this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        taskId: taskId || null,
        todoId: todoId || null,
        uploaderId,
        tenantId,
      },
    })
    return attachment
  }

  async findByTask(taskId: string, tenantId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId, tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByTodo(todoId: string, tenantId: string) {
    return this.prisma.attachment.findMany({
      where: { todoId, tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async remove(id: string, tenantId: string) {
    const attachment = await this.prisma.attachment.findFirst({ where: { id, tenantId } })
    if (!attachment) throw new NotFoundException('Fayl tapılmadı')

    // Faylı diskdən sil
    try { fs.unlinkSync(attachment.storagePath) } catch {}

    await this.prisma.attachment.delete({ where: { id } })
    return { message: 'Fayl silindi' }
  }

  getFilePath(storagePath: string): string {
    return path.resolve(storagePath)
  }
}
