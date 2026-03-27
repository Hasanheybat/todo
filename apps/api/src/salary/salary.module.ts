import { Module } from '@nestjs/common'
import { SalaryService } from './salary.service'
import { SalaryController } from './salary.controller'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SalaryController],
  providers: [SalaryService, PermissionsGuard],
  exports: [SalaryService],
})
export class SalaryModule {}
