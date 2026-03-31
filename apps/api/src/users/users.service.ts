import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private userBusinessSelect = {
    id: true,
    businessId: true,
    departmentId: true,
    positionTitle: true,
    customRoleId: true,
    salary: true,
    payDay: true,
    startDate: true,
    business: { select: { id: true, name: true } },
    department: { select: { id: true, name: true, color: true } },
    customRole: { select: { id: true, name: true, permissions: true } },
  }

  async create(dto: CreateUserDto, tenantId: string) {
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        parentId: dto.parentId || null,
        customRoleId: dto.customRoleId || null,
        tenantId,
      },
      select: { id: true, fullName: true, email: true, role: true, parentId: true, status: true, createdAt: true },
    })

    // Assignments array varsa onları istifadə et
    if (dto.assignments && dto.assignments.length > 0) {
      for (const assignment of dto.assignments) {
        await this.prisma.userBusiness.create({
          data: {
            userId: user.id,
            businessId: assignment.businessId,
            departmentId: assignment.departmentId || null,
            customRoleId: assignment.customRoleId || null,
            positionTitle: assignment.positionTitle || null,
            salary: assignment.salary ?? null,
            payDay: assignment.payDay ?? null,
            startDate: assignment.startDate ? new Date(assignment.startDate) : new Date(),
          },
        })
      }
    } else if (dto.businessId) {
      // Köhnə format — geriyə uyğunluq
      await this.prisma.userBusiness.create({
        data: {
          userId: user.id,
          businessId: dto.businessId,
          departmentId: dto.departmentId || null,
          customRoleId: dto.customRoleId || null,
        },
      })
    }

    return this.findOne(user.id, tenantId)
  }

  async findAll(tenantId: string, businessId?: string, departmentId?: string) {
    const where: any = { tenantId, isSystemAdmin: false }
    if (businessId || departmentId) {
      where.businesses = {
        some: {
          ...(businessId ? { businessId } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
      }
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, role: true,
        parentId: true, status: true, createdAt: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true } },
        businesses: { select: this.userBusinessSelect },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, fullName: true, email: true, role: true,
        parentId: true, status: true, createdAt: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true } },
        parent: { select: { id: true, fullName: true, role: true } },
        children: { select: { id: true, fullName: true, role: true, status: true } },
        businesses: { select: this.userBusinessSelect },
      },
    })
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı')
    return user
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } })
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı')

    // Əsas sahələri yenilə
    const updateData: any = {}
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName
    if (dto.role !== undefined) updateData.role = dto.role
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId || null
    if (dto.status !== undefined) updateData.status = dto.status
    if (dto.customRoleId !== undefined) updateData.customRoleId = dto.customRoleId || null

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    })

    // Assignments yenilə (əgər göndərilibsə)
    if (dto.assignments !== undefined) {
      // Köhnə assignments sil
      await this.prisma.userBusiness.deleteMany({ where: { userId: id } })

      // Yenilərini yarat
      for (const assignment of dto.assignments) {
        await this.prisma.userBusiness.create({
          data: {
            userId: id,
            businessId: assignment.businessId,
            departmentId: assignment.departmentId || null,
            customRoleId: assignment.customRoleId || null,
            positionTitle: assignment.positionTitle || null,
            salary: assignment.salary ?? null,
            payDay: assignment.payDay ?? null,
            startDate: assignment.startDate ? new Date(assignment.startDate) : new Date(),
          },
        })
      }
    }

    return this.findOne(id, tenantId)
  }

  async remove(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } })
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı')

    // Alt işçiləri varsa silməyə icazə vermə
    const childCount = await this.prisma.user.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new ForbiddenException('Bu istifadəçinin altında işçilər var. Əvvəlcə onları köçürün.')
    }

    await this.prisma.user.delete({ where: { id } })
    return { message: 'İstifadəçi silindi' }
  }

  // Filialları qaytar
  async getBusinesses(tenantId: string) {
    return this.prisma.business.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, logo: true,
        departments: {
          select: {
            department: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  // Ağac ierarxiya — bütün istifadəçiləri ağac formatında qaytar
  async getHierarchy(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isSystemAdmin: false },
      select: {
        id: true, fullName: true, email: true, role: true,
        parentId: true, status: true,
        businesses: {
          select: {
            businessId: true,
            departmentId: true,
            positionTitle: true,
            salary: true,
            payDay: true,
            startDate: true,
            business: { select: { id: true, name: true } },
            department: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Ağac qurma
    const map = new Map<string, any>()
    users.forEach((u) => map.set(u.id, { ...u, children: [] }))

    const roots: any[] = []
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  // Görev ata biləcəyi istifadəçiləri qaytar
  // assign_upward VAR → öz filialları daxilində hər kəs
  // assign_upward YOX → yalnız parentId subordinatları
  async getAssignableUsers(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customRole: { select: { permissions: true } },
        businesses: { select: { businessId: true } },
      },
    })
    if (!user) return []

    const permissions = (user.customRole?.permissions as string[]) || []
    const hasAssignUpward = permissions.includes('tasks.assign_upward')

    let where: any

    if (hasAssignUpward) {
      // Öz filiallarındakı bütün istifadəçilər
      const bizIds = (user.businesses || []).map((b: any) => b.businessId)
      if (bizIds.length === 0) return []
      where = {
        tenantId,
        isSystemAdmin: false,
        id: { not: userId },
        businesses: { some: { businessId: { in: bizIds } } },
      }
    } else {
      // Yalnız subordinatlar
      const subIds = await this.getSubordinateIds(userId, tenantId)
      if (subIds.size === 0) return []
      where = {
        tenantId,
        isSystemAdmin: false,
        id: { in: [...subIds] },
      }
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, role: true,
        parentId: true, status: true,
        customRole: { select: { id: true, name: true, permissions: true } },
        businesses: { select: this.userBusinessSelect },
      },
      orderBy: { fullName: 'asc' },
    })
  }

  // Bir müdirin altındakı bütün işçi ID-lərini Set olaraq qaytar (ierarxiya yoxlaması üçün)
  async getSubordinateIds(userId: string, tenantId: string): Promise<Set<string>> {
    const allUsers = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, parentId: true },
    })

    const subordinateIds = new Set<string>()
    const queue = [userId]

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const u of allUsers) {
        if (u.parentId === current && !subordinateIds.has(u.id)) {
          subordinateIds.add(u.id)
          queue.push(u.id)
        }
      }
    }

    return subordinateIds
  }

  // Bir müdirin altındakı bütün işçiləri qaytar (rekursiv)
  async getSubordinates(userId: string, tenantId: string) {
    const allUsers = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, email: true, role: true, parentId: true, status: true },
    })

    const result: any[] = []
    function collect(parentId: string) {
      for (const u of allUsers) {
        if (u.parentId === parentId) {
          result.push(u)
          collect(u.id)
        }
      }
    }
    collect(userId)
    return result
  }
}
