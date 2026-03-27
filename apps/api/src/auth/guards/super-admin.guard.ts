import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user?.sub) {
      throw new ForbiddenException('Super Admin yetkisi tələb olunur')
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { isSuperAdmin: true },
    })

    if (!dbUser?.isSuperAdmin) {
      throw new ForbiddenException('Super Admin yetkisi tələb olunur')
    }

    return true
  }
}
