/**
 * SMS Service
 * 
 * Handles SMS communications using Twilio:
 * - Verification codes
 * - Load alerts
 * - Trip updates
 * - Payment notifications
 */

import { logger } from '../config/logger';

let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  try {
    const twilio = require('twilio');
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    logger.warn('Twilio not configured, using mock SMS service');
    twilioClient = null;
  }

  return twilioClient;
}

export const smsService = {
  /**
   * Send SMS
   */
  async send(to: string, body: string): Promise<void> {
    const client = getTwilioClient();

    if (!client) {
      // Mock for development
      logger.info(`[MOCK SMS] To: ${to} | Body: ${body}`);
      return;
    }

    try {
      await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    } catch (error) {
      logger.error('Failed to send SMS:', { to, error });
    }
  },

  /**
   * Send verification code
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await this.send(
      phone,
      `Your FreightConnect verification code is: ${code}\nValid for 10 minutes.`
    );
  },

  /**
   * Send load alert
   */
  async sendLoadAlert(phone: string, load: any): Promise<void> {
    await this.send(
      phone,
      `🚛 New Load Alert!\nFrom: ${load.pickupCity}\nTo: ${load.deliveryCity}\nRate: $${load.rate}\nReply YES to view details.`
    );
  },

  /**
   * Send trip status update
   */
  async sendTripUpdate(phone: string, trip: any): Promise<void> {
    await this.send(
      phone,
      `Trip ${trip.referenceNumber} status: ${trip.status}\nTrack: ${process.env.APP_URL}/trips/${trip.id}`
    );
  },

  /**
   * Send payment notification
   */
  async sendPaymentNotification(phone: string, payment: any): Promise<void> {
    await this.send(
      phone,
      `💰 Payment ${payment.status}: ${payment.currency} ${payment.amount.toFixed(2)}`
    );
  },
};
