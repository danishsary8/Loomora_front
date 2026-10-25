import { lazy } from 'react'

// Each screen is its own chunk, so the first load only pulls what it shows.
export const LandingPage = lazy(() =>
  import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
export const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })),
)
export const WeekPage = lazy(() =>
  import('@/features/schedule/week/WeekPage').then((m) => ({ default: m.WeekPage })),
)
export const FocusPage = lazy(() =>
  import('@/features/focus/FocusPage').then((m) => ({ default: m.FocusPage })),
)
export const InsightsPage = lazy(() =>
  import('@/features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
)
export const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
export const SignInPage = lazy(() =>
  import('@/features/auth/AuthPage').then((m) => ({ default: m.SignInPage })),
)
export const SignUpPage = lazy(() =>
  import('@/features/auth/AuthPage').then((m) => ({ default: m.SignUpPage })),
)
export const SurveyPage = lazy(() =>
  import('@/features/auth/SurveyPage').then((m) => ({ default: m.SurveyPage })),
)
export const GoogleCallbackPage = lazy(() =>
  import('@/features/auth/GoogleCallbackPage').then((m) => ({ default: m.GoogleCallbackPage })),
)
export const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
export const ResetPasswordPage = lazy(() =>
  import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
export const VerifyEmailPage = lazy(() =>
  import('@/features/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
)
export const PrivacyPage = lazy(() =>
  import('@/features/legal/LegalPage').then((m) => ({ default: m.PrivacyPage })),
)
export const TermsPage = lazy(() =>
  import('@/features/legal/LegalPage').then((m) => ({ default: m.TermsPage })),
)
export const StyleguidePage = lazy(() =>
  import('@/features/styleguide/StyleguidePage').then((m) => ({ default: m.StyleguidePage })),
)
