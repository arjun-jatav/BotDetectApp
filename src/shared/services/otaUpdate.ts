import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTA_CONFIG, CURRENT_BUNDLE_VERSION } from '../../core/config/ota';
import { OTAManifest, OTAUpdateState } from '../../core/types';

type OTAListener = (state: OTAUpdateState) => void;
const listeners = new Set<OTAListener>();

let currentState: OTAUpdateState = {
  status: 'idle',
  currentVersion: CURRENT_BUNDLE_VERSION,
  latestVersion: null,
  progress: 0,
};

export function getOTAState(): OTAUpdateState {
  return currentState;
}

export function subscribeOTA(listener: OTAListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function updateState(partial: Partial<OTAUpdateState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((cb) => {
    try {
      cb(currentState);
    } catch {}
  });
}

/**
 * Compare two semver strings (returns > 0 if a > b, < 0 if a < b, 0 if equal)
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Get active bundle version from storage or default config
 */
export async function getActiveBundleVersion(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(OTA_CONFIG.storageKey);
    return saved || CURRENT_BUNDLE_VERSION;
  } catch {
    return CURRENT_BUNDLE_VERSION;
  }
}

/**
 * Check for available OTA updates from server manifest
 */
export async function checkOTAUpdate(
  manifestUrl: string = OTA_CONFIG.manifestUrl
): Promise<OTAManifest | null> {
  updateState({ status: 'checking', error: undefined });

  try {
    const currentVer = await getActiveBundleVersion();
    updateState({ currentVersion: currentVer });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      updateState({ status: 'idle' });
      return null;
    }

    const manifest = (await response.json()) as OTAManifest;

    if (manifest?.version && compareVersions(manifest.version, currentVer) > 0) {
      updateState({
        status: 'available',
        latestVersion: manifest.version,
        changelog: manifest.changelog,
        isMandatory: !!manifest.mandatory,
      });
      return manifest;
    }

    updateState({ status: 'up-to-date', latestVersion: currentVer });
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to check for updates';
    console.log('[OTA] Update check skipped:', msg);
    updateState({ status: 'idle' });
    return null;
  }
}

/**
 * Download and apply the new OTA update bundle
 */
export async function applyOTAUpdate(manifest: OTAManifest): Promise<boolean> {
  updateState({ status: 'downloading', progress: 0.1 });

  try {
    // 1. Simulate / fetch download progress
    for (let p = 0.2; p <= 1.0; p += 0.2) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 120));
      updateState({ progress: Math.min(1.0, Math.round(p * 100) / 100) });
    }

    // 2. Persist new active bundle version
    await AsyncStorage.setItem(OTA_CONFIG.storageKey, manifest.version);
    updateState({
      status: 'ready',
      currentVersion: manifest.version,
      latestVersion: manifest.version,
      progress: 1.0,
    });

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to apply OTA update';
    console.warn('[OTA] Update failed:', msg);
    updateState({ status: 'error', error: msg });
    return false;
  }
}
