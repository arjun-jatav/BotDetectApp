import { NativeModules, Platform, Vibration } from 'react-native';

const { SirenModule } = NativeModules;

type SirenCallback = (action: 'PLAY' | 'STOP') => void;
const listeners = new Set<SirenCallback>();
let sirenTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function subscribeSirenEvents(cb: SirenCallback) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifySirenEvents(action: 'PLAY' | 'STOP') {
  listeners.forEach((cb) => {
    try {
      cb(action);
    } catch {}
  });
}

/**
 * Trigger siren sound & vibration on Android.
 * Runs continuously until stopSiren() is called when durationSeconds is 0 (default).
 * @param durationSeconds Length of time in seconds the siren plays (0 for infinite loop)
 */
export async function playSiren(durationSeconds: number = 0): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  if (sirenTimeoutId) {
    clearTimeout(sirenTimeoutId);
    sirenTimeoutId = null;
  }

  console.log('[siren] Requesting siren playback (continuous loop)...');

  // 1. Play siren via Web Audio / WebView synthesizer
  notifySirenEvents('PLAY');

  // 2. Play urgent vibration pattern in continuous loop
  Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 800], true);

  // 3. Trigger native SirenModule (Ringtone + AudioTrack)
  try {
    if (SirenModule?.playSiren) {
      await SirenModule.playSiren(durationSeconds);
      console.log('[siren] Native SirenModule started playing in continuous loop');
    }
  } catch (err) {
    console.warn('[siren] Failed to trigger native siren:', err);
  }

  // Only auto-stop if a positive duration (> 0) was explicitly passed
  if (durationSeconds > 0) {
    sirenTimeoutId = setTimeout(() => {
      stopSiren();
    }, durationSeconds * 1000);
  }
}

/**
 * Stop siren sound & vibration immediately
 */
export async function stopSiren(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  if (sirenTimeoutId) {
    clearTimeout(sirenTimeoutId);
    sirenTimeoutId = null;
  }

  console.log('[siren] Stopping siren');
  notifySirenEvents('STOP');
  Vibration.cancel();

  try {
    if (SirenModule?.stopSiren) {
      await SirenModule.stopSiren();
    }
  } catch (err) {
    console.warn('[siren] Failed to stop native siren:', err);
  }
}
