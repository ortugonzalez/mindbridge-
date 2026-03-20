export const theme = {
  colors: {
    light: {
      primary: '#3B82F6', // Blue-500
      primaryHover: '#2563EB', // Blue-600
      secondary: '#10B981', // Emerald-500
      secondaryHover: '#059669', // Emerald-600
      background: '#FAF8F5',
      surface: '#FFFFFF',
      text: '#2D2D2D',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      ghost: 'transparent',
      ghostHover: 'rgba(59, 130, 246, 0.1)',
    },
    dark: {
      primary: '#7C9A7E',
      primaryHover: '#9CAF9C',
      secondary: '#4A5E4A',
      secondaryHover: '#3D4F3D',
      background: '#2D3B2D',
      surface: '#3D4F3D',
      text: '#E8EDE8',
      textMuted: '#9CAF9C',
      border: '#4A5E4A',
      ghost: 'transparent',
      ghostHover: 'rgba(124, 154, 126, 0.2)',
    }
  },
  typography: {
    base: "system-ui, 'Segoe UI', Roboto, Inter, Arial, sans-serif",
    headings: "system-ui, 'Segoe UI', Roboto, Inter, Arial, sans-serif",
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      xxl: '1.5rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  }
};
