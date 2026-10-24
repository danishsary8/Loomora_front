import type { RouteObject } from 'react-router-dom'
import { StyleguidePage } from '@/features/styleguide/StyleguidePage'

// Minimal routes for F-003. The full route map from docs/05 arrives in F-004.
export const routes: RouteObject[] = [
  { path: '/', element: <main data-testid="app-root" /> },
  { path: '/styleguide', element: <StyleguidePage /> },
]
