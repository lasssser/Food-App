// 🎨 Design System - يلا ناكل؟
// Food-driven – فخم – يخلي المستخدم يحس بالجوع فوراً

export const COLORS = {
  // Primary (شهية)
  primary: '#E53935',
  primaryLight: '#FF6B6B',
  primaryDark: '#C62828',
  
  // Secondary (ثقة وهدوء)
  secondary: '#1E1E1E',
  secondaryLight: '#2D2D2D',
  
  // Accent (إغراء)
  accent: '#FFC107',
  accentLight: '#FFD54F',
  
  // Background
  background: '#FAFAFA',
  surface: '#FFFFFF',
  
  // Success / Order status
  success: '#2ECC71',
  successLight: '#A9DFBF',
  
  // Status colors
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  
  // Text
  textPrimary: '#1E1E1E',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#FFFFFF',
  
  // Others
  border: '#E0E0E0',
  divider: '#F0F0F0',
  overlay: 'rgba(0,0,0,0.5)',
  cardShadow: 'rgba(0,0,0,0.12)',
};

export const FONTS = {
  // Arabic: Cairo
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  
  // Sizes
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 40,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 100,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
};

// Gradient for header
export const GRADIENTS = {
  primary: ['#E53935', '#C62828'],
  dark: ['#1E1E1E', '#2D2D2D'],
  overlay: ['transparent', 'rgba(0,0,0,0.7)'],
};

// Animation durations
export const ANIMATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
};

export default {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
  ANIMATIONS,
};
