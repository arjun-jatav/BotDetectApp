import { Platform, PermissionsAndroid, DeviceEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSiren, stopSiren } from './siren';
import { NotificationPayload, SirenNotificationType } from '../../core/types';

export const FCM_TOKEN_STORAGE_KEY = '@botdetect_fcm_token';

export const SIREN_NOTIFICATION_TYPES: readonly SirenNotificationType[] = [
  'first_message',
  'visitor_message',
  'lead_captured',
  'meeting_booked',
  'attachment',
  'visitor_landed',
  'human_support',
  'llm_credit_exhausted',
  'conversation_taken_over',
  'test_push',
] as const;

export function extractNotificationType(data?: Record<string, unknown> | null): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  const raw =
    data.type ||
    data.notification_type ||
    data.notificationType ||
    data.alert_type ||
    data.alertType ||
    data.event ||
    data.category ||
    '';
  return typeof raw === 'string' ? raw.trim().toLowerCase().replace(/-/g, '_') : '';
}

export function shouldPlaySiren(data?: Record<string, unknown> | null): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const soundEnabledRaw = data.soundEnabled ?? data.sound_enabled;
  if (
    soundEnabledRaw === false ||
    soundEnabledRaw === 'false' ||
    soundEnabledRaw === '0'
  ) {
    return false;
  }

  if (
    soundEnabledRaw === true ||
    soundEnabledRaw === 'true' ||
    soundEnabledRaw === '1'
  ) {
    return true;
  }

  const soundUrl = data.soundUrl || data.sound_url;
  if (typeof soundUrl === 'string' && soundUrl.trim().length > 0) {
    return true;
  }

  const soundType = data.soundType || data.sound_type;
  if (
    typeof soundType === 'string' &&
    soundType.trim().length > 0 &&
    soundType.trim().toLowerCase() !== 'none'
  ) {
    return true;
  }

  const type = extractNotificationType(data);
  return SIREN_NOTIFICATION_TYPES.includes(type as SirenNotificationType);
}

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
 * Update native Android auth state to control push notifications & siren behavior
 */
export async function setNativeAuthStatus(isLoggedIn: boolean): Promise<void> {
  if (Platform.OS === 'android' && NativeModules.SirenModule?.setAuthStatus) {
    try {
      await NativeModules.SirenModule.setAuthStatus(isLoggedIn);
      console.log('[notifications] Native auth status updated:', isLoggedIn);
    } catch (err) {
      console.warn('[notifications] Failed to set native auth status:', err);
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
    return () => { };
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
        // If user is logged out, suppress foreground notification & siren
        const session = await AsyncStorage.getItem('@botdetect_auth_session');
        if (!session) {
          console.log('🚫 [PUSH NOTIFICATION] Ignored in foreground because user is logged out.');
          return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔔 [PUSH NOTIFICATION - FOREGROUND RECEIVED]');
        console.log('📦 Notification Title:', remoteMessage.notification?.title);
        console.log('📦 Notification Body:', remoteMessage.notification?.body);
        console.log('📦 Full Data Payload:', JSON.stringify(remoteMessage.data, null, 2));
        console.log('🎵 soundEnabled:', remoteMessage.data?.soundEnabled);
        console.log('🎵 soundType:', remoteMessage.data?.soundType);
        console.log('🎵 soundUrl:', remoteMessage.data?.soundUrl);
        console.log('🔗 url:', remoteMessage.data?.url);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const title =
          remoteMessage.notification?.title ||
          (remoteMessage.data?.title as string) ||
          'JPLoft Agent Alert';
        const body =
          remoteMessage.notification?.body ||
          (remoteMessage.data?.body as string) ||
          'New notification received';

        const fullPayload: Record<string, unknown> = {
          ...remoteMessage.data,
          title,
          body,
        };

        const qualifiesForSiren = shouldPlaySiren(fullPayload);
        if (qualifiesForSiren) {
          const notifType = extractNotificationType(fullPayload);
          console.log('🚨 [PUSH NOTIFICATION] Triggering sound/siren & banner for type:', notifType);
          playSiren(0, notifType, fullPayload);
        }

        if (onNotificationReceived) {
          onNotificationReceived({
            title,
            body,
            data: fullPayload,
          });
        }
      }
    );

    // 2. Native Android onNotificationOpened listener (for foreground & notification shade clicks)
    const nativeNotificationSub = DeviceEventEmitter.addListener(
      'onNotificationOpened',
      (data: Record<string, unknown>) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👆 [PUSH NOTIFICATION - TAPPED IN FOREGROUND/SHADE]');
        console.log('📦 Tapped Data:', JSON.stringify(data, null, 2));
        console.log('🔗 Target URL:', data?.url);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        stopSiren();
        if (onNotificationOpened && data) {
          onNotificationOpened(data);
        }
      }
    );

    // Check if initial notification data was captured in MainActivity during cold launch
    if (NativeModules.SirenModule?.getInitialNotification) {
      NativeModules.SirenModule.getInitialNotification()
        .then((data: Record<string, unknown> | null) => {
          if (data) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 [PUSH NOTIFICATION - COLD START LAUNCH VIA INTENT]');
            console.log('📦 Intent Data:', JSON.stringify(data, null, 2));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            stopSiren();
            if (onNotificationOpened) {
              onNotificationOpened(data);
            }
          }
        })
        .catch(() => { });
    }

    // 3. Notification opened from background state (FCM)
    const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(
      messagingInstance,
      (remoteMessage: FirebaseRemoteMessage) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 [PUSH NOTIFICATION - OPENED FROM BACKGROUND]');
        console.log('📦 RemoteMessage:', JSON.stringify(remoteMessage, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        stopSiren();
        if (onNotificationOpened && remoteMessage.data) {
          onNotificationOpened(remoteMessage.data);
        }
      }
    );

    // 4. Notification opened from quit/killed state (FCM)
    getInitialNotification(messagingInstance)
      .then((remoteMessage: FirebaseRemoteMessage | null) => {
        if (remoteMessage) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('💀 [PUSH NOTIFICATION - OPENED FROM KILLED STATE]');
          console.log('📦 RemoteMessage:', JSON.stringify(remoteMessage, null, 2));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          stopSiren();
          if (onNotificationOpened && remoteMessage.data) {
            onNotificationOpened(remoteMessage.data);
          }
        }
      })
      .catch((err: unknown) => {
        console.warn('[notifications] Failed to get initial notification:', err);
      });

    // 5. Token refresh listener
    const unsubscribeOnTokenRefresh = onTokenRefresh(
      messagingInstance,
      async (newToken: string) => {
        console.log('🔄 [PUSH NOTIFICATION] FCM token refreshed:', newToken);
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
      }
    );

    return () => {
      unsubscribeOnMessage();
      nativeNotificationSub.remove();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  } catch (err: unknown) {
    console.warn('[notifications] Failed to setup notification listeners:', err);
    return () => { };
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
        // If user is logged out, suppress background notification & siren
        const session = await AsyncStorage.getItem('@botdetect_auth_session');
        if (!session) {
          console.log('🚫 [notifications] Ignored background message because user is logged out.');
          return;
        }

        console.log('[notifications] Background message handled in headless mode:', remoteMessage);
        const fullPayload: Record<string, unknown> = {
          ...remoteMessage.data,
          title: remoteMessage.notification?.title || (remoteMessage.data?.title as string),
          body: remoteMessage.notification?.body || (remoteMessage.data?.body as string),
        };

        // Play siren only if notification matches siren types or has soundUrl
        if (shouldPlaySiren(fullPayload)) {
          const notifType = extractNotificationType(fullPayload);
          console.log('[notifications] Background siren triggered for type:', notifType, 'soundUrl:', fullPayload.soundUrl);
          playSiren(0, notifType, fullPayload);
        }
      }
    );
  } catch (err: unknown) {
    console.warn('[notifications] Failed to register background message handler:', err);
  }
}
