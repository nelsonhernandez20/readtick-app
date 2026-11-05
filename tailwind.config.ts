import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          lime: "#B9FF66",
          dark: "#191A23",
          card: "#191A23",
          surface: "#14151D",
          input: "#111218",
          border: "#292A36",
          light: "#F3F3F3",
        },
        tiktok: {
          cyan: "#B9FF66",
          pink: "#FE2C55",
          dark: "#191A23",
          card: "#191A23",
          border: "#292A36",
          accent: "#B9FF66"
        }
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-2%)' },
          '50%': { transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(254, 44, 85, 0.6))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 5px rgba(37, 244, 238, 0.4))' },
        }
      },
      animation: {
        'bounce-subtle': 'bounceSubtle 2s infinite ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      }
    },
  },
  plugins: [],
};
export default config;
