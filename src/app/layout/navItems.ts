import type { ComponentType, SVGProps } from 'react'
import { FocusIcon, InsightsIcon, TodayIcon, WeekIcon } from '@/components/ui/icons'

export interface NavItem {
  to: string
  labelKey: 'nav.today' | 'nav.week' | 'nav.focus' | 'nav.insights'
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

// docs/05: bottom nav Today | Week | Focus | Insights.
export const NAV_ITEMS: NavItem[] = [
  { to: '/today', labelKey: 'nav.today', Icon: TodayIcon },
  { to: '/week', labelKey: 'nav.week', Icon: WeekIcon },
  { to: '/focus', labelKey: 'nav.focus', Icon: FocusIcon },
  { to: '/insights', labelKey: 'nav.insights', Icon: InsightsIcon },
]
