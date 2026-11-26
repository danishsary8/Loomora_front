import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/api'
import { GuestNoteRepository } from '@/lib/storage/GuestNoteRepository'
import { useNoteRepository } from '@/lib/storage/noteContext'
import type { Note, NoteFields, NoteInput } from './types'

export const notesKeys = {
  all: ['notes'] as const,
  list: (generation: number) => [...notesKeys.all, generation] as const,
}

export function useNotes() {
  const repo = useNoteRepository()
  const generation = useSession((s) => s.generation)
  const networkMode = repo instanceof GuestNoteRepository ? 'always' : 'online'

  return useQuery<Note[]>({
    queryKey: notesKeys.list(generation),
    networkMode,
    queryFn: ({ signal }) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      return repo.list(signal)
    },
  })
}

export function useCreateNote() {
  const repo = useNoteRepository()
  const queryClient = useQueryClient()
  const generation = useSession((s) => s.generation)
  const networkMode = repo instanceof GuestNoteRepository ? 'always' : 'online'

  return useMutation({
    networkMode,
    mutationFn: async (input: NoteInput) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      return repo.create(input)
    },
    onSuccess: async () => {
      if (useSession.getState().generation === generation) {
        await queryClient.invalidateQueries({ queryKey: notesKeys.all })
      }
    },
  })
}

export function useUpdateNote() {
  const repo = useNoteRepository()
  const queryClient = useQueryClient()
  const generation = useSession((s) => s.generation)
  const networkMode = repo instanceof GuestNoteRepository ? 'always' : 'online'

  return useMutation({
    networkMode,
    mutationFn: async ({
      id,
      fields,
      revision,
    }: {
      id: string
      fields: NoteFields
      revision?: number
    }) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      return repo.update(id, fields, revision)
    },
    onSettled: async () => {
      if (useSession.getState().generation === generation) {
        await queryClient.invalidateQueries({ queryKey: notesKeys.all })
      }
    },
  })
}

export function useDeleteNote() {
  const repo = useNoteRepository()
  const queryClient = useQueryClient()
  const generation = useSession((s) => s.generation)
  const networkMode = repo instanceof GuestNoteRepository ? 'always' : 'online'

  return useMutation({
    networkMode,
    mutationFn: async ({ id, revision }: { id: string; revision?: number }) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      await repo.delete(id, revision)
    },
    onSettled: async () => {
      if (useSession.getState().generation === generation) {
        await queryClient.invalidateQueries({ queryKey: notesKeys.all })
      }
    },
  })
}

export function useRestoreNote() {
  const repo = useNoteRepository()
  const queryClient = useQueryClient()
  const generation = useSession((s) => s.generation)
  const networkMode = repo instanceof GuestNoteRepository ? 'always' : 'online'

  return useMutation({
    networkMode,
    mutationFn: async (id: string) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      return repo.restore(id)
    },
    onSuccess: async () => {
      if (useSession.getState().generation === generation) {
        await queryClient.invalidateQueries({ queryKey: notesKeys.all })
      }
    },
  })
}
