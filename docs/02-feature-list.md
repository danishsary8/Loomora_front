# Loomora: Feature List (A2, v0.1)

Priority: **Must** = needed for that release to ship. **Should** = planned in that release if time allows. **Later** = after the four releases.

## R1 Today
| Feature | Priority |
|---|---|
| To-do: add, edit, delete, check off (title, optional due date, category color) | Must |
| Today screen: to-do list as main view | Must |
| Fixed weekly schedule: add items with time and repeat days | Must |
| Schedule strip: Now + Next, tap to expand the full day | Must |
| Week view of the schedule (day strip on phone, 7 columns on tablet/desktop) | Must |
| "Only today" vs "All repeats" when editing a repeating schedule item | Must |
| Unfinished to-dos carry over with "Overdue" badge | Must |
| Guest mode (local storage) | Must |
| Account: email and Google, guest data migrates on signup | Must |
| Streak counter (day counts if 1+ item checked off) | Must |
| Check-off stamp animation, progress ring | Should |
| Settings (name, sign out, delete account) | Should |
| Feedback button | Should |
| Installable PWA, offline-friendly | Should |
| Copy a day to other days | Should |

## R2 Repeat, subtasks, reminders
| Feature | Priority |
|---|---|
| Subtasks inside a to-do | Must |
| Repeating to-dos (daily, weekly, custom days) | Must |
| In-app reminders | Must |
| Priority and notes on a to-do | Should |
| Push notifications | Later |

## R3 Focus
| Feature | Priority |
|---|---|
| Focus timer attached to a to-do or schedule item | Must |
| Countdown timer (25 / 50 / 90 min presets + custom) | Must |
| Stopwatch with laps (1/100 s) | Must |
| Time tracking from sessions | Must |
| Timer history | Should |
| Timer-end sound with mute | Should |

## R4 Review
| Feature | Priority |
|---|---|
| Analytics (completion trends, focus time, streak history) | Must |
| Notes (standalone and attached to items) | Must |
| Weekly recap | Should |
| Plan vs Reality | Should |

## After R4
Khmer language, accessibility and performance polish, push notifications, quick-add by typing ("Gym 6pm Mon-Fri"), shareable stamp card, data export.

## Out of scope
Multiple themes (one Elemental Edition identity; see `docs/DECISIONS.md` DEC-003), teams/sharing, native mobile apps.

## Added 2026-11-19 (from the Daycraft analysis, docs/research/)
| Feature | Priority | Release |
|---|---|---|
| Undo after deleting a to-do (5 s) | Should | R1 |
| Time format (12 h / 24 h) and week start settings | Should | R1 |
| Daily intention (one line per day) | Should | R1 |
| Error, offline and not-found states on every screen | Must | R1 |
| Focus cycles with short and long breaks, end early keeps time, timer survives page changes and reloads | Must | R3 |
| Sound picker, volume and play mode for the timer alarm | Should | R3 |
| Focus presets, full-screen focus view | Should | R3 |
| History filters, search and delete with undo | Should | R3 |
| Notes: tags, pin, color, search | Should | R4 |
| Today insight sentence | Later | R4 |
| Server-side achievements, avatar, custom alarm sound | Later | After R4 |
