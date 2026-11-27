import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppPageHeader } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { ActionToast, Button, Card, iconActionClass, Sheet } from '@/components/ui'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { PencilIcon, PinIcon, SearchIcon, TrashIcon } from '@/components/ui/icons'
import { pressSmAny } from '@/components/ui'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import { ApiError, errorMessageKey, useSession } from '@/lib/api'
import { cn } from '@/lib/cn'
import { NoteConflictError } from '@/lib/storage'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { NoteSheet } from './NoteSheet'
import type { Note } from './types'
import { useCreateNote, useDeleteNote, useNotes, useRestoreNote, useUpdateNote } from './useNotes'

type NoteFilter = 'all' | 'pinned' | 'standalone' | 'attached'

const UNDO_TOAST_MS = 6000

function formatOccurrenceDate(localDate: string, locale: string): string {
  const parts = localDate.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return localDate
  const [y, m, d] = parts as [number, number, number]
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function formatUpdatedDate(iso: string, formatter: Intl.DateTimeFormat): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '' : formatter.format(parsed)
}

export function NotesPage() {
  const generation = useSession((s) => s.generation)
  return <NotesPageSession key={generation} />
}

function NotesPageSession() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const signedIn = useSession((s) => s.token !== null)
  const online = useOnlineStatus()

  const notes = useNotes()
  const scheduleItems = useScheduleItems()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const restoreNote = useRestoreNote()

  const [filter, setFilter] = useState<NoteFilter>('all')
  const [search, setSearch] = useState('')
  const searchId = useId()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null)
  const [toast, setToast] = useState<{
    message: string
    tone: 'default' | 'danger'
    undoId?: string
  } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(next: { message: string; tone: 'default' | 'danger'; undoId?: string }) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = setTimeout(() => setToast(null), UNDO_TOAST_MS)
  }

  const updatedFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
    [locale],
  )

  const scheduleById = useMemo(
    () => new Map((scheduleItems.data ?? []).map((item) => [item.id, item])),
    [scheduleItems.data],
  )

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (notes.data ?? []).filter((note) => {
      if (filter === 'pinned' && !note.pinned) return false
      if (filter === 'standalone' && note.schedule_item_id !== null) return false
      if (filter === 'attached' && note.schedule_item_id === null) return false
      if (!query) return true
      // "#tag" (from a tag chip) matches that tag exactly; plain text also searches tags.
      if (query.startsWith('#')) return note.tags.includes(query.slice(1))
      const blockTitle = note.schedule_item_id
        ? (scheduleById.get(note.schedule_item_id)?.title ?? '')
        : ''
      return (
        (note.title ?? '').toLowerCase().includes(query) ||
        (note.body ?? '').toLowerCase().includes(query) ||
        blockTitle.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.includes(query))
      )
    })
  }, [notes.data, filter, search, scheduleById])

  const hasFilters = filter !== 'all' || search.trim().length > 0
  const isOfflineAccountWithoutData = signedIn && !online && !notes.data
  const canCreate = !signedIn || online
  const showHeaderAdd =
    !isOfflineAccountWithoutData &&
    !notes.isPending &&
    !notes.isError &&
    notes.data.length > 0 &&
    canCreate

  async function handleConfirmDelete() {
    if (!confirmDelete || deleteNote.isPending) return
    const target = confirmDelete
    try {
      await deleteNote.mutateAsync({ id: target.id, revision: target.revision })
      setConfirmDelete(null)
      showToast({
        message: t('notes.deletedToast'),
        tone: 'default',
        undoId: target.id,
      })
    } catch (error) {
      setConfirmDelete(null)
      showToast({
        message: t(
          error instanceof NoteConflictError ? 'notes.deleteConflict' : 'notes.deleteError',
        ),
        tone: 'danger',
      })
    }
  }

  async function handleUndo(id: string) {
    if (restoreNote.isPending) return
    try {
      await restoreNote.mutateAsync(id)
      setToast(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) {
        showToast({ message: t('notes.restoreExpired'), tone: 'danger' })
      } else {
        showToast({ message: t('notes.restoreError'), tone: 'danger' })
      }
    }
  }

  const filterOptions = [
    { value: 'all' as const, label: t('notes.filters.all') },
    { value: 'pinned' as const, label: t('notes.filters.pinned') },
    { value: 'standalone' as const, label: t('notes.filters.standalone') },
    { value: 'attached' as const, label: t('notes.filters.attached') },
  ]

  return (
    <div className="flex flex-col gap-5 pb-4">
      <AppPageHeader
        title={t('pages.notes.title')}
        headline={t('pages.notes.headline')}
        subtitle={t('notes.subtitle')}
      />

      {isOfflineAccountWithoutData ? (
        <Card className="border-warning/30 bg-warning-surface">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-semibold text-ink">
              {t('notes.offlineTitle')}
            </h2>
            <p className="text-sm text-muted">{t('notes.offlineBody')}</p>
            <div>
              <Button variant="secondary" size="md" onClick={() => void notes.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          </div>
        </Card>
      ) : notes.isPending ? (
        <LoadingState variant="cards" />
      ) : notes.isError ? (
        <ErrorState
          message={t(errorMessageKey(notes.error))}
          onRetry={() => void notes.refetch()}
        />
      ) : notes.data.length === 0 ? (
        <EmptyState
          title={t('notes.emptyTitle')}
          message={t('notes.emptyBody')}
          actions={
            canCreate ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  setEditingNote(null)
                  setEditorOpen(true)
                }}
              >
                {t('notes.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={searchId} className="sr-only">
                {t('notes.searchLabel')}
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-muted" />
                <input
                  id={searchId}
                  type="search"
                  placeholder={t('notes.searchPlaceholder')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={cn(fieldClasses(), 'pl-10')}
                />
              </div>
            </div>
            <div role="group" aria-label={t('notes.filterLabel')} className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const selected = filter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'inline-flex min-h-touch items-center rounded-full border-hairline px-4 text-sm font-semibold transition-colors duration-fast ease-elemental',
                      selected
                        ? 'border-primary bg-primary text-white shadow-soft-sm'
                        : 'border-border-subtle bg-paper text-ink hover:bg-subtle',
                      pressSmAny,
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {filteredNotes.length === 0 ? (
            <Card>
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted" role="status">
                  {t('notes.noMatches')}
                </p>
                {hasFilters && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setFilter('all')
                      setSearch('')
                    }}
                  >
                    {t('notes.clearFilters')}
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <ul className="grid gap-3 pb-4 md:grid-cols-2 xl:grid-cols-3 md:items-start">
              {filteredNotes.map((note) => {
                const headingText = note.title ?? t('notes.untitled')
                const block = note.schedule_item_id
                  ? scheduleById.get(note.schedule_item_id)
                  : undefined
                const formattedOccurrenceDate = note.local_date
                  ? formatOccurrenceDate(note.local_date, locale)
                  : null
                const badgeText =
                  note.schedule_item_id === null
                    ? t('notes.standaloneBadge')
                    : block
                      ? formattedOccurrenceDate
                        ? t('notes.attachedOnDate', {
                            title: block.title,
                            date: formattedOccurrenceDate,
                          })
                        : t('notes.attachedTo', { title: block.title })
                      : formattedOccurrenceDate
                        ? t('notes.detachedBlockOnDate', { date: formattedOccurrenceDate })
                        : t('notes.detachedBlock')

                const updatedLabel = formatUpdatedDate(note.updated_at, updatedFmt)

                return (
                  <li key={note.id}>
                    <Card tone={note.color ?? 'paper'}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="flex min-w-0 flex-1 items-start justify-between gap-2 font-heading text-base font-semibold text-ink [overflow-wrap:anywhere]">
                            <span className="min-w-0">{headingText}</span>
                            {note.pinned && (
                              <PinIcon
                                className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-primary"
                                role="img"
                                aria-hidden={false}
                                aria-label={t('notes.pinned')}
                              />
                            )}
                          </h2>
                          <div className="-mr-1.5 -mt-1 flex shrink-0 items-center">
                            <button
                              type="button"
                              aria-label={t('notes.editLabel', { title: headingText })}
                              onClick={() => {
                                setEditingNote(note)
                                setEditorOpen(true)
                              }}
                              className={iconActionClass}
                            >
                              <PencilIcon className="h-icon-sm w-icon-sm" />
                            </button>
                            <button
                              type="button"
                              aria-label={t('notes.deleteLabel', { title: headingText })}
                              onClick={() => setConfirmDelete(note)}
                              className={iconActionClass}
                            >
                              <TrashIcon className="h-icon-sm w-icon-sm" />
                            </button>
                          </div>
                        </div>
                        {note.body && (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90 [overflow-wrap:anywhere]">
                            {note.body}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          {note.tags.length > 0 ? (
                            <ul className="flex flex-wrap gap-1.5">
                              {note.tags.map((tag) => (
                                <li key={tag}>
                                  <button
                                    type="button"
                                    onClick={() => setSearch(`#${tag}`)}
                                    aria-label={t('notes.filterByTag', { tag })}
                                    className="inline-flex min-h-touch items-center rounded-full px-2 text-xs font-semibold text-primary underline-offset-2 hover:underline [overflow-wrap:anywhere]"
                                  >
                                    #{tag}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span />
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="inline-block max-w-full rounded-md bg-paper/70 px-2 py-0.5 font-medium leading-snug text-ink [overflow-wrap:anywhere]">
                              {badgeText}
                            </span>
                            <time dateTime={note.updated_at} className="shrink-0 tabular-nums">
                              {updatedLabel}
                            </time>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}

          {showHeaderAdd && (
            <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 pt-2 md:bottom-4">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="shadow-soft-md"
                onClick={() => {
                  setEditingNote(null)
                  setEditorOpen(true)
                }}
              >
                <span aria-hidden="true">+</span>
                <span>{t('notes.add')}</span>
              </Button>
            </div>
          )}
        </>
      )}

      <NoteSheet
        key={editingNote?.id ?? (editorOpen ? 'new' : 'closed')}
        open={editorOpen}
        note={editingNote}
        scheduleItems={scheduleItems.data ?? []}
        saving={createNote.isPending || updateNote.isPending}
        onClose={() => setEditorOpen(false)}
        onCreate={(input) => createNote.mutateAsync(input)}
        onUpdate={(id, fields, revision) => updateNote.mutateAsync({ id, fields, revision })}
      />

      <Sheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t('notes.confirmDeleteTitle')}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t('notes.confirmDeleteBody')}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(null)}
              disabled={deleteNote.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteNote.isPending}
            >
              {t('notes.confirmDeleteAction')}
            </Button>
          </div>
        </div>
      </Sheet>

      <ActionToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? 'default'}
        actionLabel={toast?.undoId ? t('notes.undo') : undefined}
        actionDisabled={restoreNote.isPending}
        onAction={
          toast?.undoId
            ? () => {
                const undoId = toast.undoId
                if (undoId) void handleUndo(undoId)
              }
            : undefined
        }
      />
    </div>
  )
}
