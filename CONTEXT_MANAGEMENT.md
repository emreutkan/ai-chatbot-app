# Context Management System

## Overview

The ChatMobile app now includes a comprehensive context management system that provides persistent conversation storage, customizable system prompts, dynamic context windows, and intelligent context trimming. This ensures optimal performance across different AI models while preserving important conversation context.

## Features

### 1. Persistent Conversation Storage

- **Multiple Conversations**: Support for unlimited saved conversations
- **Auto-Save**: Messages are automatically saved as they're sent/received
- **Conversation Titles**: Auto-generated from first user message
- **Metadata Tracking**: Provider, model, timestamps, and system prompts
- **Export Functionality**: Share conversations as formatted text

**Key Components:**
- `ConversationService.getConversations()` - Load all saved conversations
- `ConversationService.saveConversation()` - Save/update a conversation
- `ConversationService.deleteConversation()` - Remove a conversation

### 2. System Prompts

Customizable AI personality and instructions that are applied to each conversation.

**Default System Prompts:**
- **Default Assistant**: General helpful AI assistant
- **Creative Writer**: Specialized for creative writing tasks
- **Technical Expert**: Programming and technical assistance
- **Patient Teacher**: Educational and explanatory responses
- **Research Analyst**: Structured, objective analysis

**Features:**
- Per-provider/model system prompt selection
- Custom system prompt creation (planned)
- Persistent prompt preferences
- Token counting for prompt overhead

**Key Components:**
- `ConversationService.getSystemPrompts()` - Get available prompts
- `ConversationService.getSelectedSystemPrompt()` - Get current prompt
- `ConversationService.setSelectedSystemPrompt()` - Save prompt preference

### 3. Dynamic Context Windows

Automatically adjusts conversation context based on the selected model's capabilities.

**Model Context Limits:**
- **OpenAI GPT-4o/Mini**: 128,000 tokens
- **Claude 3.5**: 200,000 tokens
- **Gemini 1.5 Pro**: 2,000,000 tokens
- **Groq Llama 3.1**: 32,768 tokens

**Features:**
- Model-specific token limits
- Real-time context usage monitoring
- Visual usage indicators
- Smart context trimming

### 4. Smart Context Trimming

Intelligently manages conversation history to stay within token limits while preserving important context.

**Algorithm:**
1. Calculate available tokens (80% of model limit - system prompt tokens)
2. Work backwards from most recent messages
3. Include messages until token limit reached
4. Always preserve at least the last user message
5. System prompts are always included

**Key Components:**
- `ConversationService.trimContext()` - Apply smart trimming
- `ConversationService.estimateTokens()` - Token estimation
- `ConversationService.getContextLimit()` - Get model limits

### 5. Context Management Controls

User interface controls for managing conversations and context.

**Header Controls:**
- **Chat Bubbles Icon**: Access conversation list
- **Person Icon**: System prompt selector
- **Analytics Icon**: Context information viewer
- **Refresh Icon**: Clear current conversation
- **Share Icon**: Export conversation

**Conversation List Modal:**
- View all saved conversations
- Switch between conversations
- Create new conversations
- Delete conversations
- Current conversation highlighting

**System Prompt Selector:**
- Browse available system prompts
- See prompt descriptions
- Select different prompts
- Default/custom prompt indicators

**Context Information Modal:**
- Current model information
- Token usage statistics
- Usage percentage with visual bar
- Message count
- System prompt details

## Usage Examples

### Creating a New Conversation

```typescript
const newConversation: Conversation = {
  id: Date.now().toString(),
  title: 'New Conversation',
  messages: [],
  providerId: 'openai',
  modelName: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
  createdAt: new Date(),
  updatedAt: new Date(),
};

await ConversationService.saveConversation(newConversation);
```

### Applying Smart Context Trimming

```typescript
const trimmedMessages = ConversationService.trimContext(
  conversation.messages,
  'gpt-4o',
  systemPrompt
);

// Build API request with trimmed context
const conversationHistory: ChatMessage[] = [];
if (systemPrompt) {
  conversationHistory.push({
    role: 'system',
    content: systemPrompt
  });
}

trimmedMessages.forEach(msg => {
  conversationHistory.push({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.text
  });
});
```

### Token Usage Monitoring

```typescript
const getContextInfo = () => {
  const contextLimit = ConversationService.getContextLimit(currentModel);
  const currentTokens = messages.reduce((sum, msg) => 
    sum + ConversationService.estimateTokens(msg.text), 0
  );
  const systemTokens = currentSystemPrompt ? 
    ConversationService.estimateTokens(currentSystemPrompt) : 0;
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
```

## Storage Keys

The system uses AsyncStorage with the following keys:

- `stored_conversations` - All saved conversations
- `custom_system_prompts` - User-created system prompts
- `current_conversation_id` - Currently active conversation
- `system_prompt_{providerId}_{modelName}` - Selected system prompt per provider/model
- `selected_model_{providerId}` - Selected model per provider
- `custom_models_{providerId}` - Custom models per provider

## Performance Considerations

- **Token Estimation**: Uses approximation (1 token ≈ 4 characters) for performance
- **Context Limit Buffer**: Uses 80% of model limit to reserve space for responses
- **Lazy Loading**: Conversations loaded on demand
- **Efficient Storage**: Only stores necessary message metadata
- **Background Processing**: Context trimming happens before API calls

## Error Handling

- Graceful fallbacks for missing conversations
- Default system prompts if custom ones fail to load
- Automatic conversation creation if current conversation is invalid
- Safe token limit fallbacks (4096 tokens default)

## Future Enhancements

- Custom system prompt creation/editing
- Conversation search and filtering
- Conversation folders/categories
- Advanced token counting using actual tokenizers
- Conversation templates
- Bulk export/import functionality
- Context window optimization strategies
- Message prioritization based on content importance 