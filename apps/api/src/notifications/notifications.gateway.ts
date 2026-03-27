import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as jwt from 'jsonwebtoken'

const MAX_SOCKETS_PER_PLATFORM = 1 // hər platform üçün max 1 socket
const TOKEN_CHECK_INTERVAL = 60_000 // 1 dəqiqə

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000'], credentials: true },
  namespace: '/notifications',
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(NotificationsGateway.name)
  // userId → { web: socketId, app: socketId }
  private userSockets = new Map<string, { web?: string; app?: string }>()
  private tokenCheckTimer: ReturnType<typeof setInterval> | null = null

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Hər 1 dəqiqə token expire yoxla
    this.tokenCheckTimer = setInterval(() => this.checkExpiredTokens(), TOKEN_CHECK_INTERVAL)
  }

  onModuleDestroy() {
    if (this.tokenCheckTimer) clearInterval(this.tokenCheckTimer)
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token as string
      if (!token) { client.disconnect(); return }

      const secret = process.env.JWT_SECRET || 'change-this-in-production'
      const payload = jwt.verify(token, secret) as any
      const userId = payload.sub

      if (!userId) { client.disconnect(); return }

      // Platform təyin et — client handshake-dən göndərir
      const platform = (client.handshake.auth?.platform || client.handshake.query?.platform || 'web') as 'web' | 'app'
      const validPlatform = platform === 'app' ? 'app' : 'web'

      // Platform başına max 1 socket
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, {})
      const slots = this.userSockets.get(userId)!

      // Eyni platformda köhnə socket varsa kəs
      const existingId = slots[validPlatform]
      if (existingId) {
        const oldSocket = (this.server?.sockets as any)?.get?.(existingId) || this.server?.sockets?.sockets?.get(existingId)
        if (oldSocket) {
          oldSocket.emit('session_replaced', { message: 'Başqa cihazdan giriş edildi', platform: validPlatform })
          oldSocket.disconnect()
        }
      }

      // Yeni socket-i yaz
      slots[validPlatform] = client.id

      // User-ı room-a əlavə et
      client.join(`user:${userId}`)
      client.data.userId = userId
      client.data.platform = validPlatform
      client.data.token = token
      client.data.tokenExp = payload.exp

      const activeCount = (slots.web ? 1 : 0) + (slots.app ? 1 : 0)
      this.logger.log(`Bağlandı: ${userId} [${validPlatform}] (${client.id}) [${activeCount}/2]`)

      // Reconnect — qaçırılan bildirişləri göndər (client lastSeen göndərə bilər)
      const lastSeen = client.handshake.auth?.lastSeen || client.handshake.query?.lastSeen
      if (lastSeen) {
        this.sendMissedNotifications(client, userId, payload.tenantId, lastSeen)
      }
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId
    const platform = client.data?.platform as 'web' | 'app'
    if (userId && this.userSockets.has(userId)) {
      const slots = this.userSockets.get(userId)!
      // Yalnız öz socket-ini sil (başqa platform-un deyil)
      if (slots[platform] === client.id) {
        delete slots[platform]
      }
      if (!slots.web && !slots.app) this.userSockets.delete(userId)
    }
  }

  // ═══ Token expire yoxlama — hər 1 dəqiqə ═══
  private checkExpiredTokens() {
    if (!this.server) return
    const now = Math.floor(Date.now() / 1000)
    let disconnected = 0

    const socketsMap = (this.server.sockets as any)?.sockets || new Map()
    for (const [, socket] of socketsMap) {
      const exp = socket.data?.tokenExp
      if (exp && exp < now) {
        socket.emit('token_expired', { message: 'Token müddəti bitdi' })
        socket.disconnect()
        disconnected++
      }
    }

    if (disconnected > 0) {
      this.logger.warn(`Token expire: ${disconnected} socket kəsildi`)
    }
  }

  // Bildiriş göndər
  sendToUser(userId: string, notification: any) {
    this.server?.to(`user:${userId}`).emit('notification', notification)
  }

  sendToUsers(userIds: string[], notification: any) {
    for (const uid of userIds) {
      this.server?.to(`user:${uid}`).emit('notification', notification)
    }
  }

  getOnlineCount(): number {
    return this.userSockets.size
  }

  getSocketCount(): number {
    let count = 0
    for (const slots of this.userSockets.values()) {
      if (slots.web) count++
      if (slots.app) count++
    }
    return count
  }

  // Reconnect zamanı qaçırılan bildirişləri göndər
  private async sendMissedNotifications(client: Socket, userId: string, tenantId: string, lastSeen: string) {
    try {
      const missed = await this.prisma.notification.findMany({
        where: { userId, tenantId, createdAt: { gt: new Date(lastSeen) } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      if (missed.length > 0) {
        client.emit('missed_notifications', missed)
        this.logger.log(`${userId} → ${missed.length} qaçırılan bildiriş göndərildi`)
      }
    } catch (err) {
      this.logger.error(`Missed notifications xətası: ${err}`)
    }
  }
}
