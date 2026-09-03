import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../core/theme/colors';
import { JPLoftLogo } from './icons/JPLoftLogo';

const isNativeDriver = Platform.OS !== 'web' && typeof jest === 'undefined';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Responsive calculations (164:67 aspect ratio - compact & refined)
  const isSmallScreen = width < 375;
  const logoWidth = isSmallScreen ? 160 : Math.min(Math.max(width * 0.48, 175), 205);
  const logoHeight = Math.round((logoWidth * 67) / 164);
  const trackWidth = Math.round(logoWidth * 0.56);
  const barWidth = Math.round(trackWidth * 0.36);

  useEffect(() => {
    if (typeof jest !== 'undefined') {
      return;
    }

    // 1. Vector Logo Spring & Fade In
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 550,
        delay: 200,
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        delay: 350,
        useNativeDriver: isNativeDriver,
      }),
    ]).start();

    // 2. Smooth Minimalist Progress Loading Bar Loop
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: isNativeDriver,
        }),
      ])
    );

    progressLoop.start();

    return () => {
      progressLoop.stop();
    };
  }, [
    logoScale,
    logoOpacity,
    loaderOpacity,
    footerOpacity,
    progressAnim,
  ]);

  const progressTranslate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-barWidth, trackWidth],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Subtle responsive background ambient glows */}
      <View
        style={[
          styles.glowTop,
          {
            top: -height * 0.08,
            right: -width * 0.2,
            width: width * 0.7,
            height: width * 0.7,
            borderRadius: (width * 0.7) / 2,
          },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.glowBottom,
          {
            bottom: -height * 0.08,
            left: -width * 0.2,
            width: width * 0.8,
            height: width * 0.8,
            borderRadius: (width * 0.8) / 2,
          },
        ]}
        pointerEvents="none"
      />

      {/* Center Hero: Official Vector JPLoft Logo */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <JPLoftLogo
            width={logoWidth}
            height={logoHeight}
          />
        </Animated.View>

        {/* Responsive Animated Loading Bar */}
        <Animated.View
          style={[
            styles.loaderSection,
            {
              opacity: loaderOpacity,
              marginTop: isSmallScreen ? 20 : 28,
            },
          ]}
        >
          <View style={[styles.progressTrack, { width: trackWidth }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: barWidth,
                  transform: [{ translateX: progressTranslate }],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Subtle Responsive Footer */}
      <Animated.View
        style={[
          styles.footerSection,
          {
            opacity: footerOpacity,
          },
        ]}
      >
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glowTop: {
    position: 'absolute',
    backgroundColor: 'rgba(235, 50, 45, 0.035)',
  },
  glowBottom: {
    position: 'absolute',
    backgroundColor: 'rgba(235, 50, 45, 0.025)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderSection: {
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  footerSection: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
});
