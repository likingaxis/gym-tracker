import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#080B12",
          panel: "#111827",
          card: "#172033",
          accent: "#34D399",
          muted: "#94A3B8"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(52, 211, 153, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
