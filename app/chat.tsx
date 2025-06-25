import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

// Mock function for premium subscription API calls
// In a real app, this would call your backend API with your OpenAI keys
const mockPremiumAPICall = async (conversationHistory: any[]) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock response structure similar to OpenAI API
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: "I'm responding through the premium subscription service! This would normally use your backend API with your OpenAI keys to provide unlimited access to users with subscriptions."
        }
      }]
    })
  };
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadUserSettings();
    // Add a welcome message
    setMessages([
      {
        id: '1',
        text: "Hello! I'm your AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const loadUserSettings = async () => {
    try {
      const [key, subscription] = await Promise.all([
        AsyncStorage.getItem('openai_api_key'),
        AsyncStorage.getItem('has_subscription')
      ]);
      setApiKey(key);
      setHasSubscription(subscription);
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Check if user has either API key or subscription
    if (!apiKey && !hasSubscription) {
      Alert.alert(
        'No Access', 
        'Please either add your OpenAI API key or subscribe to ChatMobile Premium to start chatting.',
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

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Add the current user message
      conversationHistory.push({
        role: 'user',
        content: userMessage.text
      });

      let data;

      if (apiKey) {
        // Use user's own OpenAI API key
        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: conversationHistory,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({}));
          console.error('OpenAI API Error:', apiResponse.status, errorData);
          
          if (apiResponse.status === 401) {
            throw new Error('Invalid API key. Please check your OpenAI API key.');
          } else if (apiResponse.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (apiResponse.status === 403) {
            throw new Error('API key does not have access to this model. Please check your OpenAI account.');
          } else {
            throw new Error(`OpenAI API error: ${apiResponse.status}`);
          }
        }

        data = await apiResponse.json();
      } else if (hasSubscription) {
        // Use premium subscription service (would be your backend API)
        // For now, we'll simulate this with a mock response
        const mockResponse = await mockPremiumAPICall(conversationHistory);
        data = await mockResponse.json();
      } else {
        throw new Error('No API access available');
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }

      const aiResponse: Message = {
        id: Date.now().toString() + '_ai',
        text: data.choices[0].message.content.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
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
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
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
}); 