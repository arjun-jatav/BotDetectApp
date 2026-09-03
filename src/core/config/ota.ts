export const CURRENT_BUNDLE_VERSION = '1.1.0';
export const CURRENT_NATIVE_VERSION = '1.1.0';

export const GITHUB_OTA_BASE_URL =
  'https://raw.githubusercontent.com/arjun-jatav/BotDetectApp/main/dist/ota';

export const OTA_CONFIG = {
  manifestUrl: `${GITHUB_OTA_BASE_URL}/ota-manifest.json`,
  storageKey: '@botdetect_ota_version',
  autoCheckOnResume: true,
  checkIntervalMs: 15 * 60 * 1000, // Check every 15 minutes while app is active
};
