import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatWallTime, parseWallTime, type TimeFormat } from '@/lib/time/time'
import { Input, type InputProps } from './Input'

interface ClockInputProps extends Pick<InputProps, 'label' | 'error' | 'className'> {
  format: TimeFormat
  wallTime: string
  draft?: string
  onChange: (draft: string) => void
}

/** A clock editor whose visible value follows the app's display setting. */
export const ClockInput = forwardRef<HTMLInputElement, ClockInputProps>(function ClockInput(
  { format, wallTime, draft, onChange, ...field },
  ref,
) {
  const { t, i18n } = useTranslation()
  const display = (time: string) => formatWallTime(time, format, i18n.language)

  return (
    <Input
      {...field}
      ref={ref}
      type="text"
      autoComplete="off"
      maxLength={12}
      value={draft ?? (wallTime ? display(wallTime) : '')}
      hint={t('common.clockInputHint', { time: display('14:30') })}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        if (draft === undefined) return
        const parsed = parseWallTime(draft)
        if (parsed) {
          const formatted = display(parsed)
          if (formatted !== draft) onChange(formatted)
        }
      }}
    />
  )
})
