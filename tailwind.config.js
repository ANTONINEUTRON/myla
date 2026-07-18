/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#06080F",
        surface: "#0F1219",
        "surface-elevated": "#161B26",
        primary: {
          DEFAULT: "#FF6B35",
          glow: "rgba(255, 107, 53, 0.15)",
          dark: "#CC5529",
          light: "#FF8C5A",
        },
        yes: "#00E676",
        no: "#FF1744",
        text: {
          primary: "#F5F5F7",
          secondary: "#8E8E93",
          muted: "#48484A",
        }
      },
      fontFamily: {
        sans: ['PlusJakartaSans-Regular'],
        medium: ['PlusJakartaSans-Medium'],
        semibold: ['PlusJakartaSans-SemiBold'],
        bold: ['PlusJakartaSans-Bold'],
        extrabold: ['Outfit-ExtraBold'],
      },
    },
  },
  plugins: [],
}
