import { createContext, useContext } from 'react'
import type { NoteRepository } from './NoteRepository'

export const NoteRepositoryContext = createContext<NoteRepository | null>(null)

export function useNoteRepository(): NoteRepository {
  const repo = useContext(NoteRepositoryContext)
  if (!repo) throw new Error('useNoteRepository must be used inside <AppProviders>')
  return repo
}
