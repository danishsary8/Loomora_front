import { newId } from '@/lib/id'

const muteKey = 'loomora.focus.muted'
const soundChannel = 'loomora.focus.expiry'
const listeners = new Set<() => void>()
let muteOverride: boolean | undefined

export function isFocusSoundMuted() {
  if (muteOverride !== undefined) return muteOverride
  try {
    return localStorage.getItem(muteKey) === 'true'
  } catch {
    return false
  }
}

export function setFocusSoundMuted(muted: boolean) {
  try {
    localStorage.setItem(muteKey, String(muted))
    muteOverride = undefined
  } catch {
    muteOverride = muted
  }
  listeners.forEach((listener) => listener())
}

export function subscribeToFocusSoundMute(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === muteKey || event.key === null) listener()
  }
  listeners.add(listener)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function openSoundChannel() {
  try {
    return new BroadcastChannel(soundChannel)
  } catch {
    return null
  }
}

function playChime(context: AudioContext) {
  const tone = context.createOscillator()
  const envelope = context.createGain()
  const start = context.currentTime
  const end = start + 0.32
  tone.frequency.setValueAtTime(660, start)
  tone.frequency.setValueAtTime(880, start + 0.12)
  envelope.gain.setValueAtTime(0, start)
  envelope.gain.linearRampToValueAtTime(0.1, start + 0.02)
  envelope.gain.exponentialRampToValueAtTime(0.001, end)
  tone.connect(envelope).connect(context.destination)
  tone.onended = () => {
    tone.disconnect()
    envelope.disconnect()
  }
  tone.start(start)
  tone.stop(end)
}

export function connectCountdownSound(
  scope: string,
  monotonicNow: () => number,
  isCurrent: () => boolean,
) {
  const ownerKey = 'loomora.focus.audioOwner.' + scope
  const ownerId = newId()
  const channel = openSoundChannel()
  let context: AudioContext | undefined
  let unlockedAt = Infinity
  let lastPlayedDeadline = -Infinity

  function play(deadline: number) {
    if (
      !isCurrent() ||
      isFocusSoundMuted() ||
      !context ||
      context.state !== 'running' ||
      deadline < unlockedAt ||
      deadline <= lastPlayedDeadline
    )
      return false

    lastPlayedDeadline = deadline
    try {
      playChime(context)
    } catch {
      // Audio output is optional and cannot affect the timer.
    }
    return true
  }

  if (channel) {
    channel.onmessage = ({ data }) => {
      if (data?.owner === ownerId && Number.isFinite(data.deadline)) play(data.deadline)
    }
  }

  return {
    unlock() {
      if (!isCurrent() || isFocusSoundMuted() || navigator.userActivation?.isActive === false)
        return
      try {
        context ??= new AudioContext()
        if (context.state !== 'running') void context.resume().catch(() => undefined)
        unlockedAt = Math.min(unlockedAt, monotonicNow())
        if (channel) localStorage.setItem(ownerKey, ownerId)
      } catch {
        // Unsupported Web Audio or blocked storage is safe to ignore.
      }
    },
    notify(deadline: number) {
      if (play(deadline)) return
      if (channel) {
        try {
          const owner = localStorage.getItem(ownerKey)
          // The commit can happen in a passive tab. Send only to the document with audio.
          if (owner && owner !== ownerId) {
            channel.postMessage({ owner, deadline })
          }
        } catch {
          // A passive document cannot play when cross-tab coordination is unavailable.
        }
      }
    },
    disconnect() {
      channel?.close()
      if (context) void context.close().catch(() => undefined)
      context = undefined
    },
  }
}
