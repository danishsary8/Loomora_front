import { HealthIcon, LifeIcon, OtherIcon, RestIcon, StudyIcon, WorkIcon } from './icons'

/** One outline glyph per documented category (concept v3). */
export const CATEGORY_ICONS = {
  study: StudyIcon,
  work: WorkIcon,
  health: HealthIcon,
  life: LifeIcon,
  rest: RestIcon,
  other: OtherIcon,
} as const
