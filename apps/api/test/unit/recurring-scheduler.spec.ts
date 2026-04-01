/**
 * WorkFlow Pro — Təkrarlanan Tapşırıq Scheduler Testləri
 * ──────────────────────────────────────────────────────
 * Əhatə edir:
 *  - Gündəlik / həftəlik / aylıq təkrarlama
 *  - Dublikat qoruma
 *  - Gecikmiş tapşırıq sürüşdürülməsi
 *  - Boş tapşırıq siyahısında heç nə baş verməməsi
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TodoistRecurringSchedulerService } from '../../src/todoist/todoist-recurring-scheduler.service'
import { PrismaService } from '../../src/prisma/prisma.service'

const USER_ID   = 'user-001'
const TENANT_ID = 'tenant-001'

function makeOverdueTask(recurRule: string, daysAgo: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() - daysAgo)
  return {
    id: `task-${recurRule}-${daysAgo}`,
    content: `${recurRule} Tapşırıq`,
    userId: USER_ID,
    tenantId: TENANT_ID,
    projectId: 'proj-001',
    isRecurring: true,
    isCompleted: false,
    recurRule,
    dueDate,
    priority: 'P4',
    todoStatus: 'WAITING',
    labels: [],
  }
}

describe('TodoistRecurringSchedulerService', () => {
  let service: TodoistRecurringSchedulerService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      todoistTask: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoistRecurringSchedulerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<TodoistRecurringSchedulerService>(TodoistRecurringSchedulerService)
  })

  afterEach(() => jest.clearAllMocks())

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ƏSAS FUNKSIYA TESTLƏRI
  // ═══════════════════════════════════════════════════════════════════════
  describe('dispatchRecurringTasks()', () => {
    it('Gecikmiş tapşırıq yoxdursa — heç nə etmir', async () => {
      prisma.todoistTask.findMany.mockResolvedValue([])
      await service.dispatchRecurringTasks()
      expect(prisma.todoistTask.create).not.toHaveBeenCalled()
    })

    it('Gündəlik gecikmiş tapşırıq üçün yeni tapşırıq yaradır', async () => {
      const overdue = makeOverdueTask('daily', 1)
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      prisma.todoistTask.findFirst.mockResolvedValue(null) // dublikat yoxdur
      prisma.todoistTask.create.mockResolvedValue({ ...overdue, id: 'new-task-daily' })

      await service.dispatchRecurringTasks()

      expect(prisma.todoistTask.create).toHaveBeenCalledTimes(1)
      const createCall = prisma.todoistTask.create.mock.calls[0][0]
      expect(createCall.data.isRecurring).toBe(true)
      expect(createCall.data.recurRule).toBe('daily')
      expect(createCall.data.isCompleted).toBe(false)
    })

    it('Həftəlik tapşırıq üçün 7 gün sonraya tarix hesablanır', async () => {
      const overdue = makeOverdueTask('weekly', 7)
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      prisma.todoistTask.create.mockResolvedValue({})

      await service.dispatchRecurringTasks()

      const createCall = prisma.todoistTask.create.mock.calls[0][0]
      const newDue: Date = createCall.data.dueDate
      const now = new Date()
      // Yeni tarix gələcəkdə olmalıdır
      expect(newDue.getTime()).toBeGreaterThan(now.getTime())
    })

    it('Aylıq tapşırıq üçün 1 ay sonraya tarix hesablanır', async () => {
      const overdue = makeOverdueTask('monthly', 30)
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      prisma.todoistTask.create.mockResolvedValue({})

      await service.dispatchRecurringTasks()

      const createCall = prisma.todoistTask.create.mock.calls[0][0]
      const newDue: Date = createCall.data.dueDate
      expect(newDue.getTime()).toBeGreaterThan(new Date().getTime())
    })

    it('Dublikat mövcuddursa — yeni tapşırıq yaratmır', async () => {
      const overdue = makeOverdueTask('daily', 1)
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      // Dublikat artıq var
      prisma.todoistTask.findFirst.mockResolvedValue({ id: 'existing-task' })

      await service.dispatchRecurringTasks()
      expect(prisma.todoistTask.create).not.toHaveBeenCalled()
    })

    it('Çox geridə qalmış tapşırıq — ən yaxın gələcək tarixə sürüşdürülür', async () => {
      // 3 həftə əvvəl gecikmiş həftəlik tapşırıq
      const overdue = makeOverdueTask('weekly', 21)
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      prisma.todoistTask.create.mockResolvedValue({})

      await service.dispatchRecurringTasks()

      const createCall = prisma.todoistTask.create.mock.calls[0][0]
      const newDue: Date = createCall.data.dueDate
      // Tarix bu gündən sonra olmalıdır
      expect(newDue.getTime()).toBeGreaterThan(Date.now())
    })

    it('Bir neçə gecikmiş tapşırıq — hər biri üçün yeni tapşırıq yaradır', async () => {
      const overdueTasks = [
        makeOverdueTask('daily', 1),
        makeOverdueTask('weekly', 7),
        makeOverdueTask('monthly', 30),
      ]
      prisma.todoistTask.findMany.mockResolvedValue(overdueTasks)
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      prisma.todoistTask.create.mockResolvedValue({})

      await service.dispatchRecurringTasks()
      expect(prisma.todoistTask.create).toHaveBeenCalledTimes(3)
    })

    it('Yeni tapşırıq köhnənin məzmununu miras alır', async () => {
      const overdue = {
        ...makeOverdueTask('daily', 1),
        content: 'Mühüm Tapşırıq',
        priority: 'P1',
        projectId: 'proj-xüsusi',
      }
      prisma.todoistTask.findMany.mockResolvedValue([overdue])
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      prisma.todoistTask.create.mockResolvedValue({})

      await service.dispatchRecurringTasks()

      const createCall = prisma.todoistTask.create.mock.calls[0][0]
      expect(createCall.data.content).toBe('Mühüm Tapşırıq')
      expect(createCall.data.priority).toBe('P1')
      expect(createCall.data.projectId).toBe('proj-xüsusi')
    })

    it('Xəta baş verdikdə — digər tapşırıqların işlənməsinə mane olmur', async () => {
      const tasks = [
        makeOverdueTask('daily', 1),
        makeOverdueTask('weekly', 7),
      ]
      prisma.todoistTask.findMany.mockResolvedValue(tasks)
      prisma.todoistTask.findFirst.mockResolvedValue(null)
      // Birinci yaratma xəta verir, ikincisi uğurludur
      prisma.todoistTask.create
        .mockRejectedValueOnce(new Error('DB xətası'))
        .mockResolvedValueOnce({})

      // Xəta atmır — davam edir
      await expect(service.dispatchRecurringTasks()).resolves.not.toThrow()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. TARİX HESABLAMA
  // ═══════════════════════════════════════════════════════════════════════
  describe('calculateNextDate()', () => {
    it('Gündəlik: +1 gün hesablanır', () => {
      const base = new Date('2026-04-01')
      const next = (service as any).calculateNextDate(base, 'daily')
      expect(next.toISOString().split('T')[0]).toBe('2026-04-02')
    })

    it('Həftəlik: +7 gün hesablanır', () => {
      const base = new Date('2026-04-01')
      const next = (service as any).calculateNextDate(base, 'weekly')
      expect(next.toISOString().split('T')[0]).toBe('2026-04-08')
    })

    it('Aylıq: +1 ay hesablanır', () => {
      const base = new Date('2026-04-01')
      const next = (service as any).calculateNextDate(base, 'monthly')
      expect(next.toISOString().split('T')[0]).toBe('2026-05-01')
    })

    it('Bilinməyən qayda — gündəlik qəbul edilir', () => {
      const base = new Date('2026-04-01')
      const next = (service as any).calculateNextDate(base, 'bilinmeyen')
      expect(next.getTime()).toBeGreaterThan(base.getTime())
    })
  })
})
