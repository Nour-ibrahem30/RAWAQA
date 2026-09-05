/**
 * Email Service — Nodemailer
 * Supports SMTP (Gmail, SendGrid, Mailgun) via env variables
 * Falls back to console log in development when no SMTP configured
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logInfo, logError } from '../config/logger';

interface EmailResult {
  success:   boolean;
  messageId?: string;
  error?:    string;
}

// ─── HTML templates ───────────────────────────────────────────────────────────

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body  { font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:0; direction:rtl; }
    .wrap { max-width:600px; margin:30px auto; background:#fff; border-radius:8px; overflow:hidden; }
    .hdr  { background:#1a1a2e; color:#fff; padding:24px 32px; }
    .hdr h1 { margin:0; font-size:24px; }
    .body { padding:32px; color:#333; line-height:1.6; }
    .btn  { display:inline-block; background:#e94560; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:bold; margin-top:16px; }
    .row  { display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:8px 0; }
    .ftr  { background:#f5f5f5; color:#888; font-size:12px; padding:16px 32px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><h1>🛋️ روقة</h1></div>
    <div class="body">${content}</div>
    <div class="ftr">© 2026 روقة. جميع الحقوق محفوظة.</div>
  </div>
</body>
</html>`;

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER) {
      logInfo('Email service: no SMTP config — emails will be logged to console in dev');
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    this.isConfigured = true;
    logInfo('Email service initialized');
  }

  // ─── Core send method ───────────────────────────────────────────────────────
  async send(params: {
    to:      string;
    subject: string;
    html:    string;
    text?:   string;
  }): Promise<EmailResult> {
    if (!this.isConfigured || !this.transporter) {
      // Development fallback
      if (env.NODE_ENV === 'development') {
        logInfo(`[EMAIL DEV] To: ${params.to} | Subject: ${params.subject}`);
        return { success: true, messageId: 'dev-mock' };
      }
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from:    `"روقة" <${env.SMTP_FROM || env.SMTP_USER}>`,
        to:      params.to,
        subject: params.subject,
        html:    params.html,
        text:    params.text,
      });

      logInfo(`Email sent to ${params.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logError('Email send failed', err);
      return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
    }
  }

  // ─── Order confirmation ─────────────────────────────────────────────────────
  async sendOrderConfirmation(params: {
    email:       string;
    firstName:   string;
    orderNumber: string;
    total:       number;
    items:       { nameAr: string; quantity: number; price: number }[];
  }): Promise<EmailResult> {
    const itemsHtml = params.items
      .map(i => `<div class="row"><span>${i.nameAr} × ${i.quantity}</span><span>${i.price * i.quantity} جنيه</span></div>`)
      .join('');

    const html = baseTemplate(`
      <p>مرحباً ${params.firstName}،</p>
      <p>تم استلام طلبك بنجاح! رقم الطلب: <strong>${params.orderNumber}</strong></p>
      <h3 style="margin-top:24px">تفاصيل الطلب</h3>
      ${itemsHtml}
      <div class="row" style="font-weight:bold">
        <span>الإجمالي</span>
        <span>${params.total} جنيه</span>
      </div>
      <p style="margin-top:16px">سنرسل لك رسالة نصية عند شحن طلبك.</p>
    `);

    return this.send({
      to:      params.email,
      subject: `تأكيد الطلب #${params.orderNumber} — روقة`,
      html,
      text:    `تم استلام طلبك ${params.orderNumber} بنجاح. الإجمالي: ${params.total} جنيه`,
    });
  }

  // ─── Order shipped ──────────────────────────────────────────────────────────
  async sendOrderShipped(params: {
    email:          string;
    firstName:      string;
    orderNumber:    string;
    trackingNumber?: string;
  }): Promise<EmailResult> {
    const tracking = params.trackingNumber
      ? `<p>رقم التتبع: <strong>${params.trackingNumber}</strong></p>` : '';

    const html = baseTemplate(`
      <p>مرحباً ${params.firstName}،</p>
      <p>تم شحن طلبك <strong>${params.orderNumber}</strong> وهو في طريقه إليك!</p>
      ${tracking}
      <p>سيصلك خلال 2-5 أيام عمل.</p>
    `);

    return this.send({
      to:      params.email,
      subject: `تم شحن طلبك #${params.orderNumber} — روقة`,
      html,
      text:    `تم شحن طلبك ${params.orderNumber}. ${params.trackingNumber ? 'رقم التتبع: ' + params.trackingNumber : ''}`,
    });
  }

  // ─── Password reset OTP ─────────────────────────────────────────────────────
  async sendPasswordResetOTP(params: {
    email:     string;
    firstName: string;
    otp:       string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <p>مرحباً ${params.firstName}،</p>
      <p>طلبت إعادة تعيين كلمة المرور. استخدم الرمز التالي:</p>
      <div style="font-size:36px; font-weight:bold; letter-spacing:8px; text-align:center; padding:24px; background:#f5f5f5; border-radius:8px; margin:16px 0;">
        ${params.otp}
      </div>
      <p>صالح لمدة 5 دقائق. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
    `);

    return this.send({
      to:      params.email,
      subject: 'رمز إعادة تعيين كلمة المرور — روقة',
      html,
      text:    `رمز إعادة تعيين كلمة المرور: ${params.otp} (صالح 5 دقائق)`,
    });
  }
}

export const emailService = new EmailService();
