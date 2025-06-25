import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const plans = [
    {
      id: 'monthly',
      title: 'Monthly',
      price: '$9.99',
      period: '/month',
      features: ['Unlimited chats', 'GPT-4 access', 'Priority support', 'No ads'],
    },
    {
      id: 'yearly',
      title: 'Yearly',
      price: '$99.99',
      period: '/year',
      discount: 'Save 17%',
      features: ['Unlimited chats', 'GPT-4 access', 'Priority support', 'No ads', 'Early access to new features'],
    },
  ];

  const handleSubscribe = async () => {
    try {
      // In a real app, you would process the payment here
      await AsyncStorage.setItem('has_subscription', 'true');
      Alert.alert(
        'Success!',
        'Welcome to ChatMobile Premium! You now have unlimited access.',
        [
          { text: 'Start Chatting', onPress: () => router.replace('/(tabs)') }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Choose Your Plan
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Unlock unlimited AI conversations
          </ThemedText>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: colors.border, backgroundColor: colors.card },
                selectedPlan === plan.id && { borderColor: colors.primary, backgroundColor: colors.surface }
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.discount && (
                <View style={[styles.discountBadge, { backgroundColor: colors.error }]}>
                  <ThemedText style={styles.discountText}>{plan.discount}</ThemedText>
                </View>
              )}
              
              <ThemedText style={styles.planTitle}>{plan.title}</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: colors.primary }]}>{plan.price}</ThemedText>
                <ThemedText style={styles.period}>{plan.period}</ThemedText>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <ThemedText style={styles.featureText}>{feature}</ThemedText>
                  </View>
                ))}
              </View>

              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.subscribeButton, { backgroundColor: colors.primary }]} 
          onPress={handleSubscribe}
        >
          <ThemedText style={styles.subscribeButtonText}>
            Subscribe Now
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            • Cancel anytime{'\n'}
            • Secure payment processing{'\n'}
            • 7-day free trial included
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 20,
    padding: 8,
    alignSelf: 'flex-start',
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
  plansContainer: {
    gap: 16,
    marginBottom: 30,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    opacity: 0.7,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  subscribeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 