/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#25306B',
        secondary: '#006BB9',
        accent: '#FF1D3D',
        surface: '#EDF0F5',
        card: '#FFFFFF',
        muted: '#6B7280',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        score: ['Barlow', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'pulse-live': 'pulseLive 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
