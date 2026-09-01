import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './features/auth';
import { WebScreen } from './features/dashboard';
import { SiloScreen } from './features/silo';
import { SirenPlayer } from './shared/components/SirenPlayer';
import { OTAUpdateBanner } from './shared/components/OTAUpdateBanner';
import { DEFAULT_WEB_URL } from './core/config/api';
import { getAuthSession, clearAuthSession } from './features/auth/api';
import {
  requestNotificationPermission,
  getFCMToken,
  setupNotificationListeners,
} from './shared/services/notifications';
import { AuthSession, LoginResponse, AppScreen } from './core/types';

export function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Extract<AppScreen, 'login' | 'web' | 'silo'>>('login');
  const [authData, setAuthData] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Initialize push notifications and restore session
  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        // 1. Request notification permissions and register token
        await requestNotificationPermission();
        await getFCMToken();

        // 2. Check and restore saved authentication session
        const savedSession = await getAuthSession();
        if (isMounted) {
          if (savedSession) {
            setAuthData(savedSession);
            setCurrentScreen('web');
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
    const unsubscribeNotifications = setupNotificationListeners();

    return () => {
      isMounted = false;
      unsubscribeNotifications();
    };
  }, []);

  const handleLoginSuccess = (userData?: LoginResponse) => {
    setAuthData(userData ?? null);
    setCurrentScreen('web');
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setAuthData(null);
    setCurrentScreen('login');
  };

  if (initializing) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#EB322D" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {currentScreen === 'login' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
        {currentScreen === 'web' && (
          <WebScreen
            initialUrl={DEFAULT_WEB_URL}
            userData={authData}
            onLogout={handleLogout}
            onNavigateToSilo={() => setCurrentScreen('silo')}
          />
        )}
        {currentScreen === 'silo' && (
          <SiloScreen onBack={() => setCurrentScreen('web')} />
        )}
        <SirenPlayer />
        <OTAUpdateBanner />
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
