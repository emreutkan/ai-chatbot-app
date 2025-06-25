import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AI_PROVIDERS, AIProvider, getProviderById, getSelectedModel } from '@/constants/AIProviders';
import { AIService, ChatMessage } from '@/services/AIService';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

// Note: For subscription users, you would implement a backend API that:
// 1. Receives user messages from the mobile app
// 2. Makes OpenAI API calls using your server's API keys
// 3. Returns the AI responses to the mobile app
// This keeps your API keys secure on the server side

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [currentModel, setCurrentModel] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadUserSettings();
  }, []);

  // Add welcome message after settings are loaded
  useEffect(() => {
    const currentProvider = getProviderById(selectedProvider);
    const hasCurrentApiKey = apiKeys[selectedProvider];
    
    if (hasCurrentApiKey && currentProvider) {
      setMessages([
        {
          id: '1',
          text: `Hello! I'm ${currentProvider.name}, your AI assistant. I'm ready to help you with questions, creative writing, problem-solving, and much more. What would you like to talk about?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages([
        {
          id: '1',
          text: "Welcome to ChatMobile! To get started, please add API keys for your preferred AI providers by tapping the gear icon in the top right and selecting 'AI Providers'.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [selectedProvider, apiKeys]);

  const loadUserSettings = async () => {
    try {
      // Load all API keys
      const keys: Record<string, string> = {};
      for (const provider of AI_PROVIDERS) {
        const key = await AsyncStorage.getItem(`${provider.id}_api_key`);
        console.log(`Loading ${provider.id} API key:`, key ? 'Found' : 'Not found');
        if (key) {
          keys[provider.id] = key;
        }
      }
      setApiKeys(keys);
      console.log('Final loaded API keys:', Object.keys(keys));

      // Load selected provider preference
      const savedProvider = await AsyncStorage.getItem('selected_provider');
      console.log('Saved provider preference:', savedProvider);
      if (savedProvider && getProviderById(savedProvider)) {
        setSelectedProvider(savedProvider);
        // Load current model for this provider
        const model = await getSelectedModel(savedProvider);
        setCurrentModel(model);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const currentProvider = getProviderById(selectedProvider);
    const currentApiKey = apiKeys[selectedProvider];
    
    console.log('Debug sendMessage:', {
      selectedProvider,
      currentProvider: currentProvider?.name,
      hasApiKey: !!currentApiKey,
      allApiKeys: Object.keys(apiKeys),
      apiKeyLength: currentApiKey?.length
    });
    
    // Check if user has API key for selected provider
    if (!currentApiKey || !currentProvider) {
      Alert.alert(
        'No API Key', 
        `Please add your ${currentProvider?.name || 'AI provider'} API key in Settings to start chatting.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/settings') }
        ]
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Auto-scroll when user sends message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build conversation history for context (keep last 10 messages to manage token limits)
      const recentMessages = messages.slice(-10);
      const conversationHistory: ChatMessage[] = recentMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Add the current user message
      conversationHistory.push({
        role: 'user',
        content: userMessage.text
      });

      // Get the selected model for this provider
      const selectedModel = await getSelectedModel(selectedProvider);

      console.log(`Sending to ${currentProvider.name}:`, {
        messageCount: conversationHistory.length,
        lastMessage: userMessage.text,
        model: selectedModel
      });

      // Call the appropriate AI service with the selected model
      const response = await AIService.callAI(currentProvider, currentApiKey, conversationHistory, selectedModel);

      const aiResponse: Message = {
        id: Date.now().toString() + '_ai',
        text: response.content,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Auto-scroll to bottom after AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: message.isUser ? colors.primary : colors.card,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.messageText,
            { color: message.isUser ? 'white' : colors.text },
          ]}
        >
          {message.text}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              Chat
            </ThemedText>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.providerSelector}
                onPress={() => {
                  // Show provider selection modal or navigate to provider settings
                  Alert.alert(
                    'Select AI Provider',
                    'Choose your AI provider',
                    [
                      ...AI_PROVIDERS.map(provider => ({
                        text: provider.displayName,
                        onPress: async () => {
                          setSelectedProvider(provider.id);
                          await AsyncStorage.setItem('selected_provider', provider.id);
                          // Load and update current model for this provider
                          const model = await getSelectedModel(provider.id);
                          setCurrentModel(model);
                        }
                      })),
                      { text: 'Cancel', style: 'cancel' as const }
                    ]
                  );
                }}
              >
                <Ionicons 
                  name={getProviderById(selectedProvider)?.icon as any || 'chatbubble-ellipses'} 
                  size={20} 
                  color={colors.primary} 
                />
                <View style={styles.providerTextContainer}>
                  <ThemedText style={styles.providerText}>
                    {getProviderById(selectedProvider)?.name || 'Select AI'}
                  </ThemedText>
                  {currentModel && (
                    <ThemedText style={styles.modelText}>
                      {currentModel}
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer} 
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={[styles.messageContainer, styles.aiMessage]}>
                <View style={[styles.messageBubble, { backgroundColor: colors.card }]}>
                  <ThemedText style={styles.loadingText}>AI is typing...</ThemedText>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 5,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  inputContainer: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 20,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 6,
  },
  providerTextContainer: {
    marginLeft: 8,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modelText: {
    fontSize: 10,
    opacity: 0.7,
    fontStyle: 'italic',
  },
}); 