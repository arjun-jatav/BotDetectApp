import { CURRENT_BUNDLE_VERSION } from '../src/core/config/ota';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.unmock('../src/shared/services/otaUpdate');

import {
  compareVersions,
  getActiveBundleVersion,
  checkOTAUpdate,
  applyOTAUpdate,
  getOTAState,
} from '../src/shared/services/otaUpdate';

describe('OTA Update Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('compareVersions accurately compares semantic version strings', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  test('getActiveBundleVersion falls back to config version if storage empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const ver = await getActiveBundleVersion();
    expect(ver).toBe(CURRENT_BUNDLE_VERSION);
  });

  test('getActiveBundleVersion returns persisted version if saved', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1.0.5');
    const ver = await getActiveBundleVersion();
    expect(ver).toBe('1.0.5');
  });

  test('checkOTAUpdate detects new update when server version is higher', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1.0.0');
    const mockManifest = {
      version: '1.0.1',
      bundleUrl: 'https://v2.checkprojectstatus.com/ota/1.0.1/index.android.bundle',
      changelog: 'Refactored UI theme',
    };

    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockManifest,
    });

    const result = await checkOTAUpdate('https://mock-ota-url/manifest.json');
    expect(result).toEqual(mockManifest);
    expect(getOTAState().status).toBe('available');
    expect(getOTAState().latestVersion).toBe('1.0.1');
  });

  test('applyOTAUpdate updates active version and transitions state to ready', async () => {
    const mockManifest = {
      version: '1.0.2',
      bundleUrl: 'https://v2.checkprojectstatus.com/ota/1.0.2/index.android.bundle',
    };

    const success = await applyOTAUpdate(mockManifest);
    expect(success).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@botdetect_ota_version', '1.0.2');
    expect(getOTAState().status).toBe('ready');
  });
});
