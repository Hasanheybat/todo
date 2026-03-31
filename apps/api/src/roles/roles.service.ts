import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoleDto, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './dto/create-role.dto'

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // Tenant üçün default rolları yarat (yoxdursa)
  async ensureDefaults(tenantId: string) {
    for (const [name, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await this.prisma.customRole.findUnique({
        where: { tenantId_name: { tenantId, name } },
      })
      if (!existing) {
        await this.prisma.customRole.create({
          data: { name, description: `Default rol: ${name}`, permissions: [...permissions], isDefault: true, tenantId },
        })
      }
    }
  }

  async create(dto: CreateRoleDto, tenantId: string) {
    const existing = await this.prisma.customRole.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    })
    if (existing) throw new ConflictException('Bu adda rol artıq mövcuddur')

    // Tenant allowedPermissions yoxlaması
    await this.validatePermissionsAgainstTenant(dto.permissions, tenantId)

    return this.prisma.customRole.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        tenantId,
      },
    })
  }

  async findAll(tenantId: string) {
    // Default rolları əvvəlcə yarat (yoxdursa)
    await this.ensureDefaults(tenantId)

    return this.prisma.customRole.findMany({
      where: { tenantId },
      include: { _count: { select: { users: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async findOne(id: string, tenantId: string) {
    const role = await this.prisma.customRole.findFirst({
      where: { id, tenantId },
      include: {
        users: { select: { id: true, fullName: true, email: true } },
      },
    })
    if (!role) throw new NotFoundException('Rol tapılmadı')
    return role
  }

  async update(id: string, dto: Partial<CreateRoleDto>, tenantId: string) {
    const role = await this.prisma.customRole.findFirst({ where: { id, tenantId } })
    if (!role) throw new NotFoundException('Rol tapılmadı')

    // Tenant allowedPermissions yoxlaması
    if (dto.permissions) {
      await this.validatePermissionsAgainstTenant(dto.permissions, tenantId)
    }

    // Default rolun adını dəyişmək olmaz
    const data: any = {
      description: dto.description,
      permissions: dto.permissions,
    }
    if (!role.isDefault) {
      data.name = dto.name
    }

    return this.prisma.customRole.update({ where: { id }, data })
  }

  async remove(id: string, tenantId: string) {
    const role = await this.prisma.customRole.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new NotFoundException('Rol tapılmadı')
    if (role.isDefault) throw new ForbiddenException('Default rolları silmək olmaz')
    if (role._count.users > 0) {
      throw new ConflictException(`Bu rola ${role._count.users} istifadəçi bağlıdır. Əvvəlcə onları köçürün.`)
    }

    await this.prisma.customRole.delete({ where: { id } })
    return { message: 'Rol silindi' }
  }

  // Bir istifadəçiyə xüsusi rol təyin et
  async assignRole(userId: string, roleId: string, tenantId: string) {
    const role = await this.prisma.customRole.findFirst({ where: { id: roleId, tenantId } })
    if (!role) throw new NotFoundException('Rol tapılmadı')

    return this.prisma.user.update({
      where: { id: userId },
      data: { customRoleId: roleId },
      select: { id: true, fullName: true, customRoleId: true },
    })
  }

  // Tenant-ın icazə verdiyi yetkiləri yoxla
  private async validatePermissionsAgainstTenant(permissions: string[], tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { allowedPermissions: true } })
    if (!tenant) throw new NotFoundException('Tenant tapılmadı')

    // allowedPermissions boşdursa limit yoxdur (köhnə tenant-lar üçün geriyə uyğunluq)
    if (tenant.allowedPermissions.length === 0) return

    const allowed = new Set(tenant.allowedPermissions)
    const forbidden = permissions.filter(p => !allowed.has(p))
    if (forbidden.length > 0) {
      throw new ForbiddenException(`Bu yetkililər işletmənizin planına daxil deyil: ${forbidden.join(', ')}`)
    }
  }

  // Tenant-ın icazə verdiyi yetkiləri qaytar (frontend üçün)
  async getAllowedPermissions(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { allowedPermissions: true } })
    if (!tenant) throw new NotFoundException('Tenant tapılmadı')
    // Boşdursa hamısını qaytar (geriyə uyğunluq)
    return tenant.allowedPermissions.length > 0 ? tenant.allowedPermissions : ALL_PERMISSIONS
  }

  // Mövcud bütün permission-ları qaytar
  getPermissions() {
    return ALL_PERMISSIONS
  }
}
