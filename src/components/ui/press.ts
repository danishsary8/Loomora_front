// Elemental Edition interactive states (DEC-003): subtle elevation + restrained tactile scale.
// `enabled:` keeps disabled buttons still; `motion-reduce:` disables scale under reduced motion.
const pressBase =
  'transition-[background-color,border-color,box-shadow,transform] duration-fast ease-elemental'

export const pressMd = `shadow-soft-sm ${pressBase} enabled:active:scale-[0.98] motion-reduce:enabled:active:scale-100`

export const pressSm = `shadow-soft-sm ${pressBase} enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100`

/** For links and other non-form elements (no :enabled state). */
export const pressMdAny = `shadow-soft-sm ${pressBase} active:scale-[0.98] motion-reduce:active:scale-100`

export const pressSmAny = `shadow-soft-sm ${pressBase} active:scale-[0.97] motion-reduce:active:scale-100`
