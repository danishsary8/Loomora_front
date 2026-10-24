import type { SVGProps } from 'react'

// Decorative icons: callers give the accessible name, so these are aria-hidden.
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
