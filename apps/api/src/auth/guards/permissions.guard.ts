import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../prisma/prisma.service'

export const PERMISSIONS_KEY = 'permissions'
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )
    // Əgər permission tələb olunmursa — keç
    if (!requiredPermissions || requiredPermissions.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const user = request.user
    if (!user?.sub) throw new ForbiddenException('İcazə yoxdur')

    // İstifadəçinin customRole + business-level role-larını tap
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        customRole: { select: { permissions: true } },
        businesses: { include: { customRole: { select: { permissions: true } } } },
      },
    })

    // User-level permissions
    const userPerms = (dbUser?.customRole?.permissions as string[]) || []

    // Business-level permissions (bütün təyinatlardan)
    const bizPerms: string[] = []
    for (const biz of dbUser?.businesses || []) {
      const perms = biz.customRole?.permissions as string[] || []
      bizPerms.push(...perms)
    }

    // Birləşdir (unique)
    const allPermissions = [...new Set([...userPerms, ...bizPerms])]

    if (allPermissions.length === 0) {
      throw new ForbiddenException('İcazə yoxdur — rol təyin edilməyib')
    }

    // Permission yoxlaması: "|" ilə ayrılanlar OR, qalanlar AND
    // Məsələn: @RequirePermissions('gorev.create|gorev.approve') → birindən biri yetər
    const hasAll = requiredPermissions.every(p => {
      if (p.includes('|')) {
        // OR: ən az birinin olması yetər
        return p.split('|').some(alt => allPermissions.includes(alt.trim()))
      }
      return allPermissions.includes(p)
    })
    if (!hasAll) {
      throw new ForbiddenException(`Bu əməliyyat üçün icazəniz yoxdur. Tələb olunan: ${requiredPermissions.join(', ')}`)
    }

    return true
  }
}
