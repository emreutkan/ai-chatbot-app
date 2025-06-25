import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProvider } from '@/constants/AIProviders';

export interface StoredMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  tokens?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  providerId: string;
  modelName: string;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault: boolean;
  providerId?: string;
  modelName?: string;
}

// Model context window limits (in tokens)
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 4096,
  
  // Anthropic models
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  
  // Google models
  'gemini-1.5-pro-latest': 2000000,
  'gemini-1.5-flash-latest': 1000000,
  'gemini-pro': 32000,
  'gemini-pro-vision': 16000,
  
  // Groq models
  'llama-3.1-405b-reasoning': 32768,
  'llama-3.1-70b-versatile': 32768,
  'llama-3.1-8b-instant': 8192,
  'mixtral-8x7b-32768': 32768,
  'gemma2-9b-it': 8192,
};

// Default system prompts
export const DEFAULT_SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: 'default',
    name: 'Default Assistant',
    prompt: 'You are a helpful AI assistant. Be concise, accurate, and friendly in your responses.',
    isDefault: true,
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    prompt: 'You are a creative writing assistant. Help with storytelling, character development, and imaginative content. Be creative and inspiring.',
    isDefault: true,
  },
  {
    id: 'technical',
    name: 'Technical Expert',
    prompt: 'You are a technical expert and programming assistant. Provide accurate, detailed technical information and code examples when appropriate.',
    isDefault: true,
  },
  {
    id: 'teacher',
    name: 'Patient Teacher',
    prompt: 'You are a patient and encouraging teacher. Explain concepts clearly, provide examples, and adapt your explanations to the user\'s level of understanding.',
    isDefault: true,
  },
  {
    id: 'analyst',
    name: 'Research Analyst',
    prompt: 'You are a research analyst. Provide thorough analysis, cite sources when possible, and present information in a structured, objective manner.',
    isDefault: true,
  },
];

export class ConversationService {
  private static readonly CONVERSATIONS_KEY = 'stored_conversations';
  private static readonly SYSTEM_PROMPTS_KEY = 'custom_system_prompts';
  private static readonly CURRENT_CONVERSATION_KEY = 'current_conversation_id';

  // Estimate tokens for a message (rough approximation: 1 token ≈ 4 characters)
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Get context window limit for a model
  static getContextLimit(modelName: string): number {
    return MODEL_CONTEXT_LIMITS[modelName] || 4096; // Default fallback
  }

  // Smart context trimming based on token limits
  static trimContext(
    messages: StoredMessage[], 
    modelName: string, 
    systemPrompt?: string,
    maxTokens?: number
  ): StoredMessage[] {
    const contextLimit = maxTokens || this.getContextLimit(modelName);
    const systemTokens = systemPrompt ? this.estimateTokens(systemPrompt) : 0;
    const availableTokens = Math.floor(contextLimit * 0.8) - systemTokens; // Use 80% of limit, reserve space for response
    
    let totalTokens = 0;
    const trimmedMessages: StoredMessage[] = [];
    
    // Always include the most recent messages, working backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = message.tokens || this.estimateTokens(message.text);
      
      if (totalTokens + messageTokens <= availableTokens) {
        trimmedMessages.unshift(message);
        totalTokens += messageTokens;
      } else {
        // If we can't fit this message, stop here
        break;
      }
    }
    
    // Ensure we have at least the last user message and AI response
    if (trimmedMessages.length === 0 && messages.length > 0) {
      trimmedMessages.push(messages[messages.length - 1]);
    }
    
    return trimmedMessages;
  }

  // Load all conversations
  static async getConversations(): Promise<Conversation[]> {
    try {
      const conversationsJson = await AsyncStorage.getItem(this.CONVERSATIONS_KEY);
      if (conversationsJson) {
        const conversations = JSON.parse(conversationsJson);
        // Convert date strings back to Date objects
        return conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
    return [];
  }

  // Save conversation
  static async saveConversation(conversation: Conversation): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = { ...conversation, updatedAt: new Date() };
      } else {
        conversations.push(conversation);
      }
      
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  // Delete conversation
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const filteredConversations = conversations.filter(c => c.id !== conversationId);
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filteredConversations));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Get current conversation ID
  static async getCurrentConversationId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.CURRENT_CONVERSATION_KEY);
    } catch (error) {
      console.error('Error getting current conversation ID:', error);
      return null;
    }
  }

  // Set current conversation ID
  static async setCurrentConversationId(conversationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CURRENT_CONVERSATION_KEY, conversationId);
    } catch (error) {
      console.error('Error setting current conversation ID:', error);
      throw error;
    }
  }

  // Generate conversation title from first message
  static generateConversationTitle(firstMessage: string): string {
    const maxLength = 50;
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  // System Prompts Management
  static async getSystemPrompts(): Promise<SystemPrompt[]> {
    try {
      const customPromptsJson = await AsyncStorage.getItem(this.SYSTEM_PROMPTS_KEY);
      const customPrompts = customPromptsJson ? JSON.parse(customPromptsJson) : [];
      return [...DEFAULT_SYSTEM_PROMPTS, ...customPrompts];
    } catch (error) {
      console.error('Error loading system prompts:', error);
      return DEFAULT_SYSTEM_PROMPTS;
    }
  }

  static async saveSystemPrompt(prompt: SystemPrompt): Promise<void> {
    try {
      const customPrompts = await this.getCustomSystemPrompts();
      const existingIndex = customPrompts.findIndex(p => p.id === prompt.id);
      
      if (existingIndex >= 0) {
        customPrompts[existingIndex] = prompt;
      } else {
        customPrompts.push(prompt);
      }
      
      await AsyncStorage.setItem(this.SYSTEM_PROMPTS_KEY, JSON.stringify(customPrompts));
    } catch (error) {
      console.error('Error saving system prompt:', error);
      throw error;
    }
  }

  static async deleteSystemPrompt(promptId: string): Promise<void> {
    try {
      const customPrompts = await this.getCustomSystemPrompts();
      const filteredPrompts = customPrompts.filter(p => p.id !== promptId);
      await AsyncStorage.setItem(this.SYSTEM_PROMPTS_KEY, JSON.stringify(filteredPrompts));
    } catch (error) {
      console.error('Error deleting system prompt:', error);
      throw error;
    }
  }

  private static async getCustomSystemPrompts(): Promise<SystemPrompt[]> {
    try {
      const customPromptsJson = await AsyncStorage.getItem(this.SYSTEM_PROMPTS_KEY);
      return customPromptsJson ? JSON.parse(customPromptsJson) : [];
    } catch (error) {
      console.error('Error loading custom system prompts:', error);
      return [];
    }
  }

  // Get selected system prompt for provider/model
  static async getSelectedSystemPrompt(providerId: string, modelName: string): Promise<string> {
    try {
      const promptId = await AsyncStorage.getItem(`system_prompt_${providerId}_${modelName}`);
      if (promptId) {
        const prompts = await this.getSystemPrompts();
        const prompt = prompts.find(p => p.id === promptId);
        return prompt?.prompt || DEFAULT_SYSTEM_PROMPTS[0].prompt;
      }
    } catch (error) {
      console.error('Error getting selected system prompt:', error);
    }
    return DEFAULT_SYSTEM_PROMPTS[0].prompt;
  }

  // Set selected system prompt for provider/model
  static async setSelectedSystemPrompt(providerId: string, modelName: string, promptId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`system_prompt_${providerId}_${modelName}`, promptId);
    } catch (error) {
      console.error('Error setting selected system prompt:', error);
      throw error;
    }
  }

  // Export conversation as text
  static exportConversationAsText(conversation: Conversation): string {
    let header = `# ${conversation.title}\n` +
                  `Provider: ${conversation.providerId}\n` +
                  `Model: ${conversation.modelName}\n` +
                  `Created: ${conversation.createdAt.toLocaleString()}\n` +
                  `Updated: ${conversation.updatedAt.toLocaleString()}\n\n`;
    
    if (conversation.systemPrompt) {
      header += `System Prompt: ${conversation.systemPrompt}\n\n`;
    }
    
    const messages = conversation.messages.map(msg => {
      const role = msg.isUser ? 'User' : 'Assistant';
      const timestamp = msg.timestamp.toLocaleTimeString();
      return `**${role}** (${timestamp}):\n${msg.text}\n`;
    }).join('\n');
    
    return header + messages;
  }
} 