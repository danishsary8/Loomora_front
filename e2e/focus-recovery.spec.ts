import { expect, test } from '@playwright/test'
import type { FocusSession } from '../src/features/focus/types'

test('two tabs recover an expired final break and save one guest session', async ({
  context,
  page,
}) => {
  await page.goto('/focus')
  const second = await context.newPage()
  await second.goto('/focus')

  const id = '1419ee67-34da-4b53-a541-036ef5db8810'
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await indexedDB.databases()).some(
          (db) => db.name === 'loomora-guest' && db.version === 110,
        ),
      ),
    )
    .toBe(true)

  const endedAt = await page.evaluate(async (id) => {
    const wall = Date.now()
    const mono = Math.floor(performance.timeOrigin + performance.now())
    const durations = [60_000, 300_000, 60_000, 300_000, 60_000, 300_000, 60_000]
    const longBreak = 900_000
    const lateBy = 120_000
    const at = wall - longBreak - lateBy
    const startedAt = at - 1_140_000
    let segmentStart = startedAt
    const segments = durations.map((duration, index) => {
      const segment = {
        type: index % 2 === 0 ? 'focus' : 'short_break',
        started_at: new Date(segmentStart).toISOString(),
        ended_at: new Date(segmentStart + duration).toISOString(),
        active_ms: duration,
      }
      segmentStart += duration
      return segment
    })

    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('loomora-guest')
      opening.onerror = () => reject(opening.error)
      opening.onsuccess = () => {
        const db = opening.result
        const transaction = db.transaction('focus_timers', 'readwrite')
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onabort = () => {
          db.close()
          reject(transaction.error)
        }
        transaction.objectStore('focus_timers').add({
          version: 1,
          scope: 'guest',
          login: null,
          id,
          revision: 7,
          config: { mode: 'countdown', minutes: 1 },
          startedAt,
          checkpoint: { source: 'closed-tab', wall: at, mono: mono - longBreak - lateBy, at },
          phase: {
            index: 7,
            status: 'running',
            startedAt: at,
            timing: { accumulatedMs: 0, runStartedAtMs: at },
          },
          segments,
          laps: [],
        })
      }
    })
    return new Date(at + longBreak).toISOString()
  }, id)

  await Promise.all([page.reload(), second.reload()])
  await expect
    .poll(() =>
      second.evaluate(async () => {
        return new Promise<{
          active: number
          pending: number
          saved: FocusSession[]
        }>((resolve, reject) => {
          const opening = indexedDB.open('loomora-guest')
          opening.onerror = () => reject(opening.error)
          opening.onsuccess = () => {
            const db = opening.result
            const tx = db.transaction(['focus_timers', 'focus_timer_pending', 'focus_sessions'])
            const active = tx.objectStore('focus_timers').count()
            const pending = tx.objectStore('focus_timer_pending').count()
            const saved = tx.objectStore('focus_sessions').getAll()
            tx.oncomplete = () => {
              db.close()
              resolve({ active: active.result, pending: pending.result, saved: saved.result })
            }
            tx.onabort = () => {
              db.close()
              reject(tx.error)
            }
          }
        })
      }),
    )
    .toMatchObject({
      active: 0,
      pending: 0,
      saved: [
        {
          id,
          ended_at: endedAt,
          end_reason: 'completed',
          focus_ms: 240_000,
          break_ms: 1_800_000,
          paused_ms: 0,
        },
      ],
    })
})
