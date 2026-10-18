/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B1020',
          sidebar: '#080D19',
          card: '#171E35',
          panel: '#202944',
        },
        accent: {
          purple: '#8B5CF6',
          cyan: '#22D3EE',
        },
        text: {
          main: '#F8FAFC',
          muted: '#A7B1C8',
        },
        border: {
          dark: '#2B3550',
        },
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          error: '#FB7185',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 20px -5px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.35)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
