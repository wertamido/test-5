/**
 * Scheduler Service
 * 
 * Handles all background/cron jobs:
 * - Clean up expired sessions
 * - Process scheduled notifications
 * - Update load statuses
 * - Generate invoices
 * - Send reminder notifications
 * - Clean up old location data
 * - Process escrow releases
 * - Generate analytics reports
 */

import cron from 'node-cron';
import { database } from '../config/database';
import { logger } from '../config/logger';
import { emailService } from './email.service';
import { smsService } from './sms.service';

class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all scheduled jobs
   */
  start(): void {
    // ==========================================================================
    // EVERY MINUTE: Check for urgent notifications
    // ==========================================================================
    this.registerJob('urgent-notifications', '* * * * *', async () => {
      try {
        // Find loads that need urgent pickup reminders (2 hours before pickup)
        const urgentLoads = await database.queryMany(
          `SELECT l.id, l.reference_number, l.pickup_date, u.id as user_id, u.email, u.phone
           FROM loads l
           JOIN users u ON u.id = l.assigned_trucker_id
           WHERE l.status = 'assigned'
           AND l.pickup_date BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
           AND NOT EXISTS (
             SELECT 1 FROM notifications 
             WHERE data->>'loadId' = l.id::text 
             AND type = 'trip_update'
             AND title = 'Pickup Reminder'
           )`
        );

        for (const load of urgentLoads) {
          // Create notification
          await database.query(
            `INSERT INTO notifications (user_id, type, priority, title, body, data)
             VALUES ($1, 'trip_update', 'high', 'Pickup Reminder', $2, $3)`,
            [
              load.user_id,
              `Your pickup for load ${load.reference_number} is in less than 2 hours!`,
              JSON.stringify({ loadId: load.id }),
            ]
          );

          // Send SMS
          await smsService.sendTripUpdate(load.phone, load);
        }
      } catch (error) {
        logger.error('Urgent notifications job error:', error);
      }
    });

    // ==========================================================================
    // EVERY 5 MINUTES: Update trip locations from cache
    // ==========================================================================
    this.registerJob('location-sync', '*/5 * * * * *', async () => {
      try {
        // This would sync Redis location data to PostgreSQL for persistence
        // Implemented as needed based on scale
      } catch (error) {
        logger.error('Location sync job error:', error);
      }
    });

    // ==========================================================================
    // EVERY HOUR: Clean up expired data
    // ==========================================================================
    this.registerJob('cleanup', '0 * * * *', async () => {
      try {
        // Clean up expired password reset tokens
        await database.query(
          "UPDATE users SET password_reset_token = NULL, password_reset_expires_at = NULL WHERE password_reset_expires_at < NOW()"
        );

        // Clean up old location history (older than 30 days)
        // This runs in Redis primarily, but clean up DB if storing

        // Mark stale loads as expired (posted but past pickup date)
        await database.query(
          "UPDATE loads SET status = 'cancelled' WHERE status IN ('posted', 'bidding') AND pickup_date < NOW() - INTERVAL '1 day'"
        );

        // Clean up old error logs (older than 30 days)
        await database.query('DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days'');

        logger.debug('Cleanup job completed');
      } catch (error) {
        logger.error('Cleanup job error:', error);
      }
    });

    // ==========================================================================
    // EVERY HOUR: Process HOS warnings
    // ==========================================================================
    this.registerJob('hos-monitor', '0 * * * *', async () => {
      try {
        // Find drivers approaching HOS limits
        const drivers = await database.queryMany(
          `SELECT id, trucker_id, driver_hours_today, driver_hours_week, load_id
           FROM trips
           WHERE status IN ('en_route_pickup', 'loading', 'en_route_delivery', 'at_pickup')
           AND hos_status = 'driving'`
        );

        for (const trip of drivers) {
          if (trip.driver_hours_today >= 10) {
            // 11 hour limit - warn at 10
            await database.query(
              `INSERT INTO notifications (user_id, type, priority, title, body, data)
               VALUES ($1, 'hos_warning', 'urgent', 'HOS Warning', 'You are approaching the 11-hour driving limit!', $2)`,
              [trip.trucker_id, JSON.stringify({ tripId: trip.id })]
            );
          }

          if (trip.driver_hours_week >= 68) {
            // 70 hour limit - warn at 68
            await database.query(
              `INSERT INTO notifications (user_id, type, priority, title, body, data)
               VALUES ($1, 'hos_warning', 'urgent', 'HOS Limit Approaching', 'You are approaching the 70-hour weekly limit!', $2)`,
              [trip.trucker_id, JSON.stringify({ tripId: trip.id })]
            );
          }
        }
      } catch (error) {
        logger.error('HOS monitor job error:', error);
      }
    });

    // ==========================================================================
    // DAILY at 9 AM: Generate daily reports & reminders
    // ==========================================================================
    this.registerJob('daily-reports', '0 9 * * *', async () => {
      try {
        // Generate daily earnings report for active truckers
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
        const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));

        const earnings = await database.queryMany(
          `SELECT 
            t.trucker_id,
            u.email,
            COUNT(*) as trips_completed,
            SUM(p.amount) as total_earnings
           FROM trips t
           JOIN payments p ON p.trip_id = t.id
           JOIN users u ON u.id = t.trucker_id
           WHERE t.status = 'completed'
           AND t.actual_delivery BETWEEN $1 AND $2
           AND p.status = 'completed'
           GROUP BY t.trucker_id, u.email`,
          [startOfDay, endOfDay]
        );

        for (const report of earnings) {
          if (parseFloat(report.total_earnings) > 0) {
            await emailService.send({
              to: report.email,
              subject: 'Your Daily Earnings Report - FreightConnect',
              html: `
                <h2>Daily Earnings Report</h2>
                <p><strong>Date:</strong> ${startOfDay.toLocaleDateString()}</p>
                <p><strong>Trips Completed:</strong> ${report.trips_completed}</p>
                <p><strong>Total Earnings:</strong> $${parseFloat(report.total_earnings).toFixed(2)}</p>
              `,
            });
          }
        }

        // Send payment reminders for overdue invoices
        const overdueInvoices = await database.queryMany(
          `SELECT i.*, u.email, u.first_name
           FROM invoices i
           JOIN users u ON u.id = i.user_id
           WHERE i.status = 'sent'
           AND i.due_date < NOW()`
        );

        for (const invoice of overdueInvoices) {
          await emailService.send({
            to: invoice.email,
            subject: `Payment Reminder: Invoice ${invoice.number}`,
            html: `<p>Hi ${invoice.first_name},</p><p>Your invoice ${invoice.number} is now overdue. Please make a payment to avoid service interruption.</p>`,
          });
        }

        logger.info('Daily reports job completed');
      } catch (error) {
        logger.error('Daily reports job error:', error);
      }
    });

    // ==========================================================================
    // DAILY at MIDNIGHT: Reset daily counters, archive old data
    // ==========================================================================
    this.registerJob('midnight-maintenance', '0 0 * * *', async () => {
      try {
        // Reset daily HOS counters for drivers who've had 34+ hour reset
        await database.query(
          `UPDATE trips 
           SET driver_hours_today = 0 
           WHERE hos_status = 'off_duty' 
           AND updated_at < NOW() - INTERVAL '34 hours'`
        );

        // Archive completed trips older than 90 days (to archive table)
        // This keeps the main table performant

        // Update subscription usage counters
        await database.query(
          `UPDATE subscriptions SET usage = usage - '{"apiCallsUsed": 0}' WHERE status = 'active'`
        );

        logger.info('Midnight maintenance completed');
      } catch (error) {
        logger.error('Midnight maintenance error:', error);
      }
    });

    // ==========================================================================
    // WEEKLY on MONDAY: Generate weekly analytics
    // ==========================================================================
    this.registerJob('weekly-analytics', '0 8 * * 1', async () => {
      try {
        // Generate platform-wide analytics
        const stats = await database.queryOne<any>(
          `SELECT 
            (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users,
            (SELECT COUNT(*) FROM loads WHERE created_at > NOW() - INTERVAL '7 days') as new_loads,
            (SELECT COUNT(*) FROM trips WHERE status = 'completed' AND actual_delivery > NOW() - INTERVAL '7 days') as completed_trips,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days') as total_volume`
        );

        logger.info('Weekly analytics:', stats);

        // Store analytics snapshot
        await database.query(
          `INSERT INTO analytics_events (event, properties) VALUES ('weekly_snapshot', $1)`,
          [JSON.stringify(stats)]
        );
      } catch (error) {
        logger.error('Weekly analytics error:', error);
      }
    });

    logger.info(`✅ Started ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.debug(`Stopped job: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * Register a cron job
   */
  private registerJob(name: string, cronExpression: string, handler: () => Promise<void>): void {
    const task = cron.schedule(cronExpression, async () => {
      const startTime = Date.now();
      try {
        await handler();
        const duration = Date.now() - startTime;
        if (duration > 5000) {
          logger.warn(`Slow job [${name}]: ${duration}ms`);
        }
      } catch (error) {
        logger.error(`Job [${name}] error:`, error);
      }
    });

    this.jobs.set(name, task);
    logger.debug(`Registered job: ${name} (${cronExpression})`);
  }
}

export const schedulerService = new SchedulerService();
