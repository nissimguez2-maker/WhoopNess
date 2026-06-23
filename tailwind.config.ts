import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

/**
 * WhoopNess design system — light, earthy, paper-calm.
 * - Cream paper background, sand surfaces, deep-green ink.
 * - GREEN is the BRAND (interactive/chrome) — never a data signal.
 * - Recovery has its OWN scale (clay → ochre → signal-green) and is ALWAYS
 *   shown with a verdict word/icon, so meaning never rides on hue alone.
 * - Text/`-400` variants are tuned dark enough to clear WCAG AA on cream.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-fustat)", "Fustat", "ui-sans-serif", "system-ui", "sans-serif"],
        // Numbers reuse Fustat with tabular figures (see globals .font-mono) — no dev-tool monospace.
        mono: ["var(--font-fustat)", "Fustat", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["3.25rem", { lineHeight: "3.4rem", fontWeight: "700", letterSpacing: "-0.02em" }],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "light",
      layout: {
        radius: { small: "8px", medium: "12px", large: "20px" },
      },
      themes: {
        // WhoopNess is light-only; "light" IS the product theme.
        light: {
          colors: {
            background: "#FBF5DD", // cream paper
            foreground: {
              DEFAULT: "#14380F", // deep-green ink (body) — 8.5:1 on cream
              600: "#355E2C", // secondary text — ~6:1
              500: "#5A7150", // muted hints (large/decorative)
              400: "#8A9A80", // faint
            },
            content1: "#F4EDCB", // slightly deeper than cream (primary card)
            content2: "#E7E1B1", // sand (secondary surface)
            content3: "#DBD3A0",
            content4: "#CFC78E",
            divider: "rgba(20,56,15,0.12)",
            default: {
              100: "#EDE6C2",
              200: "#E1DAAE",
              300: "#D3CB95",
              400: "#8A9A80",
              500: "#5A7150",
              600: "#355E2C",
            },
            // GREEN BRAND — interactive/chrome only, never a recovery signal.
            primary: {
              DEFAULT: "#306D29",
              foreground: "#FBF5DD",
              600: "#0D530E", // deep green (hover/press, on-cream emphasis)
              500: "#3E7C34",
              400: "#2E6A26", // text/icon variant — kept dark for AA on cream
            },
            // Coach accent — deep green, used sparingly.
            secondary: { DEFAULT: "#0D530E", foreground: "#FBF5DD" },
            // ── RECOVERY SCALE (data only; always paired with a verdict word) ──
            // READY — signal green, deliberately brighter than brand green.
            success: {
              DEFAULT: "#4F9E3F",
              foreground: "#06210A",
              400: "#2E7D24", // text on cream — ~4.7:1
              50: "rgba(79,158,63,0.16)",
            },
            // EASE OFF — ochre/amber.
            warning: {
              DEFAULT: "#D69A33",
              foreground: "#231603",
              400: "#8F6410", // text on cream — ~4.8:1
              50: "rgba(214,154,51,0.18)",
            },
            // RECOVER — clay/terracotta.
            danger: {
              DEFAULT: "#BB5436",
              foreground: "#FBF5DD",
              400: "#9B3F22", // text on cream — ~6:1
              50: "rgba(187,84,54,0.16)",
            },
            focus: "#306D29",
          },
        },
      },
    }),
  ],
};

export default config;
