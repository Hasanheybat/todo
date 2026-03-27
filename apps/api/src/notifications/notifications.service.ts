import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsGateway } from './notifications.gateway'

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  // Bildiriş yarat + real-time WebSocket göndər
  async create(data: { type: string; title: string; message: string; userId: string; senderId?: string; link?: string; tenantId: string }) {
    const notif = await this.prisma.notification.create({
      data: {
        type: data.type as any,
        title: data.title,
        message: data.message,
        userId: data.userId,
        senderId: data.senderId || null,
        link: data.link || null,
        tenantId: data.tenantId,
      },
    })
    // Real-time göndər
    this.gateway.sendToUser(data.userId, { ...notif, _realtime: true })
    return notif
  }

  // Çox nəfərə eyni anda bildiriş + real-time
  async createMany(userIds: string[], data: { type: string; title: string; message: string; senderId?: string; link?: string; tenantId: string }) {
    const result = await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        type: data.type as any,
        title: data.title,
        message: data.message,
        userId,
        senderId: data.senderId || null,
        link: data.link || null,
        tenantId: data.tenantId,
      })),
    })
    // Real-time göndər hər user-a
    this.gateway.sendToUsers(userIds, { type: data.type, title: data.title, message: data.message, _realtime: true })
    return result
  }

  // İstifadəçinin bildirişlərini gətir
  async findAll(userId: string, tenantId: string) {
    return this.prisma.notification.findMany({
      where: { userId, tenantId },
      include: { sender: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  // Oxunmamış sayı
  async getUnreadCount(userId: string, tenantId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, tenantId, isRead: false },
    })
    return { count }
  }

  // Oxundu işarələ
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    })
  }

  // Hamısını oxundu işarələ
  async markAllAsRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    })
  }

  // ── Avtomatik bildiriş yaratma helper-ləri ──

  async notifyTaskAssigned(taskTitle: string, assigneeIds: string[], creatorId: string, tenantId: string) {
    if (assigneeIds.length === 0) return
    await this.createMany(assigneeIds, {
      type: 'TASK_ASSIGNED',
      title: 'Yeni tapşırıq',
      message: `Sizə "${taskTitle}" tapşırığı atandı`,
      senderId: creatorId,
      link: '/tasks',
      tenantId,
    })
  }

  async notifyTaskCompleted(taskTitle: string, creatorId: string, completedBy: string, tenantId: string) {
    await this.create({
      type: 'TASK_COMPLETED',
      title: 'Tapşırıq tamamlandı',
      message: `"${taskTitle}" tapşırığı tamamlanıb, onayınız gözlənilir`,
      userId: creatorId,
      senderId: completedBy,
      link: '/tasks',
      tenantId,
    })
  }

  async notifyTaskApproved(taskTitle: string, assigneeIds: string[], approvedBy: string, tenantId: string) {
    await this.createMany(assigneeIds, {
      type: 'TASK_APPROVED',
      title: 'Tapşırıq onaylandı',
      message: `"${taskTitle}" tapşırığı onaylandı`,
      senderId: approvedBy,
      link: '/tasks',
      tenantId,
    })
  }

  async notifyTaskRejected(taskTitle: string, assigneeIds: string[], rejectedBy: string, tenantId: string) {
    await this.createMany(assigneeIds, {
      type: 'TASK_REJECTED',
      title: 'Tapşırıq rədd edildi',
      message: `"${taskTitle}" tapşırığı rədd edildi`,
      senderId: rejectedBy,
      link: '/tasks',
      tenantId,
    })
  }

  async notifySalaryPaid(employeeName: string, userId: string, amount: number, paidBy: string, tenantId: string) {
    await this.create({
      type: 'SALARY_PAID',
      title: 'Maaş ödənildi',
      message: `${amount.toLocaleString()} ₼ maaşınız ödənildi`,
      userId,
      senderId: paidBy,
      link: '/salary',
      tenantId,
    })
  }

  async notifyCommentAdded(taskTitle: string, taskOwnerId: string, commentAuthor: string, authorId: string, tenantId: string) {
    if (taskOwnerId === authorId) return // öz şərhinə bildiriş yox
    await this.create({
      type: 'COMMENT_ADDED',
      title: 'Yeni şərh',
      message: `${commentAuthor} "${taskTitle}" tapşırığına şərh yazdı`,
      userId: taskOwnerId,
      senderId: authorId,
      link: '/tasks',
      tenantId,
    })
  }
}
