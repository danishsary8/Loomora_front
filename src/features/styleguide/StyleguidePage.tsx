import { m, useReducedMotion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, LoadingState } from '@/components/states'
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  ProgressRing,
  SegmentedControl,
  Sheet,
  Textarea,
  Toast,
} from '@/components/ui'
import { ClockInput } from '@/components/ui/ClockInput'
import {
  CheckIcon,
  CloseIcon,
  FocusIcon,
  InsightsIcon,
  PencilIcon,
  ProfileIcon,
  RepeatIcon,
  SproutIcon,
  StreakIcon,
  TodayIcon,
  TrashIcon,
  WeekIcon,
} from '@/components/ui/icons'
import { CountUp } from '@/components/reactbits/CountUp'
import { ScheduleItemSheet } from '@/features/schedule/ScheduleItemSheet'
import { listStaggerContainer, listStaggerItem, pressTapProps } from '@/styles/motion'
import { CATEGORIES, colors, type Category } from '@/styles/tokens'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-bold leading-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

const swatches: [string, string][] = [
  ['canvas', colors.cream],
  ['paper', colors.paper],
  ['subtle', colors.subtle],
  ['ink', colors.ink],
  ['muted', colors.muted],
  ['primary', colors.primary],
  ['primary-soft', colors.primarySoft],
  ['accent', colors.accent],
  ['border-subtle', colors.borderSubtle],
  ['border-control', colors.borderControl],
  ['success', colors.success],
  ['warning', colors.warning],
  ['danger', colors.danger],
  ...CATEGORIES.map((c): [string, string] => [c, colors.category[c]]),
]

const ICON_SHOWCASE = [
  { name: 'Today', Icon: TodayIcon },
  { name: 'Week', Icon: WeekIcon },
  { name: 'Focus', Icon: FocusIcon },
  { name: 'Insights', Icon: InsightsIcon },
  { name: 'Profile', Icon: ProfileIcon },
  { name: 'Streak', Icon: StreakIcon },
  { name: 'Check', Icon: CheckIcon },
  { name: 'Close', Icon: CloseIcon },
  { name: 'Edit', Icon: PencilIcon },
  { name: 'Repeat', Icon: RepeatIcon },
  { name: 'Delete', Icon: TrashIcon },
  { name: 'Sprout', Icon: SproutIcon },
] as const

export function StyleguidePage() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const reduced = Boolean(reduceMotion)
  const [picked, setPicked] = useState<Category>('study')
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>('24h')
  const [clockDraft, setClockDraft] = useState<string>()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false)
  const [kpiTarget, setKpiTarget] = useState(83)
  const tap = pressTapProps(reduced)

  return (
    <main className="mx-auto flex w-full max-w-[375px] flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold leading-tight text-ink">
          {t('styleguide.title')}
        </h1>
        <p className="text-muted">{t('styleguide.intro')}</p>
      </header>

      <Section title={t('styleguide.colors')}>
        <ul className="grid grid-cols-3 gap-3">
          {swatches.map(([name, hex]) => (
            <li key={name} className="flex flex-col gap-1 text-xs">
              <span
                className="h-12 rounded-sm border-hairline border-border-control/40 shadow-soft-sm"
                style={{ backgroundColor: hex }}
              />
              <span className="font-semibold text-ink">{name}</span>
              <span className="tabular-nums text-muted">{hex}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('styleguide.typography')}>
        <p className="font-heading text-4xl font-bold leading-tight text-ink">
          {t('styleguide.scriptSample')}
        </p>
        <p className="text-base text-ink">{t('styleguide.bodySample')}</p>
        <p className="text-sm text-muted">{t('styleguide.bodySample')}</p>
      </Section>

      <Section title={t('styleguide.icons')}>
        <ul className="grid grid-cols-4 gap-2">
          {ICON_SHOWCASE.map(({ name, Icon }) => (
            <li
              key={name}
              className="flex flex-col items-center gap-1.5 rounded-md border-hairline border-border-subtle bg-paper p-2.5 text-xs text-muted shadow-soft-sm"
            >
              <Icon className="size-5 text-ink" />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('styleguide.buttons')}>
        <div className="flex flex-wrap gap-3">
          <Button>{t('styleguide.primary')}</Button>
          <Button variant="secondary">{t('styleguide.secondary')}</Button>
          <Button variant="danger">{t('styleguide.danger')}</Button>
          <Button variant="ghost">{t('styleguide.ghost')}</Button>
        </div>
        <Button size="lg" fullWidth>
          {t('styleguide.large')}
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button disabled>{t('styleguide.disabled')}</Button>
          <Button variant="secondary" disabled>
            {t('styleguide.disabled')}
          </Button>
        </div>
      </Section>

      <Section title={t('styleguide.segmented')}>
        <SegmentedControl
          label={t('styleguide.segmentedLabel')}
          value={clockFormat}
          onChange={setClockFormat}
          options={[
            { value: '12h', label: t('styleguide.segmentedFirst') },
            { value: '24h', label: t('styleguide.segmentedSecond') },
          ]}
        />
      </Section>

      <Section title={t('styleguide.cards')}>
        <Card>
          <h3 className="text-lg font-bold">{t('styleguide.cardTitle')}</h3>
          <p className="text-muted">{t('styleguide.cardBody')}</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <Card key={c} tone={c} compact className="font-semibold">
              {t(`categories.${c}`)}
            </Card>
          ))}
        </div>
      </Section>

      <Section title={t('styleguide.chips')}>
        <h3 className="text-sm font-semibold text-muted">{t('styleguide.chipsStatic')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} category={c} />
          ))}
        </div>
        <h3 className="text-sm font-semibold text-muted">{t('styleguide.chipsPicker')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} category={c} selected={picked === c} onClick={() => setPicked(c)} />
          ))}
        </div>
      </Section>

      <Section title={t('styleguide.checkboxes')}>
        <div className="flex flex-col">
          <Checkbox label={t('styleguide.checkboxUnchecked')} />
          <Checkbox label={t('styleguide.checkboxChecked')} defaultChecked />
          <Checkbox label={t('styleguide.checkboxDisabled')} disabled />
        </div>
      </Section>

      <Section title={t('styleguide.inputs')}>
        <Input
          label={t('styleguide.inputLabel')}
          placeholder={t('styleguide.inputPlaceholder')}
          hint={t('styleguide.inputHint')}
        />
        <Input label={t('styleguide.inputErrorLabel')} error={t('styleguide.inputError')} />
        <Input label={t('styleguide.inputDisabled')} disabled />
        <Textarea
          label={t('styleguide.textareaLabel')}
          placeholder={t('styleguide.textareaPlaceholder')}
        />
        <ClockInput
          label={t('styleguide.clockLabel')}
          format={clockFormat}
          wallTime="14:30"
          draft={clockDraft}
          onChange={setClockDraft}
        />
      </Section>

      <Section title={t('styleguide.progressRing')}>
        <div className="flex flex-wrap justify-between gap-2">
          <ProgressRing
            value={0}
            max={7}
            label={t('progress.doneOfTotal', { done: 0, total: 7 })}
            size={96}
          />
          <ProgressRing
            value={3}
            max={7}
            label={t('progress.doneOfTotal', { done: 3, total: 7 })}
            size={96}
          />
          <ProgressRing
            value={7}
            max={7}
            label={t('progress.doneOfTotal', { done: 7, total: 7 })}
            size={96}
          />
        </div>
      </Section>

      <Section title={t('styleguide.toast')}>
        <Button
          variant="secondary"
          onClick={() =>
            setToastMessage((current) => (current ? null : t('styleguide.toastSample')))
          }
        >
          {t('styleguide.showToast')}
        </Button>
        <Toast message={toastMessage} />
      </Section>

      <Section title={t('styleguide.sheet')}>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          {t('styleguide.openSheet')}
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t('styleguide.sheetTitle')}
        >
          <div className="flex flex-col gap-4">
            <p className="text-muted">{t('styleguide.sheetBody')}</p>
            <Input
              label={t('styleguide.inputLabel')}
              placeholder={t('styleguide.inputPlaceholder')}
            />
            <Button fullWidth onClick={() => setSheetOpen(false)}>
              {t('styleguide.primary')}
            </Button>
          </div>
        </Sheet>
      </Section>

      <Section title={t('styleguide.scheduleSheet')}>
        <Button variant="secondary" onClick={() => setScheduleSheetOpen(true)}>
          {t('styleguide.openScheduleSheet')}
        </Button>
        <ScheduleItemSheet
          open={scheduleSheetOpen}
          onClose={() => setScheduleSheetOpen(false)}
          target={{ type: 'create' }}
        />
      </Section>

      <Section title={t('styleguide.motionStates')}>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted">{t('styleguide.motionCountLabel')}</p>
            <p className="text-2xl font-bold tabular-nums text-ink">
              <CountUp to={kpiTarget} />%
            </p>
          </div>
          <m.button
            type="button"
            {...tap}
            onClick={() => setKpiTarget((v) => (v >= 100 ? 60 : v + 10))}
            className="min-h-touch rounded-md border-control border-border-control bg-paper px-3.5 text-sm font-semibold text-ink shadow-soft-sm hover:bg-subtle"
          >
            {t('styleguide.motionStep')}
          </m.button>
        </Card>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('styleguide.motionStaggerLabel')}</h3>
          <m.ul
            variants={listStaggerContainer(reduced)}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2"
          >
            {CATEGORIES.slice(0, 3).map((c) => (
              <m.li key={c} variants={listStaggerItem(reduced)}>
                <Card tone={c} compact className="font-semibold">
                  {t(`categories.${c}`)}
                </Card>
              </m.li>
            ))}
          </m.ul>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('styleguide.skeletonPreview')}</h3>
          <LoadingState variant="list" />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('styleguide.emptyPreview')}</h3>
          <EmptyState
            title={t('styleguide.emptySampleTitle')}
            message={t('styleguide.emptySampleBody')}
            actions={<Button fullWidth>{t('styleguide.emptySampleCta')}</Button>}
          />
        </div>
      </Section>
    </main>
  )
}
