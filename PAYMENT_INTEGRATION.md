# iOS Payment Integration Guide

This document explains how to implement real iOS in-app purchases for the ChatMobile app.

## Current Implementation

The app currently uses a simulated payment system (`simulatePaymentProcess` in `app/subscription.tsx`) for demonstration purposes. In production, you'll need to integrate with Apple's StoreKit.

## Production Setup Required

### 1. App Store Connect Configuration

1. Create in-app purchase products in App Store Connect:
   - Product ID: `chatmobile_monthly`
   - Product ID: `chatmobile_yearly`
   - Set pricing and descriptions

### 2. Package Installation

Replace the mock payment system with a real payment library:

```bash
# For Expo managed workflow
npx expo install expo-store-kit

# Or for bare React Native
npm install react-native-iap
```

### 3. Update Subscription Screen

Replace the mock `simulatePaymentProcess` function with real payment processing:

```typescript
import * as StoreKit from 'expo-store-kit';

// Real implementation
const processPayment = async (productId: string) => {
  try {
    // Request payment
    const payment = await StoreKit.requestPayment(productId);
    
    // Verify receipt with your backend
    const receipt = await StoreKit.getReceiptURL();
    const verified = await verifyReceiptWithBackend(receipt);
    
    if (verified) {
      return true;
    }
    
    throw new Error('Receipt verification failed');
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
};
```

### 4. Receipt Verification

For security, always verify receipts on your backend server:

```typescript
const verifyReceiptWithBackend = async (receipt: string) => {
  const response = await fetch('YOUR_BACKEND_URL/verify-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receipt })
  });
  
  const result = await response.json();
  return result.valid;
};
```

### 5. Backend Integration

Set up your backend to:
- Verify Apple receipts with Apple's servers
- Store subscription status in your database
- Provide API endpoints for subscription management

## Security Notes

- Never trust client-side subscription status
- Always verify receipts server-side
- Store subscription status in your secure backend
- Handle subscription renewals and cancellations
- Implement proper error handling for payment failures

## Testing

1. Create sandbox accounts in App Store Connect
2. Test with TestFlight builds
3. Test subscription flows, cancellations, and renewals
4. Verify receipt validation works correctly

## Current Flow

The app currently handles two authentication methods:

1. **API Key**: Users provide their own OpenAI API key
2. **Subscription**: Users pay for premium access (uses your backend API with your keys)

Both methods are properly integrated into the chat functionality and settings management. 