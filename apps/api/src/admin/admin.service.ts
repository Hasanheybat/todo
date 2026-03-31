import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminService {
  // Brute force qoruması — IP/email bazalı rate limiting
  private loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil: number }>()

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private checkRateLimit(key: string) {
    const now = Date.now()
    const record = this.loginAttempts.get(key)

    if (record) {
      // Blok müddəti keçibsə sıfırla
      if (record.blockedUntil > 0 && now > record.blockedUntil) {
        this.loginAttempts.delete(key)
        return
      }
      // Hələ bloklıdır
      if (record.blockedUntil > 0 && now <= record.blockedUntil) {
        const remainSec = Math.ceil((record.blockedUntil - now) / 1000)
        throw new UnauthorizedException(`Çox sayda uğursuz cəhd. ${remainSec} saniyə sonra yenidən cəhd edin.`)
      }
    }
  }

  private recordFailedAttempt(key: string) {
    const now = Date.now()
    const record = this.loginAttempts.get(key) || { count: 0, lastAttempt: 0, blockedUntil: 0 }

    // 10 dəqiqədən köhnə cəhdləri sıfırla
    if (now - record.lastAttempt > 10 * 60 * 1000) {
      record.count = 0
    }

    record.count++
    record.lastAttempt = now

    // 5 uğursuz cəhddən sonra 2 dəqiqə blokla
    if (record.count >= 5) {
      record.blockedUntil = now + 2 * 60 * 1000 // 2 dəqiqə
    }

    this.loginAttempts.set(key, record)
  }

  private clearAttempts(key: string) {
    this.loginAttempts.delete(key)
  }

  // ── Login ──
  async login(email: string, password: string) {
    // Null byte / xüsusi simvol təmizləmə
    const cleanEmail = email.replace(/[\x00-\x1f\x7f]/g, '').trim()
    if (!cleanEmail || cleanEmail.length > 255) {
      throw new BadRequestException('Yanlış e-poçt formatı')
    }

    // Rate limit yoxla
    this.checkRateLimit(cleanEmail)

    // Eyni xəta mesajı — email enumeration qoruması
    const authError = 'E-poçt və ya şifrə yanlışdır'

    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } })
    if (!user || !user.isSuperAdmin) {
      // Timing attack qoruması — bcrypt vaxtını simülyasiya et
      await bcrypt.compare(password, '$2b$10$dummyhashfortimingattak000000000000000000000000000')
      this.recordFailedAttempt(cleanEmail)
      throw new UnauthorizedException(authError)
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      this.recordFailedAttempt(cleanEmail)
      throw new UnauthorizedException(authError)
    }

    // Uğurlu login — cəhdləri sıfırla
    this.clearAttempts(cleanEmail)

    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId, isSuperAdmin: true }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ])

    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    // Audit log
    await this.logAction(user.id, user.email, 'login', 'Super Admin daxil oldu')

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, fullName: user.fullName, isSuperAdmin: true } }
  }

  // ── Dashboard Stats ──
  async getStats() {
    const [tenantCount, activeCount, userCount, taskCount] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isSuperAdmin: false } }),
      this.prisma.task.count(),
    ])

    const planCounts = await this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })

    return {
      tenantCount,
      activeCount,
      passiveCount: tenantCount - activeCount,
      userCount,
      taskCount,
      planDistribution: planCounts.map(p => ({ plan: p.plan, count: p._count.plan })),
    }
  }

  // ── Tenant CRUD ──
  async getTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        settings: true,
        _count: { select: { users: true, businesses: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Hər tenant üçün task count əlavə et
    const result = []
    for (const t of tenants) {
      const taskCount = await this.prisma.task.count({ where: { tenantId: t.id } })
      const admin = await this.prisma.user.findFirst({
        where: { tenantId: t.id, isSystemAdmin: true },
        select: { email: true, fullName: true },
      })
      result.push({
        ...t,
        taskCount,
        adminEmail: admin?.email || '',
        adminName: admin?.fullName || '',
        userCount: t._count.users,
        branchCount: t._count.businesses,
        permissionCount: t.allowedPermissions?.length || 0,
      })
    }
    return result
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        businesses: {
          select: {
            id: true, name: true,
            _count: { select: { users: true } },
            departments: { select: { department: { select: { id: true, name: true } } } },
          },
        },
      },
    })
    if (!tenant) throw new NotFoundException('İşletmə tapılmadı')

    const [userCount, taskCount, admin] = await Promise.all([
      this.prisma.user.count({ where: { tenantId: id } }),
      this.prisma.task.count({ where: { tenantId: id } }),
      this.prisma.user.findFirst({
        where: { tenantId: id, isSystemAdmin: true },
        select: { id: true, email: true, fullName: true },
      }),
    ])

    return { ...tenant, userCount, taskCount, admin }
  }

  // Input sanitizasiyası — XSS və injection qoruması
  private sanitize(input: string): string {
    return input.replace(/[<>'";&|`$\\]/g, '').replace(/[\x00-\x1f\x7f]/g, '').replace(/:\/\//g, '').trim()
  }

  async createTenant(data: { name: string; plan?: string; adminEmail: string; adminPassword: string; adminName: string; allowedPermissions?: string[] }, actorId?: string, actorEmail?: string) {
    // Input sanitizasiyası
    data.name = this.sanitize(data.name)
    data.adminName = this.sanitize(data.adminName)
    data.adminEmail = data.adminEmail.replace(/[\x00-\x1f\x7f]/g, '').trim().toLowerCase()

    if (!data.name || data.name.length > 100) throw new BadRequestException('İşletmə adı 1-100 simvol olmalıdır')
    if (!data.adminEmail.includes('@')) throw new BadRequestException('Yanlış e-poçt formatı')

    const existing = await this.prisma.tenant.findFirst({ where: { name: data.name } })
    if (existing) throw new BadRequestException('Bu adda işletmə artıq mövcuddur')

    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.name,
        plan: data.plan || 'starter',
        allowedPermissions: data.allowedPermissions || [],
      },
    })

    // Settings yarat
    const planLimits: Record<string, { maxUsers: number; maxBranches: number; maxDepartments: number }> = {
      starter: { maxUsers: 20, maxBranches: 2, maxDepartments: 5 },
      pro: { maxUsers: 100, maxBranches: 5, maxDepartments: 20 },
      enterprise: { maxUsers: 200, maxBranches: 20, maxDepartments: 50 },
    }
    const limits = planLimits[data.plan || 'starter'] || planLimits.starter

    await this.prisma.tenantSettings.create({
      data: { tenantId: tenant.id, ...limits },
    })

    // Admin istifadəçi yarat
    const hashedPassword = await bcrypt.hash(data.adminPassword, 10)
    await this.prisma.user.create({
      data: {
        email: data.adminEmail,
        password: hashedPassword,
        fullName: data.adminName,
        role: 'TENANT_ADMIN',
        isSystemAdmin: true,
        tenantId: tenant.id,
      },
    })

    await this.logAction(actorId || 'system', actorEmail || 'system', 'tenant.create', `Yeni tenant yaradıldı: ${data.name}`, tenant.id)

    return this.getTenant(tenant.id)
  }

  async updateTenant(id: string, data: { name?: string; plan?: string; maxUsers?: number; maxBranches?: number; maxDepartments?: number; allowedPermissions?: string[] }, actorId?: string, actorEmail?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('İşletmə tapılmadı')

    // Tenant yenilə
    const tenantUpdate: any = {}
    if (data.name) {
      tenantUpdate.name = this.sanitize(data.name)
      if (!tenantUpdate.name || tenantUpdate.name.length > 100) throw new BadRequestException('İşletmə adı 1-100 simvol olmalıdır')
    }
    if (data.plan) tenantUpdate.plan = data.plan
    if (data.allowedPermissions) tenantUpdate.allowedPermissions = data.allowedPermissions

    if (Object.keys(tenantUpdate).length > 0) {
      await this.prisma.tenant.update({ where: { id }, data: tenantUpdate })
    }

    // Settings yenilə
    const settingsUpdate: any = {}
    if (data.maxUsers !== undefined) settingsUpdate.maxUsers = data.maxUsers
    if (data.maxBranches !== undefined) settingsUpdate.maxBranches = data.maxBranches
    if (data.maxDepartments !== undefined) settingsUpdate.maxDepartments = data.maxDepartments

    if (Object.keys(settingsUpdate).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: id },
        update: settingsUpdate,
        create: { tenantId: id, ...settingsUpdate },
      })
    }

    await this.logAction(actorId || 'system', actorEmail || 'system', 'tenant.update', `Tenant yeniləndi: ${tenant.name}`, id)

    return this.getTenant(id)
  }

  async toggleTenantStatus(id: string, actorId?: string, actorEmail?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('İşletmə tapılmadı')

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    })

    const action = updated.isActive ? 'tenant.activate' : 'tenant.deactivate'
    await this.logAction(actorId || 'system', actorEmail || 'system', action, `${tenant.name} ${updated.isActive ? 'aktiv' : 'deaktiv'} edildi`, id)

    return updated
  }

  async deleteTenant(id: string, actorId?: string, actorEmail?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('İşletmə tapılmadı')

    // Soft delete — deaktiv et
    await this.prisma.tenant.update({ where: { id }, data: { isActive: false } })
    await this.logAction(actorId || 'system', actorEmail || 'system', 'tenant.delete', `Tenant silindi (deaktiv): ${tenant.name}`, id)

    return { message: 'İşletmə deaktiv edildi' }
  }

  // ── Audit Logs ──
  async getLogs(filters?: { action?: string; limit?: number }) {
    return this.prisma.adminAuditLog.findMany({
      where: filters?.action ? { action: { contains: filters.action } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    })
  }

  // ── Settings ──
  async getDefaultSettings() {
    return {
      plans: {
        starter: { maxUsers: 20, maxBranches: 2, maxDepartments: 5 },
        pro: { maxUsers: 100, maxBranches: 5, maxDepartments: 20 },
        enterprise: { maxUsers: 200, maxBranches: 20, maxDepartments: 50 },
      },
      defaultTheme: 'sunset',
      defaultLanguage: 'az',
    }
  }

  // ── Health — sistem sağlamlığı ──
  async getHealth() {
    const startTime = Date.now()

    // DB ping
    let dbOk = false
    let dbLatency = 0
    try {
      const dbStart = Date.now()
      await this.prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - dbStart
      dbOk = true
    } catch { dbOk = false }

    // Memori
    const mem = process.memoryUsage()
    const memUsedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const memTotalMB = Math.round(mem.heapTotal / 1024 / 1024)

    // Son 1 saat xəta sayı
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [errorsLastHour, errorsLastDay] = await Promise.all([
      this.prisma.adminAuditLog.count({ where: { action: 'error', createdAt: { gte: oneHourAgo } } }),
      this.prisma.adminAuditLog.count({ where: { action: 'error', createdAt: { gte: oneDayAgo } } }),
    ])

    // Yavaş sorğu sayı
    const slowQueries = await this.prisma.adminAuditLog.count({ where: { action: 'slow_query', createdAt: { gte: oneDayAgo } } })

    // Son 5 xəta
    const recentErrors = await this.prisma.adminAuditLog.findMany({
      where: { action: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Ümumi statistika
    const [totalUsers, totalTenants, totalTasks] = await Promise.all([
      this.prisma.user.count({ where: { isSuperAdmin: false } }),
      this.prisma.tenant.count(),
      this.prisma.task.count(),
    ])

    return {
      status: dbOk ? 'healthy' : 'degraded',
      uptime: Math.floor(process.uptime()),
      uptimeFormatted: this.formatUptime(process.uptime()),
      memory: { usedMB: memUsedMB, totalMB: memTotalMB, percent: Math.round((memUsedMB / memTotalMB) * 100) },
      database: { status: dbOk ? 'online' : 'offline', latencyMs: dbLatency },
      errors: { lastHour: errorsLastHour, lastDay: errorsLastDay },
      slowQueries: { lastDay: slowQueries },
      recentErrors: recentErrors.map(e => ({
        id: e.id, createdAt: e.createdAt,
        details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details,
        ip: e.ip,
      })),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        totalUsers, totalTenants, totalTasks,
      },
      responseTime: Date.now() - startTime,
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${d}g ${h}s ${m}d`
  }

  // ── Helper ──
  private async logAction(userId: string, userEmail: string, action: string, details?: string, tenantId?: string) {
    await this.prisma.adminAuditLog.create({
      data: { userId, userEmail, action, details, tenantId },
    })
  }
}
