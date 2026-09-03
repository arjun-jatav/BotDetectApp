import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginHeader } from '../components/LoginHeader';
import { InputField } from '../../../shared/components/InputField';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { loginUser, getSavedCredentials, saveSavedCredentials, clearSavedCredentials } from '../api/authApi';
import { getFCMToken, requestNotificationPermission } from '../../../shared/services/notifications';
import { LoginResponse } from '../../../core/types';

interface LoginScreenProps {
  onLoginSuccess?: (userData?: LoginResponse) => void;
  onNavigateToSignUp?: () => void;
}

function formatAuthErrorMessage(rawError?: string | null): string {
  if (!rawError || typeof rawError !== 'string') {
    return 'Invalid email or password. Please try again.';
  }

  const trimmed = rawError.trim();

  if (
    trimmed.includes('invalid_email_or_password') ||
    trimmed.includes('invalid_credentials') ||
    trimmed.includes('invalid email or password')
  ) {
    return 'Invalid email or password. Please try again.';
  }

  if (trimmed.includes('user_not_found') || trimmed.includes('account_not_found')) {
    return 'Account not found with this email.';
  }

  if (trimmed.includes('account_disabled') || trimmed.includes('user_disabled')) {
    return 'Your account has been deactivated. Please contact your workspace administrator.';
  }

  if (trimmed.includes('too_many_requests') || trimmed.includes('rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (trimmed.startsWith('errors.')) {
    const clean = trimmed.replace(/^errors\.(auth\.)?/, '').replace(/_/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return trimmed;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const isSmallScreen = height < 700;
  const isTablet = width >= 768;

  // Track keyboard appearance and automatically scroll the form into view
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load saved credentials on mount if available
  useEffect(() => {
    let isMounted = true;

    async function loadSavedCredentials() {
      try {
        const saved = await getSavedCredentials();
        if (isMounted && saved) {
          if (saved.identifier) {
            setIdentifier(saved.identifier);
          }
          if (saved.password) {
            setPassword(saved.password);
          }
          if (typeof saved.keepSignedIn === 'boolean') {
            setKeepSignedIn(saved.keepSignedIn);
          }
        }
      } catch (err) {
        console.warn('[LoginScreen] Failed to load saved credentials:', err);
      }
    }

    loadSavedCredentials();

    return () => {
      isMounted = false;
    };
  }, []);

  // Retrieve FCM Token when the login screen loads
  useEffect(() => {
    let isMounted = true;

    async function initFCM() {
      try {
        await requestNotificationPermission();
        const token = await getFCMToken();
        if (isMounted && token) {
          setFcmToken(token);
          console.log('[LoginScreen] FCM Token retrieved on login screen:', token);
        }
      } catch (err) {
        console.warn('[LoginScreen] Failed to retrieve FCM Token:', err);
      }
    }

    initFCM();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleKeepSignedIn = async () => {
    const nextState = !keepSignedIn;
    setKeepSignedIn(nextState);
    if (!nextState) {
      await clearSavedCredentials();
    } else if (identifier.trim() && password) {
      await saveSavedCredentials({
        identifier: identifier.trim(),
        password,
        keepSignedIn: true,
      });
    }
  };

  const handleIdentifierChange = (text: string) => {
    setIdentifier(text);
    if (identifierError) {
      setIdentifierError('');
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError('');
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Email validation
    const emailTrimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed) {
      setIdentifierError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(emailTrimmed)) {
      setIdentifierError('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let currentToken = fcmToken;
      if (!currentToken) {
        currentToken = await getFCMToken();
        if (currentToken) {
          setFcmToken(currentToken);
        }
      }

      console.log('[LoginScreen] Submitting login with FCM token:', currentToken);
      const response = await loginUser(identifier, password, 10000, currentToken, keepSignedIn);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(response);
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials and try again.';
      setApiError(formatAuthErrorMessage(msg));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (isSmallScreen ? 12 : 24),
              paddingBottom: insets.bottom + (keyboardHeight > 0 ? keyboardHeight + 40 : 40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={true}
          nestedScrollEnabled={true}
        >
          <View style={[styles.innerWrapper, isTablet && styles.tabletWrapper]}>
            {/* Admin Workspace Header */}
            <LoginHeader isSmallScreen={isSmallScreen} />

            {/* Form Inputs */}
            <View style={styles.form}>
              {apiError ? (
                <View style={styles.apiErrorBanner}>
                  <Text style={styles.apiErrorText}>{apiError}</Text>
                </View>
              ) : null}

              <InputField
                label="Email"
                required
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={handleIdentifierChange}
                error={identifierError}
                returnKeyType="next"
                onFocus={scrollToBottom}
                onSubmitEditing={() => passwordRef.current?.focus?.()}
                blurOnSubmit={false}
              />

              <InputField
                ref={passwordRef}
                label="Password"
                required
                placeholder="Enter your password"
                isPassword
                autoCapitalize="none"
                value={password}
                onChangeText={handlePasswordChange}
                error={passwordError}
                returnKeyType="done"
                onFocus={scrollToBottom}
                onSubmitEditing={handleLogin}
              />

              {/* Keep Signed In Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={handleToggleKeepSignedIn}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
                    {keepSignedIn && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Keep me signed in</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Primary Action Button */}
              <PrimaryButton
                title="Sign In"
                backgroundColor="#EB322D"
                loading={loading}
                onPress={handleLogin}
                style={styles.signInButton}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  tabletWrapper: {
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  apiErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  apiErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 22,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#EB322D',
    borderColor: '#EB322D',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -1,
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  signInButton: {
    marginTop: 4,
  },
});
