import { Test } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { TaskAssigneeFilesService } from '../../src/task-assignee-files/task-assignee-files.service'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('TaskAssigneeFilesService', () => {
  let service: TaskAssigneeFilesService
  let prisma: any

  const mockFile = {
    originalname: 'test.xlsx', mimetype: 'application/xlsx',
    size: 500000, buffer: Buffer.from('test'),
  } as any

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskAssigneeFilesService,
        {
          provide: PrismaService,
          useValue: {
            taskAssignee: {
              findUnique: jest.fn().mockResolvedValue({ id: 'ta1', userId: 'u1' }),
            },
            taskAssigneeFile: {
              create: jest.fn().mockResolvedValue({ id: 'f1', slotNumber: 1, filename: 'test.xlsx' }),
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue({ id: 'f1', taskAssignee: { userId: 'u1' } }),
              update: jest.fn().mockResolvedValue({ id: 'f1', isDeleted: true }),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile()
    service = module.get(TaskAssigneeFilesService)
    prisma = module.get(PrismaService)
  })

  describe('upload', () => {
    it('fayl yükləməlidir (slot 1-5)', async () => {
      const result = await service.upload('ta1', 1, mockFile, 'u1')
      expect(result.filename).toBe('test.xlsx')
      expect(prisma.taskAssigneeFile.updateMany).toHaveBeenCalled() // köhnə faylı soft delete
      expect(prisma.taskAssigneeFile.create).toHaveBeenCalled()
    })

    it('slot 0 üçün xəta verməlidir', async () => {
      await expect(service.upload('ta1', 0, mockFile, 'u1')).rejects.toThrow(BadRequestException)
    })

    it('slot 6 üçün xəta verməlidir', async () => {
      await expect(service.upload('ta1', 6, mockFile, 'u1')).rejects.toThrow(BadRequestException)
    })

    it('1.5MB-dan böyük fayl üçün xəta verməlidir', async () => {
      const bigFile = { ...mockFile, size: 2000000 } as any
      await expect(service.upload('ta1', 1, bigFile, 'u1')).rejects.toThrow(BadRequestException)
    })

    it('başqasının atanmasına yükləmə üçün xəta verməlidir', async () => {
      await expect(service.upload('ta1', 1, mockFile, 'other-user')).rejects.toThrow(ForbiddenException)
    })

    it('mövcud olmayan atanma üçün xəta verməlidir', async () => {
      prisma.taskAssignee.findUnique.mockResolvedValueOnce(null)
      await expect(service.upload('nonexist', 1, mockFile, 'u1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getFiles', () => {
    it('aktiv faylları qaytarmalıdır', async () => {
      await service.getFiles('ta1')
      expect(prisma.taskAssigneeFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taskAssigneeId: 'ta1', isDeleted: false },
        })
      )
    })
  })

  describe('getHistory', () => {
    it('bütün faylları (silnənlər daxil) qaytarmalıdır', async () => {
      await service.getHistory('ta1')
      expect(prisma.taskAssigneeFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taskAssigneeId: 'ta1' },
        })
      )
    })
  })

  describe('deleteFile', () => {
    it('faylı soft delete etməlidir', async () => {
      const result = await service.deleteFile('f1', 'u1')
      expect(prisma.taskAssigneeFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDeleted: true }),
        })
      )
    })

    it('başqasının faylını silməyə icazə verməməlidir', async () => {
      prisma.taskAssigneeFile.findUnique.mockResolvedValueOnce({
        id: 'f1', taskAssignee: { userId: 'other-user' },
      })
      await expect(service.deleteFile('f1', 'u1')).rejects.toThrow(ForbiddenException)
    })

    it('mövcud olmayan fayl üçün xəta verməlidir', async () => {
      prisma.taskAssigneeFile.findUnique.mockResolvedValueOnce(null)
      await expect(service.deleteFile('nonexist', 'u1')).rejects.toThrow(NotFoundException)
    })
  })
})
