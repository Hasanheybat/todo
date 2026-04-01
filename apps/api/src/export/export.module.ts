import { Module } from '@nestjs/common'
import { ExportController } from './export.controller'
import { ExportService } from './export.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
