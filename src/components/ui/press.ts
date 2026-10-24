// Press-down states (DEC-002): the element moves into its hard shadow when pressed.
// `enabled:` keeps disabled buttons still.
const pressBase = 'transition-[transform,box-shadow] duration-100 ease-out'

export const pressMd = `shadow-hard-md ${pressBase} enabled:active:translate-x-press-md enabled:active:translate-y-press-md enabled:active:shadow-none`

export const pressSm = `shadow-hard-sm ${pressBase} enabled:active:translate-x-press-sm enabled:active:translate-y-press-sm enabled:active:shadow-none`

/** For non-form elements (no :enabled state). */
export const pressMdAny = `shadow-hard-md ${pressBase} active:translate-x-press-md active:translate-y-press-md active:shadow-none`
