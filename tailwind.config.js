/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        petrol: {
          950: "#050b0e",
          900: "#081418",
          850: "#0c1b21",
          800: "#11262e",
          750: "#17313b",
          700: "#1e3d48",
          600: "#27505d",
          500: "#356a7a",
          400: "#498a9d",
          300: "#6eafc0",
          200: "#9fd0dc",
        },
        uno: {
          red: "#ef4444",
          blue: "#0284c7",
          green: "#10b981",
          yellow: "#f59e0b",
          teal: "#14b8a6",
          dark: "#050b0e",
          cardDark: "#0c1b21",
          accent: "#06b6d4",
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
