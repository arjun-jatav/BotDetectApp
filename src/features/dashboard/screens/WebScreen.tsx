import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { DEFAULT_WEB_URL } from '../../../core/config/api';
import { WebScreenProps } from '../types';

export function WebScreen({
  initialUrl = DEFAULT_WEB_URL,
  userData,
}: WebScreenProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView<object>>(null);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  const token =
    userData?.token ||
    userData?.admin_token ||
    userData?.accessToken ||
    userData?.jwt ||
    '';
  const role = userData?.user?.role || userData?.role || '';
  const identifier =
    userData?.identifier || userData?.email || userData?.username || '';
  const password = userData?.password || '';

  // Injected before content loads: sets tokens in localStorage before React mounts
  const injectedBeforeScript = useMemo(() => {
    return `
      (function() {
        try {
          var token = ${JSON.stringify(token)};
          var role = ${JSON.stringify(role)};
          if (token) {
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_remember_me', '1');
            localStorage.setItem('admin_show_welcome_toast', '0');
            if (role === 'superadmin' || role === 'super_admin' || location.pathname.indexOf('/super-admin') === 0) {
              localStorage.setItem('super_admin_token', token);
            }
          }
        } catch(e) {}
      })();
      true;
    `;
  }, [token, role]);

  // Injected after page loads: ensures token sync and auto-fills + submits form if login page appears
  const injectedAfterScript = useMemo(() => {
    return `
      (function() {
        var token = ${JSON.stringify(token)};
        var identifier = ${JSON.stringify(identifier)};
        var password = ${JSON.stringify(password)};

        if (token) {
          try {
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_remember_me', '1');
          } catch(e) {}
        }

        // Auto-fill and auto-submit login form if rendered
        var attempts = 0;
        var interval = setInterval(function() {
          attempts++;
          var emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="company.com"], input[placeholder*="email" i], input[type="text"]');
          var passInput = document.querySelector('input[type="password"], input[name="password"]');

          if (emailInput && passInput && identifier && password) {
            function setVal(elem, val) {
              var proto = window.HTMLInputElement.prototype;
              var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
              if (descriptor && descriptor.set) {
                descriptor.set.call(elem, val);
              } else {
                elem.value = val;
              }
              elem.dispatchEvent(new Event('input', { bubbles: true }));
              elem.dispatchEvent(new Event('change', { bubbles: true }));
              elem.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            setVal(emailInput, identifier);
            setVal(passInput, password);

            var buttons = Array.from(document.querySelectorAll('button'));
            var signInBtn = buttons.find(function(b) {
              return /sign in|log in/i.test(b.textContent || '');
            }) || document.querySelector('button[type="submit"]');

            if (signInBtn && !signInBtn.disabled) {
              clearInterval(interval);
              setTimeout(function() {
                signInBtn.click();
              }, 120);
            }
          }

          if (attempts > 30) {
            clearInterval(interval);
          }
        }, 250);
      })();
      true;
    `;
  }, [token, identifier, password]);

  const handleReload = () => {
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Loading Progress Bar */}
      {loading && loadProgress < 1 ? (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.max(15, loadProgress * 100)}%` }]} />
        </View>
      ) : null}

      {/* Main Fullscreen WebView Container */}
      <View style={styles.webViewWrapper}>
        <WebView
          ref={webViewRef}
          source={{ uri: initialUrl }}
          style={styles.webView}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeScript}
          injectedJavaScript={injectedAfterScript}
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

        {/* Error Fallback Screen */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Unable to load page</Text>
            <Text style={styles.errorSubtitle}>
              Please check your network connection or server availability.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
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
  errorOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#EB322D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
