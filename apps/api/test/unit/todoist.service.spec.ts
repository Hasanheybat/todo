/**
 * WorkFlow Pro — TodoistService Unit Testləri
 * ─────────────────────────────────────────────
 * Əhatə edir:
 *  - TODO əlavə etmə / silmə / yeniləmə
 *  - Kanban status keçidləri (WAITING → IN_PROGRESS → DONE → CANCELLED)
 *  - Layihə CRUD + Inbox qoruması
 *  - Bölmə (section) CRUD
 *  - Şərh əlavə etmə / silmə
 *  - Toplu (bulk) əməliyyatlar
 *  - Təkrarlanan tapşırıq məntiqi
 *  - Xatırlatma sahəsi
 *  - Sıralama (reorder)
 *  - Şablon (template) idarəsi
 */

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { TodoistService } from '../../src/todoist/todoist.service'
import { PrismaService } from '../../src/prisma/prisma.service'

// ─── Sabit test məlumatları ───────────────────────────────────────────────────
const USER_ID  = 'user-001'
const TENANT_ID = 'tenant-001'
const PROJECT_ID = 'proj-001'
const INBOX_ID   = 'inbox-001'
const TASK_ID    = 'task-001'
const SECTION_ID = 'section-001'

const mockInboxProject = {
  id: INBOX_ID, name: 'Gələnlər', isInbox: true,
  userId: USER_ID, tenantId: TENANT_ID, sortOrder: 0,
}

const mockProject = {
  id: PROJECT_ID, name: 'İş layihəsi', isInbox: false,
  userId: USER_ID, tenantId: TENANT_ID, color: '#FF0000', sortOrder: 1,
}

const mockTask = {
  id: TASK_ID,
  content: 'Test tapşırığı',
  userId: USER_ID,
  tenantId: TENANT_ID,
  projectId: PROJECT_ID,
  isCompleted: false,
  todoStatus: 'WAITING',
  priority: 'P4',
  dueDate: null,
  isRecurring: false,
  recurRule: null,
  reminder: null,
  reminderSent: false,
  sortOrder: 1,
  labels: [],
}

// ─── PrismaService Mock ───────────────────────────────────────────────────────
function makePrismaMock() {
  return {
    todoistProject: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
    },
    todoistTask: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
    },
    todoistSection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    todoistComment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    todoistLabel: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    todoistTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    todoistActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn({
      todoistTask: {
        updateMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    })),
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('TodoistService', () => {
  let service: TodoistService
  let prisma: ReturnType<typeof makePrismaMock>

  beforeEach(async () => {
    prisma = makePrismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get<TodoistService>(TodoistService)
  })

  afterEach(() => jest.clearAllMocks())

  // ═══════════════════════════════════════════════════════════════════════
  // 1. LAYİHƏ (PROJECT) TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Layihə əməliyyatları', () => {
    describe('getProjects()', () => {
      it('Inbox artıq mövcuddursa — yenidən yaratmır', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        prisma.todoistProject.findMany.mockResolvedValue([mockInboxProject, mockProject])
        const result = await service.getProjects(USER_ID, TENANT_ID)
        expect(prisma.todoistProject.create).not.toHaveBeenCalled()
        expect(result).toHaveLength(2)
      })

      it('Inbox yoxdursa — avtomatik yaradır', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(null)
        prisma.todoistProject.create.mockResolvedValue(mockInboxProject)
        prisma.todoistProject.findMany.mockResolvedValue([mockInboxProject])
        await service.getProjects(USER_ID, TENANT_ID)
        expect(prisma.todoistProject.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ isInbox: true, name: 'Gələnlər' }) })
        )
      })
    })

    describe('createProject()', () => {
      it('Yeni layihəni doğru məlumatla yaradır', async () => {
        prisma.todoistProject.create.mockResolvedValue({ ...mockProject, id: 'new-proj' })
        const result = await service.createProject(
          { name: 'Yeni layihə', color: '#FF5722', isFavorite: false },
          USER_ID, TENANT_ID
        )
        expect(result.id).toBe('new-proj')
        expect(prisma.todoistProject.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ name: 'Yeni layihə', userId: USER_ID }) })
        )
      })
    })

    describe('updateProject()', () => {
      it('Inbox adını dəyişdirməyə izin vermir', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        await expect(
          service.updateProject(INBOX_ID, { name: 'Yeni ad' }, USER_ID)
        ).rejects.toThrow(ForbiddenException)
      })

      it('Mövcud olmayan layihəni yeniləmə — NotFoundException', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(null)
        await expect(
          service.updateProject('yalan-id', { name: 'Ad' }, USER_ID)
        ).rejects.toThrow(NotFoundException)
      })

      it('Normal layihəni uğurla yeniləyir', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockProject)
        prisma.todoistProject.update.mockResolvedValue({ ...mockProject, name: 'Yenilənmiş' })
        const result = await service.updateProject(PROJECT_ID, { name: 'Yenilənmiş' }, USER_ID)
        expect(result.name).toBe('Yenilənmiş')
      })
    })

    describe('deleteProject()', () => {
      it('Inbox layihəsi silinə bilməz', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        await expect(
          service.deleteProject(INBOX_ID, USER_ID, TENANT_ID)
        ).rejects.toThrow(ForbiddenException)
      })

      it('Silinən layihənin tapşırıqları Inbox-a köçürülür', async () => {
        prisma.todoistProject.findFirst
          .mockResolvedValueOnce(mockProject)   // layihəni tapır
          .mockResolvedValueOnce(mockInboxProject) // inbox-ı tapır
        prisma.todoistTask.updateMany.mockResolvedValue({ count: 3 })
        prisma.todoistSection.findMany.mockResolvedValue([])
        prisma.todoistProject.delete.mockResolvedValue(mockProject)

        await service.deleteProject(PROJECT_ID, USER_ID, TENANT_ID)
        expect(prisma.todoistTask.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ projectId: INBOX_ID }) })
        )
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. TODO TAPŞIRIQ TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('TODO Tapşırıq əməliyyatları', () => {
    describe('createTask()', () => {
      it('Əsas məlumatlarla tapşırıq yaradır', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        prisma.todoistTask.create.mockResolvedValue(mockTask)
        prisma.todoistActivity.create.mockResolvedValue({})

        const result = await service.createTask(
          { content: 'Test tapşırığı', projectId: INBOX_ID },
          USER_ID, TENANT_ID
        )
        expect(result.content).toBe('Test tapşırığı')
        expect(result.todoStatus).toBe('WAITING')
      })

      it('Boş content ilə tapşırıq yaratmaq — BadRequest', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        await expect(
          service.createTask({ content: '', projectId: INBOX_ID }, USER_ID, TENANT_ID)
        ).rejects.toThrow(BadRequestException)
      })

      it('Xatırlatma tarixi olan tapşırıq yaradılır', async () => {
        const reminder = new Date(Date.now() + 3600_000)
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        const taskWithReminder = { ...mockTask, reminder, reminderSent: false }
        prisma.todoistTask.create.mockResolvedValue(taskWithReminder)
        prisma.todoistActivity.create.mockResolvedValue({})

        const result = await service.createTask(
          { content: 'Xatırlat mənə', projectId: INBOX_ID, reminder: reminder.toISOString() },
          USER_ID, TENANT_ID
        )
        expect(result.reminder).toEqual(reminder)
        expect(result.reminderSent).toBe(false)
      })

      it('Təkrarlanan tapşırıq doğru sahələrlə yaradılır', async () => {
        prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
        const recurTask = { ...mockTask, isRecurring: true, recurRule: 'daily', dueDate: new Date() }
        prisma.todoistTask.create.mockResolvedValue(recurTask)
        prisma.todoistActivity.create.mockResolvedValue({})

        const result = await service.createTask(
          {
            content: 'Günlük tapşırıq',
            projectId: INBOX_ID,
            isRecurring: true,
            recurRule: 'daily',
            dueDate: new Date().toISOString(),
          },
          USER_ID, TENANT_ID
        )
        expect(result.isRecurring).toBe(true)
        expect(result.recurRule).toBe('daily')
      })
    })

    describe('updateTask() — Kanban Status Keçidləri', () => {
      const statusTransitions = [
        { from: 'WAITING',     to: 'IN_PROGRESS', desc: 'Gözləyir → Davam edir' },
        { from: 'IN_PROGRESS', to: 'DONE',        desc: 'Davam edir → Tamamlandı' },
        { from: 'DONE',        to: 'CANCELLED',   desc: 'Tamamlandı → İptal edilib' },
        { from: 'CANCELLED',   to: 'WAITING',     desc: 'İptal edilib → Gözləyir (geri)' },
        { from: 'WAITING',     to: 'CANCELLED',   desc: 'Gözləyir → İptal edilib (birbaşa)' },
        { from: 'IN_PROGRESS', to: 'WAITING',     desc: 'Davam edir → Gözləyir (geri)' },
      ]

      statusTransitions.forEach(({ from, to, desc }) => {
        it(`Status: ${desc}`, async () => {
          prisma.todoistTask.findFirst.mockResolvedValue({ ...mockTask, todoStatus: from })
          prisma.todoistTask.update.mockResolvedValue({ ...mockTask, todoStatus: to })
          prisma.todoistActivity.create.mockResolvedValue({})

          const result = await service.updateTask(TASK_ID, { todoStatus: to }, USER_ID)
          expect(result.todoStatus).toBe(to)
          expect(prisma.todoistTask.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ todoStatus: to }) })
          )
        })
      })

      it('Başqasının tapşırığını yeniləmə — NotFoundException', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue(null)
        await expect(
          service.updateTask('yalan-id', { todoStatus: 'DONE' }, USER_ID)
        ).rejects.toThrow(NotFoundException)
      })

      it('Prioritet yenilənir (P1–P4)', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue({ ...mockTask, priority: 'P4' })
        prisma.todoistTask.update.mockResolvedValue({ ...mockTask, priority: 'P1' })
        prisma.todoistActivity.create.mockResolvedValue({})
        const result = await service.updateTask(TASK_ID, { priority: 'P1' as any }, USER_ID)
        expect(result.priority).toBe('P1')
      })

      it('Bitmə tarixi yenilənir', async () => {
        const newDue = '2026-05-01'
        prisma.todoistTask.findFirst.mockResolvedValue(mockTask)
        prisma.todoistTask.update.mockResolvedValue({ ...mockTask, dueDate: new Date(newDue) })
        prisma.todoistActivity.create.mockResolvedValue({})
        const result = await service.updateTask(TASK_ID, { dueDate: newDue }, USER_ID)
        expect(result.dueDate).toEqual(new Date(newDue))
      })
    })

    describe('deleteTask()', () => {
      it('Öz tapşırığını silir', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue(mockTask)
        prisma.todoistTask.delete.mockResolvedValue(mockTask)
        await service.deleteTask(TASK_ID, USER_ID)
        expect(prisma.todoistTask.delete).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: TASK_ID } })
        )
      })

      it('Başqasının tapşırığını silə bilmir', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue(null)
        await expect(service.deleteTask('yalan-id', USER_ID)).rejects.toThrow(NotFoundException)
      })
    })

    describe('completeTask() / uncompleteTask()', () => {
      it('Tapşırığı tamamlar — isCompleted=true, todoStatus=DONE', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue(mockTask)
        prisma.todoistTask.update.mockResolvedValue({ ...mockTask, isCompleted: true, todoStatus: 'DONE' })
        prisma.todoistActivity.create.mockResolvedValue({})
        const result = await service.completeTask(TASK_ID, USER_ID)
        expect(result.isCompleted).toBe(true)
      })

      it('Tapşırığı tamamlanmamış edir — isCompleted=false', async () => {
        prisma.todoistTask.findFirst.mockResolvedValue({ ...mockTask, isCompleted: true, todoStatus: 'DONE' })
        prisma.todoistTask.update.mockResolvedValue({ ...mockTask, isCompleted: false, todoStatus: 'WAITING' })
        prisma.todoistActivity.create.mockResolvedValue({})
        const result = await service.uncompleteTask(TASK_ID, USER_ID)
        expect(result.isCompleted).toBe(false)
      })
    })

    describe('reorderTasks()', () => {
      it('Sıra rəqəmlərini doğru yeniləyir', async () => {
        const items = [
          { id: 'task-a', sortOrder: 1 },
          { id: 'task-b', sortOrder: 2 },
          { id: 'task-c', sortOrder: 3 },
        ]
        prisma.todoistTask.update.mockResolvedValue({})
        await service.reorderTasks(USER_ID, items)
        expect(prisma.todoistTask.update).toHaveBeenCalledTimes(3)
        expect(prisma.todoistTask.update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'task-a' }, data: expect.objectContaining({ sortOrder: 1 }) })
        )
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 3. BÖLMƏ (SECTION) TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Bölmə əməliyyatları', () => {
    it('Bölmə yaradılır', async () => {
      prisma.todoistSection.create.mockResolvedValue({ id: SECTION_ID, name: 'Sprint 1', projectId: PROJECT_ID })
      const result = await service.createSection({ name: 'Sprint 1', projectId: PROJECT_ID }, USER_ID)
      expect(result.name).toBe('Sprint 1')
    })

    it('Mövcud olmayan bölməni silmə — NotFoundException', async () => {
      prisma.todoistSection.findFirst.mockResolvedValue(null)
      await expect(service.deleteSection('yalan-section', USER_ID)).rejects.toThrow(NotFoundException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 4. ŞƏRH TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Şərh (comment) əməliyyatları', () => {
    it('Şərh əlavə olunur', async () => {
      prisma.todoistTask.findFirst.mockResolvedValue(mockTask)
      prisma.todoistComment.create.mockResolvedValue({
        id: 'cmt-001', content: 'Bu yaxşıdır!', userId: USER_ID, taskId: TASK_ID, createdAt: new Date(),
      })
      const result = await service.createComment(TASK_ID, 'Bu yaxşıdır!', USER_ID)
      expect(result.content).toBe('Bu yaxşıdır!')
    })

    it('Boş şərh əlavə olunmur', async () => {
      prisma.todoistTask.findFirst.mockResolvedValue(mockTask)
      await expect(service.createComment(TASK_ID, '', USER_ID)).rejects.toThrow(BadRequestException)
    })

    it('Öz şərhini silir', async () => {
      prisma.todoistComment.findFirst.mockResolvedValue({ id: 'cmt-001', userId: USER_ID })
      prisma.todoistComment.delete.mockResolvedValue({})
      await service.deleteComment('cmt-001', USER_ID)
      expect(prisma.todoistComment.delete).toHaveBeenCalled()
    })

    it('Başqasının şərhini silə bilmir', async () => {
      prisma.todoistComment.findFirst.mockResolvedValue(null)
      await expect(service.deleteComment('cmt-001', USER_ID)).rejects.toThrow(NotFoundException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 5. TOPLU (BULK) ƏMƏLIYYAT TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Toplu əməliyyatlar (bulkAction)', () => {
    const taskIds = ['task-a', 'task-b', 'task-c']

    it('complete — seçilmiş tapşırıqları tamamlayır', async () => {
      prisma.todoistTask.findMany.mockResolvedValue(taskIds.map(id => ({ ...mockTask, id })))
      prisma.todoistTask.update.mockResolvedValue({})
      prisma.todoistActivity.create.mockResolvedValue({})
      await service.bulkAction(USER_ID, TENANT_ID, { taskIds, action: 'complete' })
      expect(prisma.todoistTask.update).toHaveBeenCalledTimes(3)
    })

    it('delete — seçilmiş tapşırıqları silir', async () => {
      prisma.todoistTask.findMany.mockResolvedValue(taskIds.map(id => ({ ...mockTask, id })))
      prisma.todoistTask.delete.mockResolvedValue({})
      prisma.todoistActivity.create.mockResolvedValue({})
      await service.bulkAction(USER_ID, TENANT_ID, { taskIds, action: 'delete' })
      expect(prisma.todoistTask.delete).toHaveBeenCalledTimes(3)
    })

    it('move — tapşırıqları başqa layihəyə köçürür', async () => {
      const targetProjectId = 'proj-002'
      prisma.todoistTask.findMany.mockResolvedValue(taskIds.map(id => ({ ...mockTask, id })))
      prisma.todoistProject.findFirst.mockResolvedValue({ id: targetProjectId, userId: USER_ID })
      prisma.todoistTask.update.mockResolvedValue({})
      prisma.todoistActivity.create.mockResolvedValue({})
      await service.bulkAction(USER_ID, TENANT_ID, { taskIds, action: 'move', payload: { projectId: targetProjectId } })
      expect(prisma.todoistTask.update).toHaveBeenCalledTimes(3)
    })

    it('Bilinməyən action — BadRequestException', async () => {
      await expect(
        service.bulkAction(USER_ID, TENANT_ID, { taskIds, action: 'bilinmeyen' })
      ).rejects.toThrow()
    })

    it('Boş taskIds — badRequest', async () => {
      await expect(
        service.bulkAction(USER_ID, TENANT_ID, { taskIds: [], action: 'complete' })
      ).rejects.toThrow()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 6. ŞABLON (TEMPLATE) TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('Şablon əməliyyatları', () => {
    const mockTemplate = {
      id: 'tmpl-001',
      name: 'Sprint Şablonu',
      tasks: JSON.stringify([{ content: 'Tapşırıq 1' }, { content: 'Tapşırıq 2' }]),
      userId: USER_ID,
      tenantId: TENANT_ID,
    }

    it('Şablon yaradılır', async () => {
      prisma.todoistTemplate.create.mockResolvedValue(mockTemplate)
      const result = await service.createTemplate(USER_ID, TENANT_ID, {
        name: 'Sprint Şablonu',
        tasks: JSON.stringify([{ content: 'Tapşırıq 1' }]),
      })
      expect(result.name).toBe('Sprint Şablonu')
    })

    it('Şablondan layihə yaradılır', async () => {
      prisma.todoistTemplate.findFirst.mockResolvedValue(mockTemplate)
      prisma.todoistProject.create.mockResolvedValue({ id: 'proj-from-tmpl', name: 'Yeni Sprint' })
      prisma.todoistTask.create.mockResolvedValue({})
      prisma.todoistProject.findFirst.mockResolvedValue(mockInboxProject)
      prisma.todoistProject.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } })

      const result = await service.createProjectFromTemplate(USER_ID, TENANT_ID, 'tmpl-001', 'Yeni Sprint')
      expect(result.name).toBe('Yeni Sprint')
    })

    it('Mövcud olmayan şablondan istifadə — NotFoundException', async () => {
      prisma.todoistTemplate.findFirst.mockResolvedValue(null)
      await expect(
        service.createProjectFromTemplate(USER_ID, TENANT_ID, 'yalan-tmpl', 'Ad')
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 7. AKTİVLİK VƏ AXTARIŞ
  // ═══════════════════════════════════════════════════════════════════════
  describe('Aktivlik və axtarış', () => {
    it('getActivities — aktivlik siyahısını qaytarır', async () => {
      prisma.todoistActivity.findMany.mockResolvedValue([
        { id: 'act-1', action: 'created', taskId: TASK_ID, userId: USER_ID },
      ])
      const result = await service.getActivities(USER_ID, TENANT_ID, 10)
      expect(result).toHaveLength(1)
    })

    it('searchTasks — açar sözlə axtarış', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([mockTask])
      const result = await service.searchTasks(USER_ID, TENANT_ID, 'Test')
      expect(result).toHaveLength(1)
      expect(result[0].content).toContain('Test')
    })

    it('searchTasks — boş sorğu bütün tapşırıqları qaytarır', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([mockTask, { ...mockTask, id: 'task-002', content: 'Digər' }])
      const result = await service.searchTasks(USER_ID, TENANT_ID, '')
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })
})
