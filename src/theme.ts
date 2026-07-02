// Design System Theme Tokens
// These colors correspond to the Tailwind / NativeWind configurations

export const THEME = {
  colors: {
    background: "#06080F",
    surface: "#0F1219",
    surfaceElevated: "#161B26",
    border: "rgba(255, 255, 255, 0.06)",
    
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
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  }
} as const;
