/**
 * WorkFlow Pro — Xatırlatma Scheduler Testləri
 * ─────────────────────────────────────────────
 * Əhatə edir:
 *  - Vaxtı çatan xatırlatmaları tapıb bildiriş göndərir
 *  - reminderSent=true qoyur (təkrar göndərmir)
 *  - Vaxtı keçmiş / gəlməmiş xatırlatmaları yox sayır
 *  - Xəta olduqda digərləri üçün davam edir
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TodoistReminderSchedulerService } from '../../src/todoist/todoist-reminder-scheduler.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { NotificationsService } from '../../src/notifications/notifications.service'

const USER_ID   = 'user-001'
const TENANT_ID = 'tenant-001'

function makeReminderTask(minutesFromNow: number) {
  const reminder = new Date(Date.now() + minutesFromNow * 60 * 1000)
  return {
    id: `task-reminder-${minutesFromNow}`,
    content: 'Xatırlatma tapşırığı',
    userId: USER_ID,
    isCompleted: false,
    reminder,
    reminderSent: false,
    user: { id: USER_ID, tenantId: TENANT_ID },
    project: { name: 'Gələnlər' },
    projectId: 'inbox-001',
  }
}

describe('TodoistReminderSchedulerService', () => {
  let service: TodoistReminderSchedulerService
  let prisma: any
  let notifications: any

  beforeEach(async () => {
    prisma = {
      todoistTask: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    }

    notifications = {
      create: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoistReminderSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile()

    service = module.get<TodoistReminderSchedulerService>(TodoistReminderSchedulerService)
  })

  afterEach(() => jest.clearAllMocks())

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ƏSAS XATİRLATMA MƏNTIQI
  // ═══════════════════════════════════════════════════════════════════════
  describe('handleReminders()', () => {
    it('Xatırlatma tapşırığı yoxdursa — heç nə göndərilmir', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([])
      await service.handleReminders()
      expect(notifications.create).not.toHaveBeenCalled()
      expect(prisma.todoistTask.update).not.toHaveBeenCalled()
    })

    it('Vaxtı çatan tapşırıq üçün bildiriş göndərilir', async () => {
      const task = makeReminderTask(-1) // 1 dəq əvvəl keçib (2 dəq pəncərə içindədir)
      prisma.todoistTask.findMany.mockResolvedValue([task])
      notifications.create.mockResolvedValue({})
      prisma.todoistTask.update.mockResolvedValue({ ...task, reminderSent: true })

      await service.handleReminders()

      expect(notifications.create).toHaveBeenCalledTimes(1)
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TODO_DUE',
          userId: USER_ID,
          tenantId: TENANT_ID,
        })
      )
    })

    it('Bildiriş göndərildikdən sonra reminderSent=true olur', async () => {
      const task = makeReminderTask(-1)
      prisma.todoistTask.findMany.mockResolvedValue([task])
      notifications.create.mockResolvedValue({})
      prisma.todoistTask.update.mockResolvedValue({})

      await service.handleReminders()

      expect(prisma.todoistTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: task.id },
          data: { reminderSent: true },
        })
      )
    })

    it('Bir neçə xatırlatma — hamısı göndərilir', async () => {
      const tasks = [makeReminderTask(-1), makeReminderTask(-2)]
      tasks[1].id = 'task-reminder-2'
      prisma.todoistTask.findMany.mockResolvedValue(tasks)
      notifications.create.mockResolvedValue({})
      prisma.todoistTask.update.mockResolvedValue({})

      await service.handleReminders()

      expect(notifications.create).toHaveBeenCalledTimes(2)
      expect(prisma.todoistTask.update).toHaveBeenCalledTimes(2)
    })

    it('Bildiriş göndərimi xəta versə — digər tapşırıqlara davam edilir', async () => {
      const tasks = [makeReminderTask(-1), makeReminderTask(-2)]
      tasks[1].id = 'task-reminder-b'
      prisma.todoistTask.findMany.mockResolvedValue(tasks)
      notifications.create
        .mockRejectedValueOnce(new Error('Mail xətası'))
        .mockResolvedValueOnce({})
      prisma.todoistTask.update.mockResolvedValue({})

      // Xəta atmır — davam edir
      await expect(service.handleReminders()).resolves.not.toThrow()

      // İkinci tapşırıq üçün yenə bildiriş göndərildi
      expect(notifications.create).toHaveBeenCalledTimes(2)
    })

    it('Bildiriş mesajında tapşırıq adı var', async () => {
      const task = { ...makeReminderTask(-1), content: 'Mühüm hesabat' }
      prisma.todoistTask.findMany.mockResolvedValue([task])
      notifications.create.mockResolvedValue({})
      prisma.todoistTask.update.mockResolvedValue({})

      await service.handleReminders()

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Mühüm hesabat'),
        })
      )
    })

    it('Bildiriş linkdə projectId daxildir', async () => {
      const task = makeReminderTask(-1)
      prisma.todoistTask.findMany.mockResolvedValue([task])
      notifications.create.mockResolvedValue({})
      prisma.todoistTask.update.mockResolvedValue({})

      await service.handleReminders()

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          link: expect.stringContaining('projectId=inbox-001'),
        })
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. FİLTR YOXLANIŞİ — Prisma sorğusu düzgündür
  // ═══════════════════════════════════════════════════════════════════════
  describe('Prisma sorğusu yoxlanışı', () => {
    it('Yalnız reminderSent=false tapşırıqları axtarır', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([])
      await service.handleReminders()

      expect(prisma.todoistTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reminderSent: false,
            isCompleted: false,
          }),
        })
      )
    })

    it('Tarix pəncərəsi ≤ 2 dəqiqədir', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([])
      const before = Date.now()
      await service.handleReminders()
      const after = Date.now()

      const callArg = prisma.todoistTask.findMany.mock.calls[0][0]
      const lte: Date = callArg.where.reminder.lte
      const gte: Date = callArg.where.reminder.gte

      const windowMs = lte.getTime() - gte.getTime()
      expect(windowMs).toBeGreaterThanOrEqual(120_000 - 100) // ≈2 dəq
      expect(windowMs).toBeLessThanOrEqual(120_000 + 2000)
    })
  })
})
