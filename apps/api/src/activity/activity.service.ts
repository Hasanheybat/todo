import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name)

  constructor(private prisma: PrismaService) {}

  async log(params: {
    tenantId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    entityTitle: string
    details?: any
  }) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityTitle: params.entityTitle,
          details: params.details ? JSON.stringify(params.details) : null,
        },
      })
    } catch (err) {
      this.logger.error('Activity log yazıla bilmədi', err)
    }
  }

  async findAll(tenantId: string, filters?: {
    entityType?: string
    userId?: string
    limit?: number
    offset?: number
  }) {
    const where: any = { tenantId }
    if (filters?.entityType) where.entityType = filters.entityType
    if (filters?.userId) where.userId = filters.userId

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.activityLog.count({ where }),
    ])

    return { items, total }
  }

  async findByEntity(entityType: string, entityId: string, tenantId: string) {
    return this.prisma.activityLog.findMany({
      where: { entityType, entityId, tenantId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }
}
