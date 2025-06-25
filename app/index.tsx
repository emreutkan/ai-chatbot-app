import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AI_PROVIDERS } from '@/constants/AIProviders';

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // Add a small delay to ensure the app is properly loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user has any API keys configured
      let hasAnyApiKey = false;
      for (const provider of AI_PROVIDERS) {
        const key = await AsyncStorage.getItem(`${provider.id}_api_key`);
        if (key) {
          hasAnyApiKey = true;
          break;
        }
      }
      
      if (hasAnyApiKey) {
        // User has completed setup, go to main app
        router.replace('/chat');
      } else {
        // User needs to complete setup
        router.replace('/setup');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      // If there's an error, go to setup
      router.replace('/setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading ChatMobile...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // This should not be reached as we redirect, but just in case
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText>Starting app...</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
}); 