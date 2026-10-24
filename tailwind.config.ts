import type { Config } from 'tailwindcss'
import { borderWidth, colors, fontFamily, radius, shadow, shadowOffset } from './src/styles/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: colors.cream,
        paper: colors.paper,
        ink: colors.ink,
        muted: colors.muted,
        accent: colors.accent,
        success: colors.success,
        danger: colors.danger,
        category: colors.category,
      },
      borderWidth: {
        thin: borderWidth.thin,
        thick: borderWidth.thick,
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
      },
      boxShadow: {
        'hard-sm': shadow.sm,
        'hard-md': shadow.md,
        'hard-lg': shadow.lg,
      },
      translate: {
        'press-sm': `${shadowOffset.sm}px`,
        'press-md': `${shadowOffset.md}px`,
        'press-lg': `${shadowOffset.lg}px`,
      },
      fontFamily: {
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
