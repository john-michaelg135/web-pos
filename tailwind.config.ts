import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fdf8f8',
        'on-background': '#1c1b1c',
        surface: '#fdf8f8',
        'surface-dim': '#ddd9d9',
        'surface-bright': '#fdf8f8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f7f3f2',
        'surface-container': '#f1eded',
        'surface-container-high': '#ebe7e7',
        'surface-container-highest': '#e5e2e1',
        'on-surface': '#1c1b1c',
        'on-surface-variant': '#47464b',
        'inverse-surface': '#313030',
        'inverse-on-surface': '#f4f0ef',
        outline: '#77767b',
        'outline-variant': '#c8c5cb',
        'surface-tint': '#5f5e61',
        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#1b1b1e',
        'on-primary-container': '#858387',
        'inverse-primary': '#c8c5ca',
        secondary: '#5d5e66',
        'on-secondary': '#ffffff',
        'secondary-container': '#e3e1ec',
        'on-secondary-container': '#63646c',
        tertiary: '#000000',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#1d1b16',
        'on-tertiary-container': '#88837c',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'surface-variant': '#e5e2e1',
      },
      fontFamily: {
        sans: ['var(--font-hanken-grotesk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      spacing: {
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
      },
    },
  },
  plugins: [],
};

export default config;
