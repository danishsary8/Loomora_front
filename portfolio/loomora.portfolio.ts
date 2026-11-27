/**
 * Loomora: portfolio entry, ready to paste.
 *
 * Shaped like the Bookly entry in Danish_portfolio/src/content/portfolio.ts
 * (same `Project` + `CaseStudy` fields), so it drops in next to it.
 * The "How I built it" parts (steps, practices, challenges, lessons) are left
 * empty on purpose: this case study shows the problem, what was built, the
 * screens, the numbers and what comes next.
 *
 * Every number below was checked on 27 Nov 2026:
 *   981 frontend tests: `npm test` in Loomora_front (v2-rebuild, 2531e7b), 85 files, all passing.
 *   714 backend tests: GitHub Actions CI run 171 for loomora_back v2-rebuild (9a14b78),
 *     on PostgreSQL 16, all passing (51,823 assertions).
 *   56 API endpoints: 56 routes in routes/api.php = 56 operations in docs/openapi.yaml (41 paths).
 *   36 end-to-end specs: e2e/*.spec.ts in Loomora_front (plus the separate staging suite).
 *   Also true, if you want them elsewhere: 6 categories, 739 UI strings in src/i18n/en.json,
 *   23 database migrations, countdown presets of 25, 50 and 90 minutes (custom 1–240).
 */

// 1) In src/lib/assets.ts, next to the Bookly glob:
//
//   const lm = import.meta.glob("@/assets/projects/loomora/*.webp", {
//     eager: true,
//     import: "default",
//   }) as Record<string, string>;
//   const loomora = (name: string) => lm[`/src/assets/projects/loomora/${name}.webp`] ?? "";
//
//   and inside ASSETS.projects:
//     loomoraShot: loomora,
//     loomoraShots: { home: loomora("week"), phoneHome: loomora("m-today") },
//   and point ASSETS.projects.loomora.src at loomora("today") || loomoraShot.url.
//
// 2) Copy portfolio/screens/*.webp into src/assets/projects/loomora/
//    and portfolio/cover/*.webp wherever the covers live.
//
// 3) `screens[].group` is "Customer" | "Staff" | "Admin" for Bookly. This project
//    groups its screens by the app's own three pillars plus accounts:
//    "Plan" | "Focus" | "Review" | "Account". Widen that union in CaseStudy.

export const loomoraProject = {
  id: 'loomora',
  title: 'Loomora',
  coverLine: 'Plan your day, keep your routines',
  kind: 'Routine & habit planner · PWA',
  summary:
    'A mobile-first planner that puts your to-dos and your weekly routine on one Today screen, with a focus timer, notes and insights that show how the week really went. It works offline and without an account. I built the React frontend and the Laravel API.',
  highlights: [
    'Laravel REST API with 56 endpoints on PostgreSQL',
    'Installable React app that works offline, no sign-up needed',
    '981 frontend and 714 backend tests, all passing',
  ],
  stack: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Laravel', 'PostgreSQL'],
  hosting: 'Vercel · Render · Neon',
  liveUrl: 'https://loomora-craft.vercel.app/',
  githubUrl: 'https://github.com/danishsary8/Loomora_front',
  repos: [
    { label: 'Frontend', url: 'https://github.com/danishsary8/Loomora_front' },
    { label: 'Backend API', url: 'https://github.com/danishsary8/loomora_back' },
  ],
  imageAlt: 'Loomora week view on a laptop and the Today screen on a phone',

  caseStudy: {
    pitch:
      "Your to-dos and your weekly routine on one screen. Focus on what's next, then see how the week really went.",

    facts: [
      { label: 'Role', value: 'Own project, full-stack' },
      { label: 'Status', value: 'Live on Vercel' },
      { label: 'Start', value: 'No sign-up needed' },
      { label: 'Works', value: 'Offline · installable' },
    ],

    problem:
      'Most planners make you choose between a task list and a calendar. Your routine lives in one app, your to-dos in another, and nothing tells you how the week actually went.',

    solution:
      'One calm app for the day: to-dos and a repeating schedule on a single Today screen, a focus timer, notes, and insights that compare the plan with what really happened.',

    // Left empty on purpose (no "How I built it" section).
    steps: [],

    // One screen on the laptop and the phone at the same time, like Bookly.
    // Desktop 1440×900, phone 430×932 (shot at 1.2×, saved 516×1118).
    screens: [
      {
        group: 'Plan',
        title: 'Today',
        text: "Today's progress, a one-line intention, and what is on now and next.",
        desktop: 'today',
        phone: 'm-today',
      },
      {
        group: 'Plan',
        title: 'To-dos',
        text: "Overdue first, then today's list, with subtasks, repeats and priority.",
        desktop: 'today-todos',
        phone: 'm-today-todos',
      },
      {
        group: 'Plan',
        title: 'Add a to-do',
        text: 'Start with a title. Category, due date and the rest can come later.',
        desktop: 'new-task',
        phone: 'm-new-task',
      },
      {
        group: 'Plan',
        title: 'Week',
        text: 'The fixed weekly routine, colour-coded by six categories.',
        desktop: 'week',
        phone: 'm-week',
      },
      {
        group: 'Plan',
        title: 'Edit a block',
        text: 'Change the time, the days it repeats and its category.',
        desktop: 'edit-block',
        phone: 'm-edit-block',
      },
      {
        group: 'Focus',
        title: 'Focus timer',
        text: "A countdown linked to today's to-do, in four focus rounds with breaks.",
        desktop: 'focus',
        phone: 'm-focus',
      },
      {
        group: 'Focus',
        title: 'Full-screen timer',
        text: "Just the timer, for when you're in the zone.",
        desktop: 'focus-expanded',
        phone: 'm-focus-expanded',
      },
      {
        group: 'Focus',
        title: 'Focus history',
        text: 'Every session by date, with a day total, search and filters.',
        desktop: 'focus-history',
        phone: 'm-focus-history',
      },
      {
        group: 'Review',
        title: 'Insights',
        text: 'Completion, focus time and streak for the week, and the completion rhythm.',
        desktop: 'insights',
        phone: 'm-insights',
      },
      {
        group: 'Review',
        title: 'Plan vs reality',
        text: 'What was planned against what got done, plus a weekly recap.',
        desktop: 'insights-review',
        phone: 'm-insights-review',
      },
      {
        group: 'Review',
        title: 'Notes',
        text: 'Pinned, coloured and tagged notes, on their own or attached to a block.',
        desktop: 'notes',
        phone: 'm-notes',
      },
      {
        group: 'Account',
        title: 'Start',
        text: 'Try it right away. No account needed.',
        desktop: 'landing',
        phone: 'm-landing',
      },
      {
        group: 'Account',
        title: 'Save your plan',
        text: 'Sign up with email or Google, and the guest plan moves to the account.',
        desktop: 'sign-up',
        phone: 'm-sign-up',
      },
      {
        group: 'Account',
        title: 'Profile',
        text: 'Streak, tasks done, and time and week settings in one place.',
        desktop: 'profile',
        phone: 'm-profile',
      },
    ],

    stats: [
      { value: 981, label: 'frontend tests' },
      { value: 714, label: 'backend tests' },
      { value: 56, label: 'API endpoints' },
      { value: 36, label: 'end-to-end specs' },
    ],

    // Left empty on purpose (no "How I built it" section).
    practices: [],
    challenges: [],
    lessons: [],

    // Future development plan (from the app's own roadmap; none started yet).
    next: [
      'Khmer language',
      'Push reminders when the app is closed',
      'Quick add by typing, like “Gym tomorrow 6pm”',
      'Export your plan, focus history and notes',
    ],
  },
} as const
