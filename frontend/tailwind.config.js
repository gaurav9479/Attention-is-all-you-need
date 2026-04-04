/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        slate: {
          950: '#0a0f1e',
        }
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' }
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        }
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
        pulse: 'pulse 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
