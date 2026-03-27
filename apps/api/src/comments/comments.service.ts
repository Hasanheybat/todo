import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, content: string, authorId: string, tenantId: string) {
    // Tapşırığın mövcudluğunu yoxla
    const task = await this.prisma.task.findFirst({ where: { id: taskId, tenantId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    return this.prisma.comment.create({
      data: { content, taskId, authorId, tenantId },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    })
  }

  async findByTask(taskId: string, tenantId: string) {
    return this.prisma.comment.findMany({
      where: { taskId, tenantId },
      include: { author: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(id: string, content: string, authorId: string, tenantId: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id, authorId, tenantId } })
    if (!comment) throw new NotFoundException('Şərh tapılmadı')
    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    })
  }

  async remove(id: string, authorId: string, tenantId: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id, tenantId } })
    if (!comment) throw new NotFoundException('Şərh tapılmadı')
    // Yalnız öz şərhini və ya müdir silə bilər
    await this.prisma.comment.delete({ where: { id } })
    return { message: 'Şərh silindi' }
  }
}
