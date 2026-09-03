import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { DEFAULT_WEB_URL } from '../../../core/config/api';
import { useNetworkStatus } from '../../../shared/hooks/useNetworkStatus';
import { NoInternetScreen } from '../../../shared/components/NoInternetScreen';
import { WebScreenProps } from '../types';

export function WebScreen({
  initialUrl = DEFAULT_WEB_URL,
  userData,
  onLogout,
  onNavigateToSilo: _onNavigateToSilo,
}: WebScreenProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView<object>>(null);
  const { isOffline } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [chatUnavailable, setChatUnavailable] = useState(false);

  const token =
    userData?.token ||
    userData?.admin_token ||
    userData?.accessToken ||
    userData?.jwt ||
    '';
  const role = userData?.user?.role || userData?.role || '';

  // Injected before content loads: sets tokens in localStorage before React mounts
  const injectedBeforeScript = useMemo(() => {
    return `
      (function() {
        try {
          var token = ${JSON.stringify(token)};
          var role = ${JSON.stringify(role)};
          var userObj = ${JSON.stringify(userData?.user || userData || null)};
          if (token) {
            localStorage.setItem('admin_token', token);
            localStorage.setItem('super_admin_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('accessToken', token);
            localStorage.setItem('auth_token', token);
            localStorage.setItem('jwt', token);
            localStorage.setItem('admin_remember_me', '1');
            localStorage.setItem('admin_show_welcome_toast', '0');
            if (userObj) {
              try { localStorage.setItem('user', JSON.stringify(userObj)); } catch(e) {}
              try { localStorage.setItem('admin_user', JSON.stringify(userObj)); } catch(e) {}
            }
          }

          // Intercept localStorage logout
          var origRemoveItem = localStorage.removeItem;
          localStorage.removeItem = function(key) {
            origRemoveItem.apply(this, arguments);
            if (key === 'admin_token' || key === 'super_admin_token' || key === 'token' || key === 'accessToken') {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
              }
            }
          };

          var origClear = localStorage.clear;
          localStorage.clear = function() {
            origClear.apply(this, arguments);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
            }
          };
        } catch(e) {}
      })();
      true;
    `;
  }, [token, role, userData]);

  // Injected after page loads: checks for web login page and intercepts logout clicks
  const injectedAfterScript = useMemo(() => {
    return `
      (function() {
        var path = location.pathname.toLowerCase();
        if (path.indexOf('/login') !== -1 || path.indexOf('/signin') !== -1 || path.indexOf('/logout') !== -1) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
          }
          return;
        }

        // Check if conversation ID / chat requested is missing or closed
        var bodyText = (document.body ? document.body.innerText : '') || '';
        if (
          location.search.indexOf('sessionId') !== -1 ||
          location.search.indexOf('conversationId') !== -1 ||
          location.search.indexOf('chatId') !== -1 ||
          location.pathname.indexOf('/conversations/') !== -1
        ) {
          if (
            /conversation\\s+not\\s+found/i.test(bodyText) ||
            /chat\\s+not\\s+found/i.test(bodyText) ||
            /session\\s+not\\s+found/i.test(bodyText) ||
            /invalid\\s+session/i.test(bodyText) ||
            /no\\s+longer\\s+available/i.test(bodyText) ||
            /conversation\\s+does\\s+not\\s+exist/i.test(bodyText)
          ) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CHAT_NOT_FOUND' }));
            }
          }
        }

        // Intercept click events on any Logout button or sidebar item
        document.addEventListener('click', function(e) {
          try {
            var target = e.target;
            if (!target) return;
            var el = target.closest('a, button, [role="button"], li, div');
            if (el) {
              var text = (el.innerText || el.textContent || '').trim();
              var href = el.getAttribute ? (el.getAttribute('href') || '') : '';
              var ariaLabel = el.getAttribute ? (el.getAttribute('aria-label') || '') : '';
              
              if (/^logout$/i.test(text) || /log\\s*out/i.test(text) || /logout/i.test(href) || /logout/i.test(ariaLabel)) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
                }
              }
            }
          } catch(err) {}
        }, true);
      })();
      true;
    `;
  }, []);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'LOGOUT') {
        console.log('[WebScreen] Received LOGOUT event from WebView, sending to app login');
        onLogout?.();
      } else if (data && data.type === 'CHAT_NOT_FOUND') {
        console.log('[WebScreen] Received CHAT_NOT_FOUND event from WebView');
        setChatUnavailable(true);
      }
    } catch {
      if (event.nativeEvent.data === 'LOGOUT') {
        console.log('[WebScreen] Received raw LOGOUT string from WebView, sending to app login');
        onLogout?.();
      }
    }
  };

  const handleNavigationStateChange = (navState: { url: string }) => {
    const url = navState.url.toLowerCase();
    const isAuthPage =
      url.endsWith('/login') ||
      url.includes('/login?') ||
      url.includes('/login#') ||
      url.includes('/auth/login') ||
      url.includes('/signin') ||
      url.includes('/logout');

    if (isAuthPage) {
      console.log('[WebScreen] Web redirected to login/logout URL, sending to app login:', navState.url);
      onLogout?.();
    }
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }): boolean => {
    const url = request.url.toLowerCase();
    const isAuthPage =
      url.endsWith('/login') ||
      url.includes('/login?') ||
      url.includes('/login#') ||
      url.includes('/auth/login') ||
      url.includes('/signin') ||
      url.includes('/logout');

    if (isAuthPage) {
      console.log('[WebScreen] Intercepted navigation to login/logout URL, sending to app login:', request.url);
      onLogout?.();
      return false;
    }
    return true;
  };

  const handleReload = () => {
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // If connection comes back and we had an error, try reloading automatically
  useEffect(() => {
    if (!isOffline && hasError) {
      handleReload();
    }
  }, [isOffline, hasError]);

  // Stop any playing audio inside WebView when siren is silenced
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onSirenStopped', () => {
      try {
        webViewRef.current?.injectJavaScript(`
          try {
            document.querySelectorAll('audio, video').forEach(function(el) {
              try { el.pause(); el.currentTime = 0; } catch(e) {}
            });
          } catch(e) {}
          true;
        `);
      } catch { }
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Reset chatUnavailable and navigate WebView whenever target URL prop updates
  useEffect(() => {
    if (initialUrl && webViewRef.current) {
      console.log('[WebScreen] URL prop changed, directing WebView to:', initialUrl);
      setChatUnavailable(false);
      setHasError(false);
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            var target = ${JSON.stringify(initialUrl)};
            if (window.location.href !== target) {
              window.location.replace(target);
            }
          } catch(e) {
            try { window.location.href = ${JSON.stringify(initialUrl)}; } catch(_) {}
          }
        })();
        true;
      `);
    }
  }, [initialUrl]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Loading Progress Bar */}
      {loading && loadProgress < 1 && !hasError && !chatUnavailable ? (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.max(15, loadProgress * 100)}%` }]} />
        </View>
      ) : null}

      {/* Main Fullscreen WebView Container */}
      <View style={styles.webViewWrapper}>
        {chatUnavailable ? (
          <View style={styles.fallbackContainer}>
            <View style={styles.fallbackCard}>
              <View style={styles.fallbackIconBadge}>
                <Text style={styles.fallbackIconText}>💬</Text>
              </View>
              <Text style={styles.fallbackTitle}>Conversation No Longer Available</Text>
              <Text style={styles.fallbackSubtitle}>
                The requested conversation may have been closed, transferred, or resolved by another administrator.
              </Text>
              <TouchableOpacity
                style={styles.fallbackButton}
                activeOpacity={0.8}
                onPress={() => {
                  setChatUnavailable(false);
                  if (webViewRef.current) {
                    webViewRef.current.injectJavaScript(`
                      window.location.href = ${JSON.stringify(DEFAULT_WEB_URL)};
                      true;
                    `);
                  }
                }}
              >
                <Text style={styles.fallbackButtonText}>Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : hasError ? (
          <NoInternetScreen
            title="Unable to Load Dashboard"
            subtitle="Please check your internet connection and tap below to retry."
            onRetry={handleReload}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: initialUrl }}
            style={styles.webView}
            injectedJavaScriptBeforeContentLoaded={injectedBeforeScript}
            injectedJavaScript={injectedAfterScript}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            androidLayerType="hardware"
            overScrollMode="never"
            onLoadStart={() => {
              setLoading(true);
              setHasError(false);
            }}
            onLoadProgress={(e) => setLoadProgress(e.nativeEvent.progress)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.statusCode === 404 || nativeEvent.statusCode === 410) {
                if (
                  initialUrl.includes('sessionId=') ||
                  initialUrl.includes('conversationId=') ||
                  initialUrl.includes('chatId=') ||
                  initialUrl.includes('/conversations')
                ) {
                  setChatUnavailable(true);
                } else {
                  setHasError(true);
                }
              } else if (nativeEvent.statusCode >= 500) {
                setHasError(true);
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EB322D" />
                <Text style={styles.loadingText}>Loading workspace...</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBarContainer: {
    height: 2.5,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#EB322D',
  },
  webViewWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  fallbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  fallbackIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackIconText: {
    fontSize: 28,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  fallbackButton: {
    backgroundColor: '#EB322D',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
