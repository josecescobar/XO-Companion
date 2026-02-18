import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1a1a2e',
        },
        safety: {
          green: '#16a34a',
          yellow: '#ca8a04',
          red: '#dc2626',
          orange: '#ea580c',
        },
        field: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
        },
      },
      fontSize: {
        'field-sm': ['14px', '20px'],
        'field-base': ['16px', '24px'],
        'field-lg': ['18px', '28px'],
        'field-xl': ['20px', '28px'],
        'field-2xl': ['24px', '32px'],
      },
    },
  },
  plugins: [],
} satisfies Config;
