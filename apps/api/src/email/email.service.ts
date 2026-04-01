import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter
  private readonly logger = new Logger(EmailService.name)
  private readonly enabled: boolean

  constructor(private config: ConfigService) {
    const host = this.config.get('SMTP_HOST')
    const port = this.config.get('SMTP_PORT')
    const user = this.config.get('SMTP_USER')
    const pass = this.config.get('SMTP_PASS')

    this.enabled = !!(host && user && pass)

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      })
      this.logger.log('Email service aktiv')
    } else {
      this.logger.warn('SMTP konfiqurasiya olunmayib — e-poct gonderilmeyecek')
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.enabled) {
      this.logger.debug(`Email skip (SMTP konfiq yox): ${to} — ${subject}`)
      return
    }
    try {
      const from = this.config.get('SMTP_FROM') || this.config.get('SMTP_USER')
      await this.transporter.sendMail({ from: `WorkFlow Pro <${from}>`, to, subject, html })
      this.logger.log(`Email gonderildi: ${to} — ${subject}`)
    } catch (err) {
      this.logger.error(`Email gonderile bilmedi: ${to}`, err)
    }
  }

  async sendTaskReminder(to: string, userName: string, taskTitle: string, dueDate: string) {
    const subject = `Tapshiriq xatirlatmasi: ${taskTitle}`
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 12px; padding: 20px 24px; color: white; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">WorkFlow Pro</h2>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Tapshiriq xatirlatmasi</p>
        </div>
        <p style="color: #334155; font-size: 14px;">Salam <strong>${userName}</strong>,</p>
        <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #F59E0B;">
          <p style="margin: 0; font-weight: 600; color: #1E293B;">${taskTitle}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #64748B;">Son tarix: <strong>${dueDate}</strong></p>
        </div>
        <p style="color: #64748B; font-size: 13px;">Bu tapshiriqin son tarixi yaxinlashir. Zehmet olmasa vaxtinda tamamlayin.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">WorkFlow Pro — Ish proseslerinin idaresi</p>
      </div>
    `
    await this.sendMail(to, subject, html)
  }

  async sendTaskAssigned(to: string, userName: string, taskTitle: string, creatorName: string) {
    const subject = `Yeni tapshiriq: ${taskTitle}`
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 12px; padding: 20px 24px; color: white; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">WorkFlow Pro</h2>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Yeni tapshiriq</p>
        </div>
        <p style="color: #334155; font-size: 14px;">Salam <strong>${userName}</strong>,</p>
        <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3B82F6;">
          <p style="margin: 0; font-weight: 600; color: #1E293B;">${taskTitle}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #64748B;">Yaradan: <strong>${creatorName}</strong></p>
        </div>
        <p style="color: #64748B; font-size: 13px;">Size yeni tapshiriq teyin edildi. Zehmet olmasa nezden kecirin.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">WorkFlow Pro — Ish proseslerinin idaresi</p>
      </div>
    `
    await this.sendMail(to, subject, html)
  }

  async sendTaskCompleted(to: string, userName: string, taskTitle: string, completedBy: string) {
    const subject = `Tapshiriq tamamlandi: ${taskTitle}`
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #059669, #10B981); border-radius: 12px; padding: 20px 24px; color: white; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">WorkFlow Pro</h2>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Tapshiriq tamamlandi</p>
        </div>
        <p style="color: #334155; font-size: 14px;">Salam <strong>${userName}</strong>,</p>
        <div style="background: #ECFDF5; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #10B981;">
          <p style="margin: 0; font-weight: 600; color: #1E293B;">${taskTitle}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #64748B;">Tamamlayan: <strong>${completedBy}</strong></p>
        </div>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">WorkFlow Pro — Ish proseslerinin idaresi</p>
      </div>
    `
    await this.sendMail(to, subject, html)
  }
}
