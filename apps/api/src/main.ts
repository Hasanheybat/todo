import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { SanitizePipe } from './common/sanitize.pipe'
import { GlobalExceptionFilter } from './common/global-exception.filter'
import { PrismaService } from './prisma/prisma.service'
import { join } from 'path'
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Global xəta tutucu — 500 xətalarını Admin Log-a yazır
  const prisma = app.get(PrismaService)
  app.useGlobalFilters(new GlobalExceptionFilter(prisma))

  // Güvənlik header-ləri
  app.use(helmet({
    contentSecurityPolicy: false, // Frontend ilə uyğunluq üçün
    crossOriginEmbedderPolicy: false,
  }))
  app.getHttpAdapter().getInstance().disable('x-powered-by')

  // Body parser limiti — DoS qoruması
  app.useBodyParser('json', { limit: '1mb' })
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true })

  app.useGlobalPipes(new SanitizePipe(), new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
  })

  // Statik fayl xidməti — yüklənmiş fayllar üçün
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' })

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}`)
}
bootstrap()
