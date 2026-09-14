import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0E0E12',
        sidebar: '#13131A',
        surface: '#17171F',
        elevated: '#1E1E28',
        stroke: '#2A2A36',
        'text-primary': '#F2F2F5',
        'text-secondary': '#9A9AA8',
        'text-muted': '#6A6A78',
        accent: { DEFAULT: '#7C5CFF', hover: '#8F73FF', active: '#6C4CE6' },
        profit: { DEFAULT: '#35D07F', tint: 'rgba(53, 208, 127, 0.12)' },
        warning: { DEFAULT: '#E8B54A', tint: 'rgba(232, 181, 74, 0.12)' },
        critical: { DEFAULT: '#F0603E', tint: 'rgba(240, 96, 62, 0.12)' },
        desire: { DEFAULT: '#A78BFA', tint: 'rgba(167, 139, 250, 0.12)' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '1rem',
        full: '9999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '28px',
      },
      boxShadow: {
        overlay: '0 8px 24px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
