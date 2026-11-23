import type { Config } from 'tailwindcss'
import {
  borderWidth,
  colors,
  elevation,
  fontFamily,
  motion,
  radius,
  shadow,
  shadowOffset,
} from './src/styles/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: colors.cream,
        canvas: colors.cream,
        paper: colors.paper,
        subtle: colors.subtle,
        ink: colors.ink,
        muted: colors.muted,
        primary: colors.primary,
        'primary-pressed': colors.primaryPressed,
        'primary-soft': colors.primarySoft,
        accent: colors.accent,
        'border-subtle': colors.borderSubtle,
        'border-control': colors.borderControl,
        success: colors.success,
        warning: colors.warning,
        'warning-surface': colors.warningSurface,
        danger: colors.danger,
        category: colors.category,
      },
      borderWidth: {
        hairline: borderWidth.hairline,
        control: borderWidth.control,
        thin: borderWidth.thin,
        thick: borderWidth.thick,
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
      },
      boxShadow: {
        'soft-sm': elevation.sm,
        'soft-md': elevation.md,
        'soft-sheet': elevation.sheet,
        'hard-sm': shadow.sm,
        'hard-md': shadow.md,
        'hard-lg': shadow.lg,
      },
      transitionDuration: {
        fast: motion.duration.fast,
        base: motion.duration.base,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        elemental: motion.easing.standard,
      },
      translate: {
        'press-sm': `${shadowOffset.sm}px`,
        'press-md': `${shadowOffset.md}px`,
        'press-lg': `${shadowOffset.lg}px`,
      },
      fontFamily: {
        heading: [...fontFamily.heading],
        script: [...fontFamily.script],
        body: [...fontFamily.body],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
} satisfies Config
