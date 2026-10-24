import type { RouteObject } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { RootLayout } from './layout/RootLayout'
import { RouteError } from './layout/RouteError'
import { NotFoundPage } from './NotFoundPage'
import {
  FocusPage,
  InsightsPage,
  LandingPage,
  PrivacyPage,
  ProfilePage,
  SignInPage,
  SignUpPage,
  StyleguidePage,
  TermsPage,
  TodayPage,
  WeekPage,
} from './pages'

// Route map from docs/05-screen-map.md (R1).
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/today', element: <TodayPage /> },
          { path: '/week', element: <WeekPage /> },
          { path: '/focus', element: <FocusPage /> },
          { path: '/insights', element: <InsightsPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/styleguide', element: <StyleguidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
