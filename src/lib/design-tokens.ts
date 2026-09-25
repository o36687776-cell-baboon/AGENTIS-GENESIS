export const colors = {
  void: "#050505",
  black: "#080808",
  deepBlack: "#0C0C0D",
  charcoal: "#111214",
  graphite: "#17191C",
  darkGrey: "#202328",
  midGrey: "#353A40",
  softGrey: "#737981",
  lightGrey: "#B8BDC4",
  offWhite: "#E8E9EA",
  white: "#F7F7F5",
  pureWhite: "#FFFFFF",

  signal: {
    primary: "#D9FF00",
    ai: "#9B7CFF",
    blue: "#6EA8FF",
    success: "#67E8A5",
    warning: "#F5C76A",
    error: "#FF6B6B",
  },
} as const;

export const borders = {
  subtle: "rgba(255,255,255,0.08)",
  default: "rgba(255,255,255,0.12)",
  active: "rgba(255,255,255,0.20)",
} as const;

export const shadows = {
  depth: "0 1px 2px rgba(0,0,0,.35)",
  elevated: "0 8px 32px rgba(0,0,0,.30)",
  floating: "0 24px 80px rgba(0,0,0,.35)",
  modal: "0 32px 120px rgba(0,0,0,.55)",
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
  32: "128px",
} as const;

export const radius = {
  sm: "2px",
  md: "4px",
  lg: "6px",
  xl: "8px",
  "2xl": "12px",
  "3xl": "16px",
} as const;

export const typography = {
  display: { size: "56px", lineHeight: "64px", weight: 600 },
  hero: { size: "44px", lineHeight: "52px", weight: 600 },
  h1: { size: "32px", lineHeight: "40px", weight: 600 },
  h2: { size: "24px", lineHeight: "32px", weight: 600 },
  h3: { size: "20px", lineHeight: "28px", weight: 600 },
  h4: { size: "16px", lineHeight: "24px", weight: 600 },
  body: { size: "14px", lineHeight: "22px", weight: 400 },
  sm: { size: "12px", lineHeight: "18px", weight: 400 },
  micro: { size: "10px", lineHeight: "14px", weight: 400 },
} as const;

export const motion = {
  micro: "100ms",
  fast: "160ms",
  normal: "180ms",
  transition: "280ms",
  complex: "300ms",
  major: "500ms",
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;