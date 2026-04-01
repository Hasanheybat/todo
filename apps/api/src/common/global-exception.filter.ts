import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private prisma: PrismaService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest()
    const res = ctx.getResponse()

    // Express body-parser kimi middleware-lər HttpException atmır,
    // amma `status` və ya `statusCode` sahəsi var (məs. 413 PayloadTooLarge)
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : (exception?.status || exception?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR)

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any)?.message || exception.message
      : exception?.message || 'Internal server error'

    // Yalnız 500+ xətaları Admin Log-a yaz
    if (status >= 500) {
      try {
        await this.prisma.adminAuditLog.create({
          data: {
            action: 'error',
            userId: req?.user?.sub || 'system',
            userEmail: req?.user?.email || 'anonymous',
            details: JSON.stringify({
              status,
              path: req?.url,
              method: req?.method,
              message: typeof message === 'string' ? message : JSON.stringify(message),
              stack: exception?.stack?.split('\n').slice(0, 5).join('\n'),
              userAgent: req?.headers?.['user-agent']?.substring(0, 200),
              body: req?.body ? JSON.stringify(req.body).substring(0, 500) : undefined,
            }),
            ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
          },
        })
      } catch {
        // Log yazma xətası sistemi çökdürməsin
        console.error('[GlobalExceptionFilter] Log yazma xətası:', exception?.message)
      }
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: status >= 500 ? 'Internal Server Error' : undefined,
      timestamp: new Date().toISOString(),
      path: req?.url,
    })
  }
}
