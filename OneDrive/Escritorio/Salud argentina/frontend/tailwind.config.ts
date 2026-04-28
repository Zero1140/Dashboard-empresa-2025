import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#080C18",
        surface: "#0F1629",
        "surface-2": "#162038",
        border: "#1E2A45",
        "border-bright": "#2A3A5C",
        accent: "#00D4B4",
        "accent-dim": "#00A896",
        "accent-glow": "rgba(0,212,180,0.15)",
        text: "#E8ECF4",
        "text-2": "#7A8BA6",
        "text-3": "#4A5A72",
        success: "#22C55E",
        "success-bg": "rgba(34,197,94,0.1)",
        warning: "#F59E0B",
        "warning-bg": "rgba(245,158,11,0.1)",
        danger: "#EF4444",
        "danger-bg": "rgba(239,68,68,0.1)",
        info: "#3B82F6",
        "info-bg": "rgba(59,130,246,0.1)",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0,212,180,0.2)",
        "glow-sm": "0 0 8px rgba(0,212,180,0.15)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,42,69,0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
