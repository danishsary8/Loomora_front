import { lazyWithPreload } from '@/lib/lazyWithPreload'

// Each screen is its own chunk, so the first load only pulls what it shows.
export const TodayPage = lazyWithPreload(() =>
  import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })),
)
export const WeekPage = lazyWithPreload(() =>
  import('@/features/schedule/week/WeekPage').then((m) => ({ default: m.WeekPage })),
)
export const FocusPage = lazyWithPreload(() =>
  import('@/features/focus/FocusPage').then((m) => ({ default: m.FocusPage })),
)
export const InsightsPage = lazyWithPreload(() =>
  import('@/features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
)
export const NotesPage = lazyWithPreload(() =>
  import('@/features/notes/NotesPage').then((m) => ({ default: m.NotesPage })),
)
export const ProfilePage = lazyWithPreload(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
export const SignInPage = lazyWithPreload(() =>
  import('@/features/auth/AuthPage').then((m) => ({ default: m.SignInPage })),
)
export const SignUpPage = lazyWithPreload(() =>
  import('@/features/auth/AuthPage').then((m) => ({ default: m.SignUpPage })),
)
export const SurveyPage = lazyWithPreload(() =>
  import('@/features/auth/SurveyPage').then((m) => ({ default: m.SurveyPage })),
)
export const GoogleCallbackPage = lazyWithPreload(() =>
  import('@/features/auth/GoogleCallbackPage').then((m) => ({ default: m.GoogleCallbackPage })),
)
export const ForgotPasswordPage = lazyWithPreload(() =>
  import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
export const ResetPasswordPage = lazyWithPreload(() =>
  import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
export const VerifyEmailPage = lazyWithPreload(() =>
  import('@/features/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
)
export const PrivacyPage = lazyWithPreload(() =>
  import('@/features/legal/LegalPage').then((m) => ({ default: m.PrivacyPage })),
)
export const TermsPage = lazyWithPreload(() =>
  import('@/features/legal/LegalPage').then((m) => ({ default: m.TermsPage })),
)
export const StyleguidePage = lazyWithPreload(() =>
  import('@/features/styleguide/StyleguidePage').then((m) => ({ default: m.StyleguidePage })),
)

/** The four tab screens, fetched on idle so the first tap never shows a skeleton. */
export function preloadTabPages() {
  return Promise.all([TodayPage, WeekPage, FocusPage, InsightsPage].map((page) => page.preload()))
}
