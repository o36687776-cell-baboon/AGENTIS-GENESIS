import { colors, borders, shadows, spacing, radius, typography, motion } from "@/lib/design-tokens";

export type ColorName = keyof typeof colors | `signal.${keyof typeof colors.signal}`;

export const semanticTokens = {
  color: {
    background: colors.void,
    surface: {
      0: colors.void,
      1: colors.black,
      2: colors.deepBlack,
      3: colors.charcoal,
      4: colors.graphite,
      5: colors.darkGrey,
    },
    text: {
      primary: colors.offWhite,
      secondary: colors.lightGrey,
      muted: colors.softGrey,
      disabled: colors.midGrey,
      inverse: colors.void,
    },
    border: {
      subtle: borders.subtle,
      default: borders.default,
      active: borders.active,
      focus: colors.signal.primary,
    },
    signal: {
      primary: colors.signal.primary,
      ai: colors.signal.ai,
      blue: colors.signal.blue,
      success: colors.signal.success,
      warning: colors.signal.warning,
      error: colors.signal.error,
    },
  },
  space: spacing,
  radius,
  shadow: shadows,
  typography,
  motion,
} as const;

export { colors, borders, shadows, spacing, radius, typography, motion };
