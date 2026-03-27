import { Injectable, NestMiddleware } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  use(req: any, res: any, next: () => void) {
    const start = Date.now()

    res.on('finish', async () => {
      const duration = Date.now() - start
      const method = req.method
      const path = req.originalUrl || req.url
      const status = res.statusCode

      // Yavaş sorğu (>3 saniyə) → Admin Log-a yaz
      if (duration > 3000) {
        try {
          await this.prisma.adminAuditLog.create({
            data: {
              action: 'slow_query',
              userId: req?.user?.sub || 'system',
              userEmail: req?.user?.email || 'anonymous',
              details: JSON.stringify({ method, path, status, durationMs: duration }),
              ip: req.ip || req.connection?.remoteAddress || 'unknown',
            },
          })
        } catch {}
      }
    })

    next()
  }
}
