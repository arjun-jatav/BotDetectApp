import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_ICON_CONFIG, AppIconItem } from '../../../core/config/appIcons';
import { changeAppIcon, getCurrentAppIcon } from '../../../shared/services/appIcon';
import { AppIconConfigScreenProps } from '../types';

export function AppIconConfigScreen({ onBack, onIconChanged }: AppIconConfigScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [selectedIconId, setSelectedIconId] = useState<string>('');
  const [loadingIconId, setLoadingIconId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getCurrentAppIcon()
      .then((id) => {
        if (isMounted) {
          setSelectedIconId(id);
          setInitialLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setInitialLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectIcon = async (item: AppIconItem) => {
    if (selectedIconId === item.id) {
      Alert.alert('Already Selected', `"${item.name}" is already your active app icon.`);
      return;
    }

    setLoadingIconId(item.id);

    try {
      await changeAppIcon(item.id);
      setSelectedIconId(item.id);
      if (onIconChanged) {
        onIconChanged(item.imageUrl);
      }
      Alert.alert(
        'Success',
        `Icon changed successfully to "${item.name}".\n\n(iOS will display the selected launcher icon on your home screen).`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to change app icon. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoadingIconId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerWrapper, isTablet && styles.tabletWrapper]}>
          {/* Top Bar with Back Button */}
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>App Icon Configuration</Text>
            <Text style={styles.subtitle}>Select an icon to use for the application.</Text>
          </View>

          {/* Dynamic Cards List */}
          {initialLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#38BDF8" />
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {APP_ICON_CONFIG.map((item) => {
                const isSelected = selectedIconId === item.id;
                const isChanging = loadingIconId === item.id;
                const isDisabled = loadingIconId !== null;

                return (
                  <View
                    key={item.id}
                    style={[styles.card, isSelected && styles.cardSelected]}
                  >
                    {/* Icon Preview */}
                    <View style={styles.previewWrapper}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Icon Info & Actions */}
                    <View style={styles.cardInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.iconName}>{item.name}</Text>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isSelected && styles.actionButtonSelected,
                          isDisabled && !isChanging && styles.actionButtonDisabled,
                        ]}
                        disabled={isDisabled || isSelected}
                        onPress={() => handleSelectIcon(item)}
                        activeOpacity={0.8}
                      >
                        {isChanging ? (
                          <View style={styles.buttonLoadingRow}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.actionButtonText}> Changing...</Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.actionButtonText,
                              isSelected && styles.actionButtonTextSelected,
                            ]}
                          >
                            {isSelected ? '✓ In Use' : 'Use Icon'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  tabletWrapper: {
    backgroundColor: '#1E293B',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 20,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  previewWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  selectedBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  selectedBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSelected: {
    backgroundColor: '#334155',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtonTextSelected: {
    color: '#94A3B8',
  },
});
