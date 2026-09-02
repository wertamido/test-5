/**
 * Push Notification Service
 * Handles: FCM/APNs registration, local notifications, permission management
 */

import { Platform } from 'react-native';
import { Notifications } from 'react-native-notifications';
import { store } from '../store';
import { selectAuth } from '../store/slices/authSlice';

class NotificationService {
  private fcmToken: string | null = null;
  private apnsToken: string | null = null;

  // ─── Initialize ────────────────────────────────────────────────────────────

  async initialize() {
    try {
      // Request permissions
      const granted = await this.requestPermissions();
      if (!granted) {
        console.log('[NotificationService] Permission denied');
        return;
      }

      // Register for remote notifications
      if (Platform.OS === 'android') {
        await this.registerAndroid();
      } else {
        await this.registerIOS();
      }

      // Set up notification handlers
      this.setupHandlers();

      console.log('[NotificationService] Initialized');
    } catch (error) {
      console.error('[NotificationService] Init error:', error);
    }
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  async requestPermissions(): Promise<boolean> {
    try {
      const auth = await Notifications.requestPermissions();
      return auth.granted || auth.authorized || false;
    } catch (error) {
      console.error('[NotificationService] Permission error:', error);
      return false;
    }
  }

  // ─── Platform Registration ─────────────────────────────────────────────────

  private async registerAndroid() {
    try {
      const token = await Notifications.getFCMToken();
      this.fcmToken = token;
      await this.sendTokenToServer(token, 'fcm');
    } catch (error) {
      console.error('[NotificationService] Android registration error:', error);
    }
  }

  private async registerIOS() {
    try {
      const token = await Notifications.getAPNSToken();
      this.apnsToken = token;
      await this.sendTokenToServer(token, 'apns');
    } catch (error) {
      console.error('[NotificationService] iOS registration error:', error);
    }
  }

  // ─── Send Token to Server ─────────────────────────────────────────────────

  private async sendTokenToServer(token: string, type: 'fcm' | 'apns') {
    const state = store.getState();
    const accessToken = state.auth.accessToken;

    if (!accessToken) return;

    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/users/push-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token, type, platform: Platform.OS }),
        }
      );
    } catch (error) {
      console.error('[NotificationService] Failed to send token:', error);
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  private setupHandlers() {
    // Foreground notification received
    Notifications.events().registerNotificationReceivedForeground(
      (notification) => {
        console.log('[NotificationService] Foreground:', notification);
        this.handleNotification(notification);
      }
    );

    // Background/quit notification tapped
    Notifications.events().registerNotificationOpened(
      (notification, completion) => {
        console.log('[NotificationService] Opened:', notification);
        this.handleNotificationTap(notification);
        completion();
      }
    );

    // Token refresh (Android)
    Notifications.events().registerRemoteNotificationsRegistered((event) => {
      if (Platform.OS === 'android') {
        this.fcmToken = event.deviceToken;
        this.sendTokenToServer(event.deviceToken, 'fcm');
      }
    });
  }

  // ─── Handle Incoming ───────────────────────────────────────────────────────

  private handleNotification(notification: any) {
    const data = notification.payload || notification.data || {};
    const type = data.type;
    const title = notification.title || 'New Notification';
    const body = notification.body || notification.message || '';

    // Dispatch to Redux store
    store.dispatch({
      type: 'notifications/addNotification',
      payload: {
        id: data.id || Date.now().toString(),
        type: type || 'system',
        title,
        body,
        data,
        createdAt: new Date().toISOString(),
      },
    });

    // Show local notification if app is in foreground
    if (type === 'message') {
      // Don't show for active chat
      const currentConv = store.getState().messages.currentConversation;
      if (currentConv?.id === data.conversationId) return;
    }

    this.showLocalNotification(title, body, data);
  }

  private handleNotificationTap(notification: any) {
    const data = notification.payload || notification.data || {};
    const type = data.type;

    // Navigate based on notification type
    switch (type) {
      case 'new_bid':
      case 'bid_accepted':
      case 'bid_rejected':
        // Navigate to loads/bids screen
        break;
      case 'trip_status':
        // Navigate to trip details
        break;
      case 'payment':
        // Navigate to payments
        break;
      case 'message':
        // Navigate to chat
        break;
      case 'document_verified':
      case 'document_rejected':
        // Navigate to documents
        break;
      default:
        break;
    }
  }

  // ─── Local Notifications ───────────────────────────────────────────────────

  async showLocalNotification(title: string, body: string, data: any = {}) {
    try {
      await Notifications.postLocalNotification({
        title,
        body,
        payload: data,
        sound: 'default',
        priority: 'high',
      });
    } catch (error) {
      console.error('[NotificationService] Local notification error:', error);
    }
  }

  // ─── Scheduled Notifications ───────────────────────────────────────────────

  async scheduleLocalNotification(options: {
    title: string;
    body: string;
    date: Date;
    data?: any;
  }) {
    try {
      await Notifications.scheduleLocalNotification({
        title: options.title,
        body: options.body,
        fireDate: options.date.getTime(),
        payload: options.data || {},
      });
    } catch (error) {
      console.error('[NotificationService] Schedule error:', error);
    }
  }

  // ─── HOS Warning ───────────────────────────────────────────────────────────

  async scheduleHOSWarning(hoursRemaining: number, warningDate: Date) {
    await this.scheduleLocalNotification({
      title: '⚠️ HOS Warning',
      body: `You have ${hoursRemaining} hours of driving time remaining.`,
      date: warningDate,
      data: { type: 'hos_warning' },
    });
  }

  // ─── Trip Reminders ────────────────────────────────────────────────────────

  async schedulePickupReminder(tripId: string, pickupTime: Date) {
    await this.scheduleLocalNotification({
      title: '📦 Pickup Reminder',
      body: 'Your pickup window opens in 1 hour.',
      date: new Date(pickupTime.getTime() - 60 * 60 * 1000),
      data: { type: 'pickup_reminder', tripId },
    });
  }

  async scheduleDeliveryReminder(tripId: string, deliveryTime: Date) {
    await this.scheduleLocalNotification({
      title: '🚛 Delivery Reminder',
      body: 'Your delivery window opens in 1 hour.',
      date: new Date(deliveryTime.getTime() - 60 * 60 * 1000),
      data: { type: 'delivery_reminder', tripId },
    });
  }

  // ─── Clear ─────────────────────────────────────────────────────────────────

  async clearAll() {
    try {
      await Notifications.cancelAllLocalNotifications();
    } catch (error) {
      console.error('[NotificationService] Clear error:', error);
    }
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  getToken() {
    return Platform.OS === 'android' ? this.fcmToken : this.apnsToken;
  }
}

export default new NotificationService();
