import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { notificationAPI } from './api';

// Configure notification handler for foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications and get token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Check if we're on a physical device (required for push notifications)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    // For web/simulator, return null but don't show error
    return null;
  }

  // Set up notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'الإشعارات العامة',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E53935',
      sound: 'default',
    });

    // Channel for new orders (for drivers)
    await Notifications.setNotificationChannelAsync('new-orders', {
      name: 'طلبات جديدة',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#4CAF50',
      sound: 'default',
    });

    // Channel for order updates (for customers)
    await Notifications.setNotificationChannelAsync('order-updates', {
      name: 'تحديثات الطلبات',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      sound: 'default',
    });
  }

  // Get current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return null;
  }

  try {
    // Get project ID from constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    token = tokenResponse.data;
    console.log('Expo Push Token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
}

// Register push token with backend
export async function registerPushToken(token: string): Promise<void> {
  try {
    await notificationAPI.registerPushToken(token, Platform.OS);
    console.log('Push token registered with backend');
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

// Unregister push token (when logging out)
export async function unregisterPushToken(): Promise<void> {
  try {
    await notificationAPI.unregisterPushToken();
    console.log('Push token unregistered');
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

// Handle notification response (when user taps on notification)
export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as {
    screen?: string;
    orderId?: string;
    type?: string;
  };

  console.log('Notification tapped:', data);

  // Navigate based on notification type
  if (data.screen === 'OrderDetails' && data.orderId) {
    router.push(`/order/${data.orderId}`);
  } else if (data.screen === 'AvailableOrders') {
    router.push('/(driver)/available');
  } else if (data.screen === 'MyOrders') {
    router.push('/(driver)/myorders');
  } else if (data.screen === 'Orders') {
    router.push('/(main)/orders');
  } else if (data.screen === 'RestaurantOrders') {
    router.push('/(restaurant)/orders');
  }
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: object,
  seconds: number = 1
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: { seconds },
  });
  return id;
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
