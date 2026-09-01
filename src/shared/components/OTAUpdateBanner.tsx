import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { subscribeOTA, checkOTAUpdate, applyOTAUpdate } from '../services/otaUpdate';
import { OTAUpdateState, OTAManifest } from '../../core/types';

export function OTAUpdateBanner() {
  const [otaState, setOtaState] = useState<OTAUpdateState>({
    status: 'idle',
    currentVersion: '1.0.0',
    latestVersion: null,
    progress: 0,
  });

  const [pendingManifest, setPendingManifest] = useState<OTAManifest | null>(null);

  useEffect(() => {
    let isMounted = true;

    const unsub = subscribeOTA((state) => {
      if (isMounted) {
        setOtaState(state);
      }
    });

    checkOTAUpdate().then((manifest) => {
      if (isMounted && manifest) {
        setPendingManifest(manifest);
        applyOTAUpdate(manifest);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  if (otaState.status === 'idle' || otaState.status === 'up-to-date' || otaState.status === 'checking') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.badgeText}>⚡ LIVE OTA UPDATE</Text>
        {otaState.status === 'available' || otaState.status === 'downloading' ? (
          <Text style={styles.infoText}>
            Updating UI to v{otaState.latestVersion}... ({Math.round(otaState.progress * 100)}%)
          </Text>
        ) : otaState.status === 'ready' ? (
          <Text style={styles.infoText}>
            UI updated to v{otaState.latestVersion}! Active on next launch.
          </Text>
        ) : null}
      </View>

      {otaState.status === 'available' && pendingManifest && (
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={() => applyOTAUpdate(pendingManifest)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Apply Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  infoText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  updateBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
