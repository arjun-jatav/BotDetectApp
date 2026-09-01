import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageGetItem<T = string>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch (error) {
    console.warn(`[storage] Failed to get key "${key}":`, error);
    return null;
  }
}

export async function storageSetItem<T = unknown>(key: string, value: T): Promise<void> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  } catch (error) {
    console.warn(`[storage] Failed to set key "${key}":`, error);
  }
}

export async function storageRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] Failed to remove key "${key}":`, error);
  }
}
