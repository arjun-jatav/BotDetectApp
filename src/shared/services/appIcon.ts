import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_ICON_CONFIG, DEFAULT_ICON_ID, AppIconItem } from '../../core/config/appIcons';

const { AppIconManager, AppIconModule } = NativeModules;
const APP_ICON_STORAGE_KEY = '@selected_app_icon';
let inMemoryIconStorage: string | null = null;

async function safeStorageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return inMemoryIconStorage;
  }
}

async function safeStorageSet(key: string, value: string): Promise<void> {
  inMemoryIconStorage = value;
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err: unknown) {
    console.warn('[appIcon] Storage fallback to in-memory:', err);
  }
}

/**
 * Changes the app launcher icon using the centralized config.
 * Handles validation, native module invocation, and storage persistence.
 */
export async function changeAppIcon(iconId: string): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('Dynamic app icon switching is currently configured for iOS.');
  }

  const iconItem = APP_ICON_CONFIG.find((item) => item.id === iconId);
  if (!iconItem && iconId !== 'default') {
    throw new Error(`Invalid icon ID "${iconId}". Not found in APP_ICON_CONFIG.`);
  }

  const currentIconId = await getCurrentAppIcon();
  if (currentIconId === iconId) {
    return;
  }

  const targetNativeName = iconItem ? iconItem.iosIconName : null;
  const nativeModule = AppIconManager || AppIconModule;

  if (nativeModule) {
    try {
      if (typeof nativeModule.setIcon === 'function') {
        await nativeModule.setIcon(targetNativeName);
      } else if (typeof nativeModule.changeAppIcon === 'function') {
        await nativeModule.changeAppIcon(targetNativeName);
      }
    } catch (error: unknown) {
      console.error('Failed to change app icon via native module:', error);
      const msg = error instanceof Error ? error.message : 'Unable to change app icon. Please try again.';
      throw new Error(msg);
    }
  } else {
    console.warn('Native AppIconManager is not available in the current environment.');
  }

  await safeStorageSet(APP_ICON_STORAGE_KEY, iconId);
}

/**
 * Gets the currently active icon ID from storage or native state
 */
export async function getCurrentAppIcon(): Promise<string> {
  try {
    const saved = await safeStorageGet(APP_ICON_STORAGE_KEY);
    if (saved) {
      return saved;
    }

    const nativeModule = AppIconManager || AppIconModule;
    if (Platform.OS === 'ios' && nativeModule && typeof nativeModule.getCurrentIcon === 'function') {
      const nativeName: string = await nativeModule.getCurrentIcon();
      const matched = APP_ICON_CONFIG.find((item) => item.iosIconName === nativeName);
      if (matched) {
        return matched.id;
      }
    }

    return DEFAULT_ICON_ID;
  } catch {
    return DEFAULT_ICON_ID;
  }
}

/**
 * Restores the persisted app icon selection on app startup
 */
export async function restoreSavedAppIcon(): Promise<string> {
  try {
    const saved = await safeStorageGet(APP_ICON_STORAGE_KEY);
    if (saved) {
      const matched = APP_ICON_CONFIG.find((item) => item.id === saved);
      const nativeModule = AppIconManager || AppIconModule;
      if (matched && Platform.OS === 'ios' && nativeModule) {
        if (typeof nativeModule.setIcon === 'function') {
          await nativeModule.setIcon(matched.iosIconName).catch(() => {});
        } else if (typeof nativeModule.changeAppIcon === 'function') {
          await nativeModule.changeAppIcon(matched.iosIconName).catch(() => {});
        }
      }
      return saved;
    }
  } catch (err: unknown) {
    console.warn('Failed to restore saved app icon:', err);
  }
  return DEFAULT_ICON_ID;
}

/**
 * Helper to get icon config item by ID
 */
export function getAppIconItem(iconId: string): AppIconItem | undefined {
  return APP_ICON_CONFIG.find((item) => item.id === iconId);
}
