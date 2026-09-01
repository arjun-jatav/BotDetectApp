import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface LoginFooterProps {
  onSignUpPress: () => void;
  isSmallScreen?: boolean;
}

export function LoginFooter({ onSignUpPress, isSmallScreen = false }: LoginFooterProps) {
  return (
    <View style={[styles.footer, isSmallScreen && styles.footerCompact]}>
      <Text style={styles.footerText}>Don't have an account? </Text>
      <TouchableOpacity
        onPress={onSignUpPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.signUpText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerCompact: {
    marginTop: 18,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  signUpText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
});
