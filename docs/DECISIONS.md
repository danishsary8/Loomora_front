# Decisions

Decisions made during development, with the reason. Product and setup decisions made before coding are in `01-product-brief.md` and `07-project-decisions.md`.

## Entry template

```md
### DEC-000: Title (YYYY-MM-DD)
- **Decision:** ...
- **Reason:** ...
- **Alternatives considered:** ...
- **Related task:** T-000
```

## Log

### DEC-001: Visual style, neo-brutalism vs neo-skeuomorphic / retro-digital (2026-10-24)
- **Decision:** Keep **neo-brutalism on cream `#F5EDE6`** (docs/01, S15). The neo-skeuomorphic / retro-digital idea (S18) is not used for the base system. A small retro touch may come back later as decoration (for example the check-off stamp), not as the component style.
- **Reason:** Comparison, with research from the `ui-ux-pro-max` style database:

  | Check | Neo-brutalism (chosen) | Neo-skeuomorphic / retro-digital |
  |---|---|---|
  | Accessibility risk (style DB) | Low. Edges come from solid ink borders, so controls are visible without relying on color | Neumorphism: **high**. Soft same-color shadows give low edge contrast. Retro-futurism: **high** (neon on black, glow, glitch) |
  | Readability at 375 px | Flat fills, black text on light colors: 9.7:1 or more | Gradients, inner shadows and pixel/monospace fonts hurt small text |
  | Press-down feedback | Clear: the element moves into its hard shadow | Soft emboss changes are hard to see in sunlight |
  | Category colors | Flat fills, 6 colors stay distinct | Monochrome pastel (neumorphism) or neon (retro) fight 6 categories |
  | Performance | Cheap: no blur, no layered shadows | Several blurred shadows per element, scanline overlays |
  | Fit with docs | Matches docs/01, S15, CLAUDE.md | Would change the brand already agreed |

- **Alternatives considered:** Neumorphism (soft UI), retro-futurism (CRT, neon), pixel-art. All rejected for the base system for the reasons above.
- **Related task:** F-003

### DEC-002: Design tokens (2026-10-24)
- **Decision:**
  - Colors: cream `#F5EDE6` (page), paper `#FFFFFF` (cards, inputs), ink `#111111` (text, borders, shadows), muted `#5C5249` (secondary text).
  - Categories (docs/08 enum): study `#8EC5FF`, work `#FFD166`, health `#7ED9A6`, life `#FF9EBB`, rest `#C3B1FF`, other `#E3D7C9`. Always ink text on top, always with an ink border.
  - Accent `#FF8A3D` for primary buttons; success `#18703F`; danger `#C62F36` (white text on top).
  - Borders 2 px (small parts) and 3 px (components). Hard shadows with no blur: 2, 4, 6 px. Pressed = move by the shadow offset and drop the shadow.
  - Radii 6 / 12 / 20 px and full. Spacing: Tailwind's 4 px scale.
  - Fonts: **Caveat** (script, headings only, 28 px or more) and **Space Grotesk** (body and UI). Both self-hosted via Fontsource so the PWA works offline.
- **Reason:** Every text/background pair is tested at 4.5:1 or more in `src/styles/tokens.test.ts`. A script font for body text would be hard to read, so it is for headings only. Space Grotesk is tagged "neo brutalism, cream" in the style database.
- **Alternatives considered:** Google Fonts CDN (rejected: no offline use, extra request). Ink-filled primary button (rejected: the ink shadow disappears behind it).
- **Related task:** F-003

### DEC-003: Adopt Loomora Elemental Edition visual identity (supersedes DEC-001 and DEC-002) (2026-11-23)
- **Decision:** Replace Loomora's cream/orange neo-brutalist identity (`DEC-001`, `DEC-002`, `docs/01`, `docs/02`, `docs/07` S15/S18, `AGENTS.md`, and `CLAUDE.md`) with **Loomora Elemental Edition** as the single visual identity (one theme only; multi-theme support remains out of scope):
  - **Surfaces & Ink:** Warm ivory canvas `#F7F5EF`, elevated paper/card surface `#FCFBF8`, subtle warm surface `#EFECE3`, primary forest ink `#132A23` (`13.93:1` on canvas, `14.67:1` on paper), supporting muted text `#54685B` (`5.49:1` on canvas, `5.78:1` on paper).
  - **Brand & Actions:** Deep forest green primary `#1D5039` (`9.30:1` with `#FFFFFF`), pressed/active `#194631` (`10.70:1` with `#FFFFFF`), soft brand tint `#E6F0EB` (`7.98:1` with `#1D5039`), and restrained warm terracotta accent `#E99A63` paired **only** with `#132A23` foreground (`6.70:1`; never `#FFFFFF`). Reserve deep forest green for one obvious primary action per screen.
  - **Borders & Elevation (WCAG 2.2 SC 1.4.11):** Replace `2–3 px` black borders and hard-offset shadows with `1 px` decorative card/list hairlines (`border-subtle: #E1E8E1`), soft ambient elevation, and accessible interactive control borders (`border-control: #7B8C82`, `3.26:1` on canvas and `3.43:1` on paper for inputs, selects, checkboxes, and outlined buttons).
  - **Semantic Status Colors (distinct from categories):** `success: #18703F` (`5.62:1` on canvas; `#FFFFFF` on `success`: `6.13:1`), `warning: #9A5B04` on `#FEF4E4` (`4.98:1` — replaces `work` yellow on offline/service-down/guest-warning banners), and `danger: #C62F36` (`4.99:1` on canvas; `#FFFFFF` on `danger`: `5.44:1`).
  - **Six Documented Categories (`study`, `work`, `health`, `life`, `rest`, `other`):** Preserve the exact six categories and their semantics using meaningful pastel surfaces paired with `#132A23` ink text (never color-only meaning). Proposed WCAG-verified pastel fills pending visual verification against the four reference assets (`LOOMORA_ELEMENTAL_*` / `LOOMORA_PREMIUM_*`, not present in workspace): `study #E3F0FC` (`13.11:1`), `work #FBF0D9` (`13.42:1`), `health #E2F5EA` (`13.36:1`), `life #FDE8EE` (`12.98:1`), `rest #EEE9FC` (`12.79:1`), `other #ECE8DF` (`12.42:1`).
  - **Typography:** Single self-hosted variable font family **Inter** (`@fontsource-variable/inter`) for headings and body/UI with `tabular-nums` on times, streak counts, and progress values (replacing `Caveat` + `Space Grotesk`; keeps the offline PWA bundle lean and ready for future Khmer pairing).
  - **Iconography, Spacing & Motion:** Unified `1.75 px` round-cap SVG icons (no emojis); `4 px`/`8 px` spacing rhythm; `8 / 14 / 22 px` + `full` radii; `>= 44×44` CSS px touch targets (`>= 8 px` gap); `160–240 ms` restrained transitions honoring `prefers-reduced-motion: reduce`.
  - **Responsive, Safe Areas & Accessibility:** Mobile-first (`320 / 375 / 390 / 768 / 1024 / 1440 px`), full iOS standalone safe-area insets (`top`, `bottom`, `left`, `right`), WCAG 2.2 AA `Focus Not Obscured` (`scroll-padding-bottom` clearing fixed bottom nav/FAB), `inert` background locking while sheets are open, and 200% text scaling. Presentation chrome (iPhone frame / Dynamic Island in concept mockups) is never rendered in the PWA.
  - **Scope Guardrail:** Visual identity, token architecture, and UX clarity only. Preserves all R1/R2 functionality (including Today's streak badge) and R3 (Focus) / R4 (Insights & Notes) release boundaries; no unapproved features are added.
- **Reason:** Owner approved Elemental Edition on 2026-11-23 to reduce visual noise on dense R2 task lists at 320–390 px, separate system warnings from the `work` category color, and establish a calmer, WCAG 2.2 AA-compliant single-theme PWA. Core hex values and self-hosted Inter typography are reconciled with the prior unpushed `EL-01` alignment record; exact pastel category hexes should be confirmed against the original reference assets before `UX-003`.
- **Alternatives considered:** Retaining neo-brutalism (`DEC-001`/`DEC-002`) — superseded by owner approval; loading a second decorative heading font — rejected to protect mobile Lighthouse performance and bundle size; shipping multiple user-selectable themes — out of scope (`docs/02-feature-list.md`).
- **Related task:** UX-002 (approved 2026-11-23; supersedes unmerged local `EL-01`/`UI-01` worktree drafts once merged; implementation starts in `UX-003`).

### DEC-004: Focus timer runtime and recovery (2026-11-24)

- **Decision:** Countdown presets remain 25, 50, and 90 minutes. Custom countdowns accept whole minutes from 1 through 240. Both use the same default plan of four Focus phases, three five-minute short breaks between them, and one fifteen-minute long break after the fourth Focus phase.
- **Phase boundaries:** Each phase after the initial Focus phase starts explicitly. Expiry closes only the current phase at its measured deadline and waits for the next start. A delayed check cannot complete a phase that never started. The countdown plan completes when its long break expires.
- **Session records:** B-043 stores one ordered segment per started phase. Segment wall intervals include pauses, while active milliseconds exclude them. Only Focus segments contribute to tracked Focus time. Save any finished session with positive Focus time. A countdown terminated before its plan completes uses `ended_early`. A stopwatch has no deadline. Its explicit Finish action completes the run, and End Early records `ended_early`. Laps use strictly increasing cumulative active milliseconds.
- **Clock recovery:** Measure elapsed time with the document's monotonic clock while available and retain a wall-clock checkpoint for reload. If clock readings are contradictory, preserve the last measured time or suspend the timer without deriving additional activity from the contradictory readings.
- **Ownership:** Suspend an account timer when its auth session ends or changes. Its original owner can recover it after signing in. Keep guest state, account state, and pending payloads in their original scopes. Retry a finished session with its original UUID and payload.
- **Related task:** F-R3-02B. The planner approved these lifecycle rules in the F-R3-02B session on 2026-11-24.
