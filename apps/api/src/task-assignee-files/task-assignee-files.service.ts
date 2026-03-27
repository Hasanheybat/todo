import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as fs from 'fs'
import * as path from 'path'

const MAX_FILE_SIZE = 1572864 // 1.5 MB
const MAX_SLOTS = 5

@Injectable()
export class TaskAssigneeFilesService {
  constructor(private prisma: PrismaService) {}

  async upload(taskAssigneeId: string, slotNumber: number, file: Express.Multer.File, userId: string) {
    // Validasiya
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      throw new BadRequestException(`Slot nömrəsi 1-${MAX_SLOTS} arası olmalıdır`)
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Fayl ölçüsü maksimum 1.5 MB ola bilər')
    }

    // TaskAssignee yoxla
    const assignee = await this.prisma.taskAssignee.findUnique({
      where: { id: taskAssigneeId },
    })
    if (!assignee) throw new NotFoundException('Atanma tapılmadı')
    if (assignee.userId !== userId) throw new ForbiddenException('Yalnız öz fayllarınızı yükləyə bilərsiniz')

    // Eyni slot-da mövcud aktiv fayl varsa soft delete et
    await this.prisma.taskAssigneeFile.updateMany({
      where: { taskAssigneeId, slotNumber, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    })

    // Upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'assignee-files')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const ext = path.extname(file.originalname)
    const filename = `${taskAssigneeId}_slot${slotNumber}_${Date.now()}${ext}`
    const storagePath = path.join(uploadDir, filename)
    fs.writeFileSync(storagePath, file.buffer)

    return this.prisma.taskAssigneeFile.create({
      data: {
        taskAssigneeId,
        slotNumber,
        filename: file.originalname,
        storagePath: `/uploads/assignee-files/${filename}`,
        mimeType: file.mimetype,
        size: file.size,
      },
    })
  }

  async getFiles(taskAssigneeId: string) {
    return this.prisma.taskAssigneeFile.findMany({
      where: { taskAssigneeId, isDeleted: false },
      orderBy: { slotNumber: 'asc' },
    })
  }

  async getHistory(taskAssigneeId: string) {
    return this.prisma.taskAssigneeFile.findMany({
      where: { taskAssigneeId },
      orderBy: [{ slotNumber: 'asc' }, { uploadedAt: 'desc' }],
    })
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.taskAssigneeFile.findUnique({
      where: { id: fileId },
      include: { taskAssignee: true },
    })
    if (!file) throw new NotFoundException('Fayl tapılmadı')
    if (file.taskAssignee.userId !== userId) throw new ForbiddenException('Yalnız öz fayllarınızı silə bilərsiniz')

    return this.prisma.taskAssigneeFile.update({
      where: { id: fileId },
      data: { isDeleted: true, deletedAt: new Date() },
    })
  }
}
