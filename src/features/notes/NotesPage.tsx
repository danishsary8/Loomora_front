import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { ActionToast, Button, Card, Input, SegmentedControl, Sheet } from '@/components/ui'
import { TrashIcon } from '@/components/ui/icons'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import { ApiError, errorMessageKey, useSession } from '@/lib/api'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { NoteSheet } from './NoteSheet'
import type { Note } from './types'
import { useCreateNote, useDeleteNote, useNotes, useRestoreNote, useUpdateNote } from './useNotes'

type NoteFilter = 'all' | 'standalone' | 'attached'

const UNDO_TOAST_MS = 6000

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

  const scheduleById = useMemo(
    () => new Map((scheduleItems.data ?? []).map((item) => [item.id, item])),
    [scheduleItems.data],
  )

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (notes.data ?? []).filter((note) => {
      if (filter === 'standalone' && note.schedule_item_id !== null) return false
      if (filter === 'attached' && note.schedule_item_id === null) return false
      if (!query) return true
      const blockTitle = note.schedule_item_id
        ? (scheduleById.get(note.schedule_item_id)?.title ?? '')
        : ''
      return (
        (note.title ?? '').toLowerCase().includes(query) ||
        (note.body ?? '').toLowerCase().includes(query) ||
        blockTitle.toLowerCase().includes(query)
      )
    })
  }, [notes.data, filter, search, scheduleById])

  const hasFilters = filter !== 'all' || search.trim().length > 0
  const isOfflineAccountWithoutData = signedIn && !online && !notes.data

  async function handleConfirmDelete() {
    if (!confirmDelete || deleteNote.isPending) return
    const target = confirmDelete
    try {
      await deleteNote.mutateAsync(target.id)
      setConfirmDelete(null)
      showToast({
        message: t('notes.deletedToast'),
        tone: 'default',
        undoId: target.id,
      })
    } catch {
      setConfirmDelete(null)
      showToast({ message: t('notes.deleteError'), tone: 'danger' })
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
    { value: 'standalone' as const, label: t('notes.filters.standalone') },
    { value: 'attached' as const, label: t('notes.filters.attached') },
  ]

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <PageHeading>{t('pages.notes.title')}</PageHeading>
          <p className="text-sm font-medium text-muted">{t('notes.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingNote(null)
            setEditorOpen(true)
          }}
        >
          {t('notes.add')}
        </Button>
      </header>

      {isOfflineAccountWithoutData ? (
        <Card className="bg-warning-surface border-warning/30">
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
        <LoadingState />
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
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Input
              type="search"
              label={t('notes.searchLabel')}
              placeholder={t('notes.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <SegmentedControl
              label={t('notes.filterLabel')}
              options={filterOptions}
              value={filter}
              onChange={setFilter}
              className="flex-wrap"
            />
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
            <ul className="flex flex-col gap-3">
              {filteredNotes.map((note) => {
                const headingText = note.title ?? t('notes.untitled')
                const block = note.schedule_item_id
                  ? scheduleById.get(note.schedule_item_id)
                  : undefined
                const badgeText =
                  note.schedule_item_id === null
                    ? t('notes.standaloneBadge')
                    : block
                      ? note.local_date
                        ? t('notes.attachedOnDate', { title: block.title, date: note.local_date })
                        : t('notes.attachedTo', { title: block.title })
                      : note.local_date
                        ? t('notes.detachedBlockOnDate', { date: note.local_date })
                        : t('notes.detachedBlock')

                const updatedLabel = new Intl.DateTimeFormat(locale, {
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(note.updated_at))

                return (
                  <li key={note.id}>
                    <Card>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-heading text-base font-semibold text-ink [overflow-wrap:anywhere]">
                              {headingText}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                              <span className="rounded-full bg-subtle px-2.5 py-0.5 font-semibold text-ink">
                                {badgeText}
                              </span>
                              <time dateTime={note.updated_at} className="tabular-nums">
                                {updatedLabel}
                              </time>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="md"
                              aria-label={t('notes.editLabel', { title: headingText })}
                              onClick={() => {
                                setEditingNote(note)
                                setEditorOpen(true)
                              }}
                            >
                              {t('notes.editAction')}
                            </Button>
                            <button
                              type="button"
                              aria-label={t('notes.deleteLabel', { title: headingText })}
                              onClick={() => setConfirmDelete(note)}
                              className="grid size-11 shrink-0 place-items-center rounded-md border-control border-border-control/70 bg-paper text-ink transition-[background-color,transform] duration-fast ease-elemental hover:bg-subtle active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </div>
                        {note.body && (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90 [overflow-wrap:anywhere]">
                            {note.body}
                          </p>
                        )}
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
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
        onUpdate={(id, fields) => updateNote.mutateAsync({ id, fields })}
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
