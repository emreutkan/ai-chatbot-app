import { AIProvider, getSelectedModel } from '@/constants/AIProviders';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class AIService {
  static async callAI(provider: AIProvider, apiKey: string, conversation: ChatMessage[], selectedModel?: string) {
    console.log(`Making ${provider.name} API request...`);
    
    try {
      let result: AIResponse;
      
      switch (provider.id) {
        case 'openai':
          result = await this.callOpenAI(apiKey, conversation, selectedModel || provider.defaultModel);
          break;
        case 'anthropic':
          result = await this.callAnthropic(apiKey, conversation, selectedModel || provider.defaultModel);
          break;
        case 'google':
          result = await this.callGoogle(apiKey, conversation, selectedModel || provider.defaultModel);
          break;
        case 'groq':
          result = await this.callGroq(apiKey, conversation, selectedModel || provider.defaultModel);
          break;
        default:
          throw new Error('Provider not supported');
      }

      console.log(`${provider.name} API response received:`, {
        contentLength: result.content.length,
        usage: result.usage
      });

      return result;
    } catch (error) {
      console.error(`${provider.name} API Error:`, error);
      throw error;
    }
  }

  private static async callOpenAI(apiKey: string, conversation: ChatMessage[], model: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: conversation,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return { 
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  private static async callAnthropic(apiKey: string, conversation: ChatMessage[], model: string) {
    // Separate system messages from conversation for Anthropic
    const systemMessages = conversation.filter(msg => msg.role === 'system');
    const conversationMessages = conversation.filter(msg => msg.role !== 'system');
    
    // Combine system messages into one system prompt
    const systemPrompt = systemMessages.map(msg => msg.content).join('\n\n');

    const requestBody: any = {
      model: model,
      max_tokens: 1000,
      messages: conversationMessages,
    };

    // Add system prompt if available
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Anthropic API request failed');
    }

    const data = await response.json();
    return { 
      content: data.content[0].text,
      usage: data.usage
    };
  }

  private static async callGoogle(apiKey: string, conversation: ChatMessage[], model: string) {
    // Convert conversation to Google format, handling system prompts
    const parts: any[] = [];
    
    conversation.forEach(message => {
      if (message.role === 'system') {
        // For Google, we can prepend system prompts as user messages with special formatting
        parts.push({
          role: 'user',
          parts: [{ text: `[SYSTEM]: ${message.content}` }]
        });
        parts.push({
          role: 'model',
          parts: [{ text: 'I understand and will follow these instructions.' }]
        });
      } else {
        parts.push({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }]
        });
      }
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: parts,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Google API request failed');
    }

    const data = await response.json();
    return { 
      content: data.candidates[0].content.parts[0].text,
      usage: data.usage
    };
  }

  private static async callGroq(apiKey: string, conversation: ChatMessage[], model: string) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: conversation,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Groq API request failed');
    }

    const data = await response.json();
    return { 
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }
} 