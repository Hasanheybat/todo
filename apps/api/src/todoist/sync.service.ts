import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TodoistService } from './todoist.service'

interface SyncCommand {
  type: string
  temp_id?: string
  args: Record<string, any>
}

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private todoistService: TodoistService,
  ) {}

  async sync(userId: string, tenantId: string, syncToken: string | null, commands: SyncCommand[]) {
    const tempIdMapping: Record<string, string> = {}
    const commandResults: { type: string; ok: boolean; error?: string }[] = []

    // 1. Command-ları icra et
    for (const cmd of commands || []) {
      try {
        const result = await this.executeCommand(cmd, userId, tenantId)
        if (cmd.temp_id && result?.id) {
          tempIdMapping[cmd.temp_id] = result.id
        }
        commandResults.push({ type: cmd.type, ok: true })
      } catch (err: any) {
        commandResults.push({ type: cmd.type, ok: false, error: err.message })
      }
    }

    // 2. Dəyişən entity-ləri topla (sync_token-dan sonra)
    const since = syncToken ? new Date(syncToken) : new Date(0)
    const now = new Date()

    const [tasks, projects, sections, labels, comments] = await Promise.all([
      this.getChangedTasks(userId, tenantId, since),
      this.getChangedProjects(userId, tenantId, since),
      this.getChangedSections(userId, since),
      this.getChangedLabels(userId, tenantId, since),
      this.getChangedComments(userId, since),
    ])

    return {
      sync_token: now.toISOString(),
      temp_id_mapping: tempIdMapping,
      command_results: commandResults,
      full_sync: !syncToken,
      tasks,
      projects,
      sections,
      labels,
      comments,
    }
  }

  private async executeCommand(cmd: SyncCommand, userId: string, tenantId: string): Promise<any> {
    const { type, args } = cmd

    switch (type) {
      // ── Tasks ──
      case 'task_add':
        return this.todoistService.createTask({
          content: args.content,
          description: args.description,
          priority: args.priority,
          projectId: args.projectId,
          sectionId: args.sectionId,
          parentId: args.parentId,
          dueDate: args.dueDate,
          dueString: args.dueString,
          isRecurring: args.isRecurring,
          recurRule: args.recurRule,
          labelIds: args.labelIds,
        }, userId, tenantId)

      case 'task_update':
        return this.todoistService.updateTask(args.id, {
          content: args.content,
          description: args.description,
          priority: args.priority,
          projectId: args.projectId,
          sectionId: args.sectionId,
          dueDate: args.dueDate,
          dueString: args.dueString,
          isRecurring: args.isRecurring,
          recurRule: args.recurRule,
          duration: args.duration,
          sortOrder: args.sortOrder,
        }, userId)

      case 'task_complete':
        return this.todoistService.completeTask(args.id, userId)

      case 'task_uncomplete':
        return this.todoistService.uncompleteTask(args.id, userId)

      case 'task_delete':
        return this.softDeleteTask(args.id, userId)

      // ── Projects ──
      case 'project_add':
        return this.todoistService.createProject({
          name: args.name,
          color: args.color || '#808080',
        }, userId, tenantId)

      case 'project_update':
        return this.todoistService.updateProject(args.id, {
          name: args.name,
          color: args.color,
          viewType: args.viewType,
          isFavorite: args.isFavorite,
          sortOrder: args.sortOrder,
        }, userId)

      case 'project_delete':
        return this.softDeleteProject(args.id, userId)

      // ── Sections ──
      case 'section_add':
        return this.todoistService.createSection({
          name: args.name,
          projectId: args.projectId,
        }, userId)

      case 'section_update':
        return this.todoistService.updateSection(args.id, {
          name: args.name,
          sortOrder: args.sortOrder,
        }, userId)

      case 'section_delete':
        return this.softDeleteSection(args.id, userId)

      // ── Labels ──
      case 'label_add':
        return this.todoistService.createLabel({
          name: args.name,
          color: args.color,
        }, userId, tenantId)

      case 'label_update':
        return this.todoistService.updateLabel(args.id, {
          name: args.name,
          color: args.color,
        }, userId)

      case 'label_delete':
        return this.softDeleteLabel(args.id, userId)

      // ── Comments ──
      case 'comment_add':
        return this.todoistService.createComment(args.taskId, args.content, userId)

      case 'comment_delete':
        return this.softDeleteComment(args.id, userId)

      default:
        throw new Error(`Bilinməyən command: ${type}`)
    }
  }

  // ═══ Soft Delete metodları ═══
  private async softDeleteTask(id: string, userId: string) {
    return this.prisma.todoistTask.updateMany({
      where: { id, userId },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }

  private async softDeleteProject(id: string, userId: string) {
    return this.prisma.todoistProject.updateMany({
      where: { id, userId, isInbox: false },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }

  private async softDeleteSection(id: string, userId: string) {
    const section = await this.prisma.todoistSection.findFirst({
      where: { id, project: { userId } },
    })
    if (!section) return null
    return this.prisma.todoistSection.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }

  private async softDeleteLabel(id: string, userId: string) {
    return this.prisma.todoistLabel.updateMany({
      where: { id, userId },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }

  private async softDeleteComment(id: string, userId: string) {
    return this.prisma.todoistComment.updateMany({
      where: { id, userId },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }

  // ═══ Dəyişən entity-ləri gətir ═══
  private async getChangedTasks(userId: string, tenantId: string, since: Date) {
    return this.prisma.todoistTask.findMany({
      where: { userId, tenantId, updatedAt: { gt: since } },
      include: {
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        section: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  private async getChangedProjects(userId: string, tenantId: string, since: Date) {
    return this.prisma.todoistProject.findMany({
      where: { userId, tenantId, updatedAt: { gt: since } },
      include: { _count: { select: { tasks: { where: { isCompleted: false, isDeleted: false } } } } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  private async getChangedSections(userId: string, since: Date) {
    return this.prisma.todoistSection.findMany({
      where: { project: { userId }, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  private async getChangedLabels(userId: string, tenantId: string, since: Date) {
    return this.prisma.todoistLabel.findMany({
      where: { userId, tenantId, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  private async getChangedComments(userId: string, since: Date) {
    return this.prisma.todoistComment.findMany({
      where: { userId, updatedAt: { gt: since } },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }
}
