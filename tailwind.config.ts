import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f7ff",
          500: "#1b67ff",
          600: "#0c4ed8",
        },
        status: {
          pending: "#f97316",
          confirmed: "#16a34a",
          risk: "#f59e0b",
          canceled: "#ef4444",
          noshow: "#dc2626",
          attended: "#22c55e",
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
