import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AI_PROVIDERS } from '@/constants/AIProviders';
import { ConversationService, Conversation } from '@/services/ConversationService';

export default function SettingsScreen() {
  const [hasAnyApiKey, setHasAnyApiKey] = useState(false);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    checkSetupStatus();
    loadCurrentConversation();
  }, []);

  const checkSetupStatus = async () => {
    try {
      let count = 0;
      for (const provider of AI_PROVIDERS) {
        const key = await AsyncStorage.getItem(`${provider.id}_api_key`);
        if (key) count++;
      }
      setApiKeyCount(count);
      setHasAnyApiKey(count > 0);
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const loadCurrentConversation = async () => {
    try {
      const currentConvId = await ConversationService.getCurrentConversationId();
      if (currentConvId) {
        const conversations = await ConversationService.getConversations();
        const conversation = conversations.find(c => c.id === currentConvId);
        setCurrentConversation(conversation || null);
      }
    } catch (error) {
      console.error('Error loading current conversation:', error);
    }
  };

  const handleApiKeyManagement = () => {
    router.push('/ai-providers');
  };

  const handleSubscriptionManagement = () => {
    router.push('/subscription');
  };

  const handleExportAllChats = async () => {
    try {
      const allConversations = await ConversationService.getConversations();
      
      if (allConversations.length === 0) {
        Alert.alert('No Chats', 'There are no conversations to export.');
        return;
      }

      // Create a comprehensive export of all conversations
      const exportText = allConversations.map((conversation, index) => {
        const conversationText = ConversationService.exportConversationAsText(conversation);
        return `\n${'='.repeat(60)}\nCONVERSATION ${index + 1} OF ${allConversations.length}\n${'='.repeat(60)}\n${conversationText}`;
      }).join('\n\n');

      const header = `ChatMobile - Complete Export\nTotal Conversations: ${allConversations.length}\nExported: ${new Date().toLocaleString()}\n${'='.repeat(60)}\n`;
      
      Share.share({
        message: header + exportText,
        title: `ChatMobile Export - ${allConversations.length} Conversations`,
      });
    } catch (error) {
      console.error('Error exporting all chats:', error);
      Alert.alert('Error', 'Failed to export conversations');
    }
  };

  const handleClearAllChats = () => {
    Alert.alert(
      'Clear All Chats',
      'Are you sure you want to delete ALL conversations? This will permanently remove all chat history and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all conversations and delete them one by one
              const allConversations = await ConversationService.getConversations();
              
              for (const conversation of allConversations) {
                await ConversationService.deleteConversation(conversation.id);
              }

              // Create a fresh new conversation as the current one
              const newConversation: Conversation = {
                id: Date.now().toString(),
                title: 'New Conversation',
                messages: [],
                providerId: 'openai', // Default provider
                modelName: 'gpt-4o', // Default model
                systemPrompt: '',
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              await ConversationService.setCurrentConversationId(newConversation.id);
              await ConversationService.saveConversation(newConversation);
              setCurrentConversation(newConversation);
              
              Alert.alert('Success', 'All conversations have been cleared successfully!', [
                { text: 'OK', onPress: () => router.push('/chat') }
              ]);
            } catch (error) {
              console.error('Error clearing all chats:', error);
              Alert.alert('Error', 'Failed to clear all conversations');
            }
          }
        }
      ]
    );
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
              icon="hardware-chip"
              title="AI Providers"
              subtitle={hasAnyApiKey ? `${apiKeyCount} provider${apiKeyCount !== 1 ? 's' : ''} configured` : "Set up your AI provider API keys"}
              onPress={handleApiKeyManagement}
              hasValue={hasAnyApiKey}
            />
            
            <SettingItem
              icon="diamond"
              title="Subscription"
              subtitle="Premium subscription (Coming Soon)"
              onPress={handleSubscriptionManagement}
              hasValue={false}
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

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Chat Management</ThemedText>
            
            <SettingItem
              icon="document-text"
              title="Export All Chats"
              subtitle="Export all conversations"
              onPress={handleExportAllChats}
              hasValue={false}
            />
            
            <SettingItem
              icon="trash"
              title="Clear All Chats"
              subtitle="Clear all conversations"
              onPress={handleClearAllChats}
              hasValue={false}
            />
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