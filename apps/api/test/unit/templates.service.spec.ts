import { Test } from '@nestjs/testing'
import { TemplatesService } from '../../src/templates/templates.service'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('TemplatesService', () => {
  let service: TemplatesService
  let prisma: any

  const mockTemplate = {
    id: 't1', name: 'Test Şablon', description: 'test', isRecurring: true, isActive: true,
    scheduleType: 'MONTHLY', scheduleTime: '09:00', dayOfMonth: 10, dayOfWeek: null,
    businessId: 'b1', departmentId: 'd1', notificationDay: 13, deadlineDay: 15,
    endDate: null, creatorId: 'u1', tenantId: 'tn1',
    items: [{ id: 'i1', title: 'Alt görev 1', priority: 'MEDIUM', sortOrder: 0 }],
    assignees: [{ id: 'a1', userId: 'u2' }],
    creator: { id: 'u1', fullName: 'Admin' },
    business: { id: 'b1', name: 'Bakı Filialı' },
    department: null,
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: PrismaService,
          useValue: {
            taskTemplate: {
              create: jest.fn().mockResolvedValue(mockTemplate),
              findMany: jest.fn().mockResolvedValue([mockTemplate]),
              findFirst: jest.fn().mockResolvedValue(mockTemplate),
              update: jest.fn().mockResolvedValue(mockTemplate),
              delete: jest.fn().mockResolvedValue(mockTemplate),
            },
            templateItem: { deleteMany: jest.fn() },
            templateAssignee: { deleteMany: jest.fn() },
            task: { create: jest.fn().mockResolvedValue({ id: 'task1' }) },
          },
        },
      ],
    }).compile()
    service = module.get(TemplatesService)
    prisma = module.get(PrismaService)
  })

  describe('create', () => {
    it('təkrarlanan şablon yaratmalıdır', async () => {
      const dto = {
        name: 'Aylıq Hesabat', description: 'test', scheduleType: 'MONTHLY',
        scheduleTime: '09:00', dayOfMonth: 10, isRecurring: true,
        businessId: 'b1', departmentId: 'd1', notificationDay: 13, deadlineDay: 15,
        items: [{ title: 'Alt görev 1', priority: 'MEDIUM' }],
        assigneeIds: ['u2'],
      }
      const result = await service.create(dto as any, 'u1', 'tn1')
      expect(prisma.taskTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Aylıq Hesabat',
            isRecurring: true,
            businessId: 'b1',
            notificationDay: 13,
            deadlineDay: 15,
          }),
        })
      )
      expect(result).toBeDefined()
    })

    it('standart şablon yaratmalıdır (isRecurring=false)', async () => {
      const dto = {
        name: 'Standart', scheduleType: 'WEEKLY', dayOfWeek: 1,
        items: [{ title: 'Görev', priority: 'HIGH' }],
      }
      await service.create(dto as any, 'u1', 'tn1')
      expect(prisma.taskTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRecurring: false }),
        })
      )
    })
  })

  describe('findAll', () => {
    it('yalnız yaradanın şablonlarını qaytarmalıdır', async () => {
      await service.findAll('tn1', 'u1')
      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tn1', creatorId: 'u1' },
        })
      )
    })

    it('userId olmadan bütün şablonları qaytarmalıdır', async () => {
      await service.findAll('tn1')
      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tn1' },
        })
      )
    })
  })

  describe('update', () => {
    it('notificationDay və deadlineDay yeniləməlidir', async () => {
      await service.update('t1', { notificationDay: 20, deadlineDay: 25 }, 'tn1')
      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notificationDay: 20,
            deadlineDay: 25,
          }),
        })
      )
    })

    it('endDate null olaraq təmizlənə bilməlidir', async () => {
      await service.update('t1', { endDate: null } as any, 'tn1')
      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endDate: null }),
        })
      )
    })
  })

  describe('toggleActive', () => {
    it('aktiv şablonu dayandırmalıdır', async () => {
      await service.toggleActive('t1', 'tn1')
      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      )
    })
  })

  describe('remove', () => {
    it('şablonu silməlidir', async () => {
      const result = await service.remove('t1', 'tn1')
      expect(prisma.taskTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
      expect(result.message).toContain('silindi')
    })

    it('mövcud olmayan şablon üçün xəta verməlidir', async () => {
      prisma.taskTemplate.findFirst.mockResolvedValueOnce(null)
      await expect(service.remove('nonexist', 'tn1')).rejects.toThrow('tapılmadı')
    })
  })
})
