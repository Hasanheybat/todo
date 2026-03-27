import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; color?: string }, tenantId: string) {
    return this.prisma.department.create({ data: { name: data.name, color: data.color || '#246FE0', tenantId } })
  }

  async findAll(tenantId: string, businessId?: string) {
    if (businessId) {
      // Filial bazalı: yalnız o filiala bağlı şöbələr
      const links = await this.prisma.businessDepartment.findMany({
        where: { businessId, department: { tenantId } },
        include: { department: { include: { _count: { select: { tasks: true } } } } },
        orderBy: { department: { name: 'asc' } },
      })
      return links.map(l => l.department)
    }
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async assignToBusiness(businessId: string, departmentId: string) {
    return this.prisma.businessDepartment.create({
      data: { businessId, departmentId },
    })
  }

  async unassignFromBusiness(businessId: string, departmentId: string) {
    return this.prisma.businessDepartment.delete({
      where: { businessId_departmentId: { businessId, departmentId } },
    })
  }

  async remove(id: string, tenantId: string) {
    const dep = await this.prisma.department.findFirst({ where: { id, tenantId } })
    if (!dep) throw new NotFoundException('Departament tapılmadı')
    await this.prisma.department.delete({ where: { id } })
    return { message: 'Departament silindi' }
  }
}
