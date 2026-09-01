import { NativeModules, Platform } from 'react-native';

const { AppIconManager, AppIconModule } = NativeModules;

export type AppIconType = 'default' | 'HorseIcon' | 'PlusIcon';

/**
 * Changes the device's Home Screen App Icon on iOS
 * @param iconName 'default' | 'HorseIcon' | 'PlusIcon'
 */
export async function setHomeScreenAppIcon(iconName: AppIconType): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const module = AppIconManager || AppIconModule;
  if (!module) {
    console.warn('[appIcon] Native icon module is not available in current environment.');
    return false;
  }

  try {
    const target = iconName === 'default' ? null : iconName;
    if (typeof module.setIcon === 'function') {
      const success = await module.setIcon(target);
      return !!success;
    }
    if (typeof module.changeAppIcon === 'function') {
      const success = await module.changeAppIcon(target);
      return !!success;
    }
    return false;
  } catch (error: unknown) {
    console.warn('[appIcon] Failed to set alternate app icon:', error);
    return false;
  }
}

/**
 * Gets the current active alternate icon name
 */
export async function getHomeScreenAppIcon(): Promise<string> {
  if (Platform.OS !== 'ios') {
    return 'default';
  }

  const module = AppIconManager || AppIconModule;
  if (!module || typeof module.getCurrentIcon !== 'function') {
    return 'default';
  }

  try {
    return await module.getCurrentIcon();
  } catch {
    return 'default';
  }
}
