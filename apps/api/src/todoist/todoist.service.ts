import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto'
import { CreateSectionDto } from './dto/create-section.dto'

@Injectable()
export class TodoistService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════

  async getProjects(userId: string, tenantId: string) {
    // İlk dəfə çağırıldıqda Inbox avtomatik yaradılır
    const existing = await this.prisma.todoistProject.findFirst({
      where: { userId, tenantId, isInbox: true },
    })
    if (!existing) {
      await this.prisma.todoistProject.create({
        data: { name: 'Gələnlər', color: '#246FE0', isInbox: true, userId, tenantId, sortOrder: 0 },
      })
    }

    return this.prisma.todoistProject.findMany({
      where: { userId, tenantId },
      include: {
        _count: { select: { tasks: { where: { isCompleted: false } } } },
      },
      orderBy: [{ isInbox: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async createProject(dto: CreateProjectDto, userId: string, tenantId: string) {
    const maxOrder = await this.prisma.todoistProject.aggregate({
      where: { userId, tenantId },
      _max: { sortOrder: true },
    })
    return this.prisma.todoistProject.create({
      data: {
        name: dto.name,
        color: dto.color || '#808080',
        isFavorite: dto.isFavorite || false,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        userId,
        tenantId,
      },
    })
  }

  async updateProject(id: string, dto: Partial<CreateProjectDto> & { viewType?: string; sortOrder?: number }, userId: string) {
    const project = await this.prisma.todoistProject.findFirst({ where: { id, userId } })
    if (!project) throw new NotFoundException('Layihə tapılmadı')
    if (project.isInbox && dto.name) throw new ForbiddenException('Inbox adını dəyişmək olmaz')

    return this.prisma.todoistProject.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.color && { color: dto.color }),
        ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
        ...(dto.viewType && { viewType: dto.viewType as any }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    })
  }

  async deleteProject(id: string, userId: string, tenantId: string) {
    const project = await this.prisma.todoistProject.findFirst({ where: { id, userId } })
    if (!project) throw new NotFoundException('Layihə tapılmadı')
    if (project.isInbox) throw new ForbiddenException('Inbox silinə bilməz')

    // Tapşırıqları Inbox-a köçür
    const inbox = await this.prisma.todoistProject.findFirst({ where: { userId, tenantId, isInbox: true } })
    if (inbox) {
      await this.prisma.todoistTask.updateMany({
        where: { projectId: id },
        data: { projectId: inbox.id, sectionId: null },
      })
    }

    await this.prisma.todoistProject.delete({ where: { id } })
    return { message: 'Layihə silindi' }
  }

  // ═══════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════

  async getSections(projectId: string, userId: string) {
    const project = await this.prisma.todoistProject.findFirst({ where: { id: projectId, userId } })
    if (!project) throw new NotFoundException('Layihə tapılmadı')

    return this.prisma.todoistSection.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async createSection(dto: CreateSectionDto, userId: string) {
    const project = await this.prisma.todoistProject.findFirst({ where: { id: dto.projectId, userId } })
    if (!project) throw new NotFoundException('Layihə tapılmadı')

    const maxOrder = await this.prisma.todoistSection.aggregate({
      where: { projectId: dto.projectId },
      _max: { sortOrder: true },
    })

    return this.prisma.todoistSection.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    })
  }

  async updateSection(id: string, data: { name?: string; sortOrder?: number }, userId: string) {
    const section = await this.prisma.todoistSection.findFirst({
      where: { id },
      include: { project: { select: { userId: true } } },
    })
    if (!section || section.project.userId !== userId) throw new NotFoundException('Seksiya tapılmadı')

    return this.prisma.todoistSection.update({ where: { id }, data })
  }

  async deleteSection(id: string, userId: string) {
    const section = await this.prisma.todoistSection.findFirst({
      where: { id },
      include: { project: { select: { userId: true } } },
    })
    if (!section || section.project.userId !== userId) throw new NotFoundException('Seksiya tapılmadı')

    // Tapşırıqları seksiyasız et
    await this.prisma.todoistTask.updateMany({ where: { sectionId: id }, data: { sectionId: null } })
    await this.prisma.todoistSection.delete({ where: { id } })
    return { message: 'Seksiya silindi' }
  }

  // ═══════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════

  private taskInclude = {
    labels: { include: { label: { select: { id: true, name: true, color: true } } } },
    section: { select: { id: true, name: true } },
    project: { select: { id: true, name: true, color: true } },
    children: {
      select: { id: true, content: true, isCompleted: true, priority: true, dueDate: true, reminder: true, duration: true, completedAt: true, location: true,
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, storagePath: true, createdAt: true } },
      },
      orderBy: [{ isCompleted: 'asc' as const }, { sortOrder: 'asc' as const }],
    },
    attachments: { select: { id: true, filename: true, mimeType: true, size: true, storagePath: true, createdAt: true } },
    _count: { select: { children: true, comments: true } },
  }

  async getTaskById(taskId: string, userId: string, tenantId: string) {
    const task = await this.prisma.todoistTask.findFirst({
      where: { id: taskId, userId, tenantId },
      include: this.taskInclude,
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    return task
  }

  async getTasks(userId: string, tenantId: string, query?: { projectId?: string; sectionId?: string; labelId?: string; priority?: string; includeCompleted?: string }) {
    const where: any = { userId, tenantId, parentId: null }
    if (query?.includeCompleted !== 'true') where.isCompleted = false
    if (query?.projectId) where.projectId = query.projectId
    if (query?.sectionId) where.sectionId = query.sectionId
    if (query?.priority) where.priority = query.priority
    if (query?.labelId) where.labels = { some: { labelId: query.labelId } }

    return this.prisma.todoistTask.findMany({
      where,
      include: this.taskInclude,
      orderBy: { sortOrder: 'asc' },
    })
  }

  async searchTasks(userId: string, tenantId: string, q: string) {
    // Null byte və zərərli simvolları təmizlə
    const cleanQ = (q || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/['"\\;]/g, '').trim()
    if (!cleanQ) return []

    // PostgreSQL Full-Text Search — söz kökləri ilə axtarış
    try {
      const ids: { id: string }[] = await this.prisma.$queryRaw`
        SELECT id FROM "TodoistTask"
        WHERE "userId" = ${userId} AND "tenantId" = ${tenantId}
          AND (
            to_tsvector('simple', COALESCE(content, '') || ' ' || COALESCE(description, ''))
            @@ plainto_tsquery('simple', ${cleanQ})
            OR content ILIKE ${'%' + cleanQ + '%'}
            OR description ILIKE ${'%' + cleanQ + '%'}
          )
        ORDER BY ts_rank(
          to_tsvector('simple', COALESCE(content, '') || ' ' || COALESCE(description, '')),
          plainto_tsquery('simple', ${cleanQ})
        ) DESC
        LIMIT 50
      `
      if (ids.length === 0) return []

      return this.prisma.todoistTask.findMany({
        where: { id: { in: ids.map(r => r.id) } },
        include: this.taskInclude,
        orderBy: { createdAt: 'desc' },
      })
    } catch {
      // FTS xəta verərsə — köhnə ILIKE fallback
      return this.prisma.todoistTask.findMany({
        where: {
          userId, tenantId,
          OR: [
            { content: { contains: cleanQ, mode: 'insensitive' } },
            { description: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        include: this.taskInclude,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    }
  }

  async getTasksToday(userId: string, tenantId: string) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    return this.prisma.todoistTask.findMany({
      where: {
        userId, tenantId, isCompleted: false, parentId: null,
        dueDate: { lte: today },
      },
      include: this.taskInclude,
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { sortOrder: 'asc' }],
    })
  }

  async getTasksUpcoming(userId: string, tenantId: string) {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    endDate.setDate(endDate.getDate() + 14)

    // Keçmiş tarixli + gələcək 14 günlük tapşırıqlar
    return this.prisma.todoistTask.findMany({
      where: {
        userId, tenantId, isCompleted: false, parentId: null,
        dueDate: { not: null, lte: endDate },
      },
      include: this.taskInclude,
      orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
    })
  }

  async createTask(dto: CreateTaskDto, userId: string, tenantId: string) {
    // Validation
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Tapşırıq mətni boş ola bilməz')
    }

    // Əgər projectId verilməyibsə, Inbox-a əlavə et
    let projectId = dto.projectId
    // Əgər projectId varsa, mövcudluğunu yoxla
    if (projectId) {
      const project = await this.prisma.todoistProject.findFirst({ where: { id: projectId, userId, tenantId } })
      if (!project) throw new BadRequestException('Layihə tapılmadı')
    }

    if (!projectId) {
      const inbox = await this.prisma.todoistProject.findFirst({ where: { userId, tenantId, isInbox: true } })
      if (!inbox) {
        const created = await this.prisma.todoistProject.create({
          data: { name: 'Gələnlər', color: '#246FE0', isInbox: true, userId, tenantId, sortOrder: 0 },
        })
        projectId = created.id
      } else {
        projectId = inbox.id
      }
    }

    const maxOrder = await this.prisma.todoistTask.aggregate({
      where: { projectId, userId, parentId: dto.parentId || null },
      _max: { sortOrder: true },
    })

    const task = await this.prisma.todoistTask.create({
      data: {
        content: dto.content,
        description: dto.description || null,
        priority: (dto.priority as any) || 'P4',
        projectId,
        sectionId: dto.sectionId || null,
        parentId: dto.parentId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        dueString: dto.dueString || null,
        isRecurring: dto.isRecurring || false,
        recurRule: dto.recurRule || null,
        duration: dto.duration || null,
        reminder: dto.reminder ? new Date(dto.reminder) : null,
        location: dto.location || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        userId,
        tenantId,
      },
      include: this.taskInclude,
    })

    // Label əlaqələri
    if (dto.labelIds?.length) {
      await this.prisma.todoistTaskLabel.createMany({
        data: dto.labelIds.map(labelId => ({ taskId: task.id, labelId })),
        skipDuplicates: true,
      })
    }

    // Activity log
    this.logActivity(userId, tenantId, 'created', task.id).catch(() => {})

    return task
  }

  async updateTask(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    const updated = await this.prisma.todoistTask.update({
      where: { id },
      data: {
        ...(dto.content && { content: dto.content }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priority && { priority: dto.priority as any }),
        ...(dto.projectId && { projectId: dto.projectId }),
        ...(dto.sectionId !== undefined && { sectionId: dto.sectionId || null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.dueString !== undefined && { dueString: dto.dueString }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.reminder !== undefined && { reminder: dto.reminder ? new Date(dto.reminder) : null, reminderSent: false }),
        ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
        ...(dto.recurRule !== undefined && { recurRule: dto.recurRule }),
        ...(dto.location !== undefined && { location: dto.location }),
      },
      include: this.taskInclude,
    })

    // Label yenilə
    if (dto.labelIds !== undefined) {
      await this.prisma.todoistTaskLabel.deleteMany({ where: { taskId: id } })
      if (dto.labelIds.length) {
        await this.prisma.todoistTaskLabel.createMany({
          data: dto.labelIds.map(labelId => ({ taskId: id, labelId })),
          skipDuplicates: true,
        })
      }
    }

    // Activity log
    const changes: string[] = []
    if (dto.content && dto.content !== task.content) changes.push('content')
    if (dto.priority && dto.priority !== task.priority) changes.push('priority')
    if (dto.dueDate !== undefined) changes.push('dueDate')
    if (changes.length) {
      this.logActivity(userId, task.tenantId, 'updated', id, JSON.stringify({ fields: changes })).catch(() => {})
    }

    return updated
  }

  async completeTask(id: string, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    // ── Təkrarlanan tapşırıq: tamamla + yeni yarat ──
    if (task.isRecurring && task.recurRule && task.dueDate) {
      const nextDate = this.calculateNextDate(task.dueDate, task.recurRule)

      // Köhnəni tamamla
      await this.prisma.todoistTask.update({
        where: { id },
        data: { isCompleted: true, completedAt: new Date() },
      })

      // Yeni tapşırıq yarat (eyni məzmun, növbəti tarix)
      const newTask = await this.prisma.todoistTask.create({
        data: {
          content: task.content,
          description: task.description,
          priority: task.priority,
          projectId: task.projectId,
          sectionId: task.sectionId,
          parentId: task.parentId,
          userId: task.userId,
          tenantId: task.tenantId,
          dueDate: nextDate,
          isRecurring: true,
          recurRule: task.recurRule,
          duration: task.duration,
          reminder: task.reminder ? this.calculateNextDate(task.reminder, task.recurRule) : null,
          sortOrder: task.sortOrder,
        },
        include: this.taskInclude,
      })

      // Label-ları kopyala
      const labels = await this.prisma.todoistTaskLabel.findMany({ where: { taskId: id } })
      if (labels.length > 0) {
        await this.prisma.todoistTaskLabel.createMany({
          data: labels.map(l => ({ taskId: newTask.id, labelId: l.labelId })),
        })
      }

      this.logActivity(userId, task.tenantId, 'recurring_completed', id).catch(() => {})
      return { ...newTask, recurring: true, previousTaskId: id, nextDate: nextDate.toISOString() }
    }

    // Normal tapşırıq
    const result = await this.prisma.todoistTask.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date() },
      include: this.taskInclude,
    })

    this.logActivity(userId, task.tenantId, 'completed', id).catch(() => {})
    return result
  }

  private calculateNextDate(currentDate: Date, recurRule: string): Date {
    const d = new Date(currentDate)
    switch (recurRule) {
      case 'daily': d.setDate(d.getDate() + 1); break
      case 'weekly': d.setDate(d.getDate() + 7); break
      case 'monthly': d.setMonth(d.getMonth() + 1); break
      case 'weekdays':
        d.setDate(d.getDate() + 1)
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
        break
      default:
        // custom:3d, custom:2w formatı
        const match = recurRule.match(/custom:(\d+)([dwm])/)
        if (match) {
          const num = parseInt(match[1])
          if (match[2] === 'd') d.setDate(d.getDate() + num)
          else if (match[2] === 'w') d.setDate(d.getDate() + num * 7)
          else if (match[2] === 'm') d.setMonth(d.getMonth() + num)
        } else {
          d.setDate(d.getDate() + 1) // fallback
        }
    }
    return d
  }

  async uncompleteTask(id: string, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    const result = await this.prisma.todoistTask.update({
      where: { id },
      data: { isCompleted: false, completedAt: null },
      include: this.taskInclude,
    })

    this.logActivity(userId, task.tenantId, 'uncompleted', id).catch(() => {})
    return result
  }

  async deleteTask(id: string, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    await this.prisma.todoistTask.delete({ where: { id } })

    // taskId null olacaq (task silindiyinə görə, onDelete: SetNull)
    this.logActivity(userId, task.tenantId, 'deleted', null, JSON.stringify({ content: task.content })).catch(() => {})
    return { message: 'Tapşırıq silindi' }
  }

  // ═══════════════════════════════════════
  // LABELS
  // ═══════════════════════════════════════

  async getLabels(userId: string, tenantId: string) {
    return this.prisma.todoistLabel.findMany({
      where: { userId, tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createLabel(data: { name: string; color?: string }, userId: string, tenantId: string) {
    // Duplikat yoxlama
    const existing = await this.prisma.todoistLabel.findFirst({
      where: { name: data.name, userId },
    })
    if (existing) throw new BadRequestException('Bu adda etiket artıq mövcuddur')

    return this.prisma.todoistLabel.create({
      data: { name: data.name, color: data.color || '#808080', userId, tenantId },
    })
  }

  async updateLabel(id: string, data: { name?: string; color?: string }, userId: string) {
    const label = await this.prisma.todoistLabel.findFirst({ where: { id, userId } })
    if (!label) throw new NotFoundException('Etiket tapılmadı')
    return this.prisma.todoistLabel.update({ where: { id }, data })
  }

  async deleteLabel(id: string, userId: string) {
    const label = await this.prisma.todoistLabel.findFirst({ where: { id, userId } })
    if (!label) throw new NotFoundException('Etiket tapılmadı')
    await this.prisma.todoistLabel.delete({ where: { id } })
    return { message: 'Etiket silindi' }
  }

  // ═══════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════

  async getComments(taskId: string, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    return this.prisma.todoistComment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createComment(taskId: string, content: string, userId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    return this.prisma.todoistComment.create({
      data: { content, taskId, userId },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.todoistComment.findFirst({ where: { id, userId } })
    if (!comment) throw new NotFoundException('Şərh tapılmadı')
    await this.prisma.todoistComment.delete({ where: { id } })
    return { message: 'Şərh silindi' }
  }

  // ═══════════════════════════════════════
  // REORDER — sürüklə-burax sıralama
  // ═══════════════════════════════════════

  async reorderTasks(userId: string, items: { id: string; sortOrder: number; projectId?: string; sectionId?: string }[]) {
    for (const item of items) {
      await this.prisma.todoistTask.updateMany({
        where: { id: item.id, userId },
        data: {
          sortOrder: item.sortOrder,
          ...(item.projectId && { projectId: item.projectId }),
          ...(item.sectionId !== undefined && { sectionId: item.sectionId || null }),
        },
      })
    }
    return { message: 'Sıralama yeniləndi' }
  }

  // ═══════════════════════════════════════
  // BULK — toplu əməliyyat
  // ═══════════════════════════════════════

  async bulkAction(userId: string, tenantId: string, data: { taskIds: string[]; action: string; payload?: any }) {
    const { taskIds, action, payload } = data

    if (!taskIds?.length) return { count: 0 }
    if (taskIds.length > 100) {
      const { BadRequestException } = require('@nestjs/common')
      throw new BadRequestException('Maksimum 100 tapşırıq seçə bilərsiniz')
    }

    switch (action) {
      case 'complete':
        await this.prisma.todoistTask.updateMany({
          where: { id: { in: taskIds }, userId },
          data: { isCompleted: true, completedAt: new Date() },
        })
        break
      case 'delete':
        await this.prisma.todoistTask.deleteMany({
          where: { id: { in: taskIds }, userId },
        })
        break
      case 'move':
        if (payload?.projectId) {
          await this.prisma.todoistTask.updateMany({
            where: { id: { in: taskIds }, userId },
            data: { projectId: payload.projectId, sectionId: null },
          })
        }
        break
      case 'priority':
        if (payload?.priority) {
          await this.prisma.todoistTask.updateMany({
            where: { id: { in: taskIds }, userId },
            data: { priority: payload.priority },
          })
        }
        break
      case 'dueDate':
        await this.prisma.todoistTask.updateMany({
          where: { id: { in: taskIds }, userId },
          data: { dueDate: payload?.dueDate ? new Date(payload.dueDate) : null },
        })
        break
    }

    // Activity log
    for (const taskId of taskIds) {
      await this.prisma.todoistActivity.create({
        data: { action: `bulk_${action}`, taskId, userId, tenantId, details: JSON.stringify(payload || {}) },
      })
    }

    return { message: `${taskIds.length} tapşırıq ${action} edildi` }
  }

  // ═══════════════════════════════════════
  // ═══════════════════════════════════════
  // ATTACHMENTS — fayl əlavələri
  // ═══════════════════════════════════════

  async uploadAttachment(taskId: string, file: Express.Multer.File, userId: string, tenantId: string) {
    const task = await this.prisma.todoistTask.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    // 1.5MB toplam limit (TODO + alt-görevlər)
    const rootId = task.parentId || task.id
    const existingAttachments = await this.prisma.attachment.findMany({
      where: { todoistTask: { OR: [{ id: rootId }, { parentId: rootId }] } },
      select: { size: true },
    })
    const totalSize = existingAttachments.reduce((s, a) => s + (a.size || 0), 0) + file.size
    if (totalSize > 1.5 * 1024 * 1024) {
      const { BadRequestException } = require('@nestjs/common')
      // Yüklənmiş faylı sil
      const fs = require('fs')
      try { fs.unlinkSync(file.path) } catch {}
      throw new BadRequestException('Toplam dosya limiti 1.5MB-ı keçir!')
    }

    return this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        todoistTaskId: taskId,
        uploaderId: userId,
        tenantId,
      },
    })
  }

  async getAttachments(taskId: string, tenantId: string) {
    return this.prisma.attachment.findMany({
      where: { todoistTaskId: taskId, tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteAttachment(id: string, tenantId: string) {
    const attachment = await this.prisma.attachment.findFirst({ where: { id, tenantId } })
    if (!attachment) throw new NotFoundException('Fayl tapılmadı')

    try {
      const fs = require('fs')
      fs.unlinkSync(attachment.storagePath)
    } catch {}

    await this.prisma.attachment.delete({ where: { id } })
    return { message: 'Fayl silindi' }
  }

  // ═══════════════════════════════════════
  // ACTIVITY LOG
  // ═══════════════════════════════════════

  async getActivities(userId: string, tenantId: string, limit = 50) {
    return this.prisma.todoistActivity.findMany({
      where: { userId, tenantId },
      include: {
        task: { select: { id: true, content: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async logActivity(userId: string, tenantId: string, action: string, taskId?: string, details?: string) {
    return this.prisma.todoistActivity.create({
      data: { action, taskId, userId, tenantId, details },
    })
  }

  // ═══════════════════════════════════════
  // TEMPLATES — şablonlar
  // ═══════════════════════════════════════

  async getTemplates(userId: string, tenantId: string) {
    return this.prisma.todoistTemplate.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createTemplate(userId: string, tenantId: string, data: { name: string; description?: string; tasks: string; color?: string }) {
    return this.prisma.todoistTemplate.create({
      data: { ...data, userId, tenantId },
    })
  }

  async createProjectFromTemplate(userId: string, tenantId: string, templateId: string, projectName: string) {
    const template = await this.prisma.todoistTemplate.findFirst({ where: { id: templateId, userId } })
    if (!template) throw new NotFoundException('Şablon tapılmadı')

    // Layihə yarat
    const project = await this.createProject({ name: projectName, color: template.color }, userId, tenantId)

    // Tapşırıqları yarat
    const tasks = JSON.parse(template.tasks)
    for (const t of tasks) {
      await this.createTask({
        content: t.content,
        priority: t.priority || 'P4',
        projectId: project.id,
      }, userId, tenantId)
    }

    return project
  }

  async deleteTemplate(id: string, userId: string) {
    const template = await this.prisma.todoistTemplate.findFirst({ where: { id, userId } })
    if (!template) throw new NotFoundException('Şablon tapılmadı')
    await this.prisma.todoistTemplate.delete({ where: { id } })
    return { message: 'Şablon silindi' }
  }
}
