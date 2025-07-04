import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { 
  AI_PROVIDERS, 
  AIProvider, 
  AIModel,
  validateApiKey, 
  getAvailableModelsForProvider,
  addCustomModel,
  removeCustomModel,
  getSelectedModel,
  setSelectedModel
} from '@/constants/AIProviders';

export default function AIProvidersScreen() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<Record<string, AIModel[]>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [showModelSelector, setShowModelSelector] = useState<string | null>(null);
  const [showAddCustomModel, setShowAddCustomModel] = useState<string | null>(null);
  const [customModelName, setCustomModelName] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadProviderData();
  }, []);

  const loadProviderData = async () => {
    try {
      // Load API keys
      const keys: Record<string, string> = {};
      const selectedModelMap: Record<string, string> = {};
      const allModels: Record<string, AIModel[]> = {};

      for (const provider of AI_PROVIDERS) {
        const key = await AsyncStorage.getItem(`${provider.id}_api_key`);
        if (key) {
          keys[provider.id] = key;
        }

        // Load selected model
        try {
          const selectedModel = await getSelectedModel(provider.id);
          selectedModelMap[provider.id] = selectedModel;
        } catch (error) {
          console.error(`Error getting selected model for ${provider.id}:`, error);
          selectedModelMap[provider.id] = provider.defaultModel;
        }

        // Load available models (including custom ones)
        try {
          const availableModels = await getAvailableModelsForProvider(provider.id);
          allModels[provider.id] = availableModels;
        } catch (error) {
          console.error(`Error getting available models for ${provider.id}:`, error);
          allModels[provider.id] = provider.availableModels;
        }
      }

      setApiKeys(keys);
      setSelectedModels(selectedModelMap);
      setAvailableModels(allModels);
    } catch (error) {
      console.error('Error loading provider data:', error);
    }
  };

  const handleSaveApiKey = async (provider: AIProvider) => {
    if (!editingKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    if (!validateApiKey(provider.id, editingKey)) {
      Alert.alert('Invalid API Key', `Please enter a valid ${provider.name} API key (starts with ${provider.keyPrefix})`);
      return;
    }

    try {
      await AsyncStorage.setItem(`${provider.id}_api_key`, editingKey);
      setApiKeys(prev => ({ ...prev, [provider.id]: editingKey }));
      setEditingProvider(null);
      setEditingKey('');
      Alert.alert('Success', `${provider.name} API key saved!`);
    } catch {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    }
  };

  const handleRemoveApiKey = async (provider: AIProvider) => {
    Alert.alert(
      'Remove API Key',
      `Are you sure you want to remove your ${provider.name} API key?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(`${provider.id}_api_key`);
              setApiKeys(prev => {
                const newKeys = { ...prev };
                delete newKeys[provider.id];
                return newKeys;
              });
              Alert.alert('Success', `${provider.name} API key removed`);
            } catch {
              Alert.alert('Error', 'Failed to remove API key');
            }
          }
        }
      ]
    );
  };

  const handleEditApiKey = (provider: AIProvider) => {
    setEditingProvider(provider.id);
    setEditingKey(apiKeys[provider.id] || '');
  };

  const handleSelectModel = async (providerId: string, modelName: string) => {
    try {
      await setSelectedModel(providerId, modelName);
      setSelectedModels(prev => ({ ...prev, [providerId]: modelName }));
      setShowModelSelector(null);
    } catch {
      Alert.alert('Error', 'Failed to select model');
    }
  };

  const handleAddCustomModel = async (providerId: string) => {
    if (!customModelName.trim()) {
      Alert.alert('Error', 'Please enter a model name');
      return;
    }

    try {
      await addCustomModel(providerId, customModelName.trim());
      // Reload models
      const models = await getAvailableModelsForProvider(providerId);
      setAvailableModels(prev => ({ ...prev, [providerId]: models }));
      setCustomModelName('');
      setShowAddCustomModel(null);
      Alert.alert('Success', 'Custom model added!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add custom model');
    }
  };

  const handleRemoveCustomModel = async (providerId: string, modelId: string) => {
    Alert.alert(
      'Remove Custom Model',
      'Are you sure you want to remove this custom model?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCustomModel(providerId, modelId);
              // Reload models
              const models = await getAvailableModelsForProvider(providerId);
              setAvailableModels(prev => ({ ...prev, [providerId]: models }));
            } catch {
              Alert.alert('Error', 'Failed to remove custom model');
            }
          }
        }
      ]
    );
  };

  const getCurrentModelDisplayName = (providerId: string): string => {
    const currentModel = selectedModels[providerId];
    const models = availableModels[providerId] || [];
    const model = models.find(m => m.name === currentModel);
    return model?.displayName || currentModel || 'Default';
  };

  const renderModelSelector = () => {
    if (!showModelSelector) return null;
    
    const models = availableModels[showModelSelector] || [];
    const currentModel = selectedModels[showModelSelector];

    return (
      <Modal visible={true} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModelSelector(null)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[
              styles.modalHeader, 
              { borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
            ]}>
              <ThemedText style={styles.modalTitle}>Select Model</ThemedText>
              <TouchableOpacity onPress={() => setShowModelSelector(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    { backgroundColor: colors.surface },
                    currentModel === model.name && { 
                      backgroundColor: colorScheme === 'dark' 
                        ? `${colors.primary}30` 
                        : `${colors.primary}20`,
                      borderWidth: 2,
                      borderColor: colors.primary
                    }
                  ]}
                  onPress={() => handleSelectModel(showModelSelector!, model.name)}
                >
                  <View style={styles.modelInfo}>
                    <ThemedText style={styles.modelName}>{model.displayName}</ThemedText>
                    {model.isCustom && (
                      <View style={[styles.customBadge, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.customBadgeText}>Custom</ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.modelActions}>
                    {currentModel === model.name && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                    {model.isCustom && (
                      <TouchableOpacity
                        style={styles.removeModelButton}
                        onPress={() => handleRemoveCustomModel(showModelSelector!, model.id)}
                      >
                        <Ionicons name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.addModelButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowModelSelector(null);
                  setShowAddCustomModel(showModelSelector);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addModelButtonText}>Add Custom Model</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderAddCustomModelModal = () => {
    if (!showAddCustomModel) return null;

    return (
      <Modal visible={true} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowAddCustomModel(null);
            setCustomModelName('');
          }}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[
              styles.modalHeader, 
              { borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
            ]}>
              <ThemedText style={styles.modalTitle}>Add Custom Model</ThemedText>
              <TouchableOpacity onPress={() => {
                setShowAddCustomModel(null);
                setCustomModelName('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.inputLabel}>Model Name</ThemedText>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 2
                }]}
                value={customModelName}
                onChangeText={setCustomModelName}
                placeholder="e.g., claude-4-opus or gpt-5"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowAddCustomModel(null);
                    setCustomModelName('');
                  }}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleAddCustomModel(showAddCustomModel!)}
                >
                  <ThemedText style={styles.saveButtonText}>Add Model</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderProviderCard = (provider: AIProvider) => {
    const hasKey = !!apiKeys[provider.id];
    const isEditing = editingProvider === provider.id;

    return (
      <View key={provider.id} style={[styles.providerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.providerHeader}>
          <View style={styles.providerInfo}>
            <Ionicons name={provider.icon as any} size={32} color={colors.primary} />
            <View style={styles.providerText}>
              <ThemedText style={styles.providerName}>{provider.displayName}</ThemedText>
              <ThemedText style={styles.providerDescription}>{provider.description}</ThemedText>
              {hasKey && (
                <ThemedText style={styles.currentModel}>
                  Model: {getCurrentModelDisplayName(provider.id)}
                </ThemedText>
              )}
            </View>
          </View>
          {hasKey && !isEditing && (
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          )}
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={editingKey}
                onChangeText={setEditingKey}
                placeholder={`${provider.keyPrefix}...`}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={isSecure}
                autoCapitalize="none"
                autoCorrect={false}
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
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setEditingProvider(null);
                  setEditingKey('');
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSaveApiKey(provider)}
              >
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.providerActions}>
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: colors.surface }]}
              onPress={() => Alert.alert(
                'Get API Key',
                `To get your ${provider.name} API key:\n\n1. Visit ${provider.websiteUrl}\n2. Sign up or log in\n3. Navigate to API keys section\n4. Create a new API key\n5. Copy and paste it here`,
                [{ text: 'OK' }]
              )}
            >
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <ThemedText style={styles.infoButtonText}>How to get</ThemedText>
            </TouchableOpacity>

            {hasKey && (
              <TouchableOpacity
                style={[styles.modelButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowModelSelector(provider.id)}
              >
                <Ionicons name="options" size={16} color={colors.primary} />
                <ThemedText style={styles.modelButtonText}>Models</ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.mainActions}>
              {hasKey ? (
                <>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleEditApiKey(provider)}
                  >
                    <ThemedText style={styles.editButtonText}>Edit Key</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeButton, { borderColor: colors.border }]}
                    onPress={() => handleRemoveApiKey(provider)}
                  >
                    <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleEditApiKey(provider)}
                >
                  <ThemedText style={styles.addButtonText}>Add API Key</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              AI Providers
            </ThemedText>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.subtitle}>
              Manage API keys and models for different AI providers. You can switch between them anytime in the chat.
            </ThemedText>

            {AI_PROVIDERS.map(renderProviderCard)}

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Your API keys are stored securely on your device and never shared. Usage costs are charged directly to your provider accounts.
              </ThemedText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {renderModelSelector()}
      {renderAddCustomModelModal()}
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
  keyboardView: {
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
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 22,
  },
  providerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerText: {
    marginLeft: 16,
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  currentModel: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  editContainer: {
    gap: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  providerActions: {
    gap: 12,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  modelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mainActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
  },
  customBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  modelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeModelButton: {
    padding: 4,
  },
  addModelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  addModelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
}); 