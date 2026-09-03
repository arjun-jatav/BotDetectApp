import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './features/auth';
import { WebScreen } from './features/dashboard';
import { SirenPlayer, NoInternetBanner, SplashScreen } from './shared/components';
import { DEFAULT_WEB_URL, API_BASE_URL } from './core/config/api';
import { getAuthSession, logoutUser } from './features/auth/api';
import { authStore } from './features/auth/store/authStore';
import {
  requestNotificationPermission,
  getFCMToken,
  setupNotificationListeners,
  setNativeAuthStatus,
} from './shared/services/notifications';
import { stopSiren } from './shared/services/siren';
import { AuthSession, LoginResponse } from './core/types';

export function resolveNotificationUrl(data?: Record<string, unknown> | null): string | null {
  if (!data || typeof data !== 'object') return null;

  // Flatten if payload has nested data string or object
  let payload: Record<string, unknown> = { ...data };
  if (typeof payload.data === 'string') {
    try {
      const parsed = JSON.parse(payload.data);
      if (typeof parsed === 'object' && parsed !== null) {
        payload = { ...payload, ...parsed };
      }
    } catch (_) { }
  } else if (typeof payload.data === 'object' && payload.data !== null) {
    payload = { ...payload, ...(payload.data as Record<string, unknown>) };
  }

  // 1. Check direct explicit URL fields
  const rawUrl =
    (payload.url as string) ||
    (payload.link as string) ||
    (payload.chatUrl as string) ||
    (payload.chat_url as string) ||
    (payload.targetUrl as string) ||
    (payload.target_url as string) ||
    (payload.webUrl as string) ||
    (payload.web_url as string) ||
    (payload.redirectUrl as string) ||
    (payload.redirect_url as string);

  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE_URL}${cleanPath}`;
  }

  // 2. Check conversation ID / chat ID / session ID
  const sessionId = (
    payload.sessionId ||
    payload.session_id ||
    payload.conversationId ||
    payload.conversation_id ||
    payload.chatId ||
    payload.chat_id ||
    payload.leadId ||
    payload.lead_id ||
    payload.id
  ) as string | number | undefined;

  if (sessionId !== undefined && sessionId !== null) {
    const cleanId = encodeURIComponent(String(sessionId).trim());
    if (cleanId.length > 0) {
      return `${API_BASE_URL}/admin/conversations?sessionId=${cleanId}`;
    }
  }

  // 3. Check visitor ID
  const visitorId = (
    payload.visitorId ||
    payload.visitor_id
  ) as string | number | undefined;

  if (visitorId !== undefined && visitorId !== null) {
    const cleanVisitor = encodeURIComponent(String(visitorId).trim());
    if (cleanVisitor.length > 0) {
      return `${API_BASE_URL}/admin/conversations?visitorId=${cleanVisitor}`;
    }
  }

  return DEFAULT_WEB_URL;
}

export function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'web'>('login');
  const [authData, setAuthData] = useState<AuthSession | null>(null);
  const [activeWebUrl, setActiveWebUrl] = useState<string>(DEFAULT_WEB_URL);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        const minSplashTime =
          typeof jest !== 'undefined'
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
              setTimeout(() => resolve(), 1400);
            });

        // 1. Request notification permissions and register token
        const initTasks = Promise.all([
          requestNotificationPermission().catch(() => null),
          getFCMToken().catch(() => null),
          getAuthSession().catch(() => null),
          minSplashTime,
        ]);

        const [, , savedSession] = await initTasks;

        if (isMounted) {
          if (savedSession) {
            authStore.setSession(savedSession);
            await setNativeAuthStatus(true);
            setAuthData(savedSession);
            setCurrentScreen('web');
          } else {
            authStore.setSession(null);
            await setNativeAuthStatus(false);
          }
          setInitializing(false);
        }
      } catch {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    initApp();

    // 3. Setup foreground and background notification listeners
    const unsubscribeNotifications = setupNotificationListeners(
      undefined,
      (data) => {
        console.log('[App] Notification opened with data:', data);
        const resolvedUrl = resolveNotificationUrl(data);
        if (resolvedUrl) {
          console.log('[App] Navigating to resolved notification URL:', resolvedUrl);
          if (authStore.isAuthenticated()) {
            setActiveWebUrl(resolvedUrl);
            setCurrentScreen('web');
          } else {
            console.log('[App] User not authenticated; queueing pending notification target URL:', resolvedUrl);
            setPendingUrl(resolvedUrl);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeNotifications();
    };
  }, []);

  const handleLoginSuccess = (userData?: LoginResponse) => {
    authStore.setSession(userData ?? null);
    setNativeAuthStatus(true);
    setAuthData(userData ?? null);
    if (pendingUrl) {
      console.log('[App] Redirecting to pending notification URL post-login:', pendingUrl);
      setActiveWebUrl(pendingUrl);
      setPendingUrl(null);
    }
    setCurrentScreen('web');
  };

  const handleLogout = async () => {
    stopSiren();
    await setNativeAuthStatus(false);
    authStore.setSession(null);
    await logoutUser(authData);
    setAuthData(null);
    setActiveWebUrl(DEFAULT_WEB_URL);
    setCurrentScreen('login');
  };

  if (initializing) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <NoInternetBanner position="top" />
        {currentScreen === 'login' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
        {currentScreen === 'web' && (
          <WebScreen
            initialUrl={activeWebUrl}
            userData={authData}
            onLogout={handleLogout}
          />
        )}
        <SirenPlayer
          onNavigate={(url) => {
            console.log('[App] Navigating from Siren banner tap:', url);
            setActiveWebUrl(url);
            setCurrentScreen('web');
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
