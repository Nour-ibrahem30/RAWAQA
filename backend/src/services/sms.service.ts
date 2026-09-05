import { Vonage } from '@vonage/server-sdk';
import { env } from '../config/env';
import { logInfo, logError } from '../config/logger';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS Service using Vonage (formerly Nexmo)
 * Handles sending SMS notifications
 */
class SMSService {
  private vonage: Vonage | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Vonage client
   */
  private initialize(): void {
    try {
      if (!env.VONAGE_API_KEY || !env.VONAGE_API_SECRET) {
        logError('Vonage credentials not configured', new Error('Missing Vonage credentials'));
        this.isConfigured = false;
        return;
      }

      this.vonage = new Vonage({
        apiKey: env.VONAGE_API_KEY,
        apiSecret: env.VONAGE_API_SECRET,
      });

      this.isConfigured = true;
      logInfo('SMS service initialized successfully');
    } catch (error) {
      logError('Failed to initialize SMS service', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured || !this.vonage) {
      logError('SMS service not configured', new Error('SMS service not initialized'));
      return {
        success: false,
        error: 'SMS service not configured',
      };
    }

    try {
      // Normalize phone number (add country code if missing)
      const normalizedPhone = this.normalizePhoneNumber(to);

      const result = await this.vonage.sms.send({
        to: normalizedPhone,
        from: env.VONAGE_FROM_NUMBER || 'RAWAQA',
        text: message,
      });

      if (result.messages && result.messages[0] && result.messages[0].status === '0') {
        logInfo(`SMS sent successfully to ${normalizedPhone}`);
        return {
          success: true,
          messageId: result.messages[0].messageId,
        };
      } else {
        const errorText = result.messages?.[0]?.errorText || 'Unknown error';
        logError(`SMS failed: ${errorText}`, new Error(errorText));
        return {
          success: false,
          error: errorText,
        };
      }
    } catch (error) {
      logError('Failed to send SMS', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(phone: string, orderNumber: string, total: number): Promise<SMSResult> {
    const messageAr = `شكراً لطلبك من روقة! رقم الطلب: ${orderNumber}، المبلغ: ${total} جنيه. سنتواصل معك قريباً.`;
    
    // Send Arabic message (primary)
    return this.sendSMS(phone, messageAr);
  }

  /**
   * Send order shipped SMS
   */
  async sendOrderShipped(
    phone: string,
    orderNumber: string,
    trackingNumber?: string
  ): Promise<SMSResult> {
    const trackingInfo = trackingNumber ? ` رقم التتبع: ${trackingNumber}` : '';
    const messageAr = `تم شحن طلبك ${orderNumber}!${trackingInfo} سيصلك خلال 2-5 أيام عمل.`;
    
    return this.sendSMS(phone, messageAr);
  }

  /**
   * Send order delivered SMS
   */
  async sendOrderDelivered(phone: string, orderNumber: string): Promise<SMSResult> {
    const messageAr = `تم توصيل طلبك ${orderNumber} بنجاح! نتمنى أن تستمتع بمنتجات روقة. شكراً لثقتك!`;
    
    return this.sendSMS(phone, messageAr);
  }

  /**
   * Send order cancelled SMS
   */
  async sendOrderCancelled(phone: string, orderNumber: string): Promise<SMSResult> {
    const messageAr = `تم إلغاء طلبك ${orderNumber}. للاستفسارات، تواصل معنا.`;
    
    return this.sendSMS(phone, messageAr);
  }

  /**
   * Send OTP (One-Time Password)
   */
  async sendOTP(phone: string, otp: string): Promise<SMSResult> {
    const messageAr = `رمز التحقق من روقة: ${otp}. صالح لمدة 5 دقائق.`;
    
    return this.sendSMS(phone, messageAr);
  }

  /**
   * Normalize Egyptian phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and parentheses
    let normalized = phone.replace(/[\s\-()]/g, '');

    // If starts with 0, replace with +20 (Egypt country code)
    if (normalized.startsWith('0')) {
      normalized = '+20' + normalized.substring(1);
    }

    // If doesn't start with +, add +20
    if (!normalized.startsWith('+')) {
      normalized = '+20' + normalized;
    }

    return normalized;
  }

  /**
   * Test SMS service
   */
  async testService(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // Send test message to configured test number
      const testNumber = env.SMS_TEST_NUMBER || '+201234567890';
      const result = await this.sendSMS(testNumber, 'RAWAQA SMS Service Test');
      return result.success;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();
