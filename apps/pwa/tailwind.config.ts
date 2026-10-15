import type { Config } from "tailwindcss";

/**
 * Design tokens.
 *
 * One accent: the logo blue (`brand-600` = the original `primary`, #016BFF).
 * Text on a light brand fill uses `brand-700`+ — `brand-600` on `brand-50` is
 * under 4.5:1. Neutrals are Tailwind's slate.
 *
 * The shadcn-style names (`input`, `accent`, `muted-foreground`, …) were used
 * by several components but never defined, so those classes rendered
 * nothing; they now map onto the same palette.
 */
const brand = {
  50: "#EEF5FF",
  100: "#D9E8FF",
  200: "#BCD7FF",
  300: "#8EBFFF",
  400: "#599BFF",
  500: "#2F7BFF",
  600: "#016BFF",
  700: "#0156CC",
  800: "#0647A3",
  900: "#0B3C80",
  950: "#0A2651",
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand,
        primary: brand[600],
        input: "#E2E8F0", // slate-200
        accent: "#F1F5F9", // slate-100
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" }, // slate-100 / slate-500
        foreground: "#0F172A", // slate-900
        background: "#F8FAFC", // slate-50
        destructive: "#E11D48", // rose-600
        card: { DEFAULT: "#FFFFFF", foreground: "#0F172A" },
      },
      fontFamily: {
        yekan: ['var(--font-yekan)'],
      },
      boxShadow: {
        /** Resting surface: cards, panels, the sidebar. */
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)",
        /** Floating: menus, popovers, the mobile bars. */
        pop: "0 12px 32px -12px rgb(15 23 42 / 0.22), 0 2px 6px -2px rgb(15 23 42 / 0.08)",
        /** The primary button's soft brand glow. */
        brand: "0 6px 16px -6px rgb(1 107 255 / 0.55)",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
    },
  },
  plugins: [],
} satisfies Config;
