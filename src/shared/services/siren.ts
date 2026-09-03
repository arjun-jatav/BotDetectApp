import { NativeModules, Platform, Vibration, DeviceEventEmitter } from 'react-native';

const { SirenModule } = NativeModules;

type SirenCallback = (
  action: 'PLAY' | 'STOP',
  notificationType?: string,
  payloadData?: Record<string, unknown>
) => void;
const listeners = new Set<SirenCallback>();
let sirenTimeoutId: ReturnType<typeof setTimeout> | null = null;

if (Platform.OS === 'android') {
  DeviceEventEmitter.addListener('onSirenStopped', () => {
    console.log('[siren] onSirenStopped received from native -> Dismissing active siren & UI');
    if (sirenTimeoutId) {
      clearTimeout(sirenTimeoutId);
      sirenTimeoutId = null;
    }
    notifySirenEvents('STOP');
    Vibration.cancel();
  });
}

export function subscribeSirenEvents(cb: SirenCallback) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifySirenEvents(
  action: 'PLAY' | 'STOP',
  notificationType?: string,
  payloadData?: Record<string, unknown>
) {
  listeners.forEach((cb) => {
    try {
      cb(action, notificationType, payloadData);
    } catch {}
  });
}

const HUMAN_SUPPORT_TYPES = new Set([
  'human_support',
  'human-support',
  'humansupport',
  'human_support_alarm',
  'human_intervention',
  'human-intervention',
  'humanintervention',
  'high_alert',
  'high-alert',
  'highalert',
  'llm_credit_exhausted',
  'llm-credit-exhausted',
  'llmcreditexhausted',
  'conversation_taken_over',
  'conversation-taken-over',
  'conversationtakenover',
]);

/**
 * Trigger siren sound & vibration on Android.
 * Runs continuously until stopSiren() is called ONLY for Human Intervention intent.
 * All other notification types play once and finish.
 */
export async function playSiren(
  durationSeconds: number = 0,
  notificationType?: string,
  payloadData?: Record<string, unknown>
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const soundEnabledRaw = payloadData?.soundEnabled ?? payloadData?.sound_enabled;
  const isSoundEnabled = soundEnabledRaw !== false && soundEnabledRaw !== 'false' && soundEnabledRaw !== '0';

  const soundUrl = (payloadData?.soundUrl || payloadData?.sound_url) as string | undefined;
  const soundType = (payloadData?.soundType || payloadData?.sound_type) as string | undefined;

  const normalizedType = notificationType?.trim()?.toLowerCase()?.replace(/-/g, '_') || '';
  const normalizedSoundType = soundType?.trim()?.toLowerCase()?.replace(/-/g, '_') || '';

  const isHumanIntervention =
    payloadData?.isHumanIntervention === true ||
    HUMAN_SUPPORT_TYPES.has(normalizedType) ||
    HUMAN_SUPPORT_TYPES.has(normalizedSoundType) ||
    normalizedSoundType === 'high_alert';

  const effectiveDuration = isHumanIntervention ? durationSeconds : (durationSeconds > 0 ? durationSeconds : 1);

  if (sirenTimeoutId) {
    clearTimeout(sirenTimeoutId);
    sirenTimeoutId = null;
  }

  console.log(`[siren] Requesting playback (type: ${notificationType || 'default'}, isHumanIntervention: ${isHumanIntervention}, soundType: ${soundType || 'none'}, soundUrl: ${soundUrl || 'none'}, soundEnabled: ${isSoundEnabled})...`);

  // 1. Notify in-app UI listeners (includes isHumanIntervention flag)
  notifySirenEvents('PLAY', notificationType, {
    ...payloadData,
    isHumanIntervention,
  });

  if (!isSoundEnabled) {
    console.log('[siren] Audio & vibration skipped because soundEnabled is false');
    return;
  }

  // 2. Play vibration: continuous repeating loop for human intervention, single pulse for others
  if (isHumanIntervention) {
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 800], true);
  } else {
    Vibration.vibrate([0, 300, 150, 300], false);
  }

  // 3. Trigger native SirenModule
  try {
    if (SirenModule?.playDynamicSiren) {
      await SirenModule.playDynamicSiren(
        effectiveDuration,
        notificationType || '',
        soundUrl || '',
        'true',
        soundType || ''
      );
      console.log(`[siren] Native SirenModule playDynamicSiren started (isHumanIntervention: ${isHumanIntervention})`);
    } else if (SirenModule?.playSiren) {
      await SirenModule.playSiren(effectiveDuration, notificationType || '');
      console.log(`[siren] Native SirenModule playSiren started (isHumanIntervention: ${isHumanIntervention})`);
    }
  } catch (err) {
    console.warn('[siren] Failed to trigger native siren:', err);
  }

  // Only auto-stop if a positive duration (> 0) was explicitly passed
  if (effectiveDuration > 0) {
    sirenTimeoutId = setTimeout(() => {
      stopSiren();
    }, effectiveDuration * 1000);
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
