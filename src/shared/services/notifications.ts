import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSiren, stopSiren } from './siren';
import { NotificationPayload } from '../../core/types';

export const FCM_TOKEN_STORAGE_KEY = '@botdetect_fcm_token';

interface FirebaseRemoteMessage {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, unknown>;
}

/**
 * Request notification permissions for Android 13+ and iOS
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error: unknown) {
      console.warn('[notifications] Failed to request Android permission:', error);
      return false;
    }
  } else if (Platform.OS === 'ios') {
    try {
      const messagingModule = require('@react-native-firebase/messaging');
      if (messagingModule.getMessaging && messagingModule.requestPermission) {
        const messagingInstance = messagingModule.getMessaging();
        const authStatus = await messagingModule.requestPermission(messagingInstance);
        const AuthorizationStatus = messagingModule.AuthorizationStatus;
        return (
          authStatus === AuthorizationStatus?.AUTHORIZED ||
          authStatus === AuthorizationStatus?.PROVISIONAL ||
          authStatus === 1 ||
          authStatus === 2
        );
      } else if (typeof messagingModule.default === 'function') {
        const authStatus = await messagingModule.default().requestPermission();
        return authStatus === 1 || authStatus === 2;
      }
      return true;
    } catch (error: unknown) {
      console.warn('[notifications] Failed to request iOS permission:', error);
      return false;
    }
  }

  return true;
}

/**
 * Retrieve current FCM Device Token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messagingModule = require('@react-native-firebase/messaging');
    let token: string | null = null;

    if (messagingModule.getMessaging && messagingModule.getToken) {
      const messagingInstance = messagingModule.getMessaging();
      token = await messagingModule.getToken(messagingInstance);
    } else if (typeof messagingModule.default === 'function') {
      token = await messagingModule.default().getToken();
    }

    if (token) {
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('[notifications] FCM Token:', token);
      return token;
    }

    // Fallback: Check stored token if direct fetch returned null
    const storedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (storedToken) {
      console.log('[notifications] Retrieved cached FCM Token:', storedToken);
      return storedToken;
    }

    return null;
  } catch (error: unknown) {
    console.warn('[notifications] Failed to get FCM token:', error);
    try {
      const storedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      return storedToken;
    } catch {
      return null;
    }
  }
}

/**
 * Setup push notification listeners for Android
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: NotificationPayload) => void,
  onNotificationOpened?: (data: Record<string, unknown>) => void
): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  try {
    const {
      getMessaging,
      onMessage,
      onNotificationOpenedApp,
      getInitialNotification,
      onTokenRefresh,
    } = require('@react-native-firebase/messaging');
    const messagingInstance = getMessaging();

    // 1. Foreground message listener
    const unsubscribeOnMessage = onMessage(
      messagingInstance,
      async (remoteMessage: FirebaseRemoteMessage) => {
        console.log('[notifications] Foreground message received:', remoteMessage);

        // Run continuous siren on notification arrival (Android)
        playSiren();

        const title = remoteMessage.notification?.title || 'BotDetect Alert';
        const body = remoteMessage.notification?.body || 'New notification received';

        if (onNotificationReceived) {
          onNotificationReceived({
            title,
            body,
            data: remoteMessage.data,
          });
        } else {
          Alert.alert(
            title,
            body,
            [
              {
                text: 'Stop Siren',
                style: 'cancel',
                onPress: () => stopSiren(),
              },
              {
                text: 'OK',
                onPress: () => stopSiren(),
              },
            ],
            { cancelable: false }
          );
        }
      }
    );

    // 2. Notification opened from background state
    const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(
      messagingInstance,
      (remoteMessage: FirebaseRemoteMessage) => {
        console.log('[notifications] Notification opened from background:', remoteMessage);
        stopSiren();
        if (onNotificationOpened && remoteMessage.data) {
          onNotificationOpened(remoteMessage.data);
        }
      }
    );

    // 3. Notification opened from quit/killed state
    getInitialNotification(messagingInstance)
      .then((remoteMessage: FirebaseRemoteMessage | null) => {
        if (remoteMessage) {
          console.log('[notifications] Notification opened from quit state:', remoteMessage);
          stopSiren();
          if (onNotificationOpened && remoteMessage.data) {
            onNotificationOpened(remoteMessage.data);
          }
        }
      })
      .catch((err: unknown) => {
        console.warn('[notifications] Failed to get initial notification:', err);
      });

    // 4. Token refresh listener
    const unsubscribeOnTokenRefresh = onTokenRefresh(
      messagingInstance,
      async (newToken: string) => {
        console.log('[notifications] FCM token refreshed:', newToken);
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
      }
    );

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  } catch (err: unknown) {
    console.warn('[notifications] Failed to setup notification listeners:', err);
    return () => {};
  }
}

/**
 * Background message handler (registered only on Android)
 */
export function registerBackgroundMessageHandler() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    const messagingInstance = getMessaging();
    setBackgroundMessageHandler(
      messagingInstance,
      async (remoteMessage: FirebaseRemoteMessage) => {
        console.log('[notifications] Background message handled in headless mode:', remoteMessage);
        // Play continuous siren when background message arrives on Android
        playSiren();
      }
    );
  } catch (err: unknown) {
    console.warn('[notifications] Failed to register background message handler:', err);
  }
}
