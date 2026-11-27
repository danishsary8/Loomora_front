import { m, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import type { StatsSummary } from '@/lib/api'
import { progressDrawTransition } from '@/styles/motion'
import { colors } from '@/styles/tokens'
import { buildRhythmBars, RHYTHM_CHART_HEIGHT } from './completionRhythm'

const BAR_WIDTH = 22
const SLOT_WIDTH = 42

interface CompletionRhythmCardProps {
  summary: StatsSummary
  locale: string
}

/** Concept v3 "Completion rhythm" 7-bar SVG chart built from real daily activity scores. */
export function CompletionRhythmCard({ summary, locale }: CompletionRhythmCardProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const reduced = Boolean(reduceMotion)
  const bars = useMemo(() => buildRhythmBars(summary.days, locale), [summary.days, locale])

  if (bars.length === 0) return null

  const drawTransition = progressDrawTransition(reduced)
  const svgWidth = bars.length * SLOT_WIDTH

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold text-ink">
          {t('insights.rhythm.title')}
        </h2>
        <div className="w-full overflow-hidden">
          <svg
            role="img"
            aria-label={t('insights.rhythm.ariaLabel', { count: bars.length })}
            viewBox={`0 0 ${svgWidth} ${RHYTHM_CHART_HEIGHT + 24}`}
            className="h-auto w-full"
          >
            {bars.map((bar, index) => {
              const x = index * SLOT_WIDTH + (SLOT_WIDTH - BAR_WIDTH) / 2
              const y = RHYTHM_CHART_HEIGHT - bar.barHeight
              return (
                <g key={bar.date}>
                  <rect
                    x={x}
                    y={8}
                    width={BAR_WIDTH}
                    height={RHYTHM_CHART_HEIGHT - 8}
                    rx={8}
                    fill={colors.subtle}
                    opacity={0.45}
                  />
                  <m.rect
                    x={x}
                    width={BAR_WIDTH}
                    rx={8}
                    fill={bar.fill}
                    initial={reduced ? false : { y: RHYTHM_CHART_HEIGHT, height: 0 }}
                    animate={{ y, height: bar.barHeight }}
                    transition={drawTransition}
                  />
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={RHYTHM_CHART_HEIGHT + 18}
                    textAnchor="middle"
                    fill={colors.muted}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {bar.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </Card>
  )
}
