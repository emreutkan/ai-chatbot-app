import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ApiKeyScreen() {
  const [apiKey, setApiKey] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const validateApiKey = (key: string) => {
    // Basic validation for OpenAI API key format
    return key.startsWith('sk-') && key.length > 20;
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key');
      return;
    }

    if (!validateApiKey(apiKey)) {
      Alert.alert('Invalid API Key', 'Please enter a valid OpenAI API key (starts with sk-)');
      return;
    }

    setIsLoading(true);
    
    try {
      // Store API key securely
      await AsyncStorage.setItem('openai_api_key', apiKey);
      Alert.alert(
        'Success!', 
        'Your API key has been saved securely. You can now start chatting!',
        [
          { text: 'Start Chatting', onPress: () => router.replace('/(tabs)') }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={60} color={colors.primary} />
          </View>
          <ThemedText type="title" style={styles.title}>
            Enter Your API Key
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Use your own OpenAI API key for unlimited access
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <ThemedText style={styles.infoTitle}>How to get your API key:</ThemedText>
              <ThemedText style={styles.infoDescription}>
                1. Visit platform.openai.com{'\n'}
                2. Go to API Keys section{'\n'}
                3. Create a new secret key{'\n'}
                4. Copy and paste it below
              </ThemedText>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>OpenAI API Key</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor={colors.placeholder}
                secureTextEntry={isSecure}
                autoCapitalize="none"
                autoCorrect={false}
                multiline={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setIsSecure(!isSecure)}
              >
                <Ionicons 
                  name={isSecure ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.icon} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <ThemedText style={styles.securityText}>
              Your API key is stored securely on your device and never shared
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton, 
              { backgroundColor: colors.primary },
              (!apiKey || isLoading) && { backgroundColor: colors.border }
            ]}
            onPress={handleSaveApiKey}
            disabled={!apiKey || isLoading}
          >
            <ThemedText style={[
              styles.saveButtonText,
              (!apiKey || isLoading) && { color: colors.icon }
            ]}>
              {isLoading ? 'Saving...' : 'Save & Continue'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By providing your API key, you agree that usage costs will be charged directly to your OpenAI account
          </ThemedText>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  eyeButton: {
    padding: 16,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  securityText: {
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.7,
    flex: 1,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 16,
  },
}); 