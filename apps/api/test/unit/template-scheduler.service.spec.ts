import { Test } from '@nestjs/testing'
import { TemplateSchedulerService } from '../../src/templates/template-scheduler.service'
import { TemplatesService } from '../../src/templates/templates.service'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('TemplateSchedulerService', () => {
  let scheduler: TemplateSchedulerService
  let prisma: any

  const baseTemplate = {
    id: 't1', name: 'Aylıq Hesabat', description: 'test',
    isRecurring: true, isActive: true, scheduleType: 'MONTHLY',
    scheduleTime: '09:00', dayOfMonth: 10, dayOfWeek: null,
    businessId: 'b1', departmentId: null,
    notificationDay: 13, deadlineDay: 15, endDate: null,
    creatorId: 'u1', tenantId: 'tn1',
    items: [
      { id: 'i1', title: 'Alt görev 1', priority: 'MEDIUM', sortOrder: 0 },
      { id: 'i2', title: 'Alt görev 2', priority: 'HIGH', sortOrder: 1 },
    ],
    assignees: [
      { id: 'a1', userId: 'u2' },
      { id: 'a2', userId: 'u3' },
    ],
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TemplateSchedulerService,
        {
          provide: PrismaService,
          useValue: {
            taskTemplate: {
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn().mockResolvedValue({}),
            },
            task: { create: jest.fn().mockResolvedValue({ id: 'task1' }), findFirst: jest.fn() },
            notification: { create: jest.fn() },
          },
        },
        { provide: TemplatesService, useValue: {} },
      ],
    }).compile()
    scheduler = module.get(TemplateSchedulerService)
    prisma = module.get(PrismaService)
  })

  describe('handleScheduledTemplates', () => {
    it('vaxtı gəlməmiş şablon olduqda heç nə etməməlidir', async () => {
      prisma.taskTemplate.findMany.mockResolvedValueOnce([])
      await scheduler.handleScheduledTemplates()
      expect(prisma.task.create).not.toHaveBeenCalled()
    })

    it('recurring şablon üçün hər assignee-yə ayrı task yaratmalıdır', async () => {
      prisma.taskTemplate.findMany.mockResolvedValueOnce([baseTemplate])
      await scheduler.handleScheduledTemplates()

      // 2 assignee * (1 ana task + 2 alt görev) = 6 task.create
      expect(prisma.task.create).toHaveBeenCalledTimes(6)

      // Ana task sourceTemplateId ilə yaradılmalıdır
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceTemplateId: 't1',
            type: 'GOREV',
          }),
        })
      )
    })

    it('standart şablon üçün item başına task yaratmalıdır', async () => {
      const standardTemplate = { ...baseTemplate, isRecurring: false }
      prisma.taskTemplate.findMany.mockResolvedValueOnce([standardTemplate])
      await scheduler.handleScheduledTemplates()

      // 2 item = 2 task.create
      expect(prisma.task.create).toHaveBeenCalledTimes(2)
    })

    it('endDate keçibsə şablonu deaktiv etməlidir', async () => {
      const expired = { ...baseTemplate, endDate: new Date('2020-01-01') }
      prisma.taskTemplate.findMany.mockResolvedValueOnce([expired])
      await scheduler.handleScheduledTemplates()

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      )
      expect(prisma.task.create).not.toHaveBeenCalled()
    })

    it('deadlineDay-dən dueDate hesablamalıdır', async () => {
      prisma.taskTemplate.findMany.mockResolvedValueOnce([baseTemplate])
      await scheduler.handleScheduledTemplates()

      const createCall = prisma.task.create.mock.calls[0][0]
      expect(createCall.data.dueDate).toBeDefined()
      expect(createCall.data.dueDate.getDate()).toBe(15) // deadlineDay
    })

    it('dispatch sonrası lastRunAt və nextRunAt yeniləməlidir', async () => {
      prisma.taskTemplate.findMany.mockResolvedValueOnce([baseTemplate])
      await scheduler.handleScheduledTemplates()

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: expect.any(Date),
            isActive: true,
          }),
        })
      )
    })

    it('ONCE tipli şablonu dispatch sonrası deaktiv etməlidir', async () => {
      const onceTemplate = { ...baseTemplate, scheduleType: 'ONCE', isRecurring: false }
      prisma.taskTemplate.findMany.mockResolvedValueOnce([onceTemplate])
      await scheduler.handleScheduledTemplates()

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      )
    })
  })

  describe('handleNotificationReminders', () => {
    it('bildirim günü deyilsə heç nə etməməlidir', async () => {
      prisma.taskTemplate.findMany.mockResolvedValueOnce([])
      await scheduler.handleNotificationReminders()
      expect(prisma.notification.create).not.toHaveBeenCalled()
    })
  })
})
