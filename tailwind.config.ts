import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orca: {
          // Deep ocean / coastal palette
          950: "#06121c",
          900: "#0a1f2e",
          800: "#0f2c40",
          700: "#143a54",
          600: "#1c5375",
          500: "#2473a3",
          400: "#3f9bcf",
          300: "#74bde0",
          200: "#aed8ee",
          100: "#d9edf8",
        },
        coral: {
          500: "#ff6b4a",
          400: "#ff8566",
        },
        // Brand green from the Orca Coast Playgrounds logo
        kelp: {
          700: "#1f7a34",
          600: "#2a9d43",
          500: "#37b54a",
          400: "#5bc85f",
          300: "#86d98a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
