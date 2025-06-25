import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function SettingsScreen() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const apiKey = await AsyncStorage.getItem('openai_api_key');
      const subscription = await AsyncStorage.getItem('has_subscription');
      setHasApiKey(!!apiKey);
      setHasSubscription(!!subscription);
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const handleApiKeyManagement = () => {
    if (hasApiKey) {
      Alert.alert(
        'API Key Management',
        'What would you like to do with your API key?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => router.push('/api-key') },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => removeApiKey()
          },
        ]
      );
    } else {
      router.push('/api-key');
    }
  };

  const removeApiKey = async () => {
    try {
      await AsyncStorage.removeItem('openai_api_key');
      setHasApiKey(false);
      Alert.alert('Success', 'API key has been removed');
    } catch {
      Alert.alert('Error', 'Failed to remove API key');
    }
  };

  const handleSubscriptionManagement = () => {
    if (hasSubscription) {
      Alert.alert(
        'Subscription Active',
        'You have an active subscription. Manage it through the subscription screen.',
        [
          { text: 'OK' },
          { text: 'Manage', onPress: () => router.push('/subscription') },
        ]
      );
    } else {
      router.push('/subscription');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    hasValue 
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    hasValue?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={styles.settingSubtitle}>{subtitle}</ThemedText>
      </View>
      <View style={styles.settingAction}>
        {hasValue && (
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Settings
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            
            <SettingItem
              icon="key"
              title="API Key"
              subtitle={hasApiKey ? "API key configured" : "Set up your OpenAI API key"}
              onPress={handleApiKeyManagement}
              hasValue={hasApiKey}
            />
            
            <SettingItem
              icon="diamond"
              title="Subscription"
              subtitle={hasSubscription ? "Premium subscription active" : "Get unlimited access"}
              onPress={handleSubscriptionManagement}
              hasValue={hasSubscription}
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>About</ThemedText>
            
            <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
              <View style={styles.settingIcon}>
                <Ionicons name="information-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingTitle}>ChatMobile</ThemedText>
                <ThemedText style={styles.settingSubtitle}>Version 1.0.0</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
    opacity: 0.8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
}); 