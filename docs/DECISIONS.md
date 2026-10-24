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
