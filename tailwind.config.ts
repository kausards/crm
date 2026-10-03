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
        // Brand tokens
        brand: {
          black: "#070709",
          surface: "#0d0e15",
          "surface-elevated": "#141522",
          violet: "#8B5CF6",
          magenta: "#EC4899",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        // Base dark surfaces
        background: "#070709",
        surface: "#0d0e15",
        "surface-dim": "#0a0a0f",
        "surface-bright": "#141522",
        "surface-container-lowest": "#070709",
        "surface-container-low": "#0b0c12",
        "surface-container": "#0e1017",
        "surface-container-high": "#13151f",
        "surface-container-highest": "#1a1d2b",
        "surface-variant": "#1c1f2e",
        // Text
        "on-surface": "#F1F5F9",
        "on-surface-variant": "#94A3B8",
        "inverse-surface": "#F8FAFC",
        "inverse-on-surface": "#0F172A",
        outline: "rgba(255,255,255,0.1)",
        "outline-variant": "rgba(255,255,255,0.06)",
        // Primary brand violet
        primary: "#8B5CF6",
        "on-primary": "#FFFFFF",
        "primary-container": "rgba(139,92,246,0.15)",
        "on-primary-container": "#C4B5FD",
        "inverse-primary": "#A78BFA",
        // Secondary
        secondary: "#EC4899",
        "on-secondary": "#FFFFFF",
        "secondary-container": "rgba(236,72,153,0.15)",
        "on-secondary-container": "#F472B6",
        // Tertiary (Cyan)
        tertiary: "#06B6D4",
        "on-tertiary": "#FFFFFF",
        "tertiary-container": "rgba(6,182,212,0.15)",
        "on-tertiary-container": "#67E8F9",
        // Status
        error: "#EF4444",
        "on-error": "#FFFFFF",
        "error-container": "rgba(239,68,68,0.15)",
        "on-error-container": "#FCA5A5",
        // Sidebar specific
        "sidebar-bg": "rgba(255,255,255,0.03)",
        "sidebar-text": "#94A3B8",
        "sidebar-active": "#8B5CF6",
        "sidebar-active-bg": "rgba(139,92,246,0.15)",
        "sidebar-hover": "rgba(255,255,255,0.05)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
        // Aliases — all resolve to Plus Jakarta Sans for consistency
        headline: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        label: ["'Plus Jakarta Sans'", "sans-serif"],
        inter: ["'Plus Jakarta Sans'", "sans-serif"],
        sora: ["'Plus Jakarta Sans'", "sans-serif"],
        geist: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      fontSize: {
        "headline-xl": ["30px", { lineHeight: "38px", fontWeight: "700" }],
        "headline-lg": ["22px", { lineHeight: "30px", fontWeight: "600" }],
        "headline-md": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "headline-sm": ["15px", { lineHeight: "22px", fontWeight: "600" }],
        "metric-val": ["26px", { lineHeight: "32px", fontWeight: "700" }],
        "body-lg": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-md": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "600" }],
      },
      spacing: {
        gutter: "1.5rem",
        "gutter-mobile": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "card-md": "0 12px 40px -4px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "card-hover": "0 16px 48px -4px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        sidebar: "4px 0 24px rgba(0, 0, 0, 0.8)",
        glow: "0 0 25px -5px rgba(139, 92, 246, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
