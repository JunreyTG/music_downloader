import { Platform } from 'react-native';

export const COLORS = {
  // Pure Black & White - Strict Monochrome
  bg: '#000000',
  surface: '#0D0D0D',
  card: '#141414',
  cardHighlight: '#1E1E1E',
  border: '#262626',
  borderLight: '#3A3A3A',
  
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#666666',
  textSubtle: '#404040',

  white: '#FFFFFF',
  black: '#000000',
  
  // Minimalist badge indicators (strictly monochrome)
  badgeBg: '#222222',
  badgeText: '#FFFFFF',
  error: '#FF453A',
};

export const FONTS = {
  // Biotrip Serif Bold styling
  serifBold: Platform.select({
    ios: 'Georgia-Bold',
    android: 'serif',
    web: '"Biotrip Serif", "Biotif", "Georgia", "Times New Roman", serif',
    default: 'serif',
  }),
  serifRegular: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: '"Biotrip Serif", "Biotif", "Georgia", "Times New Roman", serif',
    default: 'serif',
  }),
  sansBold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    web: 'system-ui, -apple-system, sans-serif',
    default: 'sans-serif',
  }),
};
