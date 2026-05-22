export const COLORS = {
  primary: '#4A90D9',
  primaryDark: '#357ABD',
  primaryLight: '#6BB3F0',
  secondary: '#FF6B6B',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2F5',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Priority colors
  urgent: '#EF4444',
  normal: '#F59E0B',
  low: '#10B981',
  spam: '#9CA3AF',

  // Provider colors
  gmail: '#EA4335',
  outlook: '#0078D4',
  yahoo: '#6001D2',

  // Category colors
  work: '#3B82F6',
  personal: '#8B5CF6',
  finance: '#10B981',
  shopping: '#F59E0B',
  newsletter: '#6B7280',
  social: '#EC4899',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    title: 32,
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

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  maxOutputTokens: 8192,
  temperature: 0.3,
};

export const APP_CONFIG = {
  appName: 'MailMind',
  freeTierLimit: 10,
  maxAccountsFree: 1,
  maxAccountsPremium: 5,
};
