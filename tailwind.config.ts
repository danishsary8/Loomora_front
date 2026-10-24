import type { Config } from 'tailwindcss'

// Design tokens are added in F-003.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
