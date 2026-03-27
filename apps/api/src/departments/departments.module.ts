import { Module } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { DepartmentsController } from './departments.controller'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PermissionsGuard],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
