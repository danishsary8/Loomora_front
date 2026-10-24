import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Checkbox, Chip, Input, ProgressRing, Sheet } from '@/components/ui'
import { CATEGORIES, colors, type Category } from '@/styles/tokens'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-script text-4xl font-bold leading-none">{title}</h2>
      {children}
    </section>
  )
}

const swatches: [string, string][] = [
  ['cream', colors.cream],
  ['paper', colors.paper],
  ['ink', colors.ink],
  ['muted', colors.muted],
  ['accent', colors.accent],
  ['success', colors.success],
  ['danger', colors.danger],
  ...CATEGORIES.map((c): [string, string] => [c, colors.category[c]]),
]

export function StyleguidePage() {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<Category>('study')
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="mx-auto flex w-full max-w-[375px] flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-script text-5xl font-bold leading-none">{t('styleguide.title')}</h1>
        <p className="text-muted">{t('styleguide.intro')}</p>
      </header>

      <Section title={t('styleguide.colors')}>
        <ul className="grid grid-cols-3 gap-3">
          {swatches.map(([name, hex]) => (
            <li key={name} className="flex flex-col gap-1 text-xs">
              <span
                className="h-12 rounded-md border-thick border-ink"
                style={{ backgroundColor: hex }}
              />
              <span className="font-semibold">{name}</span>
              <span className="text-muted">{hex}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('styleguide.typography')}>
        <p className="font-script text-5xl font-bold leading-none">
          {t('styleguide.scriptSample')}
        </p>
        <p className="text-base">{t('styleguide.bodySample')}</p>
        <p className="text-sm text-muted">{t('styleguide.bodySample')}</p>
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

      <Section title={t('styleguide.cards')}>
        <Card>
          <h3 className="text-lg font-bold">{t('styleguide.cardTitle')}</h3>
          <p className="text-muted">{t('styleguide.cardBody')}</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <Card key={c} tone={c} className="font-semibold">
              {t(`categories.${c}`)}
            </Card>
          ))}
        </div>
      </Section>

      <Section title={t('styleguide.chips')}>
        <h3 className="font-bold">{t('styleguide.chipsStatic')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} category={c} />
          ))}
        </div>
        <h3 className="font-bold">{t('styleguide.chipsPicker')}</h3>
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
            <p>{t('styleguide.sheetBody')}</p>
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
    </main>
  )
}
