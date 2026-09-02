/**
 * Email Service
 * 
 * Handles all email communications:
 * - Verification emails
 * - Password reset
 * - Load notifications
 * - Payment confirmations
 * - Trip updates
 * - Marketing emails
 */

import nodemailer from 'nodemailer';
import { logger } from '../config/logger';
import { database } from '../config/database';

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });

  return transporter;
}

export const emailService = {
  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email/${token}`;

    await this.send({
      to: email,
      subject: 'Verify Your FreightConnect Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚛 FreightConnect</h1>
              <p>Welcome to the future of freight dispatching</p>
            </div>
            <div class="content">
              <h2>Verify Your Email</h2>
              <p>Thank you for joining FreightConnect! Please click the button below to verify your email address:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>Or copy this link: ${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FreightConnect. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logger.info(`Verification email sent to: ${email}`);
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${token}`;

    await this.send({
      to: email,
      subject: 'Reset Your FreightConnect Password',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
          <div style="background:#667eea;color:white;padding:30px;text-align:center;">
            <h1>🚛 FreightConnect</h1>
          </div>
          <div style="padding:30px;background:#f9f9f9;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" style="display:inline-block;background:#667eea;color:white;padding:14px 30px;text-decoration:none;border-radius:5px;margin:20px 0;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email or contact support.</p>
          </div>
        </div>
      `,
    });

    logger.info(`Password reset email sent to: ${email}`);
  },

  /**
   * Send load notification to matching truckers
   */
  async sendLoadNotification(truckerEmails: string[], loadDetails: any): Promise<void> {
    const promises = truckerEmails.map((email) =>
      this.send({
        to: email,
        subject: `New Load Available: ${loadDetails.referenceNumber}`,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
            <h2>📦 New Load Available</h2>
            <div style="background:#f5f5f5;padding:20px;border-radius:8px;">
              <p><strong>Reference:</strong> ${loadDetails.referenceNumber}</p>
              <p><strong>From:</strong> ${loadDetails.pickupCity}, ${loadDetails.pickupState}</p>
              <p><strong>To:</strong> ${loadDetails.deliveryCity}, ${loadDetails.deliveryState}</p>
              <p><strong>Rate:</strong> $${loadDetails.rate}</p>
              <p><strong>Distance:</strong> ${loadDetails.distance} miles</p>
              <p><strong>Pickup:</strong> ${new Date(loadDetails.pickupDate).toLocaleDateString()}</p>
            </div>
            <a href="${process.env.APP_URL}/loads/${loadDetails.id}" style="display:inline-block;background:#667eea;color:white;padding:14px 30px;text-decoration:none;border-radius:5px;margin:20px 0;">View Load</a>
          </div>
        `,
      })
    );

    await Promise.allSettled(promises);
  },

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(email: string, payment: any): Promise<void> {
    await this.send({
      to: email,
      subject: `Payment ${payment.status === 'completed' ? 'Completed' : 'Update'}: ${payment.id}`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
          <h2>💰 Payment Update</h2>
          <div style="background:#f5f5f5;padding:20px;border-radius:8px;">
            <p><strong>Amount:</strong> ${payment.currency} ${payment.amount.toFixed(2)}</p>
            <p><strong>Status:</strong> ${payment.status}</p>
            <p><strong>Type:</strong> ${payment.type}</p>
            ${payment.description ? `<p><strong>Description:</strong> ${payment.description}</p>` : ''}
          </div>
        </div>
      `,
    });
  },

  /**
   * Send trip status update
   */
  async sendTripUpdate(email: string, trip: any): Promise<void> {
    await this.send({
      to: email,
      subject: `Trip Update: ${trip.referenceNumber}`,
      text: `Trip status updated to: ${trip.status}\n\nTrack your shipment: ${process.env.APP_URL}/trips/${trip.id}`,
    });
  },

  /**
   * Send generic email
   */
  async send(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: any[];
  }): Promise<void> {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'FreightConnect <noreply@freightconnect.com>',
        ...options,
      });
    } catch (error) {
      logger.error('Failed to send email:', { to: options.to, error });
      // Don't throw - email failures shouldn't break the app
    }
  },

  /**
   * Send bulk emails (for marketing)
   */
  async sendBulk(emails: string[], template: any): Promise<void> {
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((email) => this.send({ to: email, ...template }))
      );
      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  },
};
