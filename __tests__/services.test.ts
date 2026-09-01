import { getAuthSession, saveAuthSession, clearAuthSession, loginUser } from '../src/features/auth/api';
import { getCurrentAppIcon, restoreSavedAppIcon, getAppIconItem } from '../src/shared/services/appIcon';
import { setHomeScreenAppIcon } from '../src/shared/utils/appIcon';
import { DEFAULT_ICON_ID } from '../src/core/config/appIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveAuthSession persists serialized session to AsyncStorage', async () => {
    const session = { token: 'test-token', identifier: 'admin@example.com' };
    await saveAuthSession(session);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@botdetect_auth_session',
      JSON.stringify(session)
    );
  });

  test('getAuthSession returns parsed object if present', async () => {
    const session = { token: 'saved-token', identifier: 'user@example.com' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(session));
    const result = await getAuthSession();
    expect(result).toEqual(session);
  });

  test('getAuthSession returns null if storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await getAuthSession();
    expect(result).toBeNull();
  });

  test('clearAuthSession removes key from storage', async () => {
    await clearAuthSession();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@botdetect_auth_session');
  });

  test('loginUser succeeds with valid credentials', async () => {
    const mockResponse = { token: 'mock-jwt-token', user: { id: 1, email: 'test@example.com' } };
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await loginUser('test@example.com', 'password123');
    expect(result.token).toBe('mock-jwt-token');
    expect(result.identifier).toBe('test@example.com');
  });

  test('loginUser throws error on non-ok HTTP response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid email or password' }),
    });

    await expect(loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(
      'Invalid email or password'
    );
  });
});

describe('AppIcon Service & Config', () => {
  test('getAppIconItem returns matching icon item', () => {
    const item = getAppIconItem('add-horse');
    expect(item).toBeDefined();
    expect(item?.id).toBe('add-horse');
  });

  test('getCurrentAppIcon falls back to default icon ID', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const iconId = await getCurrentAppIcon();
    expect(iconId).toBe(DEFAULT_ICON_ID);
  });

  test('restoreSavedAppIcon returns default icon if none saved', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const iconId = await restoreSavedAppIcon();
    expect(iconId).toBe(DEFAULT_ICON_ID);
  });

  test('setHomeScreenAppIcon returns false on non-iOS platforms', async () => {
    Platform.OS = 'android';
    const res = await setHomeScreenAppIcon('HorseIcon');
    expect(res).toBe(false);
  });
});
