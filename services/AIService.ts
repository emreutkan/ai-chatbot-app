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
  static async callOpenAI(provider: AIProvider, apiKey: string, messages: ChatMessage[], model?: string): Promise<AIResponse> {
    const selectedModel = model || await getSelectedModel(provider.id);
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.getOpenAIError(response.status, errorData));
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content.trim(),
      usage: data.usage,
    };
  }

  static async callAnthropic(provider: AIProvider, apiKey: string, messages: ChatMessage[], model?: string): Promise<AIResponse> {
    // Convert messages format for Claude
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const selectedModel = model || await getSelectedModel(provider.id);

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1000,
        system: systemMessage?.content || "You are a helpful AI assistant.",
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.getAnthropicError(response.status, errorData));
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage,
    };
  }

  static async callGoogle(provider: AIProvider, apiKey: string, messages: ChatMessage[], model?: string): Promise<AIResponse> {
    // Convert messages to Gemini format
    const parts = messages.map(msg => ({
      text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    }));

    const selectedModel = model || await getSelectedModel(provider.id);
    const apiUrl = `${provider.apiUrl}/${selectedModel}:generateContent`;

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.getGoogleError(response.status, errorData));
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata,
    };
  }

  static async callGroq(provider: AIProvider, apiKey: string, messages: ChatMessage[], model?: string): Promise<AIResponse> {
    // Groq uses OpenAI-compatible format
    const selectedModel = model || await getSelectedModel(provider.id);
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(this.getGroqError(response.status, errorData));
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content.trim(),
      usage: data.usage,
    };
  }

  static async callAI(provider: AIProvider, apiKey: string, messages: ChatMessage[], model?: string): Promise<AIResponse> {
    console.log(`Making ${provider.name} API request...`);
    
    try {
      let result: AIResponse;
      
      switch (provider.id) {
        case 'openai':
          result = await this.callOpenAI(provider, apiKey, messages, model);
          break;
        case 'anthropic':
          result = await this.callAnthropic(provider, apiKey, messages, model);
          break;
        case 'google':
          result = await this.callGoogle(provider, apiKey, messages, model);
          break;
        case 'groq':
          result = await this.callGroq(provider, apiKey, messages, model);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider.id}`);
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

  private static getOpenAIError(status: number, errorData: any): string {
    if (status === 401) {
      return 'Invalid OpenAI API key. Please check your API key in Settings.';
    } else if (status === 429) {
      return 'OpenAI rate limit exceeded. Please try again in a moment.';
    } else if (status === 403) {
      return 'OpenAI API key does not have access to GPT models. Please check your account billing.';
    } else if (status >= 500) {
      return 'OpenAI servers are experiencing issues. Please try again later.';
    } else {
      return `OpenAI API error: ${status} - ${errorData?.error?.message || 'Unknown error'}`;
    }
  }

  private static getAnthropicError(status: number, errorData: any): string {
    if (status === 401) {
      return 'Invalid Anthropic API key. Please check your API key in Settings.';
    } else if (status === 429) {
      return 'Anthropic rate limit exceeded. Please try again in a moment.';
    } else if (status >= 500) {
      return 'Anthropic servers are experiencing issues. Please try again later.';
    } else {
      return `Anthropic API error: ${status} - ${errorData?.error?.message || 'Unknown error'}`;
    }
  }

  private static getGoogleError(status: number, errorData: any): string {
    if (status === 401 || status === 403) {
      return 'Invalid Google API key. Please check your API key in Settings.';
    } else if (status === 429) {
      return 'Google API rate limit exceeded. Please try again in a moment.';
    } else if (status >= 500) {
      return 'Google servers are experiencing issues. Please try again later.';
    } else {
      return `Google API error: ${status} - ${errorData?.error?.message || 'Unknown error'}`;
    }
  }

  private static getGroqError(status: number, errorData: any): string {
    if (status === 401) {
      return 'Invalid Groq API key. Please check your API key in Settings.';
    } else if (status === 429) {
      return 'Groq rate limit exceeded. Please try again in a moment.';
    } else if (status >= 500) {
      return 'Groq servers are experiencing issues. Please try again later.';
    } else {
      return `Groq API error: ${status} - ${errorData?.error?.message || 'Unknown error'}`;
    }
  }
} 