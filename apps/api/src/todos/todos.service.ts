import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTodoDto } from './dto/create-todo.dto'
import { UpdateTodoDto } from './dto/update-todo.dto'

@Injectable()
export class TodosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTodoDto, userId: string, tenantId: string) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        visibility: (dto.visibility as any) || 'PRIVATE',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        businessId: dto.businessId || null,
        userId,
        tenantId,
      },
    })
  }

  async findAll(userId: string, tenantId: string) {
    return this.prisma.todo.findMany({
      where: {
        tenantId,
        OR: [
          { userId },
          { visibility: 'TEAM' },
          { visibility: 'BUSINESS' },
        ],
      },
      include: {
        user: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const todo = await this.prisma.todo.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
      },
    })
    if (!todo) throw new NotFoundException('Todo tapılmadı')
    return todo
  }

  async update(id: string, dto: UpdateTodoDto, tenantId: string) {
    const todo = await this.prisma.todo.findFirst({ where: { id, tenantId } })
    if (!todo) throw new NotFoundException('Todo tapılmadı')

    return this.prisma.todo.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      } as any,
    })
  }

  async remove(id: string, tenantId: string) {
    const todo = await this.prisma.todo.findFirst({ where: { id, tenantId } })
    if (!todo) throw new NotFoundException('Todo tapılmadı')
    await this.prisma.todo.delete({ where: { id } })
    return { message: 'Todo silindi' }
  }
}
