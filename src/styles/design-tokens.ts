export const designTokens = {
  colors: {
    primary: {
      light: '#4f46e5', // Indigo 600
      dark: '#818cf8',  // Indigo 400
    },
    accent: {
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)', // Cyan to Teal
    },
    success: '#10b981', // Emerald 500
    warning: '#f59e0b', // Amber 500
    error: '#f43f5e',   // Rose 500
    neutrals: {
      light: {
        bg: '#f8fafc',
        card: '#ffffff',
        border: '#e2e8f0',
      },
      dark: {
        bg: '#0f172a',
        card: '#1e293b',
        border: '#334155',
      }
    }
  },
  radius: {
    default: '1rem', // rounded-2xl
  },
  shadows: {
    soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.03)',
    glow: '0 0 15px -3px rgba(79, 70, 229, 0.3)',
  },
  typography: {
    fonts: {
      body: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, Geist Mono, monospace',
    }
  }
};
