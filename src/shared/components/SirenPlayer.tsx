import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeSirenEvents, stopSiren } from '../services/siren';
import { API_BASE_URL } from '../../core/config/api';

const VISITOR_LANDED_TYPES = new Set([
  'visitor_landed',
  'visitor-landed',
  'visitorlanded',
  'visitor_landed_alarm',
  'new_visitor',
  'new-visitor',
  'newvisitor',
]);

const HUMAN_SUPPORT_TYPES = new Set([
  'human_support',
  'human-support',
  'humansupport',
  'human_support_alarm',
  'llm_credit_exhausted',
  'llm-credit-exhausted',
  'llmcreditexhausted',
  'conversation_taken_over',
  'conversation-taken-over',
  'conversationtakenover',
]);

interface SirenPlayerProps {
  onNavigate?: (url: string) => void;
}

export function SirenPlayer({ onNavigate }: SirenPlayerProps = {}) {
  const insets = useSafeAreaInsets();
  const [isActive, setIsActive] = useState(false);
  const [activeTitle, setActiveTitle] = useState('🚨 EMERGENCY ALARM ACTIVE');
  const [activeSubtitle, setActiveSubtitle] = useState('Tap to open chat • Tap button to silence');
  const [activeIcon, setActiveIcon] = useState('🔔');
  const [activeData, setActiveData] = useState<Record<string, unknown> | null>(null);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const dismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const presentAlert = useCallback((notificationType?: string, payloadData?: Record<string, unknown>) => {
    setIsActive(true);
    setActiveData(payloadData || null);
    const normalizedType = notificationType?.trim()?.toLowerCase()?.replace(/-/g, '_') || '';
    const soundType = (((payloadData?.soundType || payloadData?.sound_type || '') as string)).trim().toLowerCase().replace(/-/g, '_');

    const rawTitle = (payloadData?.title as string) || '';
    const rawBody = (payloadData?.body as string) || '';

    const isIntervention = Boolean(
      payloadData?.isHumanIntervention === true ||
      (typeof payloadData?.isHumanIntervention === 'string' && payloadData?.isHumanIntervention === 'true') ||
      HUMAN_SUPPORT_TYPES.has(normalizedType) ||
      HUMAN_SUPPORT_TYPES.has(soundType) ||
      soundType === 'high_alert'
    );

    // Auto-dismiss standard non-human intervention alert banners after 10 seconds
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (!isIntervention) {
      dismissTimerRef.current = setTimeout(() => {
        setIsActive(false);
        setActiveData(null);
      }, 10000);
    }

    // Select Icon
    if (normalizedType.includes('meeting') || soundType.includes('meeting')) {
      setActiveIcon('📅');
    } else if (normalizedType.includes('lead') || soundType.includes('lead')) {
      setActiveIcon('🎯');
    } else if (normalizedType.includes('message') || normalizedType.includes('chat') || normalizedType === 'first_message' || normalizedType === 'visitor_message') {
      setActiveIcon('💬');
    } else if (normalizedType.includes('human') || soundType.includes('high_alert')) {
      setActiveIcon('🚨');
    } else {
      setActiveIcon('🔔');
    }

    // Select Title
    if (rawTitle) {
      setActiveTitle(rawTitle);
    } else if (VISITOR_LANDED_TYPES.has(normalizedType) || soundType === 'new_visitor') {
      setActiveTitle('🚨 NEW VISITOR ON SITE');
    } else if (normalizedType === 'first_message') {
      setActiveTitle('💬 NEW CHAT STARTED');
    } else if (normalizedType === 'visitor_message') {
      setActiveTitle('💬 NEW VISITOR MESSAGE');
    } else if (normalizedType === 'lead_captured') {
      setActiveTitle('🎯 NEW LEAD CAPTURED');
    } else if (normalizedType === 'meeting_booked') {
      setActiveTitle('📅 NEW MEETING BOOKED');
    } else if (isIntervention) {
      setActiveTitle('🚨 VISITOR NEEDS A HUMAN');
    } else {
      setActiveTitle('🔔 NOTIFICATION RECEIVED');
    }

    // Select Subtitle
    if (rawBody) {
      setActiveSubtitle(rawBody);
    } else if (isIntervention) {
      setActiveSubtitle('Tap to open chat • Tap button to silence');
    } else {
      setActiveSubtitle('Tap to open conversation');
    }
  }, []);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isActive) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      animation?.stop();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [isActive, pulseAnim]);

  useEffect(() => {
    const unsubscribe = subscribeSirenEvents((action, notificationType, payloadData) => {
      if (action === 'PLAY') {
        presentAlert(notificationType, payloadData);
      } else if (action === 'STOP') {
        setIsActive(false);
        setActiveData(null);
      }
    });

    const nativeStartSub = DeviceEventEmitter.addListener('onSirenStarted', (data: Record<string, unknown>) => {
      console.log('[SirenPlayer] onSirenStarted event received from native -> Showing banner', data);
      const notifType = (data?.type as string) || (data?.soundType as string);
      presentAlert(notifType, data);
    });

    const nativeStopSub = DeviceEventEmitter.addListener('onSirenStopped', () => {
      console.log('[SirenPlayer] onSirenStopped received from native -> Dismissing banner');
      setIsActive(false);
      setActiveData(null);
    });

    return () => {
      unsubscribe();
      nativeStartSub.remove();
      nativeStopSub.remove();
    };
  }, [presentAlert]);

  if (Platform.OS !== 'android' || !isActive) {
    return null;
  }

  const isHumanIntervention = Boolean(
    activeData?.isHumanIntervention === true ||
    (typeof activeData?.isHumanIntervention === 'string' && activeData?.isHumanIntervention === 'true') ||
    HUMAN_SUPPORT_TYPES.has(((activeData?.type as string) || '').trim().toLowerCase().replace(/-/g, '_')) ||
    HUMAN_SUPPORT_TYPES.has(((activeData?.soundType as string) || '').trim().toLowerCase().replace(/-/g, '_')) ||
    ((activeData?.soundType as string) || '').trim().toLowerCase().replace(/-/g, '_') === 'high_alert'
  );

  const handleStopSiren = () => {
    stopSiren();
  };

  const handleBannerPress = () => {
    const rawUrl = (activeData?.url || activeData?.link || activeData?.chatUrl || activeData?.chat_url) as string | undefined;
    const sessionId = (activeData?.sessionId || activeData?.session_id) as string | undefined;
    let targetUrl: string | null = null;

    if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
      const trimmed = rawUrl.trim();
      targetUrl = trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
    } else if (sessionId && typeof sessionId === 'string' && sessionId.trim().length > 0) {
      targetUrl = `${API_BASE_URL}/admin/conversations?sessionId=${sessionId.trim()}`;
    }

    stopSiren();
    if (targetUrl && onNavigate) {
      onNavigate(targetUrl);
    }
  };

  const topInset = Math.max((insets?.top || 0) + 8, 20);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { top: topInset, transform: [{ scale: pulseAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <TouchableOpacity
        style={styles.bannerTouchable}
        onPress={handleBannerPress}
        activeOpacity={0.9}
      >
        <View style={styles.iconBadge}>
          <Text style={styles.iconEmoji}>{activeIcon}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {activeTitle}
          </Text>
          <Text style={styles.bannerSubtitle} numberOfLines={1}>
            {activeSubtitle}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Show Stop Siren button ONLY for Human Intervention intent */}
      {isHumanIntervention ? (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopSiren}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.stopButtonText}>Stop Siren</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#EB322D',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 999999,
    zIndex: 999999,
    shadowColor: '#EB322D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  bannerTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  iconEmoji: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  stopButton: {
    backgroundColor: '#EB322D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EB322D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
