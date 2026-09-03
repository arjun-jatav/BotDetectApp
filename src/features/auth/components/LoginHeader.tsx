import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { JPLoftLogo } from '../../../shared/components/icons';

interface LoginHeaderProps {
  isSmallScreen?: boolean;
}

export function LoginHeader({ isSmallScreen = false }: LoginHeaderProps) {
  const logoWidth = isSmallScreen ? 128 : 150;
  const logoHeight = Math.round((logoWidth * 67) / 164);

  return (
    <View style={[styles.header, isSmallScreen && styles.headerCompact]}>
      {/* Official Vector JPLoft Logo */}
      <View style={[styles.logoContainer, isSmallScreen && styles.logoContainerCompact]}>
        <JPLoftLogo width={logoWidth} height={logoHeight} />
      </View>

      {/* Title & Subtitle */}
      <Text style={[styles.title, isSmallScreen && styles.titleCompact]}>Welcome back</Text>
      <Text style={styles.subtitle}>
        Sign in with the email and password issued by your workspace administrator.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    marginBottom: 24,
    width: '100%',
  },
  headerCompact: {
    marginBottom: 16,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  logoContainerCompact: {
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
