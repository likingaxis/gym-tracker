import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#070A0F",
          panel: "#0F172A",
          card: "#151E2E",
          raised: "#1B2638",
          active: "#1F2F46",
          accent: "#34D399",
          info: "#60A5FA",
          warning: "#FBBF24",
          danger: "#F87171",
          muted: "#94A3B8",
          soft: "#CBD5E1"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(52, 211, 153, 0.18)",
        info: "0 0 30px rgba(96, 165, 250, 0.14)",
        card: "0 18px 50px rgba(0, 0, 0, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
