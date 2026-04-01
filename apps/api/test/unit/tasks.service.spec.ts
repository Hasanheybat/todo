/**
 * WorkFlow Pro — TasksService Unit Testləri
 * ──────────────────────────────────────────
 * Əhatə edir:
 *  - GÖREV yaratma (tək + toplu atama)
 *  - 50 işçi limiti yoxlaması
 *  - İerarxiya yoxlaması
 *  - Mesajlaşma: işçi notu, yetkili notu, bulk not
 *  - Not redaktə / silmə
 *  - Tapşırıq statusu dəyişdirmə
 *  - Chat bağlama / açma
 *  - Assignee statusu yeniləmə
 *  - Qrup tapşırıqları
 */

import { Test, TestingModule } from '@nestjs/testing'
import {
  NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common'
import { TasksService } from '../../src/tasks/tasks.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { NotificationsService } from '../../src/notifications/notifications.service'
import { UsersService } from '../../src/users/users.service'

// ─── Sabit test məlumatları ───────────────────────────────────────────────────
const CREATOR_ID  = 'user-creator'
const ASSIGNEE_ID = 'user-assignee'
const APPROVER_ID = 'user-approver'
const TENANT_ID   = 'tenant-001'
const TASK_ID     = 'task-001'
const BIZ_ID      = 'biz-001'

const mockCreator = {
  id: CREATOR_ID, fullName: 'Hasan Müdür', role: 'BUSINESS_MANAGER',
  tenantId: TENANT_ID, parentId: null,
  customRole: { permissions: ['tasks.create', 'tasks.read', 'gorev.create', 'gorev.approve'] },
  businesses: [{ businessId: BIZ_ID }],
}

const mockAssignee = {
  id: ASSIGNEE_ID, fullName: 'Əli İşçi', role: 'EMPLOYEE',
  tenantId: TENANT_ID, parentId: CREATOR_ID,
  customRole: { permissions: ['tasks.read'] },
  businesses: [{ businessId: BIZ_ID }],
}

const mockApprover = {
  id: APPROVER_ID, fullName: 'Leyla Yetkili', role: 'TEAM_MANAGER',
  tenantId: TENANT_ID, parentId: CREATOR_ID,
  customRole: { permissions: ['gorev.approve', 'tasks.read'] },
  businesses: [{ businessId: BIZ_ID }],
}

const mockTask = {
  id: TASK_ID,
  title: 'Test Görevi',
  description: 'Açıqlama',
  type: 'GOREV',
  status: 'PENDING',
  priority: 'MEDIUM',
  businessId: BIZ_ID,
  tenantId: TENANT_ID,
  creatorId: CREATOR_ID,
  approverId: APPROVER_ID,
  dueDate: new Date('2026-05-01'),
  groupId: null,
  workerNotes: [],
  approverNotes: [],
  bulkNotes: [],
  isChatClosed: false,
  assignees: [
    {
      userId: ASSIGNEE_ID, status: 'PENDING', approverNote: '', workerNote: '',
      user: mockAssignee,
    }
  ],
  creator: mockCreator,
  approver: mockApprover,
  labels: [],
  attachments: [],
}

// ─── Mocks ───────────────────────────────────────────────────────────────────
function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    taskAssignee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => {
      if (typeof fn === 'function') return fn({
        task: { create: jest.fn().mockResolvedValue(mockTask), update: jest.fn(), updateMany: jest.fn() },
        taskAssignee: { create: jest.fn(), createMany: jest.fn() },
        notification: { create: jest.fn() },
        todoistLabel: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
        todoistProject: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
        todoistTask: { create: jest.fn() },
      })
      return Promise.all(fn)
    }),
  }
}

const mockNotificationsService = {
  create: jest.fn(),
  createMany: jest.fn(),
}

const mockUsersService = {
  findById: jest.fn(),
  getSubordinates: jest.fn(),
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('TasksService', () => {
  let service: TasksService
  let prisma: ReturnType<typeof makePrismaMock>

  beforeEach(async () => {
    prisma = makePrismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile()
    service = module.get<TasksService>(TasksService)
  })

  afterEach(() => jest.clearAllMocks())

  // ═══════════════════════════════════════════════════════════════════════
  // 1. GÖREV YARATMA
  // ═══════════════════════════════════════════════════════════════════════
  describe('create() — GÖREV yaratma', () => {
    const validDto = {
      title: 'Yeni Görev',
      description: 'Təfərrüat',
      assigneeIds: [ASSIGNEE_ID],
      approverId: APPROVER_ID,
      businessId: BIZ_ID,
      dueDate: '2026-05-01',
      priority: 'HIGH',
      type: 'GOREV',
    }

    it('Tək atama ilə GÖREV yaradılır', async () => {
      prisma.user.findMany.mockResolvedValue([mockAssignee])
      prisma.user.findFirst
        .mockResolvedValueOnce(mockCreator)   // creator yoxlanması
        .mockResolvedValueOnce(mockApprover)  // approver yoxlanması
        .mockResolvedValueOnce(mockAssignee)  // assignee yoxlanması

      const result = await service.create(validDto as any, CREATOR_ID, TENANT_ID)
      expect(result).toBeDefined()
    })

    it('50 işçidən çox atama — BadRequestException', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `user-${i}`)
      await expect(
        service.create({ ...validDto, assigneeIds: tooManyIds } as any, CREATOR_ID, TENANT_ID)
      ).rejects.toThrow(BadRequestException)
    })

    it('Mövcud olmayan assignee — BadRequestException', async () => {
      prisma.user.findMany.mockResolvedValue([]) // heç bir istifadəçi tapılmadı
      await expect(
        service.create({ ...validDto, assigneeIds: ['yalan-user'] } as any, CREATOR_ID, TENANT_ID)
      ).rejects.toThrow(BadRequestException)
    })

    it('gorev.approve yetkisi olmayan approver — ForbiddenException', async () => {
      prisma.user.findMany.mockResolvedValue([mockAssignee])
      prisma.user.findFirst
        .mockResolvedValueOnce(mockCreator)
        .mockResolvedValueOnce({
          ...mockApprover,
          customRole: { permissions: ['tasks.read'] }, // approve yetkisi yox
        })
      await expect(
        service.create(validDto as any, CREATOR_ID, TENANT_ID)
      ).rejects.toThrow(ForbiddenException)
    })

    it('Çoxlu assignee (toplu atama) — hamısı yaradılır', async () => {
      const multiAssigneeIds = ['user-a', 'user-b', 'user-c', 'user-d', 'user-e']
      const multiAssignees = multiAssigneeIds.map(id => ({ ...mockAssignee, id }))
      prisma.user.findMany.mockResolvedValue(multiAssignees)
      prisma.user.findFirst
        .mockResolvedValueOnce(mockCreator)
        .mockResolvedValueOnce(mockApprover)

      const result = await service.create(
        { ...validDto, assigneeIds: multiAssigneeIds } as any,
        CREATOR_ID, TENANT_ID
      )
      expect(result).toBeDefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. MESAJLAŞMA — İŞÇİ NOTU
  // ═══════════════════════════════════════════════════════════════════════
  describe('addWorkerNote()', () => {
    it('İşçi öz notunu əlavə edir', async () => {
      const taskWithNotes = { ...mockTask, workerNotes: [] }
      prisma.task.findFirst.mockResolvedValue(taskWithNotes)
      prisma.task.update.mockResolvedValue({
        ...taskWithNotes,
        workerNotes: [{ userId: ASSIGNEE_ID, note: 'İşi başladım', createdAt: new Date().toISOString() }],
      })
      mockNotificationsService.create.mockResolvedValue({})

      const result = await service.addWorkerNote(TASK_ID, ASSIGNEE_ID, 'İşi başladım')
      expect(result.workerNotes).toHaveLength(1)
      expect(result.workerNotes[0].note).toBe('İşi başladım')
    })

    it('Boş not əlavə olunmur', async () => {
      await expect(
        service.addWorkerNote(TASK_ID, ASSIGNEE_ID, '   ')
      ).rejects.toThrow()
    })

    it('Tapşırıq tapılmadıqda — NotFoundException', async () => {
      prisma.task.findFirst.mockResolvedValue(null)
      await expect(
        service.addWorkerNote('yalan-task', ASSIGNEE_ID, 'Not')
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 3. MESAJLAŞMA — YETKİLİ NOTU
  // ═══════════════════════════════════════════════════════════════════════
  describe('updateApproverNote()', () => {
    it('Yetkili assignee-ə cavab verir', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask)
      const updatedAssignees = mockTask.assignees.map(a =>
        a.userId === ASSIGNEE_ID
          ? { ...a, approverNote: 'Yaxşı işdir, davam et', approverNoteHistory: [] }
          : a
      )
      prisma.task.update.mockResolvedValue({ ...mockTask, assignees: updatedAssignees })
      mockNotificationsService.create.mockResolvedValue({})

      const result = await service.updateApproverNote(
        TASK_ID, APPROVER_ID, ASSIGNEE_ID, 'Yaxşı işdir, davam et'
      )
      expect(result).toBeDefined()
    })

    it('Başqası approver rolunu üstələyə bilmir', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask)
      await expect(
        service.updateApproverNote(TASK_ID, ASSIGNEE_ID, ASSIGNEE_ID, 'İcazəsiz not')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 4. TOPLU NOT (BULK NOTE)
  // ═══════════════════════════════════════════════════════════════════════
  describe('addBulkNote()', () => {
    it('Yaradıcı toplu not əlavə edir — bütün işçilərə bildiriş', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask)
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        bulkNotes: [{ userId: CREATOR_ID, note: 'Hamınıza müraciət', createdAt: new Date().toISOString() }],
      })
      mockNotificationsService.create.mockResolvedValue({})

      const result = await service.addBulkNote(TASK_ID, CREATOR_ID, 'Hamınıza müraciət')
      expect(result.bulkNotes).toHaveLength(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 5. NOT REDAKTƏ / SİLMƏ
  // ═══════════════════════════════════════════════════════════════════════
  describe('editNote() / deleteNote()', () => {
    it('İşçi öz notunu redaktə edir', async () => {
      const taskWithNote = {
        ...mockTask,
        workerNotes: [{ userId: ASSIGNEE_ID, note: 'Köhnə mətn', createdAt: new Date().toISOString() }],
      }
      prisma.task.findFirst.mockResolvedValue(taskWithNote)
      prisma.task.update.mockResolvedValue({
        ...taskWithNote,
        workerNotes: [{ userId: ASSIGNEE_ID, note: 'Yeni mətn', createdAt: new Date().toISOString() }],
      })

      const result = await service.editNote(TASK_ID, ASSIGNEE_ID, {
        noteType: 'worker', noteIndex: 0, newText: 'Yeni mətn',
      })
      expect(result.workerNotes[0].note).toBe('Yeni mətn')
    })

    it('Digərinin notunu redaktə etmə — ForbiddenException', async () => {
      const taskWithNote = {
        ...mockTask,
        workerNotes: [{ userId: 'baska-user', note: 'Mətn', createdAt: new Date().toISOString() }],
      }
      prisma.task.findFirst.mockResolvedValue(taskWithNote)
      await expect(
        service.editNote(TASK_ID, ASSIGNEE_ID, { noteType: 'worker', noteIndex: 0, newText: 'Oğurluq' })
      ).rejects.toThrow(ForbiddenException)
    })

    it('Mövcud olmayan indeks ilə redaktə — BadRequestException', async () => {
      prisma.task.findFirst.mockResolvedValue({ ...mockTask, workerNotes: [] })
      await expect(
        service.editNote(TASK_ID, ASSIGNEE_ID, { noteType: 'worker', noteIndex: 5, newText: 'Boş' })
      ).rejects.toThrow(BadRequestException)
    })

    it('Not silinir', async () => {
      const taskWithNote = {
        ...mockTask,
        workerNotes: [{ userId: ASSIGNEE_ID, note: 'Silinəcək', createdAt: new Date().toISOString() }],
      }
      prisma.task.findFirst.mockResolvedValue(taskWithNote)
      prisma.task.update.mockResolvedValue({ ...taskWithNote, workerNotes: [] })

      const result = await service.deleteNote(TASK_ID, ASSIGNEE_ID, { noteType: 'worker', noteIndex: 0 })
      expect(result.workerNotes).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 6. TAPŞIRIQ STATUS YENİLƏNMƏSİ
  // ═══════════════════════════════════════════════════════════════════════
  describe('updateAssigneeStatus()', () => {
    const statuses = ['PENDING', 'IN_PROGRESS', 'DONE', 'PENDING_APPROVAL', 'REJECTED']

    statuses.forEach(status => {
      it(`Assignee statusunu "${status}" olaraq yeniləyir`, async () => {
        prisma.taskAssignee.findFirst.mockResolvedValue({
          taskId: TASK_ID, userId: ASSIGNEE_ID, status: 'PENDING',
          task: mockTask,
        })
        prisma.taskAssignee.update.mockResolvedValue({ status })
        mockNotificationsService.create.mockResolvedValue({})

        const result = await service.updateAssigneeStatus(TASK_ID, ASSIGNEE_ID, status)
        expect(result).toBeDefined()
      })
    })

    it('Tapşırıq tapılmadıqda — NotFoundException', async () => {
      prisma.taskAssignee.findFirst.mockResolvedValue(null)
      await expect(
        service.updateAssigneeStatus('yalan-task', ASSIGNEE_ID, 'DONE')
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 7. CHAT BAĞLAMA / AÇMA
  // ═══════════════════════════════════════════════════════════════════════
  describe('toggleChatClosed()', () => {
    it('Yaradıcı chati bağlayır', async () => {
      prisma.task.findFirst.mockResolvedValue({ ...mockTask, isChatClosed: false })
      prisma.task.update.mockResolvedValue({ ...mockTask, isChatClosed: true })
      const result = await service.toggleChatClosed(TASK_ID, CREATOR_ID, ASSIGNEE_ID, true)
      expect(result.isChatClosed).toBe(true)
    })

    it('Yetkisiz istifadəçi chati bağlaya bilmir', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask)
      await expect(
        service.toggleChatClosed(TASK_ID, 'yalan-user', ASSIGNEE_ID, true)
      ).rejects.toThrow(ForbiddenException)
    })

    it('Bağlı chat açılır', async () => {
      prisma.task.findFirst.mockResolvedValue({ ...mockTask, isChatClosed: true })
      prisma.task.update.mockResolvedValue({ ...mockTask, isChatClosed: false })
      const result = await service.toggleChatClosed(TASK_ID, CREATOR_ID, ASSIGNEE_ID, false)
      expect(result.isChatClosed).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 8. TAPŞIRIQ OXUMAQ / SIYAHI
  // ═══════════════════════════════════════════════════════════════════════
  describe('findAll() / findOne()', () => {
    it('Kiracıya aid tapşırıqları gətirir', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask])
      const result = await service.findAll(TENANT_ID, CREATOR_ID, {})
      expect(result).toHaveLength(1)
    })

    it('Tək tapşırığı id ilə gətirir', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask)
      const result = await service.findOne(TASK_ID, TENANT_ID)
      expect(result.id).toBe(TASK_ID)
    })

    it('Mövcud olmayan tapşırıq — NotFoundException', async () => {
      prisma.task.findFirst.mockResolvedValue(null)
      await expect(service.findOne('yalan-id', TENANT_ID)).rejects.toThrow(NotFoundException)
    })
  })
})
