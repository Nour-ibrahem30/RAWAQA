import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "var(--charcoal)",
        "charcoal-soft": "var(--charcoal-soft)",
        ivory: "var(--ivory)",
        "ivory-2": "var(--ivory-2)",
        sand: "var(--sand)",
        gold: "var(--gold)",
        "gold-light": "var(--gold-light)",
        "gold-pale": "var(--gold-pale)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        clay: "var(--clay)",
        indigo: "var(--indigo)",
        ochre: "var(--ochre)",
        forest: "var(--forest)",
        dune: "var(--dune)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "var(--font-noto-arabic)", "sans-serif"],
      },
      borderRadius: {
        soft: "28px",
        pill: "999px",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(.22,.61,.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
