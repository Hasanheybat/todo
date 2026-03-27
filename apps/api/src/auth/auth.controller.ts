import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, BadRequestException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  // Rate limiting — IP bazalı
  private attempts = new Map<string, { count: number; resetAt: number }>()

  constructor(private authService: AuthService) {}

  private checkRate(key: string, maxAttempts: number, windowMs: number) {
    const now = Date.now()
    const record = this.attempts.get(key)
    if (record && now < record.resetAt) {
      if (record.count >= maxAttempts) {
        const waitSec = Math.ceil((record.resetAt - now) / 1000)
        throw new BadRequestException(`Çox sayda cəhd. ${waitSec} saniyə gözləyin.`)
      }
      record.count++
    } else {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs })
    }
  }

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    this.checkRate(`register:${ip}`, 3, 10 * 60 * 1000) // 10 dəqiqədə max 3 register
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    this.checkRate(`login:${ip}`, 50, 5 * 60 * 1000) // 5 dəqiqədə max 50 login cəhdi
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.authService.getMe(req.user.sub)
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.sub)
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  refresh(@Req() req: any) {
    return this.authService.refreshTokens(req.user.sub, req.user.refreshToken)
  }
}
