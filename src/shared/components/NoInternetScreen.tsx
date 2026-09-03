import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WifiOffIcon } from './icons';

interface NoInternetScreenProps {
  onRetry?: () => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

export function NoInternetScreen({
  onRetry,
  title = 'No Internet Connection',
  subtitle = 'Please check your Wi-Fi or cellular network settings and try again.',
}: NoInternetScreenProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetryPress = async () => {
    if (retrying) {
      return;
    }
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setTimeout(() => {
        setRetrying(false);
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.iconCircle}>
          <WifiOffIcon size={44} color="#EB322D" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.tipsBox}>
          <Text style={styles.tipItem}>• Check if Wi-Fi or Mobile Data is on</Text>
          <Text style={styles.tipItem}>• Verify Airplane Mode is turned off</Text>
          <Text style={styles.tipItem}>• Reconnect to your network</Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetryPress}
          disabled={retrying}
          activeOpacity={0.8}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.retryButtonText}>Try Again</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  contentCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tipsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginVertical: 2,
  },
  retryButton: {
    backgroundColor: '#EB322D',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EB322D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
