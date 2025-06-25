/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Space-themed color palette with deep gradient background and luminous accents
 */

const tintColorLight = '#007AFF';
const tintColorDark = '#9D4DFF'; // Luminous Purple

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    backgroundTop: '#FFFFFF', // Same as background for light mode
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E5E5E7',
    card: '#F8F9FA',
    cardBorder: '#E5E5E7',
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    surface: '#FAFAFA',
    placeholder: '#999999',
    // Message bubble colors
    botMessage: '#007AFF',
    userMessage: '#5856D6',
    // Glass effects (not used in light mode but needed for consistency)
    glassTint: 'rgba(0, 0, 0, 0.05)',
    glassBackground: 'rgba(0, 0, 0, 0.02)',
  },
  dark: {
    // Space theme colors
    text: '#F5F5F7', // Off-White for maximum readability
    background: '#0A0514', // Near Black (bottom of gradient)
    backgroundTop: '#101C3B', // Midnight Blue (top of gradient)
    tint: tintColorDark,
    icon: '#F5F5F7',
    tabIconDefault: '#B0B3B8',
    tabIconSelected: tintColorDark,
    border: 'rgba(245, 245, 247, 0.1)', // Subtle glass material
    card: 'rgba(245, 245, 247, 0.05)', // Glass panel with low opacity
    cardBorder: 'rgba(245, 245, 247, 0.15)',
    primary: '#9D4DFF', // Luminous Purple (The Bot)
    secondary: '#4A69BD', // Deep Blue (The User)
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    surface: 'rgba(245, 245, 247, 0.08)', // Glass surface
    placeholder: 'rgba(245, 245, 247, 0.4)',
    // Message bubble colors
    botMessage: '#9D4DFF', // Luminous Purple for bot
    userMessage: '#4A69BD', // Deep Blue for user
    // Glass effects
    glassTint: 'rgba(160, 180, 200, 0.1)', // Subtle grey/blue glass tint
    glassBackground: 'rgba(245, 245, 247, 0.03)',
  },
};
