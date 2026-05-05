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
        amber: {
          DEFAULT: "#C4872A",
          hi: "#D4963A",
          dim: "rgba(196,133,42,0.12)",
          mid: "rgba(196,133,42,0.24)",
        },
        bg: {
          DEFAULT: "#F5F4F0",
          raised: "#FFFFFF",
          card: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
