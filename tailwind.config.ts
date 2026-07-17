import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#050708",
          panel: "rgba(255, 255, 255, 0.045)",
          card: "rgba(255, 255, 255, 0.035)",
          raised: "rgba(255, 255, 255, 0.06)",
          active: "rgba(255, 255, 255, 0.08)",
          line: "rgba(255, 255, 255, 0.08)",
          accent: "#C65F37",
          info: "#A9B0AD",
          warning: "#C65F37",
          success: "#607D6D",
          danger: "#A94E48",
          muted: "#8A938F",
          soft: "#D6D9D3"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(198, 95, 55, 0.18)",
        info: "0 0 30px rgba(169, 176, 173, 0.14)",
        card: "0 18px 50px rgba(0, 0, 0, 0.5)"
      }
    }
  },
  plugins: []
};

export default config;
