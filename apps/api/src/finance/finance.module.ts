import { Module } from '@nestjs/common'
import { FinanceService } from './finance.service'
import { FinanceController } from './finance.controller'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FinanceController],
  providers: [FinanceService, PermissionsGuard],
  exports: [FinanceService],
})
export class FinanceModule {}
