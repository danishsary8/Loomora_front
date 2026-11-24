import { newId } from '@/lib/id'
import {
  getAlarmPreferences,
  isFocusSoundMuted,
  subscribeToAlarmPreferences,
} from './focusAlarmPreferences'

const soundChannel = 'loomora.focus.expiry'
const silenceMs = 2000
const alarmLimitMs = 120_000

const sounds = {
  chime: { type: 'sine', notes: [660, 880], spacing: 0.12, length: 0.32 },
  wood: { type: 'triangle', notes: [392, 262], spacing: 0.085, length: 0.21 },
  bell: { type: 'sine', notes: [784, 1175, 988], spacing: 0.14, length: 0.52 },
} as const

function openSoundChannel() {
  try {
    return new BroadcastChannel(soundChannel)
  } catch {
    return null
  }
}

function playTone(
  context: AudioContext,
  { sound, volume }: ReturnType<typeof getAlarmPreferences>,
  remainingMs: number,
  onEnded: () => void,
) {
  const tone = context.createOscillator()
  const envelope = context.createGain()
  const { type, notes, spacing, length } = sounds[sound]
  const start = context.currentTime
  const duration = Math.min(length, remainingMs / 1000)
  const end = start + duration
  const peak = (0.2 * volume) / 100

  function release() {
    tone.onended = null
    tone.disconnect()
    envelope.disconnect()
  }

  try {
    tone.type = type
    notes.forEach((frequency, index) =>
      tone.frequency.setValueAtTime(frequency, start + index * spacing),
    )
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(peak, start + Math.min(0.02, duration / 2))
    envelope.gain.exponentialRampToValueAtTime(Math.min(0.001, peak / 10), end)
    tone.connect(envelope).connect(context.destination)
    tone.onended = () => {
      release()
      onEnded()
    }
    tone.start(start)
    tone.stop(end)
  } catch (error) {
    release()
    throw error
  }

  return () => {
    release()
    try {
      tone.stop()
    } catch {
      // The oscillator may already have finished.
    }
  }
}

export type CountdownSound = ReturnType<typeof connectCountdownSound>

export function connectCountdownSound(
  scope: string,
  monotonicNow: () => number,
  isCurrent: () => boolean,
) {
  const ownerKey = 'loomora.focus.audioOwner.' + scope
  const cancellationKey = 'loomora.focus.audioCancelled.' + scope
  const ownerId = newId()
  const channel = openSoundChannel()
  const listeners = new Set<() => void>()
  let context: AudioContext | undefined
  let inFocus = false
  let unlockedAt = Infinity
  let lastPlayedDeadline = -Infinity
  let cancelledThrough = -Infinity
  let ringing: { deadline: number; stop: () => void } | undefined

  function stop() {
    if (!ringing) return
    const alarm = ringing
    ringing = undefined
    alarm.stop()
    listeners.forEach((listener) => listener())
  }

  function cancelThrough(at: number) {
    cancelledThrough = Math.max(cancelledThrough, at)
    if (ringing && ringing.deadline <= cancelledThrough) stop()
  }

  function onPhaseStorage(event: StorageEvent) {
    if (event.key !== cancellationKey || event.newValue === null || !isCurrent()) return
    const at = Number(event.newValue)
    if (Number.isFinite(at)) cancelThrough(at)
  }

  function muteChanged(mutedByEvent?: boolean) {
    if (mutedByEvent || isFocusSoundMuted()) {
      cancelThrough(monotonicNow())
      stop()
    }
  }

  function resetAudio() {
    unlockedAt = Infinity
    stop()
    if (context) {
      const previous = context
      context = undefined
      try {
        void previous.close().catch(() => undefined)
      } catch {
        // Closing audio during page teardown is best effort.
      }
    }
  }

  const unsubscribe = subscribeToAlarmPreferences(muteChanged)
  window.addEventListener('pagehide', resetAudio)
  window.addEventListener('storage', onPhaseStorage)

  function mayPlay() {
    return inFocus && isCurrent() && !isFocusSoundMuted() && context?.state === 'running'
  }

  function play(deadline: number) {
    const preferences = getAlarmPreferences()
    if (
      !mayPlay() ||
      preferences.volume === 0 ||
      deadline < unlockedAt ||
      deadline <= Math.max(lastPlayedDeadline, cancelledThrough)
    ) {
      return false
    }

    lastPlayedDeadline = deadline
    stop()
    const endsAt = monotonicNow() + alarmLimitMs
    const count = { once: 1, repeat: 3, loop: Infinity }[preferences.mode]
    let played = 0
    let nextPlay: ReturnType<typeof setTimeout> | undefined
    let stopTone: (() => void) | undefined
    const limit = setTimeout(stop, alarmLimitMs)
    ringing = {
      deadline,
      stop() {
        clearTimeout(limit)
        clearTimeout(nextPlay)
        stopTone?.()
      },
    }

    function playNext() {
      const remainingMs = endsAt - monotonicNow()
      if (!mayPlay() || !context || remainingMs <= 0) {
        stop()
        return
      }
      played += 1
      try {
        stopTone = playTone(context, preferences, remainingMs, () => {
          stopTone = undefined
          if (played === count) stop()
          else nextPlay = setTimeout(playNext, silenceMs)
        })
      } catch {
        stop()
      }
    }

    playNext()
    if (ringing) listeners.forEach((listener) => listener())
    return true
  }

  function publish(message: object) {
    try {
      channel?.postMessage({ scope, ...message })
    } catch {
      // Optional audio coordination must remain independent of the timer.
    }
  }

  if (channel) {
    channel.onmessage = ({ data }) => {
      if (!isCurrent()) return
      if (data?.scope === scope && Number.isFinite(data.cancelledAt))
        cancelThrough(data.cancelledAt)
      // The owner ID also identifies expiry messages sent by earlier PWA tabs.
      if (data?.owner === ownerId && Number.isFinite(data.deadline)) play(data.deadline)
    }
  }

  return {
    enterFocus() {
      inFocus = true
      return () => {
        inFocus = false
        resetAudio()
      }
    },
    isActive: () => ringing !== undefined,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    stop,
    phaseStarted(at: number) {
      cancelThrough(at)
      publish({ cancelledAt: at })
      try {
        // BroadcastChannel may be unavailable in a peer. Storage events also carry cancellation.
        localStorage.setItem(cancellationKey, String(at))
      } catch {
        // This document has already stopped its own alarm.
      }
    },
    unlock() {
      if (
        !inFocus ||
        !isCurrent() ||
        isFocusSoundMuted() ||
        navigator.userActivation?.isActive === false
      )
        return
      try {
        context ??= new AudioContext()
        if (context.state !== 'running') void context.resume().catch(() => undefined)
        unlockedAt = Math.min(unlockedAt, monotonicNow())
      } catch {
        return
      }
      if (channel) {
        try {
          localStorage.setItem(ownerKey, ownerId)
        } catch {
          // This document can still play its own committed expiry.
        }
      }
    },
    notify(deadline: number) {
      if (play(deadline) || !channel) return
      try {
        const owner = localStorage.getItem(ownerKey)
        // The commit can happen in a passive tab. Send only to the document with audio.
        if (owner && owner !== ownerId) publish({ owner, deadline })
      } catch {
        // A passive document cannot play when cross-tab coordination is unavailable.
      }
    },
    disconnect() {
      unsubscribe()
      window.removeEventListener('pagehide', resetAudio)
      window.removeEventListener('storage', onPhaseStorage)
      inFocus = false
      resetAudio()
      channel?.close()
    },
  }
}
