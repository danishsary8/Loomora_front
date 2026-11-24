import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDownIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

interface SettingsGroupProps {
  title: string
  children: ReactNode
}

/** A titled list of settings rows on one paper surface, divided by hairlines. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-1 text-sm font-semibold text-muted">
        {title}
      </h2>
      <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border-hairline border-border-subtle bg-paper shadow-soft-sm">
        {children}
      </ul>
    </section>
  )
}

interface SettingsRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  /** Extra line under the label, read as the row's description. */
  description?: string
  tone?: 'default' | 'danger'
}

/** One full-width row that opens a sheet or runs an action. */
export function SettingsRow({
  label,
  description,
  tone = 'default',
  className,
  ...rest
}: SettingsRowProps) {
  const descriptionId = useId()
  return (
    <li>
      <button
        type="button"
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left',
          'transition-colors duration-fast ease-elemental enabled:hover:bg-subtle/80 enabled:active:bg-subtle',
          'focus-visible:outline-offset-[-3px] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              'break-words font-semibold',
              tone === 'danger' ? 'text-danger' : 'text-ink',
            )}
          >
            {label}
          </span>
          {description && (
            <span id={descriptionId} aria-hidden="true" className="text-sm text-muted">
              {description}
            </span>
          )}
        </span>
        <ChevronDownIcon className="size-5 shrink-0 -rotate-90 text-muted" />
      </button>
    </li>
  )
}
