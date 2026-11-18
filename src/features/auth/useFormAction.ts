import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, errorMessageKey, type FieldErrors } from '@/lib/api'

/**
 * Runs a form's request and turns a failure into text for the form: field errors from a 422,
 * or one translated message for network, rate limit and unexpected failures.
 */
export function useFormAction() {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function run(action: () => Promise<void>): Promise<void> {
    setPending(true)
    setFormError(undefined)
    setFieldErrors({})
    try {
      await action()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setFieldErrors(error.fieldErrors)
      else setFormError(t(errorMessageKey(error)))
    } finally {
      setPending(false)
    }
  }

  return { pending, formError, fieldErrors, setFieldErrors, run }
}
