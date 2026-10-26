import type { RouteObject } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { RootLayout } from './layout/RootLayout'
import { RedirectIfSignedIn, RequireAuth } from '@/features/auth/RouteGuards'
import { RouteError } from './layout/RouteError'
import { NotFoundPage } from './NotFoundPage'
import {
  FocusPage,
  ForgotPasswordPage,
  GoogleCallbackPage,
  InsightsPage,
  LandingPage,
  PrivacyPage,
  ProfilePage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
  StyleguidePage,
  SurveyPage,
  TermsPage,
  TodayPage,
  VerifyEmailPage,
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
      {
        element: <RedirectIfSignedIn />,
        children: [
          { path: '/sign-in', element: <SignInPage /> },
          { path: '/sign-up', element: <SignUpPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [{ path: '/sign-up/survey', element: <SurveyPage /> }],
      },
      { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/styleguide', element: <StyleguidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
