import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS, API_BASE_URL } from '../../../core/config/api';
import { AuthSession, LoginResponse } from '../../../core/types';

export const AUTH_STORAGE_KEY = '@botdetect_auth_session';

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
 * Perform login request and persist session upon success
 */
export async function loginUser(
  identifier: string,
  password: string,
  timeoutMs: number = 10000,
  fcmToken?: string | null
): Promise<LoginResponse> {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');

  // Format request body according to whether an email or username was provided
  const payload: Record<string, string> = isEmail
    ? { email: trimmed, password }
    : { username: trimmed, password };

  if (fcmToken) {
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
    await saveAuthSession(sessionData);

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
