import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  Text,
  Dimensions,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export function BotDetectorBackground() {
  // Animated values for radar scan and pulse effects
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Continuous rotation for radar line
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for radar concentric waves
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Blinking status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim, pulseAnim, dotPulse]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.absoluteContainer} pointerEvents="none">
      {/* Deep Space Background */}
      <View style={styles.deepBg} />

      {/* Top Ambient Glow Orb */}
      <View style={styles.glowOrbTop} />

      {/* Bottom Ambient Glow Orb */}
      <View style={styles.glowOrbBottom} />

      {/* Grid Pattern Overlay */}
      <View style={styles.gridContainer}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: (width / 8) * i }]} />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: (height / 13) * i }]} />
        ))}
      </View>

      {/* Radar Center (Concentric Rings & Scanner) */}
      <View style={styles.radarWrapper}>
        {/* Outer Ring */}
        <Animated.View
          style={[
            styles.radarRing,
            styles.ringOuter,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        {/* Mid Ring */}
        <View style={[styles.radarRing, styles.ringMid]} />
        {/* Inner Ring */}
        <View style={[styles.radarRing, styles.ringInner]} />

        {/* Crosshair Lines */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Rotating Radar Sweep / Beam */}
        <Animated.View
          style={[
            styles.radarBeamContainer,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <View style={styles.radarBeamLine} />
          <View style={styles.radarBeamSector} />
        </Animated.View>

        {/* Detected Bot Target Blips */}
        <View style={[styles.targetBlip, styles.targetBlipTopRight]}>
          <View style={styles.blipDot} />
          <Text style={styles.blipTag}>BOT_429</Text>
        </View>
        <View style={[styles.targetBlip, styles.targetBlipBottomLeft]}>
          <View style={[styles.blipDot, styles.blipDotThreat]} />
          <Text style={[styles.blipTag, styles.blipTagThreat]}>THREAT_01</Text>
        </View>
      </View>

      {/* HUD Header Status Strip */}
      <View style={styles.hudHeader}>
        <View style={styles.hudBadge}>
          <Animated.View style={[styles.hudDot, { opacity: dotPulse }]} />
          <Text style={styles.hudText}>SHIELD: ACTIVE</Text>
        </View>
        <Text style={styles.hudMeta}>SYS://JPLOFT_AGENT.v2</Text>
      </View>

      {/* HUD Corner Tech Markers */}
      <Text style={[styles.cornerMarker, styles.cornerTL]}>+ SCAN_01</Text>
      <Text style={[styles.cornerMarker, styles.cornerTR]}>NODE // OK</Text>
      <Text style={[styles.cornerMarker, styles.cornerBL]}>SEC_NET 8081</Text>
      <Text style={[styles.cornerMarker, styles.cornerBR]}>IP_FILTER // ON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  deepBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070B14',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#0284C7',
    opacity: 0.18,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#4F46E5',
    opacity: 0.15,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#38BDF8',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#38BDF8',
  },
  radarWrapper: {
    position: 'absolute',
    top: height * 0.12,
    alignSelf: 'center',
    width: width * 0.85,
    height: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  ringOuter: {
    width: '100%',
    height: '100%',
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    opacity: 0.4,
  },
  ringMid: {
    width: '68%',
    height: '68%',
    borderColor: '#38BDF8',
    opacity: 0.5,
  },
  ringInner: {
    width: '36%',
    height: '36%',
    borderColor: '#06B6D4',
    opacity: 0.7,
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  radarBeamContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarBeamLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '50%',
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  radarBeamSector: {
    position: 'absolute',
    top: 0,
    right: '50%',
    width: '50%',
    height: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderTopLeftRadius: 999,
  },
  targetBlip: {
    position: 'absolute',
    alignItems: 'center',
  },
  targetBlipTopRight: {
    top: '25%',
    left: '68%',
  },
  targetBlipBottomLeft: {
    bottom: '28%',
    left: '22%',
  },
  blipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  blipDotThreat: {
    backgroundColor: '#EF4444',
  },
  blipTag: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  blipTagThreat: {
    color: '#F87171',
  },
  hudHeader: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  hudText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  hudMeta: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  cornerMarker: {
    position: 'absolute',
    color: '#475569',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  cornerTL: {
    top: 90,
    left: 20,
  },
  cornerTR: {
    top: 90,
    right: 20,
  },
  cornerBL: {
    bottom: 30,
    left: 20,
  },
  cornerBR: {
    bottom: 30,
    right: 20,
  },
});
