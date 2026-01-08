/**
 * Email Service using Resend
 *
 * Handles all transactional emails with branded React Email templates.
 */

import { Resend } from 'resend';

// Types
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SignupConfirmationData {
  userName: string;
  confirmationUrl: string;
}

export interface PasswordResetData {
  userName: string;
  resetUrl: string;
}

export interface PaymentConfirmationData {
  userName: string;
  orderName: string;
  amount: number;
  paymentMethod: string;
  receiptUrl?: string;
  analysisId: string;
  analysisType: 'jeonse_safety' | 'wolse_price' | 'wolse_safety';
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'support@krent-safety.com';
  }

  /**
   * Core send method
   */
  async sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `K-Rent Safety <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('Email sent successfully:', data?.id);
      return { success: true, id: data?.id };
    } catch (error) {
      console.error('Email send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send signup confirmation email
   */
  async sendSignupConfirmation(
    to: string,
    data: SignupConfirmationData
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { renderSignupConfirmation } = await import(
      '../emails/signup-confirmation'
    );
    const html = await renderSignupConfirmation(data);

    return this.sendEmail({
      to,
      subject: 'Confirm Your K-Rent Safety Account',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    data: PasswordResetData
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { renderPasswordReset } = await import('../emails/password-reset');
    const html = await renderPasswordReset(data);

    return this.sendEmail({
      to,
      subject: 'Reset Your K-Rent Safety Password',
      html,
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    to: string,
    data: PaymentConfirmationData
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { renderPaymentConfirmation } = await import(
      '../emails/payment-confirmation'
    );
    const html = await renderPaymentConfirmation(data);

    return this.sendEmail({
      to,
      subject: `Payment Confirmed - ${data.orderName}`,
      html,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
