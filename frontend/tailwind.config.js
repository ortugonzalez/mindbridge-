/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.jsx', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        sage: '#7C9A7E',
        whiteish: '#FAFAFA',
        softgray: '#F0F0F0',
        textdark: '#2D2D2D',
        'dm-bg': '#1A1A2E',
        'dm-surface': '#16213E',
        'dm-text': '#E8E8E8',
        'dm-muted': '#9CA3AF',
        'dm-border': '#374151',
      },
      boxShadow: {
        soft: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        xl: '1rem',
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'Inter', 'Arial', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dot: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.7s ease forwards',
        dot: 'dot 1.4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
