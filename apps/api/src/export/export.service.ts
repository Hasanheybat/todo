import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as ExcelJS from 'exceljs'

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportTasks(tenantId: string, userId: string): Promise<Buffer> {
    const tasks = await this.prisma.task.findMany({
      where: { tenantId },
      include: {
        assignees: { include: { user: { select: { fullName: true } } } },
        business: { select: { name: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'WorkFlow Pro'
    wb.created = new Date()

    const ws = wb.addWorksheet('Tapşırıqlar')

    // Header style
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      },
    }

    ws.columns = [
      { header: '#', key: 'no', width: 5 },
      { header: 'Başlıq', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Prioritet', key: 'priority', width: 12 },
      { header: 'İşçi', key: 'assignee', width: 20 },
      { header: 'İşletmə', key: 'business', width: 18 },
      { header: 'Yaradıcı', key: 'creator', width: 18 },
      { header: 'Son tarix', key: 'dueDate', width: 14 },
      { header: 'Yaradılıb', key: 'createdAt', width: 14 },
    ]

    // Apply header style
    ws.getRow(1).eachCell(cell => { Object.assign(cell, { style: headerStyle }) })
    ws.getRow(1).height = 28

    const statusMap: Record<string, string> = {
      CREATED: 'Yaradıldı', PENDING: 'Gözləyir', IN_PROGRESS: 'Davam edir',
      COMPLETED: 'Tamamlandı', PENDING_APPROVAL: 'Onay gözləyir',
      APPROVED: 'Onaylandı', REJECTED: 'Rədd', DECLINED: 'Rədd edildi',
      FORCE_COMPLETED: 'Bağlandı',
    }

    const priorityMap: Record<string, string> = {
      CRITICAL: 'Kritik', HIGH: 'Yüksək', MEDIUM: 'Orta', LOW: 'Aşağı', INFO: 'Məlumat',
    }

    tasks.forEach((task, i) => {
      const row = ws.addRow({
        no: i + 1,
        title: task.title,
        status: statusMap[task.status] || task.status,
        priority: priorityMap[task.priority] || task.priority,
        assignee: task.assignees?.map(a => a.user?.fullName).filter(Boolean).join(', ') || '-',
        business: task.business?.name || '-',
        creator: task.creator?.fullName || '-',
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('az-AZ') : '-',
        createdAt: new Date(task.createdAt).toLocaleDateString('az-AZ'),
      })

      // Zebra striping
      if (i % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
        })
      }
    })

    // Auto-filter
    ws.autoFilter = { from: 'A1', to: `I${tasks.length + 1}` }

    const buffer = await wb.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  async exportFinance(tenantId: string): Promise<Buffer> {
    const transactions = await this.prisma.transaction.findMany({
      where: { tenantId },
      include: {
        category: { select: { name: true } },
        business: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'WorkFlow Pro'
    wb.created = new Date()

    const ws = wb.addWorksheet('Maliyyə')

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      },
    }

    ws.columns = [
      { header: '#', key: 'no', width: 5 },
      { header: 'Tarix', key: 'date', width: 14 },
      { header: 'Növ', key: 'type', width: 10 },
      { header: 'Məbləğ', key: 'amount', width: 14 },
      { header: 'Kateqoriya', key: 'category', width: 18 },
      { header: 'Təsvir', key: 'description', width: 35 },
      { header: 'İşletmə', key: 'business', width: 18 },
      { header: 'Əlavə edən', key: 'createdBy', width: 18 },
    ]

    ws.getRow(1).eachCell(cell => { Object.assign(cell, { style: headerStyle }) })
    ws.getRow(1).height = 28

    let totalDebit = 0
    let totalCredit = 0

    transactions.forEach((tx, i) => {
      if (tx.type === 'DEBIT') totalDebit += Number(tx.amount)
      else totalCredit += Number(tx.amount)

      const row = ws.addRow({
        no: i + 1,
        date: new Date(tx.date).toLocaleDateString('az-AZ'),
        type: tx.type === 'DEBIT' ? 'Gəlir' : 'Xərc',
        amount: Number(tx.amount).toFixed(2),
        category: tx.category?.name || '-',
        description: tx.description || '-',
        business: tx.business?.name || '-',
        createdBy: tx.createdBy?.fullName || '-',
      })

      // Color code debit/credit
      const amountCell = row.getCell('amount')
      amountCell.font = { bold: true, color: { argb: tx.type === 'DEBIT' ? 'FF059669' : 'FFDC2626' } }

      if (i % 2 === 1) {
        row.eachCell(cell => {
          if (!cell.font?.color) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
        })
      }
    })

    // Summary row
    const summaryRow = ws.addRow({})
    ws.addRow({})
    const totalsRow = ws.addRow({
      no: '', date: '', type: 'CƏMİ',
      amount: '', category: '', description: '', business: '', createdBy: '',
    })
    totalsRow.getCell('type').font = { bold: true, size: 12 }

    const debitRow = ws.addRow({ no: '', date: '', type: 'Gəlir:', amount: totalDebit.toFixed(2) })
    debitRow.getCell('amount').font = { bold: true, color: { argb: 'FF059669' } }

    const creditRow = ws.addRow({ no: '', date: '', type: 'Xərc:', amount: totalCredit.toFixed(2) })
    creditRow.getCell('amount').font = { bold: true, color: { argb: 'FFDC2626' } }

    const balanceRow = ws.addRow({ no: '', date: '', type: 'Balans:', amount: (totalDebit - totalCredit).toFixed(2) })
    balanceRow.getCell('amount').font = { bold: true, size: 12 }

    ws.autoFilter = { from: 'A1', to: `H${transactions.length + 1}` }

    const buffer = await wb.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}
