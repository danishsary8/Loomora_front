import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

test('keeps alarm preferences keyboard-accessible and readable across widths and text sizes', async ({
  page,
}) => {
  await page.goto('/focus')
  const settings = page.getByRole('group', { name: 'Timer alarm' })
  const sound = settings.getByRole('combobox', { name: 'Alarm sound' })
  const volume = settings.getByRole('slider', { name: 'Alarm volume' })
  const mode = settings.getByRole('combobox', { name: 'Alarm play mode' })
  await expect(sound).toHaveValue('chime')
  await expect(mode).toHaveValue('once')
  await sound.focus()
  await expect(sound).toBeFocused()
  await sound.selectOption('bell')
  await page.keyboard.press('Tab')
  await expect(volume).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveAttribute('aria-valuetext', '55%')
  await page.keyboard.press('Tab')
  await expect(mode).toBeFocused()
  await mode.selectOption('repeat')
  await expect(mode).toHaveAccessibleDescription('The alarm stops automatically after two minutes.')
  await page.reload()
  await expect(sound).toHaveValue('bell')
  await expect(volume).toHaveValue('55')
  await expect(mode).toHaveValue('repeat')

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const scale of [100, 200]) {
    await page.evaluate((value) => {
      document.documentElement.style.fontSize = value + '%'
    }, scale)
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      const overflow = await settings.evaluate((element) => ({
        page: document.documentElement.scrollWidth - innerWidth,
        settings: element.scrollWidth - element.clientWidth,
      }))
      expect(overflow, `${width}px at ${scale}% text size`).toEqual({ page: 0, settings: 0 })
      for (const control of [sound, volume, mode]) {
        const bounds = await control.boundingBox()
        expect(bounds?.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
})

test('stops ringing on dismissal, the next phase, navigation and reload', async ({ page }) => {
  await page.addInitScript(() => {
    let tones = 0
    Object.defineProperty(window, 'alarmTones', { get: () => tones })
    const BrowserAudioContext = window.AudioContext
    window.AudioContext = class extends BrowserAudioContext {
      override createOscillator() {
        const tone = super.createOscillator()
        const start = tone.start.bind(tone)
        tone.start = (when) => {
          tones += 1
          start(when)
        }
        return tone
      }
    }
  })
  const tones = () => page.evaluate(() => Reflect.get(window, 'alarmTones') as number)
  await page.clock.install()
  await page.goto('/focus')
  await page.getByRole('combobox', { name: 'Alarm play mode' }).selectOption('loop')
  await page.getByRole('radio', { name: 'Custom' }).click()
  await page.getByRole('spinbutton', { name: 'Duration in minutes' }).fill('1')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Expand timer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Focus timer' })
  const stop = dialog.getByRole('button', { name: 'Stop alarm' })
  const shortBreak = dialog.getByRole('button', { name: 'Start short break' })

  await page.clock.fastForward(61_000)
  await expect(stop).toBeVisible()
  expect(await tones()).toBe(1)
  await stop.press('Enter')
  await expect(stop).toHaveCount(0)
  await expect(shortBreak).toBeFocused()
  await page.clock.fastForward(3000)
  expect(await tones()).toBe(1)

  await shortBreak.click()
  await expect(dialog.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.clock.fastForward(301_000)
  await expect(stop).toBeVisible()
  const ringingBeforeNextPhase = await tones()
  await dialog.getByRole('button', { name: 'Start focus', exact: true }).click()
  await expect(stop).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.clock.fastForward(3000)
  expect(await tones()).toBe(ringingBeforeNextPhase)

  await page.clock.fastForward(61_000)
  await expect(stop).toBeVisible()
  await dialog.getByRole('button', { name: 'Exit expanded view' }).click()
  const stopInFocus = page.getByRole('button', { name: 'Stop alarm' })
  await expect(stopInFocus).toBeVisible()
  await page.getByRole('link', { name: 'Week', exact: true }).click()
  await expect(page).toHaveURL(/\/week$/)
  const afterLeaving = await tones()
  await page.clock.fastForward(5000)
  expect(await tones()).toBe(afterLeaving)
  await page.getByRole('link', { name: 'Focus', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start short break' })).toBeVisible()
  await expect(stopInFocus).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Start short break' })).toBeVisible()
  await expect(stopInFocus).toHaveCount(0)
  expect(await tones()).toBe(0)
})
