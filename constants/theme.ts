export const COLORS = {
  dark:      '#0A0B10',
  darkCard:  '#1E202E',
  darkBorder:'rgba(255,255,255,0.05)',
  gold:      '#DBC083',
  goldDark:  '#C9A84C',
  white:     '#FFFFFF',
  gray400:   '#9CA3AF',
  gray500:   '#6B7280',
  gray600:   '#4B5563',
  green:     '#22C55E',
  red:       '#EF4444',
  blue:      '#3B82F6',
  yellow:    '#EAB308',
} as const;

export const FONTS = {
  title:    'Cinzel_700Bold',
  body:     'Raleway_400Regular',
  bodyBold: 'Raleway_700Bold',
} as const;

export const SHADOWS = {
  gold: {
    shadowColor: '#DBC083',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
} as const;
