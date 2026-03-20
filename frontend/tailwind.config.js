/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.jsx', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        sage: '#7C9A7E',
        whiteish: '#FAFAFA',
        softgray: '#F0F0F0',
        textdark: '#2D2D2D',
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
    },
  },
  plugins: [],
}

