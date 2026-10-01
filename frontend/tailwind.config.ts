import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0810",
        surface: {
          DEFAULT: "#15121A",
          dim: "#100D15",
          low: "#171320",
          container: "#1E1A27",
          high: "#262130",
          highest: "#322C3D",
        },
        brand: {
          violet: "#8B5CF6",
          purple: "#A855F7",
          magenta: "#EC4899",
          pink: "#F43F5E",
        },
        accent: {
          emerald: "#22C55E",
          amber: "#F59E0B",
          rose: "#EF4444",
          cyan: "#06B6D4",
        }
      },
      fontFamily: {
        sora: ["var(--font-sora)", "Sora", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow-violet": "0 0 25px -4px rgba(139, 92, 246, 0.35)",
        "glow-magenta": "0 0 25px -4px rgba(236, 72, 153, 0.35)",
        "glow-emerald": "0 0 25px -4px rgba(34, 197, 94, 0.30)",
        "glow-card": "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;

