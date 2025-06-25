# Testing Guide - OpenAI API Integration 🧪

## How to Test the Real OpenAI API

### Prerequisites
1. **OpenAI API Key**: Get one from [platform.openai.com](https://platform.openai.com)
2. **Credits**: Ensure your OpenAI account has billing set up with available credits

### Testing Steps

1. **Launch the App**
   ```bash
   npm start
   # Then scan QR code or press 'i' for iOS simulator
   ```

2. **Add Your API Key**
   - Tap the gear icon (⚙️) in the top right of the chat screen
   - Select "API Key"
   - Enter your OpenAI API key (starts with `sk-`)
   - Tap "Save & Continue"

3. **Test Chat Functionality**
   Try these test messages to verify the integration:

   **Basic Test:**
   ```
   Hello! Can you introduce yourself?
   ```

   **Context Test:**
   ```
   My name is [Your Name]. Remember this for our conversation.
   What's my name?
   ```

   **Creative Test:**
   ```
   Write a short haiku about programming
   ```

   **Problem Solving:**
   ```
   Explain the difference between React and React Native
   ```

### What to Expect

✅ **Successful Response Indicators:**
- "AI is typing..." appears briefly
- You receive thoughtful, contextual responses
- Conversation history is maintained
- Messages auto-scroll to bottom

❌ **Common Issues & Solutions:**

| Issue | Solution |
|-------|----------|
| "Invalid API key" error | Check your API key in Settings, ensure it starts with `sk-` |
| "Rate limit exceeded" | Wait a moment and try again |
| "API key does not have access" | Check your OpenAI account billing |
| "Network error" | Check internet connection |

### Console Logs (for debugging)
Open development console to see:
- `Sending to OpenAI: {messageCount: X, lastMessage: "..."}`
- `Making OpenAI API request...`
- `OpenAI API response received: {choices: 1, usage: {...}}`

### Features to Test

1. **Message Context** - Ask follow-up questions to verify conversation history
2. **Long Responses** - Ask for detailed explanations (increased max_tokens to 1000)
3. **Error Handling** - Try with invalid API key to test error messages
4. **Auto-scroll** - Send multiple messages to verify auto-scrolling
5. **Settings Navigation** - Test gear icon → settings → back button flow

### API Call Details

The app makes requests to:
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: `gpt-3.5-turbo`
- **Max Tokens**: 1000
- **Temperature**: 0.7
- **Context**: Last 10 messages for token efficiency

### Performance Notes

- **Context Management**: Only last 10 messages sent to API (manages token costs)
- **Token Optimization**: Reasonable max_tokens setting
- **Error Recovery**: Graceful error handling with user-friendly messages
- **Auto-scroll**: Smooth scrolling to latest messages

Happy testing! 🚀 