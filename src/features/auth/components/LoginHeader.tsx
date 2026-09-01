import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

interface LoginHeaderProps {
  isSmallScreen?: boolean;
}

export function LoginHeader({ isSmallScreen = false }: LoginHeaderProps) {
  return (
    <View style={[styles.header, isSmallScreen && styles.headerCompact]}>
      {/* JPLoft Logo */}
      <View style={[styles.logoContainer, isSmallScreen && styles.logoContainerCompact]}>
        <Image
          source={require('../../../assets/images/jploft_logo.png')}
          style={[styles.logoImage, isSmallScreen && styles.logoImageCompact]}
          resizeMode="contain"
        />
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
  },
  logoContainerCompact: {
    marginBottom: 14,
  },
  logoImage: {
    width: 150,
    height: 52,
  },
  logoImageCompact: {
    width: 126,
    height: 44,
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
