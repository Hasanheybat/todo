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

  // Mövcud bütün permission-ları qaytar
  getPermissions() {
    return ALL_PERMISSIONS
  }
}
