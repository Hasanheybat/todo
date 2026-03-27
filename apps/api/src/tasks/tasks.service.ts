import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { UsersService } from '../users/users.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private usersService: UsersService,
  ) {}

  async create(dto: CreateTaskDto, creatorId: string, tenantId: string) {
    // AssigneeIds validation — mövcud olmayanları yoxla
    if (dto.assigneeIds?.length) {
      if (dto.assigneeIds.length > 50) throw new BadRequestException('Maksimum 50 işçi atana bilərsiniz')
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: dto.assigneeIds }, tenantId },
        select: { id: true },
      })
      const existingIds = new Set(existingUsers.map(u => u.id))
      const invalid = dto.assigneeIds.filter(id => !existingIds.has(id))
      if (invalid.length > 0) throw new BadRequestException(`Bu istifadəçilər tapılmadı: ${invalid.join(', ')}`)
    }

    // ── İerarxiya yoxlaması ──
    await this.checkHierarchy(creatorId, dto, tenantId)

    // ── Label məntiqi: yeni etiketləri yarat, ID-ləri birləşdir ──
    let allLabelIds: string[] = [...(dto.labelIds || [])]
    if (dto.newLabels?.length) {
      for (const nl of dto.newLabels) {
        if (!nl.name?.trim()) continue
        // Eyni adlı etiket varsa onu istifadə et
        let label = await this.prisma.todoistLabel.findFirst({
          where: { userId: creatorId, name: nl.name.trim() },
        })
        if (!label) {
          label = await this.prisma.todoistLabel.create({
            data: { name: nl.name.trim(), color: nl.color || '#808080', userId: creatorId, tenantId },
          })
        }
        if (!allLabelIds.includes(label.id)) allLabelIds.push(label.id)
      }
    }

    // ── Assignee + Approver-ə etiketləri və layihəni avtomatik yarat ──
    // Bütün hədəf istifadəçiləri topla (assignee + approver, creator xaric)
    const targetUserIds = new Set<string>()
    if (dto.assigneeIds?.length) dto.assigneeIds.forEach((id: string) => targetUserIds.add(id))
    if (dto.approverId) targetUserIds.add(dto.approverId)
    targetUserIds.delete(creatorId)

    // Etiketləri paylaş
    if (allLabelIds.length > 0 && targetUserIds.size > 0) {
      const labels = await this.prisma.todoistLabel.findMany({ where: { id: { in: allLabelIds } } })
      for (const uid of targetUserIds) {
        for (const label of labels) {
          const exists = await this.prisma.todoistLabel.findFirst({
            where: { userId: uid, name: label.name },
          })
          if (!exists) {
            await this.prisma.todoistLabel.create({
              data: { name: label.name, color: label.color, userId: uid, tenantId },
            })
          }
        }
      }
    }

    // Layihəni paylaş
    if (dto.projectId && targetUserIds.size > 0) {
      const project = await this.prisma.todoistProject.findUnique({ where: { id: dto.projectId } })
      if (project) {
        for (const uid of targetUserIds) {
          const exists = await this.prisma.todoistProject.findFirst({
            where: { userId: uid, name: project.name },
          })
          if (!exists) {
            await this.prisma.todoistProject.create({
              data: { name: project.name, color: project.color, userId: uid, tenantId },
            })
          }
        }
      }
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: (dto as any).type || 'TASK',
        priority: (dto.priority as any) || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        businessId: dto.businessId || null,
        departmentId: (dto as any).departmentId || null,
        parentId: (dto as any).parentId || null,
        approverId: dto.approverId || null,
        groupId: dto.groupId || null,
        projectId: dto.projectId || null,
        creatorId,
        tenantId,
        assignees: dto.assigneeIds?.length ? {
          create: dto.assigneeIds.map((userId) => ({ userId })),
        } : undefined,
        labels: allLabelIds.length > 0 ? {
          create: allLabelIds.map(labelId => ({ labelId })),
        } : undefined,
      },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, color: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        project: { select: { id: true, name: true, color: true } },
        subTasks: { select: { id: true, title: true, status: true, dueDate: true, approverId: true, finalized: true, creatorApproved: true, finalFile: true, bulkNotes: true, description: true, approver: { select: { id: true, fullName: true } }, assignees: { include: { user: { select: { id: true, fullName: true } } } } } },
      },
    })

    // Alt-görevlər yaradılsın — assignee validation
    if ((dto as any).subTasks?.length) {
      // Sub-task assignee-ləri validate et
      const allSubAssigneeIds = (dto as any).subTasks
        .flatMap((s: any) => s.assigneeIds || (s.assigneeId ? [s.assigneeId] : []))
        .filter((id: string) => id)
      if (allSubAssigneeIds.length > 0) {
        const uniqueIds = [...new Set(allSubAssigneeIds)] as string[]
        const existing = await this.prisma.user.findMany({
          where: { id: { in: uniqueIds }, tenantId },
          select: { id: true },
        })
        const existingSet = new Set(existing.map(u => u.id))
        const invalid = uniqueIds.filter(id => !existingSet.has(id))
        if (invalid.length > 0) throw new BadRequestException(`Alt-görev işçiləri tapılmadı: ${invalid.join(', ')}`)
      }
      for (const sub of (dto as any).subTasks) {
        // Sub-task-ın öz assignee-ləri yoxdursa, ana task-ın assignee-lərini istifadə et
        const subAssigneeIds = sub.assigneeIds?.length
          ? sub.assigneeIds
          : sub.assigneeId ? [sub.assigneeId]
          : (dto.assigneeIds?.length ? dto.assigneeIds : [])

        await this.prisma.task.create({
          data: {
            title: sub.title,
            type: (dto as any).type || 'TASK',
            priority: (dto.priority as any) || 'MEDIUM',
            status: 'CREATED',
            parentId: task.id,
            creatorId,
            tenantId,
            approverId: sub.approverId || null,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            businessId: dto.businessId || null,
            departmentId: (dto as any).departmentId || null,
            assignees: subAssigneeIds.length > 0
              ? { create: subAssigneeIds.map((uid: string) => ({ userId: uid })) }
              : undefined,
          },
        })
      }
    }

    // Bildiriş: atanan işçilərə
    if (dto.assigneeIds?.length) {
      this.notifications.notifyTaskAssigned(task.title, dto.assigneeIds, creatorId, tenantId).catch(() => {})
    }

    // Sub-tasklar yaradıldıqdan sonra tam datanı qaytar
    const fullTask = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, color: true } },
        subTasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, approverId: true, finalized: true, creatorApproved: true, finalFile: true, bulkNotes: true, description: true, approver: { select: { id: true, fullName: true } }, assignees: { include: { user: { select: { id: true, fullName: true } } } } }, orderBy: { createdAt: 'asc' } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        project: { select: { id: true, name: true, color: true } },
        comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })

    return fullTask || task
  }

  async findAll(tenantId: string, userId: string, filters?: { projectId?: string; labelId?: string }) {
    const where: any = {
      tenantId,
      parentId: null,
      AND: [
        {
          OR: [
            { creatorId: userId },
            { assignees: { some: { userId } } },
            { subTasks: { some: { assignees: { some: { userId } } } } },
            { subTasks: { some: { approverId: userId } } },
            { approverId: userId },
          ],
        },
      ],
    }

    // Layihə filtrı
    if (filters?.projectId) (where.AND as any[]).push({ projectId: filters.projectId })
    // Etiket filtrı
    if (filters?.labelId) (where.AND as any[]).push({ labels: { some: { labelId: filters.labelId } } })

    return this.prisma.task.findMany({
      where,
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        project: { select: { id: true, name: true, color: true } },
        comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
        department: { select: { id: true, name: true, color: true } },
        subTasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, approverId: true, finalized: true, creatorApproved: true, finalFile: true, bulkNotes: true, description: true, approver: { select: { id: true, fullName: true } }, assignees: { include: { user: { select: { id: true, fullName: true } } } } }, orderBy: { createdAt: 'asc' } },
        sourceTemplate: { select: { id: true, name: true, scheduleType: true, dayOfMonth: true, dayOfWeek: true, notificationDay: true, deadlineDay: true, assignees: { include: { user: { select: { id: true, fullName: true } } } }, items: { orderBy: { sortOrder: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, color: true } },
        subTasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, approverId: true, finalized: true, creatorApproved: true, finalFile: true, bulkNotes: true, description: true, approver: { select: { id: true, fullName: true } }, assignees: { include: { user: { select: { id: true, fullName: true } } } } }, orderBy: { createdAt: 'asc' } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        project: { select: { id: true, name: true, color: true } },
        comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    return task
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    // ── İerarxiya yoxlaması (assignee dəyişirsə) ──
    if ((dto as any).assigneeIds || (dto as any).subTasks) {
      await this.checkHierarchy(userId, dto as any, tenantId)
    }

    // Əsas sahələri yenilə
    await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as any) || undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        businessId: (dto as any).businessId !== undefined ? ((dto as any).businessId || null) : undefined,
        departmentId: (dto as any).departmentId !== undefined ? ((dto as any).departmentId || null) : undefined,
        approverId: dto.approverId !== undefined ? (dto.approverId || null) : undefined,
        projectId: dto.projectId !== undefined ? (dto.projectId || null) : undefined,
      },
    })

    // Label-ləri yenilə
    if ((dto as any).labelIds) {
      await this.prisma.taskLabel.deleteMany({ where: { taskId: id } })
      if ((dto as any).labelIds.length > 0) {
        await this.prisma.taskLabel.createMany({
          data: (dto as any).labelIds.map((labelId: string) => ({ taskId: id, labelId })),
          skipDuplicates: true,
        })
      }
    }

    // Assignee-ləri yenilə
    if ((dto as any).assigneeIds) {
      await this.prisma.taskAssignee.deleteMany({ where: { taskId: id } })
      if ((dto as any).assigneeIds.length > 0) {
        await this.prisma.taskAssignee.createMany({
          data: (dto as any).assigneeIds.map((uid: string) => ({ taskId: id, userId: uid })),
        })
      }
    }

    // Alt-görevləri yenilə (köhnələri sil, yenilərini yarat)
    if ((dto as any).subTasks) {
      // Köhnə alt-görevlərin assignee-lərini sil, sonra alt-görevləri sil
      const oldSubs = await this.prisma.task.findMany({ where: { parentId: id } })
      for (const sub of oldSubs) {
        await this.prisma.taskAssignee.deleteMany({ where: { taskId: sub.id } })
      }
      await this.prisma.task.deleteMany({ where: { parentId: id } })

      // Yeni alt-görevlər yarat
      // Ana task-ın assignee ID-lərini al (fallback üçün)
      const parentAssigneeIds = (dto as any).assigneeIds?.length
        ? (dto as any).assigneeIds
        : (await this.prisma.taskAssignee.findMany({ where: { taskId: id }, select: { userId: true } })).map((a: any) => a.userId)

      for (const sub of (dto as any).subTasks) {
        if (!sub.title?.trim()) continue
        // Sub-task-ın öz assignee-ləri yoxdursa, ana task-ın assignee-lərini istifadə et
        const subAssigneeIds = sub.assigneeIds?.length
          ? sub.assigneeIds
          : sub.assigneeId ? [sub.assigneeId]
          : (parentAssigneeIds.length > 0 ? parentAssigneeIds : [])

        await this.prisma.task.create({
          data: {
            title: sub.title,
            type: task.type,
            priority: (dto.priority as any) || task.priority,
            status: 'CREATED',
            parentId: id,
            creatorId: userId,
            tenantId,
            approverId: sub.approverId || null,
            dueDate: sub.dueDate ? new Date(sub.dueDate) : (dto.dueDate ? new Date(dto.dueDate) : task.dueDate),
            businessId: (dto as any).businessId || task.businessId,
            departmentId: (dto as any).departmentId || task.departmentId,
            assignees: subAssigneeIds.length > 0
              ? { create: subAssigneeIds.map((uid: string) => ({ userId: uid })) }
              : undefined,
          },
        })
      }
    }

    // Tam datanı qaytar
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, color: true } },
        subTasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, approverId: true, finalized: true, creatorApproved: true, finalFile: true, bulkNotes: true, description: true, approver: { select: { id: true, fullName: true } }, assignees: { include: { user: { select: { id: true, fullName: true } } } } }, orderBy: { createdAt: 'asc' } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        project: { select: { id: true, name: true, color: true } },
        comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
  }

  // İşçi tamamlayır → onay gözlənilir
  async complete(id: string, userId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId },
      include: { assignees: true },
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    const assignee = task.assignees.find((a) => a.userId === userId)
    if (!assignee) throw new ForbiddenException('Bu tapşırıq sizə aid deyil')

    // İşçi yalnız öz statusunu dəyişə bilər
    if (['COMPLETED', 'FORCE_COMPLETED'].includes(assignee.status)) {
      throw new ConflictException('Siz artıq bu görevi tamamlamısınız')
    }

    // İşçinin öz assignee statusunu COMPLETED et
    await this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: 'COMPLETED' },
    })

    // Görevin ümumi statusu dəyişmir — yaradıcı bağlayana qədər
    // Bildiriş: yaradana (işçi tamamladı)
    this.notifications.notifyTaskCompleted(task.title, task.creatorId, userId, tenantId).catch(() => {})

    return this.findOne(id, tenantId)
  }

  // Müdir onaylayır
  async approve(id: string, approverId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId }, include: { assignees: true } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    if (task.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Yalnız "PENDING_APPROVAL" statuslu tapşırıq onaylana bilər (hazırda: ${task.status})`)
    }

    const updated = await this.prisma.task.update({ where: { id }, data: { status: 'APPROVED' } })

    // Bildiriş: atanan işçilərə
    const assigneeIds = task.assignees.map(a => a.userId)
    this.notifications.notifyTaskApproved(task.title, assigneeIds, approverId, tenantId).catch(() => {})

    return updated
  }

  // Müdir rədd edir
  async reject(id: string, rejecterId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId }, include: { assignees: true } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    if (task.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Yalnız "PENDING_APPROVAL" statuslu tapşırıq rədd edilə bilər (hazırda: ${task.status})`)
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    const assigneeIds = task.assignees.map(a => a.userId)
    this.notifications.notifyTaskRejected(task.title, assigneeIds, rejecterId, tenantId).catch(() => {})

    return updated
  }

  // Görevi bağla — yaradıcı VEYA yetkili kişi (approver) bağlaya bilər
  async closeTask(id: string, userId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        subTasks: { include: { assignees: { include: { user: { select: { id: true, fullName: true } } } }, approver: { select: { id: true, fullName: true } } } },
      },
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.status === 'COMPLETED') throw new ConflictException('Görev artıq bağlanıb')

    const isCreator = task.creatorId === userId
    const isApprover = task.subTasks?.some(s => s.approverId === userId) || task.approverId === userId

    if (!isCreator && !isApprover) {
      throw new ForbiddenException('Yalnız yaradıcı və ya yetkili kişi görevi bağlaya bilər')
    }

    // Bütün subTask-ların assignee-lərini topla
    const allSubAssigneeIds: string[] = []
    for (const sub of task.subTasks || []) {
      for (const a of sub.assignees || []) {
        allSubAssigneeIds.push(a.id)
      }
    }

    // PENDING və IN_PROGRESS olan assignee-ləri FORCE_COMPLETED et
    // COMPLETED və DECLINED olanlar olduğu kimi qalır (donur)
    if (allSubAssigneeIds.length > 0) {
      await this.prisma.taskAssignee.updateMany({
        where: {
          id: { in: allSubAssigneeIds },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: { status: 'FORCE_COMPLETED' },
      })
    }

    // Ana task assignee-lər (əgər varsa)
    await this.prisma.taskAssignee.updateMany({
      where: {
        taskId: id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { status: 'FORCE_COMPLETED' },
    })

    // Kim bağladı qeyd et
    const closedBy = isCreator ? 'creator' : 'approver'

    // Görevin özünü COMPLETED et
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        closedBy: userId,
        closedByRole: closedBy,
      },
      include: {
        assignees: { include: { user: { select: { id: true, fullName: true } } } },
        subTasks: { include: { assignees: { include: { user: { select: { id: true, fullName: true } } } } } },
      },
    })

    // Bildiriş: yaradıcıya + bütün işçilərə
    const notifyIds = new Set<string>()
    if (!isCreator) notifyIds.add(task.creatorId) // approver bağladısa yaradıcıya bildir
    task.assignees.forEach(a => notifyIds.add(a.userId))
    for (const sub of task.subTasks || []) {
      sub.assignees.forEach(a => notifyIds.add(a.userId))
    }
    notifyIds.delete(userId) // bağlayana bildiriş lazım deyil
    this.notifications.notifyTaskApproved(task.title, [...notifyIds], userId, tenantId).catch(() => {})

    return updated
  }

  // İşçi öz statusunu dəyişir (per-assignee)
  async updateAssigneeStatus(taskId: string, userId: string, status: string, note?: string) {
    const validStatuses = ['IN_PROGRESS', 'COMPLETED', 'DECLINED']
    if (!validStatuses.includes(status)) {
      throw new ForbiddenException('Yanlış status: ' + status)
    }

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId },
    })
    if (!assignee) throw new ForbiddenException('Bu tapşırıq sizə atanmayıb')

    // COMPLETED/DECLINED geri alınmaz
    if (assignee.status === 'COMPLETED' || assignee.status === 'DECLINED') {
      throw new ForbiddenException('Status artıq dəyişdirilib, geri alınmaz')
    }

    // Not əlavə et (array-a push, max 3)
    const updateData: any = { status: status as any }
    if (note !== undefined && note.trim()) {
      const existingNotes = (assignee.notes as any[]) || []
      // Mesaj limiti qaldırıldı
      updateData.notes = [...existingNotes, { text: note, sender: 'worker', date: new Date().toISOString() }]
    }

    const updated = await this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: updateData,
      include: { user: { select: { id: true, fullName: true } } },
    })

    return updated
  }

  // İşçi not əlavə edir (status dəyişmədən)
  async addWorkerNote(taskId: string, userId: string, note: string, fileId?: string, fileName?: string, fileSize?: number) {
    if (note && note.length > 200) {
      throw new ForbiddenException('Not maksimum 200 simvol ola bilər')
    }
    if (!note?.trim() && !fileId) {
      throw new ForbiddenException('Not və ya fayl tələb olunur')
    }
    if (fileSize && fileSize > 1.5 * 1024 * 1024) {
      throw new ForbiddenException('Fayl böyüklüyü maksimum 1.5 MB ola bilər')
    }

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId },
    })
    if (!assignee) throw new ForbiddenException('Bu tapşırıq sizə atanmayıb')

    // Finalized / chatClosed yoxla
    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (task?.finalized) throw new ForbiddenException('Görev tamamlanıb, əməliyyat mümkün deyil')
    if (assignee.chatClosed) throw new ForbiddenException('Söhbət bağlıdır, mesaj göndərə bilməzsiniz')

    const existingWorker = (assignee.notes as any[]) || []
    const existingApprover = (assignee.approverNotes as any[]) || []
    // Mesaj limiti qaldırıldı

    const newNote: any = { text: note || '', sender: 'worker', date: new Date().toISOString() }
    if (fileId) {
      newNote.fileId = fileId
      newNote.fileName = fileName || 'fayl'
      newNote.fileSize = fileSize || 0
    }

    return this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: {
        notes: [...existingWorker, newNote],
      },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // Yetkili kişi və ya yaradan → işçiyə not yazır (max 10 not, hər notda fayl ola bilər)
  async updateApproverNote(taskId: string, approverId: string, userId: string, approverNote: string, fileId?: string, fileName?: string, fileSize?: number) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.approverId !== approverId && task.creatorId !== approverId) {
      throw new ForbiddenException('Bu tapşırığın yetkili kişisi və ya yaradanı deyilsiniz')
    }
    if (task.finalized) throw new ForbiddenException('Görev tamamlanıb, əməliyyat mümkün deyil')

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId },
    })
    if (!assignee) throw new ForbiddenException('Bu istifadəçi bu tapşırığa atanmayıb')

    if (approverNote && approverNote.length > 200) {
      throw new ForbiddenException('Not maksimum 200 simvol ola bilər')
    }

    // Yetkili notu max 10
    const existingApprover = (assignee.approverNotes as any[]) || []
    // Mesaj limiti qaldırıldı

    // Fayl boyutu max 1.5MB
    if (fileSize && fileSize > 1.5 * 1024 * 1024) {
      throw new ForbiddenException('Fayl böyüklüyü maksimum 1.5 MB ola bilər')
    }

    const newNote: any = { text: approverNote || '', sender: 'approver', date: new Date().toISOString() }
    if (fileId) {
      newNote.fileId = fileId
      newNote.fileName = fileName || 'fayl'
      newNote.fileSize = fileSize || 0
    }

    return this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: {
        approverNotes: [...existingApprover, newNote],
      },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // ── Toplu not göndər (bütün işçilərə) ──
  async addBulkNote(taskId: string, approverId: string, note: string, fileId?: string, fileName?: string, fileSize?: number) {
    if (note && note.length > 200) {
      throw new ForbiddenException('Not maksimum 200 simvol ola bilər')
    }
    if (!note?.trim() && !fileId) {
      throw new ForbiddenException('Not və ya fayl tələb olunur')
    }
    if (fileSize && fileSize > 1.5 * 1024 * 1024) {
      throw new ForbiddenException('Fayl böyüklüyü maksimum 1.5 MB ola bilər')
    }

    const task = await this.prisma.task.findFirst({ where: { id: taskId }, include: { assignees: { select: { userId: true } } } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    // Yetkili kişi, yaradıcı və ya atanan işçi yaza bilər
    const isApprover = task.approverId === approverId
    const isCreator = task.creatorId === approverId
    const isAssignee = (task as any).assignees?.some((a: any) => a.userId === approverId)
    if (!isApprover && !isCreator && !isAssignee) {
      throw new ForbiddenException('Bu tapşırıqda yetkiniz yoxdur')
    }
    if (task.finalized) throw new ForbiddenException('Görev tamamlanıb, əməliyyat mümkün deyil')

    // Göndərən məlumatı
    const sender = await this.prisma.user.findUnique({ where: { id: approverId }, select: { id: true, fullName: true } })
    const existingBulk = (task.bulkNotes as any[]) || []
    const newNote: any = { text: note || '', date: new Date().toISOString(), senderId: approverId, senderName: sender?.fullName || 'İstifadəçi' }
    if (fileId) {
      newNote.fileId = fileId
      newNote.fileName = fileName || 'fayl'
      newNote.fileSize = fileSize || 0
    }
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        bulkNotes: [...existingBulk, newNote],
      },
    })
  }

  // ── Söhbəti bağla/aç ──
  // ── Mesaj düzənlə ──
  async editNote(taskId: string, requesterId: string, body: { noteType: string; noteIndex: number; userId?: string; newText: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    if (body.noteType === 'bulk') {
      const bulk = (task.bulkNotes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= bulk.length) throw new NotFoundException('Mesaj tapılmadı')
      bulk[body.noteIndex] = { ...bulk[body.noteIndex], text: body.newText, edited: true, editedAt: new Date().toISOString() }
      return this.prisma.task.update({ where: { id: taskId }, data: { bulkNotes: bulk } })
    }

    const assignee = await this.prisma.taskAssignee.findFirst({ where: { taskId, userId: body.userId || requesterId } })
    if (!assignee) throw new NotFoundException('İşçi tapılmadı')

    if (body.noteType === 'worker') {
      const notes = (assignee.notes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= notes.length) throw new NotFoundException('Mesaj tapılmadı')
      notes[body.noteIndex] = { ...notes[body.noteIndex], text: body.newText, edited: true, editedAt: new Date().toISOString() }
      return this.prisma.taskAssignee.update({ where: { id: assignee.id }, data: { notes } })
    }

    if (body.noteType === 'approver') {
      const notes = (assignee.approverNotes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= notes.length) throw new NotFoundException('Mesaj tapılmadı')
      notes[body.noteIndex] = { ...notes[body.noteIndex], text: body.newText, edited: true, editedAt: new Date().toISOString() }
      return this.prisma.taskAssignee.update({ where: { id: assignee.id }, data: { approverNotes: notes } })
    }

    throw new ForbiddenException('Yanlış mesaj tipi')
  }

  // ── Mesaj sil ──
  async deleteNote(taskId: string, requesterId: string, body: { noteType: string; noteIndex: number; userId?: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')

    if (body.noteType === 'bulk') {
      const bulk = (task.bulkNotes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= bulk.length) throw new NotFoundException('Mesaj tapılmadı')
      bulk[body.noteIndex] = { ...bulk[body.noteIndex], text: '', deleted: true, deletedAt: new Date().toISOString() }
      return this.prisma.task.update({ where: { id: taskId }, data: { bulkNotes: bulk } })
    }

    const assignee = await this.prisma.taskAssignee.findFirst({ where: { taskId, userId: body.userId || requesterId } })
    if (!assignee) throw new NotFoundException('İşçi tapılmadı')

    if (body.noteType === 'worker') {
      const notes = (assignee.notes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= notes.length) throw new NotFoundException('Mesaj tapılmadı')
      notes[body.noteIndex] = { ...notes[body.noteIndex], text: '', deleted: true, deletedAt: new Date().toISOString() }
      return this.prisma.taskAssignee.update({ where: { id: assignee.id }, data: { notes } })
    }

    if (body.noteType === 'approver') {
      const notes = (assignee.approverNotes as any[]) || []
      if (body.noteIndex < 0 || body.noteIndex >= notes.length) throw new NotFoundException('Mesaj tapılmadı')
      notes[body.noteIndex] = { ...notes[body.noteIndex], text: '', deleted: true, deletedAt: new Date().toISOString() }
      return this.prisma.taskAssignee.update({ where: { id: assignee.id }, data: { approverNotes: notes } })
    }

    throw new ForbiddenException('Yanlış mesaj tipi')
  }

  // ── Söhbəti bağla/aç ──
  async toggleChatClosed(taskId: string, approverId: string, userId: string, closed: boolean) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.approverId !== approverId && task.creatorId !== approverId) {
      throw new ForbiddenException('Bu tapşırığın yetkili kişisi deyilsiniz')
    }
    if (task.finalized) throw new ForbiddenException('Görev tamamlanıb, əməliyyat mümkün deyil')

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId },
    })
    if (!assignee) throw new ForbiddenException('Bu istifadəçi bu tapşırığa atanmayıb')

    return this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: { chatClosed: closed },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // ── Yetkili/Yaradan: işçi statusunu dəyişdir ──
  async changeAssigneeStatusByApprover(taskId: string, approverId: string, userId: string, status: string) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED']
    if (!validStatuses.includes(status)) {
      throw new ForbiddenException('Yanlış status: ' + status)
    }

    const task = await this.prisma.task.findFirst({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.approverId !== approverId && task.creatorId !== approverId) {
      throw new ForbiddenException('Bu tapşırığın yetkili kişisi deyilsiniz')
    }
    if (task.finalized) throw new ForbiddenException('Görev tamamlanıb, əməliyyat mümkün deyil')

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId },
    })
    if (!assignee) throw new ForbiddenException('Bu istifadəçi bu tapşırığa atanmayıb')

    return this.prisma.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: status as any },
      include: { user: { select: { id: true, fullName: true } } },
    })
  }

  // ── Görevi tamamla (finalize) ──
  async finalizeTask(taskId: string, approverId: string, tenantId: string, note?: string, fileId?: string, fileName?: string, fileSize?: number, files?: { fileId: string; fileName: string; fileSize: number }[]) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId },
      include: { assignees: true },
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.approverId !== approverId) {
      throw new ForbiddenException('Bu tapşırığın yetkili kişisi deyilsiniz')
    }
    if (task.finalized) throw new ForbiddenException('Görev artıq tamamlanıb')

    if (fileSize && fileSize > 1.5 * 1024 * 1024) {
      throw new ForbiddenException('Fayl böyüklüyü maksimum 1.5 MB ola bilər')
    }

    const finalFile: any = {}
    if (note) finalFile.note = note
    if (fileId) { finalFile.fileId = fileId; finalFile.fileName = fileName || 'fayl'; finalFile.fileSize = fileSize || 0 }
    if (files?.length) finalFile.files = files
    const hasFinalData = Object.keys(finalFile).length > 0

    // Task-ı finalize et + bitirməyən işçiləri FORCE_COMPLETED et
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        finalized: true,
        status: 'APPROVED',
        ...(hasFinalData ? { finalFile } : {}),
      },
    })

    // PENDING və IN_PROGRESS olanları FORCE_COMPLETED et
    // COMPLETED və DECLINED olduğu kimi qalır
    await this.prisma.taskAssignee.updateMany({
      where: { taskId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      data: { status: 'FORCE_COMPLETED' },
    })

    // Bütün assignee-lərin chatClosed = true
    await this.prisma.taskAssignee.updateMany({
      where: { taskId },
      data: { chatClosed: true },
    })

    // Bildiriş: bütün işçilərə
    const assigneeIds = task.assignees.map(a => a.userId)
    this.notifications.notifyTaskApproved(task.title, assigneeIds, approverId, tenantId).catch(() => {})

    return { message: 'Görev tamamlandı' }
  }

  // ── Yaradan onaylayır ──
  async creatorApproveTask(taskId: string, creatorId: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId },
      include: { assignees: true },
    })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    if (task.creatorId !== creatorId) throw new ForbiddenException('Bu tapşırığın yaradanı deyilsiniz')
    if (!task.finalized) throw new ForbiddenException('Görev hələ yetkili tərəfindən tamamlanmayıb')
    if (task.creatorApproved) throw new ForbiddenException('Görev artıq onaylanıb')

    await this.prisma.task.update({
      where: { id: taskId },
      data: { creatorApproved: true, status: 'APPROVED' },
    })

    // Bildiriş: yetkili + bütün işçilərə
    const notifyIds = task.assignees.map(a => a.userId)
    if (task.approverId) notifyIds.push(task.approverId)
    this.notifications.notifyTaskApproved(task.title, notifyIds, creatorId, tenantId).catch(() => {})

    return { message: 'Görev onaylandı' }
  }

  async remove(id: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } })
    if (!task) throw new NotFoundException('Tapşırıq tapılmadı')
    await this.prisma.task.delete({ where: { id } })
    return { message: 'Tapşırıq silindi' }
  }

  // ── İerarxiya yoxlaması ──
  // assign_upward YOX → yalnız parentId subordinatlarına
  // assign_upward VAR → öz filial(lar)ı daxilində hər kəsə (filialdankənara çıxa bilməz)
  private async checkHierarchy(creatorId: string, dto: any, tenantId: string) {
    // Bütün assignee ID-lərini topla (əsas + alt-görevlər)
    const allAssigneeIds = new Set<string>()
    if (dto.assigneeIds?.length) {
      dto.assigneeIds.forEach((id: string) => allAssigneeIds.add(id))
    }
    if (dto.subTasks?.length) {
      for (const sub of dto.subTasks) {
        if (sub.assigneeIds?.length) sub.assigneeIds.forEach((id: string) => allAssigneeIds.add(id))
        if (sub.assigneeId) allAssigneeIds.add(sub.assigneeId)
      }
    }

    // Özünə atama icazəlidir — sil
    allAssigneeIds.delete(creatorId)

    if (allAssigneeIds.size === 0) return

    // Creator-ın məlumatları
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        customRole: { select: { permissions: true } },
        businesses: { select: { businessId: true } },
      },
    })
    const permissions = (creator?.customRole?.permissions as string[]) || []
    const hasAssignUpward = permissions.includes('tasks.assign_upward')

    if (hasAssignUpward) {
      // assign_upward VAR → öz filialları daxilində hər kəsə ata bilər
      const creatorBusinessIds = new Set((creator?.businesses || []).map((b: any) => b.businessId))

      if (creatorBusinessIds.size === 0) {
        throw new ForbiddenException('Heç bir filiala təyin edilməmisiniz. Görev ata bilmək üçün filiala təyin edilməlisiniz.')
      }

      // Assignee-lərin filiallarını yoxla
      const assigneeBusinesses = await this.prisma.userBusiness.findMany({
        where: { userId: { in: [...allAssigneeIds] } },
        select: { userId: true, businessId: true },
      })

      // Hər assignee üçün: ən az bir ortaq filialı olmalıdır
      const unauthorized: string[] = []
      for (const assigneeId of allAssigneeIds) {
        const assigneeBizIds = assigneeBusinesses
          .filter(ab => ab.userId === assigneeId)
          .map(ab => ab.businessId)
        const hasCommonBiz = assigneeBizIds.some(bizId => creatorBusinessIds.has(bizId))
        if (!hasCommonBiz) {
          unauthorized.push(assigneeId)
        }
      }

      if (unauthorized.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: unauthorized } },
          select: { fullName: true },
        })
        const names = users.map(u => u.fullName).join(', ')
        throw new ForbiddenException(
          `Filial xətası: ${names} sizin filialınızda deyil. Yalnız öz filialınızdakı işçilərə görev ata bilərsiniz.`
        )
      }
    } else {
      // assign_upward YOX → yalnız parentId subordinatlarına
      const subordinateIds = await this.usersService.getSubordinateIds(creatorId, tenantId)

      const unauthorized: string[] = []
      for (const assigneeId of allAssigneeIds) {
        if (!subordinateIds.has(assigneeId)) {
          unauthorized.push(assigneeId)
        }
      }

      if (unauthorized.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: unauthorized } },
          select: { fullName: true },
        })
        const names = users.map(u => u.fullName).join(', ')
        throw new ForbiddenException(
          `İerarxiya xətası: ${names} sizin altınızda deyil. Yalnız öz altınızdakı işçilərə görev ata bilərsiniz.`
        )
      }
    }
  }
}
