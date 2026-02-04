import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import {
  registerForPushNotificationsAsync,
  registerPushToken,
  handleNotificationResponse,
  unregisterPushToken,
} from '../services/notifications';

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    loading: true,
    error: null,
  });

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Only register if user is logged in
    if (!user || !isAuthenticated) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const setupNotifications = async () => {
      try {
        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        
        if (token) {
          setState(prev => ({ ...prev, expoPushToken: token }));
          
          // Register token with backend
          await registerPushToken(token);
        }
        
        setState(prev => ({ ...prev, loading: false }));
      } catch (error) {
        console.error('Error setting up notifications:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false,
        }));
      }
    };

    setupNotifications();

    // Listen for incoming notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        setState(prev => ({ ...prev, notification }));
      }
    );

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user, isAuthenticated]);

  // Cleanup on logout
  const cleanup = async () => {
    try {
      await unregisterPushToken();
      setState({
        expoPushToken: null,
        notification: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  };

  return {
    ...state,
    cleanup,
  };
}
