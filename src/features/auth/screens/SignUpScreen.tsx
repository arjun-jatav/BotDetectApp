import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldIcon } from '../../../shared/components/icons/ShieldIcon';
import { InputField } from '../../../shared/components/InputField';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { APP_ICON_CONFIG, AppIconItem } from '../../../core/config/appIcons';
import { changeAppIcon } from '../../../shared/services/appIcon';

interface SignUpScreenProps {
  onSignUpSuccess?: () => void;
  onBackToLogin?: () => void;
  onNavigateToIconConfig?: () => void;
}

export function SignUpScreen({ onSignUpSuccess, onBackToLogin, onNavigateToIconConfig }: SignUpScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [selectedIconUrl, setSelectedIconUrl] = useState<string>(APP_ICON_CONFIG[0].imageUrl);
  const [iconLoading, setIconLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const isSmallScreen = height < 700;
  const isTablet = width >= 768;

  const handleNameChange = (text: string) => {
    setFullName(text);
    if (nameError) setNameError('');
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError('');
  };

  const handleSelectIcon = async (item: AppIconItem) => {
    setSelectedIconUrl(item.imageUrl);
    try {
      await changeAppIcon(item.id);
      Alert.alert(
        'App Icon Updated',
        `• In-App Icon: Switched to "${item.name}"\n• iOS Home Screen Icon: Switched to ${item.iosIconName ?? 'Default'}`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'In-app icon updated.';
      Alert.alert('Notice', msg);
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Full name validation
    if (!fullName.trim()) {
      setNameError('Full name is required');
      isValid = false;
    }

    // Email validation
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError('Please enter a valid email address');
        isValid = false;
      }
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    setLoading(true);
    // Simulate API registration call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Account Created',
        'Your account has been successfully created with your chosen icon.',
        [
          {
            text: 'Get Started',
            onPress: () => {
              if (onSignUpSuccess) {
                onSignUpSuccess();
              }
            },
          },
        ]
      );
    }, 1000);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + (isSmallScreen ? 12 : 24),
                paddingBottom: insets.bottom + (isSmallScreen ? 16 : 24),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.innerWrapper, isTablet && styles.tabletWrapper]}>
              {/* Header with Dynamic Icon from URL */}
              <View style={[styles.header, isSmallScreen && styles.headerCompact]}>
                <View style={[styles.logoBadge, isSmallScreen && styles.logoBadgeCompact]}>
                  {selectedIconUrl ? (
                    <Image
                      source={{ uri: selectedIconUrl }}
                      style={styles.headerIconImage}
                      resizeMode="cover"
                      onLoadStart={() => setIconLoading(true)}
                      onLoadEnd={() => setIconLoading(false)}
                    />
                  ) : (
                    <ShieldIcon size={isSmallScreen ? 24 : 28} color="#38BDF8" />
                  )}
                  {iconLoading && (
                    <View style={styles.iconLoadingOverlay}>
                      <ActivityIndicator size="small" color="#38BDF8" />
                    </View>
                  )}
                </View>
                <Text style={[styles.title, isSmallScreen && styles.titleCompact]}>
                  Create Account
                </Text>
                <Text style={styles.subtitle}>Sign up for BotDetect</Text>
              </View>

              {/* Form Inputs */}
              <View style={styles.form}>
                <InputField
                  label="Full Name"
                  placeholder="John Doe"
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={fullName}
                  onChangeText={handleNameChange}
                  error={nameError}
                  returnKeyType="next"
                />

                <InputField
                  label="Email"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={handleEmailChange}
                  error={emailError}
                  returnKeyType="next"
                />

                <InputField
                  label="Password"
                  placeholder="At least 6 characters"
                  isPassword
                  autoCapitalize="none"
                  value={password}
                  onChangeText={handlePasswordChange}
                  error={passwordError}
                  returnKeyType="next"
                />

                <InputField
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  isPassword
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  error={confirmPasswordError}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />

                {/* Change App Icon from URL Selection Section */}
                <View style={styles.iconSelectionSection}>
                  <View style={styles.iconSectionHeader}>
                    <Text style={styles.iconSectionTitle}>Choose App Icon (from URL)</Text>
                    <Text style={styles.iconSectionBadge}>Dynamic</Text>
                  </View>

                  <View style={styles.iconButtonRow}>
                    {APP_ICON_CONFIG.map((item) => {
                      const isSelected = selectedIconUrl === item.imageUrl;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.iconSelectButton,
                            isSelected && styles.iconSelectButtonActive,
                          ]}
                          onPress={() => handleSelectIcon(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.iconThumbWrapper}>
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.iconThumb}
                              resizeMode="cover"
                            />
                            {isSelected && (
                              <View style={styles.checkBadge}>
                                <Text style={styles.checkText}>✓</Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[
                            styles.iconOptionText,
                            isSelected && styles.iconOptionTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {onNavigateToIconConfig && (
                    <TouchableOpacity
                      style={styles.manageIconsLink}
                      onPress={onNavigateToIconConfig}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manageIconsLinkText}>⚙️ Open Full App Icon Configuration →</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Primary Sign Up Button */}
                <View style={styles.buttonWrapper}>
                  <PrimaryButton
                    title="Create Account"
                    loading={loading}
                    onPress={handleSignUp}
                  />
                </View>
              </View>

              {/* Footer */}
              <View style={[styles.footer, isSmallScreen && styles.footerCompact]}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={onBackToLogin}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.loginLinkText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  tabletWrapper: {
    maxWidth: 480,
    backgroundColor: '#1E293B',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerCompact: {
    marginBottom: 12,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  logoBadgeCompact: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: 8,
  },
  headerIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  iconLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  iconSelectionSection: {
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconSectionBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iconButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  iconSelectButtonActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  iconThumbWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 8,
  },
  iconThumb: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#38BDF8',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#0F172A',
    fontSize: 8,
    fontWeight: '900',
  },
  iconOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    flexShrink: 1,
  },
  iconOptionTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  manageIconsLink: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  manageIconsLinkText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerCompact: {
    marginTop: 14,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  loginLinkText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
});
