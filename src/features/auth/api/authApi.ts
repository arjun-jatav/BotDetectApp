import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS, API_BASE_URL } from '../../../core/config/api';
import { AuthSession, LoginResponse } from '../../../core/types';

export const AUTH_STORAGE_KEY = '@botdetect_auth_session';
export const SAVED_CREDENTIALS_KEY = '@botdetect_saved_credentials';

export interface SavedCredentials {
  identifier: string;
  password: string;
  keepSignedIn: boolean;
}

/**
 * Save authentication session to persistent storage
 */
export async function saveAuthSession(sessionData: AuthSession): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (err) {
    console.warn('[auth] Failed to persist session:', err);
  }
}

/**
 * Retrieve active authentication session from persistent storage
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthSession;
  } catch (err) {
    console.warn('[auth] Failed to read session:', err);
    return null;
  }
}

/**
 * Remove stored session on logout
 */
export async function clearAuthSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('[auth] Failed to clear session:', err);
  }
}

/**
 * Log out user from backend API and clear session
 */
export async function logoutUser(
  session?: AuthSession | null,
  fcmToken?: string | null
): Promise<void> {
  try {
    const currentSession = session || (await getAuthSession());
    const token =
      currentSession?.token ||
      currentSession?.admin_token ||
      currentSession?.accessToken ||
      currentSession?.jwt;

    let tokenToSend: string | null | undefined =
      fcmToken || currentSession?.fcmToken || currentSession?.FcmToken;
    if (!tokenToSend) {
      tokenToSend = await AsyncStorage.getItem('@botdetect_fcm_token');
    }

    if (token) {
      const payload = {
        fcmToken: tokenToSend || '',
        deviceType: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'mobile',
      };

      console.log('[authApi] Calling POST /api/logout with payload:', payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      await fetch(ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then((res) => {
          console.log('[authApi] Logout API response status:', res.status);
        })
        .catch((err) => {
          console.warn('[authApi] Logout request failed:', err);
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    }
  } catch (error) {
    console.warn('[authApi] Error during logout:', error);
  } finally {
    await clearAuthSession();
  }
}

/**
 * Save login credentials (email/password) to persistent storage for autofill
 */
export async function saveSavedCredentials(credentials: SavedCredentials): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (err) {
    console.warn('[auth] Failed to persist saved credentials:', err);
  }
}

/**
 * Retrieve saved login credentials from persistent storage
 */
export async function getSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SavedCredentials;
  } catch (err) {
    console.warn('[auth] Failed to read saved credentials:', err);
    return null;
  }
}

/**
 * Remove saved credentials from persistent storage
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
  } catch (err) {
    console.warn('[auth] Failed to clear saved credentials:', err);
  }
}

/**
 * Perform login request and persist session upon success
 */
export async function loginUser(
  identifier: string,
  password: string,
  timeoutMs: number = 10000,
  fcmToken?: string | null,
  keepSignedIn: boolean = true
): Promise<LoginResponse> {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');

  // Format request body according to whether an email or username was provided
  const payload: Record<string, string> = isEmail
    ? { email: trimmed, password }
    : { username: trimmed, password };

  if (fcmToken) {
    payload.FcmToken = fcmToken;
    payload.fcm_token = fcmToken;
    payload.fcmToken = fcmToken;
    payload.device_token = fcmToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const errorMessage =
        (data?.message as string) ||
        (data?.error as string) ||
        `Login failed with status ${response.status} (${response.statusText})`;
      throw new Error(String(errorMessage));
    }

    const sessionData: LoginResponse = {
      ...(typeof data === 'object' && data !== null ? data : {}),
      identifier: trimmed,
      password: password,
      fcmToken: fcmToken || undefined,
      token:
        (data?.token as string) ||
        (data?.admin_token as string) ||
        (data?.accessToken as string) ||
        (data?.jwt as string) ||
        ((data?.data as Record<string, unknown>)?.token as string),
    };

    if (keepSignedIn) {
      await saveAuthSession(sessionData);
      await saveSavedCredentials({
        identifier: trimmed,
        password: password,
        keepSignedIn: true,
      });
    } else {
      await clearAuthSession();
      await clearSavedCredentials();
    }

    return sessionData;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out. Please verify connection to ${API_BASE_URL}`);
      }
      if (error.message?.includes('Network request failed')) {
        throw new Error(
          `Unable to connect to server at ${API_BASE_URL}. Ensure your network is active.`
        );
      }
      throw error;
    }
    throw new Error('An unexpected error occurred during login.');
  }
}
