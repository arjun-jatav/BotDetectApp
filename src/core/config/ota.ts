import { API_BASE_URL } from './api';

export const CURRENT_BUNDLE_VERSION = '1.0.0';
export const CURRENT_NATIVE_VERSION = '0.0.1';

export const OTA_CONFIG = {
  manifestUrl: `${API_BASE_URL}/api/ota-manifest`,
  storageKey: '@botdetect_ota_version',
  autoCheckOnResume: true,
  checkIntervalMs: 15 * 60 * 1000, // Check every 15 minutes while app is active
};
