import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WifiOffIcon } from './icons';

interface NoInternetBannerProps {
  position?: 'top' | 'bottom';
  onRetry?: () => void;
}

export function NoInternetBanner({
  position = 'top',
  onRetry,
}: NoInternetBannerProps) {
  const insets = useSafeAreaInsets();
  const { isOffline, isChecking, checkConnection } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  const handleRetry = async () => {
    await checkConnection();
    if (onRetry) {
      onRetry();
    }
  };

  const containerPositionStyle =
    position === 'top'
      ? { top: Math.max(insets.top + 6, 12) }
      : { bottom: Math.max(insets.bottom + 6, 16) };

  return (
    <View
      style={[
        styles.bannerWrapper,
        containerPositionStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <WifiOffIcon size={18} color="#EB322D" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            No Internet Connection
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            Check your Wi-Fi or cellular data
          </Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={isChecking}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.retryButtonText}>Retry</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: '#FECACA',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  subtitleText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#EB322D',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EB322D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
