import type { Config } from 'tailwindcss'
import {
  borderWidth,
  colors,
  elevation,
  fontFamily,
  iconSize,
  motion,
  radius,
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
        'primary-light': colors.primaryLight,
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
        fab: elevation.fab,
      },
      transitionDuration: {
        fast: motion.duration.fast,
        base: motion.duration.base,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        elemental: motion.easing.standard,
      },
      fontFamily: {
        heading: [...fontFamily.heading],
        body: [...fontFamily.body],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      width: {
        'icon-sm': iconSize.sm,
        'icon-md': iconSize.md,
        'icon-lg': iconSize.lg,
        'icon-xl': iconSize.xl,
      },
      height: {
        'icon-sm': iconSize.sm,
        'icon-md': iconSize.md,
        'icon-lg': iconSize.lg,
        'icon-xl': iconSize.xl,
      },
    },
  },
  plugins: [],
} satisfies Config
