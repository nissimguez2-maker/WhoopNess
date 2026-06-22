import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

/**
 * WhoopNess design system — dark, calm/medical-grade.
 * - Near-black, blue-tinted surfaces (no pure black: easier on the eyes at 07:00).
 * - A single teal brand accent for interactive/brand elements.
 * - Recovery green/amber/red are reserved STRICTLY for data meaning.
 * - Two-tier semantic tokens: `success`/`warning`/`danger` are surface fills
 *   (with their own dark `-foreground`); `*-400` variants are the only versions
 *   used as text/numbers on dark. All pairings are AA/AAA contrast-checked.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "3.75rem", fontWeight: "700" }],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "dark",
      layout: {
        radius: { small: "8px", medium: "12px", large: "20px" },
      },
      themes: {
        // WhoopNess is dark-only; "dark" IS the product theme.
        dark: {
          colors: {
            background: "#0A0C10",
            foreground: {
              DEFAULT: "#ECEFF4",
              600: "#AEB6C2",
              500: "#8A93A1",
              400: "#5E6675",
            },
            content1: "#12151C",
            content2: "#191D26",
            content3: "#222732",
            content4: "#2C323F",
            divider: "rgba(255,255,255,0.10)",
            default: {
              100: "#1B202A",
              400: "#5E6675",
              500: "#8A93A1",
              600: "#AEB6C2",
            },
            // Teal brand accent — interactive/brand only, never a data signal.
            primary: {
              DEFAULT: "#3FB6C6",
              foreground: "#06121A",
              400: "#6FCBD8",
              600: "#2E97A6",
            },
            // Coach/AI accent, used sparingly.
            secondary: { DEFAULT: "#8B7CF6", foreground: "#0B0814" },
            // Recovery GREEN / READY (>=67)
            success: {
              DEFAULT: "#1FB87A",
              foreground: "#04140D",
              400: "#34D399",
              50: "rgba(31,184,122,0.14)",
            },
            // Recovery AMBER / EASE OFF (34-66)
            warning: {
              DEFAULT: "#E8A53D",
              foreground: "#1A1102",
              400: "#F2B860",
              50: "rgba(232,165,61,0.14)",
            },
            // Recovery RED / RECOVER (<=33) — desaturated coral: "care", not "alarm".
            danger: {
              DEFAULT: "#F25C5C",
              foreground: "#1A0606",
              400: "#FF8585",
              50: "rgba(242,92,92,0.14)",
            },
            focus: "#3FB6C6",
          },
        },
      },
    }),
  ],
};

export default config;
