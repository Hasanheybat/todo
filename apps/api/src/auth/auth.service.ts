import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('Bu e-poçt artıq qeydiyyatdadır')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10)

    // Tenant yaradılır
    const tenant = await this.prisma.tenant.create({
      data: { name: dto.companyName },
    })

    // İstifadəçi yaradılır (Tenant Admin)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        role: 'TENANT_ADMIN',
        tenantId: tenant.id,
      },
    })

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId)
    await this.updateRefreshToken(user.id, tokens.refreshToken)

    return {
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, tenantId: user.tenantId, parentId: user.parentId,
        customRoleId: user.customRoleId, status: user.status,
      },
      ...tokens,
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, role: true,
        tenantId: true, parentId: true, customRoleId: true, status: true,
        businesses: {
          include: {
            business: { select: { id: true, name: true } },
            department: { select: { id: true, name: true, color: true } },
            customRole: { select: { id: true, name: true, permissions: true } },
          },
        },
        customRole: { select: { id: true, name: true, permissions: true } },
      },
    })
    if (!user) throw new UnauthorizedException('İstifadəçi tapılmadı')
    return user
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        customRole: { select: { id: true, name: true, permissions: true } },
        businesses: {
          include: {
            business: { select: { id: true, name: true } },
            department: { select: { id: true, name: true, color: true } },
            customRole: { select: { id: true, name: true, permissions: true } },
          },
        },
      },
    })
    if (!user) {
      // Timing attack qoruması — bcrypt vaxtını simülyasiya et
      await bcrypt.compare(dto.password, '$2b$10$dummyhashfortimingattak000000000000000000000000000')
      throw new UnauthorizedException('E-poçt və ya şifrə yanlışdır')
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password)
    if (!passwordMatch) {
      throw new UnauthorizedException('E-poçt və ya şifrə yanlışdır')
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Hesabınız deaktiv edilib')
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId)
    await this.updateRefreshToken(user.id, tokens.refreshToken)

    return {
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, tenantId: user.tenantId, parentId: user.parentId,
        customRoleId: user.customRoleId, customRole: user.customRole,
        businesses: user.businesses, status: user.status,
      },
      ...tokens,
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    })
    return { message: 'Çıxış edildi' }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Giriş tələb olunur')
    }

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken)
    if (!tokenMatch) {
      throw new UnauthorizedException('Token etibarsızdır')
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId)
    await this.updateRefreshToken(user.id, tokens.refreshToken)
    return tokens
  }

  private async generateTokens(userId: string, email: string, role: string, tenantId: string) {
    const payload = { sub: userId, email, role, tenantId }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ])

    return { accessToken, refreshToken }
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    })
  }
}
