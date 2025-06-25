import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SetupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleSubscription = () => {
    router.push('/subscription');
  };

  const handleApiKey = () => {
    router.push('/ai-providers');
  };

  const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isDark) {
      return (
        <LinearGradient
          colors={[colors.backgroundTop, colors.background]}
          style={styles.gradientBackground}
        >
          {children}
        </LinearGradient>
      );
    }
    return <ThemedView style={styles.container}>{children}</ThemedView>;
  };

  return (
    <BackgroundWrapper>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={80} color={colors.primary} />
          <ThemedText type="title" style={styles.title}>
            ChatMobile
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Your AI-powered chat companion
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          <ThemedText type="subtitle" style={styles.chooseText}>
            Choose how to get started:
          </ThemedText>

          <TouchableOpacity style={styles.optionButton} onPress={handleSubscription}>
            <View style={[
              styles.premiumButton,
              { backgroundColor: colors.primary },
              isDark && styles.glassEffect
            ]}>
              <Ionicons name="card" size={24} color="white" />
              <ThemedText style={styles.buttonText}>
                Subscribe for Premium Access
              </ThemedText>
              <ThemedText style={styles.buttonSubtext}>
                Unlimited chats • Priority support • Latest features
              </ThemedText>
            </View>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedText style={styles.dividerText}>OR</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity style={styles.optionButton} onPress={handleApiKey}>
            <View style={[
              styles.outlineButton,
              { 
                borderColor: colors.secondary,
                backgroundColor: isDark ? colors.glassBackground : 'transparent'
              },
              isDark && styles.glassEffect
            ]}>
              <Ionicons name="key" size={24} color={colors.secondary} />
              <ThemedText style={[styles.outlineButtonText, { color: colors.secondary }]}>
                Use Your AI Provider API Keys
              </ThemedText>
              <ThemedText style={[styles.outlineButtonSubtext, { color: colors.secondary }]}>
                ChatGPT • Claude • Gemini • Groq • Pay as you use
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </View>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 8,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  chooseText: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 20,
  },
  optionButton: {
    marginBottom: 20,
  },
  premiumButton: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  glassEffect: {
    shadowColor: '#9D4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 6,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  outlineButton: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  outlineButtonSubtext: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 16,
  },
}); 