/** A message for the whole form (not one field), announced to screen readers. */
export function FormError({ message }: { message: string | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md border-thick border-danger bg-paper p-3 font-semibold">
      {message}
    </p>
  )
}
