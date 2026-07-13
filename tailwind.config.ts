import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        primaryDark: "#3730A3",
        accent: "#7C3AED",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        bg: "#FAFAFE",
        card: "#FFFFFF",
        border: "#E9E7F5",
        text: "#1E1B2E",
      },
      fontFamily: { sans: ["var(--font-poppins)", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;