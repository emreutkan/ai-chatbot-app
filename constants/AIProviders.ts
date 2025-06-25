export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  isCustom?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  apiUrl: string;
  defaultModel: string;
  description: string;
  websiteUrl: string;
  keyPrefix: string;
  availableModels: AIModel[];
}

// Predefined models for each provider
export const OPENAI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'gpt-4o', displayName: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'gpt-4', displayName: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' },
];

export const ANTHROPIC_MODELS: AIModel[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet-20240229', name: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku' },
];

export const GOOGLE_MODELS: AIModel[] = [
  { id: 'gemini-1.5-pro-latest', name: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash-latest', name: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash' },
  { id: 'gemini-pro', name: 'gemini-pro', displayName: 'Gemini Pro' },
  { id: 'gemini-pro-vision', name: 'gemini-pro-vision', displayName: 'Gemini Pro Vision' },
];

export const GROQ_MODELS: AIModel[] = [
  { id: 'llama-3.1-405b-reasoning', name: 'llama-3.1-405b-reasoning', displayName: 'Llama 3.1 405B' },
  { id: 'llama-3.1-70b-versatile', name: 'llama-3.1-70b-versatile', displayName: 'Llama 3.1 70B' },
  { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B' },
  { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768', displayName: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'gemma2-9b-it', displayName: 'Gemma 2 9B' },
];

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    displayName: 'ChatGPT (OpenAI)',
    icon: 'chatbubble-ellipses',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
    description: 'GPT models - Fast and reliable AI assistants',
    websiteUrl: 'https://platform.openai.com',
    keyPrefix: 'sk-',
    availableModels: OPENAI_MODELS,
  },
  {
    id: 'anthropic',
    name: 'Claude',
    displayName: 'Claude (Anthropic)',
    icon: 'library',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    description: 'Claude models - Thoughtful and helpful AI',
    websiteUrl: 'https://console.anthropic.com',
    keyPrefix: 'sk-ant-',
    availableModels: ANTHROPIC_MODELS,
  },
  {
    id: 'google',
    name: 'Gemini',
    displayName: 'Gemini (Google)',
    icon: 'diamond',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-pro',
    description: 'Gemini models - Google\'s advanced AI models',
    websiteUrl: 'https://makersuite.google.com',
    keyPrefix: 'AI',
    availableModels: GOOGLE_MODELS,
  },
  {
    id: 'groq',
    name: 'Groq',
    displayName: 'Groq',
    icon: 'flash',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'mixtral-8x7b-32768',
    description: 'Groq models - Ultra-fast inference',
    websiteUrl: 'https://console.groq.com',
    keyPrefix: 'gsk_',
    availableModels: GROQ_MODELS,
  },
];

export const getProviderById = (id: string): AIProvider | undefined => {
  return AI_PROVIDERS.find(provider => provider.id === id);
};

export const validateApiKey = (providerId: string, apiKey: string): boolean => {
  const provider = getProviderById(providerId);
  if (!provider) return false;
  
  // More lenient validation for Groq keys since they can vary in length
  if (providerId === 'groq') {
    return apiKey.startsWith(provider.keyPrefix) && apiKey.length >= 30;
  }
  
  return apiKey.startsWith(provider.keyPrefix) && apiKey.length > provider.keyPrefix.length + 10;
};

// Model management utilities
export const getAvailableModelsForProvider = async (providerId: string): Promise<AIModel[]> => {
  const provider = getProviderById(providerId);
  if (!provider) return [];

  // Get custom models from storage
  const customModels = await getCustomModelsForProvider(providerId);
  
  // Combine predefined and custom models
  return [...provider.availableModels, ...customModels];
};

export const getCustomModelsForProvider = async (providerId: string): Promise<AIModel[]> => {
  try {
    const customModelsJson = await import('@react-native-async-storage/async-storage').then(m => 
      m.default.getItem(`custom_models_${providerId}`)
    );
    if (customModelsJson) {
      return JSON.parse(customModelsJson);
    }
  } catch (error) {
    console.error('Error loading custom models:', error);
  }
  return [];
};

export const addCustomModel = async (providerId: string, modelName: string): Promise<void> => {
  try {
    const customModels = await getCustomModelsForProvider(providerId);
    const newModel: AIModel = {
      id: `custom_${modelName}`,
      name: modelName,
      displayName: modelName,
      isCustom: true,
    };
    
    // Check if model already exists
    const exists = customModels.find(m => m.name === modelName);
    if (exists) {
      throw new Error('Model already exists');
    }
    
    const updatedModels = [...customModels, newModel];
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    await AsyncStorage.setItem(`custom_models_${providerId}`, JSON.stringify(updatedModels));
  } catch (error) {
    console.error('Error adding custom model:', error);
    throw error;
  }
};

export const removeCustomModel = async (providerId: string, modelId: string): Promise<void> => {
  try {
    const customModels = await getCustomModelsForProvider(providerId);
    const updatedModels = customModels.filter(m => m.id !== modelId);
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    await AsyncStorage.setItem(`custom_models_${providerId}`, JSON.stringify(updatedModels));
  } catch (error) {
    console.error('Error removing custom model:', error);
    throw error;
  }
};

export const getSelectedModel = async (providerId: string): Promise<string> => {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const selectedModel = await AsyncStorage.getItem(`selected_model_${providerId}`);
    if (selectedModel) {
      return selectedModel;
    }
  } catch (error) {
    console.error('Error getting selected model:', error);
  }
  
  // Return default model if none selected
  const provider = getProviderById(providerId);
  return provider?.defaultModel || '';
};

export const setSelectedModel = async (providerId: string, modelName: string): Promise<void> => {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    await AsyncStorage.setItem(`selected_model_${providerId}`, modelName);
  } catch (error) {
    console.error('Error setting selected model:', error);
    throw error;
  }
};