import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal, Share, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { AI_PROVIDERS, AIProvider, getProviderById, getSelectedModel, setSelectedModel } from '@/constants/AIProviders';
import { AIService, ChatMessage } from '@/services/AIService';
import { 
  ConversationService, 
  Conversation, 
  StoredMessage, 
  SystemPrompt,
  MODEL_CONTEXT_LIMITS 
} from '@/services/ConversationService';

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
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<string>('');
  const [showConversationList, setShowConversationList] = useState(false);
  const [showSystemPromptSelector, setShowSystemPromptSelector] = useState(false);
  const [showContextInfo, setShowContextInfo] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContextPopup, setShowContextPopup] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sidebarAnimation = useRef(new Animated.Value(-300)).current; // Start off-screen to the left
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (selectedProvider && currentModel) {
      loadSystemPrompt();
    }
  }, [selectedProvider, currentModel]);

  // Animate sidebar
  useEffect(() => {
    if (showSidebar) {
      Animated.timing(sidebarAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sidebarAnimation, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showSidebar]);

  // Auto-save chat when user starts typing
  useEffect(() => {
    if (inputText.trim() && currentConversation && currentConversation.messages.length === 1) {
      // If this is the first time user is typing in a new conversation, save it
      const saveInitialChat = async () => {
        try {
          await ConversationService.saveConversation(currentConversation);
          await loadConversations();
        } catch (error) {
          console.error('Error auto-saving chat:', error);
        }
      };
      saveInitialChat();
    }
  }, [inputText, currentConversation]);

  // Handle navigation from settings to clear chat
  useEffect(() => {
    const handleClearFromSettings = async () => {
      // Check if there's a flag to clear conversation (could be set via navigation params)
      // For now, we'll rely on the settings screen navigating here and the user can clear manually
    };
    handleClearFromSettings();
  }, []);

  const initializeApp = async () => {
    await loadUserSettings();
    await loadConversations();
    await loadSystemPrompts();
    await loadOrCreateCurrentConversation();
  };

  const loadConversations = async () => {
    try {
      const loadedConversations = await ConversationService.getConversations();
      console.log('Loaded conversations:', loadedConversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages.length,
        userMessages: conv.messages.filter(m => m.isUser).length,
        aiMessages: conv.messages.filter(m => !m.isUser).length
      })));
      setConversations(loadedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadSystemPrompts = async () => {
    try {
      const prompts = await ConversationService.getSystemPrompts();
      setSystemPrompts(prompts);
    } catch (error) {
      console.error('Error loading system prompts:', error);
    }
  };

  const loadSystemPrompt = async () => {
    try {
      const prompt = await ConversationService.getSelectedSystemPrompt(selectedProvider, currentModel);
      setCurrentSystemPrompt(prompt);
    } catch (error) {
      console.error('Error loading system prompt:', error);
    }
  };

  const loadOrCreateCurrentConversation = async () => {
    try {
      const currentConvId = await ConversationService.getCurrentConversationId();
      if (currentConvId) {
        const conversations = await ConversationService.getConversations();
        const conversation = conversations.find(c => c.id === currentConvId);
        if (conversation) {
          setCurrentConversation(conversation);
          setMessages(conversation.messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp,
          })));
          return;
        }
      }
      
      // Create new conversation
      await createNewConversation();
    } catch (error) {
      console.error('Error loading current conversation:', error);
      await createNewConversation();
    }
  };

  const createNewConversation = async () => {
    try {
      const provider = getProviderById(selectedProvider);
      const model = await getSelectedModel(selectedProvider);
      
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: 'New Conversation',
        messages: [],
        providerId: selectedProvider,
        modelName: model,
        systemPrompt: currentSystemPrompt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentConversation(newConversation);
      setMessages([]);
      await ConversationService.setCurrentConversationId(newConversation.id);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        text: `Hello! I'm ${provider?.name}, your AI assistant. I'm ready to help you with questions, creative writing, problem-solving, and much more. What would you like to talk about?`,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // Save conversation with welcome message
      const updatedConversation = {
        ...newConversation,
        messages: [{
          ...welcomeMessage,
          tokens: ConversationService.estimateTokens(welcomeMessage.text),
        }]
      };
      
      setCurrentConversation(updatedConversation);
      await ConversationService.saveConversation(updatedConversation);
      await loadConversations();
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const saveMessageToConversation = async (message: Message) => {
    if (!currentConversation) return;

    try {
      const storedMessage: StoredMessage = {
        ...message,
        tokens: ConversationService.estimateTokens(message.text),
      };

      const updatedConversation: Conversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, storedMessage],
        updatedAt: new Date(),
      };

      // Update title if this is the first user message
      if (message.isUser && currentConversation.messages.length <= 1) {
        updatedConversation.title = ConversationService.generateConversationTitle(message.text);
      }

      console.log('Saving message:', {
        messageId: message.id,
        isUser: message.isUser,
        text: message.text.substring(0, 50) + '...',
        conversationId: currentConversation.id,
        totalMessagesAfter: updatedConversation.messages.length
      });

      setCurrentConversation(updatedConversation);
      await ConversationService.saveConversation(updatedConversation);
      await loadConversations();
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

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
    if (!inputText.trim() || !currentConversation) return;
    
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
    
    // Save user message
    await saveMessageToConversation(userMessage);
    
    // Auto-scroll when user sends message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Get current conversation messages and apply smart context trimming
      const conversationMessages = [...currentConversation.messages];
      const userStoredMessage: StoredMessage = {
        ...userMessage,
        tokens: ConversationService.estimateTokens(userMessage.text),
      };
      conversationMessages.push(userStoredMessage);

      // Apply smart context trimming
      const trimmedMessages = ConversationService.trimContext(
        conversationMessages,
        currentModel,
        currentSystemPrompt
      );

      // Build conversation history for API
      const conversationHistory: ChatMessage[] = [];
      
      // Add system prompt if available
      if (currentSystemPrompt) {
        conversationHistory.push({
          role: 'system',
          content: currentSystemPrompt
        });
      }

      // Add trimmed messages
      trimmedMessages.forEach(msg => {
        conversationHistory.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        });
      });

      // Get the selected model for this provider
      const selectedModel = await getSelectedModel(selectedProvider);

      console.log(`Sending to ${currentProvider.name}:`, {
        messageCount: conversationHistory.length,
        trimmedFromOriginal: conversationMessages.length,
        lastMessage: userMessage.text,
        model: selectedModel,
        systemPrompt: currentSystemPrompt ? 'Yes' : 'No'
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
      
      // Save AI response
      await saveMessageToConversation(aiResponse);
      
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
      await saveMessageToConversation(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToConversation = async (conversation: Conversation) => {
    try {
      console.log('Switching to conversation:', {
        conversationId: conversation.id,
        title: conversation.title,
        totalMessages: conversation.messages.length,
        messagesBreakdown: conversation.messages.map(msg => ({
          id: msg.id,
          isUser: msg.isUser,
          text: msg.text.substring(0, 30) + '...'
        }))
      });

      setCurrentConversation(conversation);
      setMessages(conversation.messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
      })));
      await ConversationService.setCurrentConversationId(conversation.id);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error switching conversation:', error);
    }
  };

  const deleteConversation = (conversationId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ConversationService.deleteConversation(conversationId);
              await loadConversations();
              
              // If we deleted the current conversation, create a new one
              if (currentConversation?.id === conversationId) {
                await createNewConversation();
              }
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const selectSystemPrompt = async (promptId: string) => {
    try {
      await ConversationService.setSelectedSystemPrompt(selectedProvider, currentModel, promptId);
      await loadSystemPrompt();
      setShowSystemPromptSelector(false);
      setShowSidebar(false);
      
      // Update current conversation's system prompt
      if (currentConversation) {
        const updatedConversation = {
          ...currentConversation,
          systemPrompt: currentSystemPrompt,
          updatedAt: new Date(),
        };
        setCurrentConversation(updatedConversation);
        await ConversationService.saveConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Error selecting system prompt:', error);
    }
  };

  const clearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear the current conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await createNewConversation();
            setShowSidebar(false);
          }
        }
      ]
    );
  };

  const exportConversation = () => {
    if (!currentConversation) return;

    const exportText = ConversationService.exportConversationAsText(currentConversation);
    Share.share({
      message: exportText,
      title: currentConversation.title,
    });
    setShowSidebar(false);
  };

  const getContextInfo = () => {
    const contextLimit = ConversationService.getContextLimit(currentModel);
    const currentTokens = messages.reduce((sum, msg) => 
      sum + ConversationService.estimateTokens(msg.text), 0
    );
    const systemTokens = currentSystemPrompt ? ConversationService.estimateTokens(currentSystemPrompt) : 0;
    const totalTokens = currentTokens + systemTokens;
    const usagePercentage = Math.round((totalTokens / contextLimit) * 100);
    
    return {
      contextLimit,
      currentTokens,
      systemTokens,
      totalTokens,
      usagePercentage,
      messagesCount: messages.length,
    };
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

  const renderSystemPromptSelector = () => {
    const currentPrompt = systemPrompts.find(p => p.prompt === currentSystemPrompt);

    return (
      <Modal visible={showSystemPromptSelector} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSystemPromptSelector(false)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
              <ThemedText style={styles.modalTitle}>System Prompts</ThemedText>
              <TouchableOpacity onPress={() => setShowSystemPromptSelector(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {systemPrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt.id}
                  style={[
                    styles.promptItem,
                    { backgroundColor: colors.surface },
                    currentPrompt?.id === prompt.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => selectSystemPrompt(prompt.id)}
                >
                  <View style={styles.promptInfo}>
                    <ThemedText style={styles.promptName}>{prompt.name}</ThemedText>
                    {prompt.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.defaultBadgeText}>Default</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.promptText} numberOfLines={2}>
                    {prompt.prompt}
                  </ThemedText>
                  {currentPrompt?.id === prompt.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.selectedIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderContextInfo = () => {
    const info = getContextInfo();

    return (
      <Modal visible={showContextInfo} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowContextInfo(false)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
              <ThemedText style={styles.modalTitle}>Context Information</ThemedText>
              <TouchableOpacity onPress={() => setShowContextInfo(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Model:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{currentModel}</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Context Limit:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{info.contextLimit.toLocaleString()} tokens</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Current Usage:</ThemedText>
                <View style={styles.usageContainer}>
                  <ThemedText style={styles.contextInfoValue}>
                    {info.totalTokens.toLocaleString()} tokens ({info.usagePercentage}%)
                  </ThemedText>
                  <View style={[styles.usageBar, { backgroundColor: colors.surface }]}>
                    <View 
                      style={[
                        styles.usageBarFill, 
                        { 
                          width: `${Math.min(info.usagePercentage, 100)}%`,
                          backgroundColor: info.usagePercentage > 80 ? colors.error : info.usagePercentage > 60 ? '#FFA500' : colors.success
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Messages:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{info.messagesCount}</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>System Prompt:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>
                  {info.systemTokens > 0 ? `${info.systemTokens} tokens` : 'None'}
                </ThemedText>
              </View>

              {currentSystemPrompt && (
                <View style={styles.systemPromptPreview}>
                  <ThemedText style={styles.systemPromptLabel}>System Prompt:</ThemedText>
                  <ThemedText style={styles.systemPromptText}>{currentSystemPrompt}</ThemedText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderContextPopup = () => {
    const info = getContextInfo();

    return (
      <Modal visible={showContextPopup} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowContextPopup(false)}
        >
          <TouchableOpacity 
            style={[styles.contextPopupContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={styles.modalTitle}>Context Information</ThemedText>
              <TouchableOpacity onPress={() => setShowContextPopup(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.contextPopupBody}>
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Provider:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{getProviderById(selectedProvider)?.name || 'Unknown'}</ThemedText>
              </View>

              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Model:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{currentModel}</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Max Capacity:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{info.contextLimit.toLocaleString()} tokens</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Capacity Used:</ThemedText>
                <View style={styles.usageContainer}>
                  <ThemedText style={styles.contextInfoValue}>
                    {info.totalTokens.toLocaleString()} tokens ({info.usagePercentage}%)
                  </ThemedText>
                  <View style={[styles.usageBar, { backgroundColor: colors.surface }]}>
                    <View 
                      style={[
                        styles.usageBarFill, 
                        { 
                          width: `${Math.min(info.usagePercentage, 100)}%`,
                          backgroundColor: info.usagePercentage > 80 ? colors.error : info.usagePercentage > 60 ? '#FFA500' : colors.success
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>Messages:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>{info.messagesCount}</ThemedText>
              </View>
              
              <View style={styles.contextInfoItem}>
                <ThemedText style={styles.contextInfoLabel}>System Prompt:</ThemedText>
                <ThemedText style={styles.contextInfoValue}>
                  {info.systemTokens > 0 ? `${info.systemTokens} tokens` : 'None'}
                </ThemedText>
              </View>

              {currentSystemPrompt && (
                <View style={styles.systemPromptPreview}>
                  <ThemedText style={styles.systemPromptLabel}>System Prompt:</ThemedText>
                  <ThemedText style={styles.systemPromptText}>{currentSystemPrompt}</ThemedText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderSidebar = () => (
    <Modal visible={showSidebar} transparent animationType="none">
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity 
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => setShowSidebar(false)}
        />
        <Animated.View 
          style={[
            styles.sidebarContent, 
            { 
              backgroundColor: colors.card,
              transform: [{ translateX: sidebarAnimation }] 
            }
          ]}
        >
          <ScrollView style={styles.sidebarScrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={styles.sidebarTitle}>Menu</ThemedText>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Current AI Provider Section */}
            <View style={styles.sidebarSection}>
              <ThemedText style={styles.sectionTitle}>Current AI Provider</ThemedText>
              
              <View style={[styles.currentProviderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.currentProviderInfo}>
                  <View style={styles.currentProviderHeader}>
                    <Ionicons 
                      name={getProviderById(selectedProvider)?.icon as any || 'chatbubble-ellipses'} 
                      size={20} 
                      color={colors.primary} 
                    />
                    <ThemedText style={styles.currentProviderName}>
                      {getProviderById(selectedProvider)?.name}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.currentModelName}>
                    Model: {currentModel}
                  </ThemedText>
                </View>
              </View>

              {/* Quick Provider Switcher */}
              <View style={styles.quickProviderSwitcher}>
                {AI_PROVIDERS.filter(provider => apiKeys[provider.id]).map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.quickProviderButton,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      selectedProvider === provider.id && { 
                        backgroundColor: colors.primary + '20', 
                        borderColor: colors.primary 
                      }
                    ]}
                    onPress={async () => {
                      setSelectedProvider(provider.id);
                      const model = await getSelectedModel(provider.id);
                      setCurrentModel(model);
                      await AsyncStorage.setItem('selected_provider', provider.id);
                      
                      // Update current conversation's provider and model
                      if (currentConversation) {
                        const updatedConversation = {
                          ...currentConversation,
                          providerId: provider.id,
                          modelName: model,
                          updatedAt: new Date(),
                        };
                        setCurrentConversation(updatedConversation);
                        await ConversationService.saveConversation(updatedConversation);
                      }
                    }}
                  >
                    <Ionicons 
                      name={provider.icon as any} 
                      size={16} 
                      color={selectedProvider === provider.id ? colors.primary : colors.text} 
                    />
                    <ThemedText style={[
                      styles.quickProviderText,
                      selectedProvider === provider.id && { color: colors.primary }
                    ]}>
                      {provider.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Model Selection for Current Provider */}
              {(() => {
                const currentProvider = getProviderById(selectedProvider);
                if (!currentProvider || !apiKeys[selectedProvider]) return null;

                return (
                  <View style={styles.modelSelection}>
                    <ThemedText style={styles.modelSelectionTitle}>Available Models</ThemedText>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.modelScrollView}
                    >
                      {currentProvider.availableModels.map((model) => (
                        <TouchableOpacity
                          key={model.id}
                          style={[
                            styles.modelChip,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            currentModel === model.name && { 
                              backgroundColor: colors.primary + '20', 
                              borderColor: colors.primary 
                            }
                          ]}
                          onPress={async () => {
                            setCurrentModel(model.name);
                            await setSelectedModel(selectedProvider, model.name);
                            
                            // Update current conversation's model
                            if (currentConversation) {
                              const updatedConversation = {
                                ...currentConversation,
                                modelName: model.name,
                                updatedAt: new Date(),
                              };
                              setCurrentConversation(updatedConversation);
                              await ConversationService.saveConversation(updatedConversation);
                            }
                          }}
                        >
                          <ThemedText style={[
                            styles.modelChipText,
                            currentModel === model.name && { color: colors.primary }
                          ]}>
                            {model.displayName}
                          </ThemedText>
                          {currentModel === model.name && (
                            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
            </View>

            {/* Settings Section */}
            <View style={styles.sidebarSection}>
              <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
              
              <TouchableOpacity 
                style={[styles.sidebarItem, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setShowSidebar(false);
                  router.push('/ai-providers');
                }}
              >
                <Ionicons name="settings" size={20} color={colors.primary} />
                <ThemedText style={styles.sidebarItemText}>AI Providers</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sidebarItem, { backgroundColor: colors.surface }]}
                onPress={() => setShowSystemPromptSelector(true)}
              >
                <Ionicons name="person" size={20} color={colors.primary} />
                <ThemedText style={styles.sidebarItemText}>System Prompt</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sidebarItem, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setShowSidebar(false);
                  router.push('/settings');
                }}
              >
                <Ionicons name="cog" size={20} color={colors.primary} />
                <ThemedText style={styles.sidebarItemText}>App Settings</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Chat History Section */}
            <View style={styles.sidebarSection}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>Chat History</ThemedText>
                <TouchableOpacity onPress={createNewConversation} style={styles.newChatButton}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              {conversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={[
                    styles.chatHistoryItem,
                    { backgroundColor: colors.surface },
                    currentConversation?.id === conversation.id && { 
                      backgroundColor: colors.primary + '20', 
                      borderLeftColor: colors.primary, 
                      borderLeftWidth: 4 
                    }
                  ]}
                  onPress={() => switchToConversation(conversation)}
                >
                  <View style={styles.chatHistoryInfo}>
                    <ThemedText style={styles.chatHistoryTitle} numberOfLines={1}>
                      {conversation.title}
                    </ThemedText>
                    <ThemedText style={styles.chatHistoryMeta}>
                      {conversation.providerId} • {conversation.modelName}
                    </ThemedText>
                    <ThemedText style={styles.chatHistoryDate}>
                      {conversation.updatedAt.toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteChatButton}
                    onPress={() => deleteConversation(conversation.id)}
                  >
                    <Ionicons name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.hamburgerButton}>
              <Ionicons name="menu" size={24} color={colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <ThemedText type="title" style={styles.headerTitle}>
                {currentConversation?.title || 'Chat'}
              </ThemedText>
              <View style={styles.currentModelInfo}>
                <Ionicons 
                  name={getProviderById(selectedProvider)?.icon as any || 'chatbubble-ellipses'} 
                  size={14} 
                  color={colors.primary} 
                />
                <ThemedText style={styles.currentModelText}>
                  {getProviderById(selectedProvider)?.name} • {currentModel}
                </ThemedText>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.newChatHeaderButton}
              onPress={createNewConversation}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer} 
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Context Info Bar */}
            <View style={[styles.contextInfoBar, { borderBottomColor: colors.border }]}>
              {(() => {
                const info = getContextInfo();
                const usageColor = info.usagePercentage > 80 ? colors.error : 
                                 info.usagePercentage > 60 ? '#FFA500' : colors.success;
                
                return (
                  <>
                    <View style={[styles.contextUsageBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.contextUsageBarFill, 
                          { 
                            width: `${Math.min(info.usagePercentage, 100)}%`,
                            backgroundColor: usageColor
                          }
                        ]} 
                      />
                    </View>
                    <TouchableOpacity 
                      style={styles.contextInfoButton}
                      onPress={() => setShowContextPopup(true)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>

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

      {renderSystemPromptSelector()}
      {renderContextInfo()}
      {renderContextPopup()}
      {renderSidebar()}
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
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  providerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 120,
    gap: 8,
  },
  providerTextContainer: {
    flex: 1,
    marginLeft: 2,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modelText: {
    fontSize: 11,
    opacity: 0.7,
  },
  settingsMenuButton: {
    padding: 8,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  hamburgerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  currentModelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentModelText: {
    fontSize: 12,
    opacity: 0.7,
  },
  newChatHeaderButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newConversationButton: {
    padding: 8,
  },
  modalBody: {
    flex: 1,
  },
  promptItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  promptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  promptText: {
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 16,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectedIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  contextInfoItem: {
    marginBottom: 15,
  },
  contextInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contextInfoValue: {
    fontSize: 14,
    opacity: 0.8,
  },
  usageContainer: {
    gap: 8,
  },
  usageBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  systemPromptPreview: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  systemPromptLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  systemPromptText: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarContent: {
    width: '75%',
    height: '100%',
    backgroundColor: 'white',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sidebarScrollView: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sidebarItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  newChatButton: {
    padding: 8,
  },
  chatHistoryItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHistoryInfo: {
    flex: 1,
  },
  chatHistoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chatHistoryMeta: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 2,
  },
  chatHistoryDate: {
    fontSize: 10,
    opacity: 0.5,
  },
  deleteChatButton: {
    padding: 8,
  },
  contextInfoBar: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  contextUsageBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  contextUsageBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  contextInfoButton: {
    padding: 4,
  },
  contextPopupContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  contextPopupBody: {
    flex: 1,
  },
  currentProviderCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  currentProviderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentProviderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentProviderName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentModelName: {
    fontSize: 12,
    opacity: 0.7,
  },
  quickProviderSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  quickProviderButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickProviderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modelSelection: {
    marginTop: 12,
  },
  modelSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modelScrollView: {
    flexDirection: 'row',
    gap: 8,
  },
  modelChip: {
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  modelChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 