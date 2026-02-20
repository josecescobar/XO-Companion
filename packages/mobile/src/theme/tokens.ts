import { Platform, type ViewStyle } from 'react-native';

/** Consistent spacing scale (multiples of 4) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/** Border radius presets */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/** Typography presets */
export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  stat: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
} as const;

/** Shadow presets — solid shadows visible in outdoor/sunlight conditions */
export const shadows: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle,
};
