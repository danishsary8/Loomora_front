import { createContext } from 'react'
import type { FocusRuntime } from './focusRuntime'

export const FocusRuntimeContext = createContext<FocusRuntime | null>(null)
