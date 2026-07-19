/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  safelist: [
    // Dark theme uses dynamic accent colors
    { pattern: /border-(emerald|cyan|violet)-500\/(10|15|20|25)/ },
    { pattern: /bg-(emerald|cyan|violet)-500\/(10|15)/ },
    { pattern: /text-(emerald|cyan|violet)-400/ },
    { pattern: /from-(emerald|cyan|violet)-500\/(50|10)/ },
    { pattern: /to-(emerald|cyan|violet|teal)-500\/(10)/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
        heading: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        /* Theme-aware page colors via CSS variables */
        page: {
          DEFAULT: 'rgb(var(--page-text) / <alpha-value>)',
          secondary: 'rgb(var(--page-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--page-text-muted) / <alpha-value>)',
          label: 'rgb(var(--page-label) / <alpha-value>)',
          link: 'rgb(var(--page-link) / <alpha-value>)',
          success: 'rgb(var(--page-success-text) / <alpha-value>)',
          warning: 'rgb(var(--page-warning-text) / <alpha-value>)',
          danger: 'rgb(var(--page-danger-text) / <alpha-value>)',
          info: 'rgb(var(--page-info-text) / <alpha-value>)',
        },
      },
      animation: {
        'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'star-movement-bottom': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(-100%, 0%)', opacity: '0' },
        },
        'star-movement-top': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(100%, 0%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
