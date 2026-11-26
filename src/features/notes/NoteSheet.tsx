import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Sheet, Textarea } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import type { ScheduleItem } from '@/features/schedule/types'
import { errorMessageKey } from '@/lib/api'
import { newId } from '@/lib/id'
import { NoteConflictError, ValidationError } from '@/lib/storage'
import { MAX_NOTE_BODY, MAX_NOTE_TITLE, type Note, type NoteFields, type NoteInput } from './types'

interface NoteSheetProps {
  open: boolean
  note: Note | null
  scheduleItems: readonly ScheduleItem[]
  saving: boolean
  onClose: () => void
  onCreate: (input: NoteInput) => Promise<unknown>
  onUpdate: (id: string, fields: NoteFields, revision?: number) => Promise<unknown>
}

export function NoteSheet({
  open,
  note,
  scheduleItems,
  saving,
  onClose,
  onCreate,
  onUpdate,
}: NoteSheetProps) {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLInputElement>(null)
  const attachId = useId()
  const dateId = useId()

  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [scheduleItemId, setScheduleItemId] = useState(note?.schedule_item_id ?? '')
  const [localDate, setLocalDate] = useState(note?.local_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{ fields: NoteFields; deleted: boolean } | null>(null)

  const hasRemovedParent =
    Boolean(scheduleItemId) && !scheduleItems.some((item) => item.id === scheduleItemId)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle && !cleanBody) {
      setError(t('notes.form.requiredContent'))
      return
    }
    if ([...cleanTitle].length > MAX_NOTE_TITLE) {
      setError(t('notes.form.titleTooLong'))
      return
    }
    if ([...cleanBody].length > MAX_NOTE_BODY) {
      setError(t('notes.form.bodyTooLong'))
      return
    }

    setError(null)
    const blockId = scheduleItemId || null
    const dateValue = blockId && localDate ? localDate : null

    const fields: NoteFields = {
      title: cleanTitle || null,
      body: cleanBody || null,
      schedule_item_id: blockId,
      local_date: dateValue,
    }

    try {
      if (note) {
        await onUpdate(note.id, fields, note.revision)
      } else {
        await onCreate({ id: newId(), ...fields })
      }
      onClose()
    } catch (err) {
      if (err instanceof NoteConflictError) {
        setConflict({ fields, deleted: err.latest === null })
      } else if (err instanceof ValidationError) {
        setError(err.message)
      } else {
        setError(t(errorMessageKey(err)))
      }
    }
  }

  async function saveAsNewNote(fields: NoteFields) {
    try {
      await onCreate({ id: newId(), ...fields })
      onClose()
    } catch (err) {
      setConflict(null)
      setError(err instanceof ValidationError ? err.message : t(errorMessageKey(err)))
    }
  }

  if (conflict) {
    return (
      <Sheet open={open} onClose={onClose} title={t('notes.conflict.title')}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted" role="alert">
            {conflict.deleted ? t('notes.conflict.deletedBody') : t('notes.conflict.body')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('notes.conflict.useLatest')}
            </Button>
            <Button
              variant="primary"
              onClick={() => void saveAsNewNote(conflict.fields)}
              disabled={saving}
            >
              {saving ? t('notes.conflict.saving') : t('notes.conflict.saveAsNew')}
            </Button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={note ? t('notes.edit') : t('notes.add')}
      initialFocusRef={titleRef}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        {error && <FormError message={error} />}

        <Input
          ref={titleRef}
          label={t('notes.form.titleLabel')}
          placeholder={t('notes.form.titlePlaceholder')}
          maxLength={MAX_NOTE_TITLE}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={saving}
        />

        <Textarea
          label={t('notes.form.bodyLabel')}
          placeholder={t('notes.form.bodyPlaceholder')}
          maxLength={MAX_NOTE_BODY}
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={saving}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={attachId} className="text-sm font-semibold text-ink">
            {t('notes.form.attachmentLabel')}
          </label>
          <select
            id={attachId}
            value={scheduleItemId}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.value
              setScheduleItemId(next)
              if (!next || next !== scheduleItemId) setLocalDate('')
            }}
            className="min-h-touch w-full rounded-md border-control border-border-control bg-paper px-3 text-base text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="">{t('notes.form.standaloneOption')}</option>
            {hasRemovedParent && (
              <option value={scheduleItemId}>{t('notes.form.removedBlockOption')}</option>
            )}
            {scheduleItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        {scheduleItemId && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateId} className="text-sm font-semibold text-ink">
              {t('notes.form.dateLabel')}
            </label>
            <input
              id={dateId}
              type="date"
              value={localDate}
              disabled={saving}
              onChange={(event) => setLocalDate(event.target.value)}
              className="min-h-touch w-full rounded-md border-control border-border-control bg-paper px-3 text-base tabular-nums text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? t('notes.form.saving') : t('notes.form.save')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
