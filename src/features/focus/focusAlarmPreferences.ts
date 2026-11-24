export const alarmSounds = ['chime', 'wood', 'bell'] as const
export const alarmModes = ['once', 'repeat', 'loop'] as const
export const alarmVolumeStep = 5

interface AlarmPreferences {
  sound: (typeof alarmSounds)[number]
  mode: (typeof alarmModes)[number]
  volume: number
}

const muteKey = 'loomora.focus.muted'
const alarmKey = 'loomora.focus.alarm'
const defaults: AlarmPreferences = { sound: 'chime', mode: 'once', volume: 50 }
const listeners = new Set<(mutedByEvent?: boolean) => void>()
let muteOverride: boolean | undefined
let alarmOverride: AlarmPreferences | undefined
let cachedAlarm: { raw: string | null; value: AlarmPreferences } | undefined

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

function normalizeAlarm(value: Partial<AlarmPreferences> | null): AlarmPreferences {
  return {
    sound: value?.sound && alarmSounds.includes(value.sound) ? value.sound : defaults.sound,
    mode: value?.mode && alarmModes.includes(value.mode) ? value.mode : defaults.mode,
    volume:
      typeof value?.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(100, Math.max(0, Math.round(value.volume / alarmVolumeStep) * alarmVolumeStep))
        : defaults.volume,
  }
}

export function getAlarmPreferences() {
  if (alarmOverride) return alarmOverride
  try {
    const raw = localStorage.getItem(alarmKey)
    if (cachedAlarm?.raw === raw) return cachedAlarm.value
    let value = defaults
    if (raw !== null) {
      try {
        value = normalizeAlarm(JSON.parse(raw) as Partial<AlarmPreferences> | null)
      } catch {
        // Malformed preferences use the defaults.
      }
    }
    cachedAlarm = { raw, value }
    return value
  } catch {
    return defaults
  }
}

export function setAlarmPreferences(patch: Partial<AlarmPreferences>) {
  const value = normalizeAlarm({ ...getAlarmPreferences(), ...patch })
  try {
    const raw = JSON.stringify(value)
    localStorage.setItem(alarmKey, raw)
    cachedAlarm = { raw, value }
    alarmOverride = undefined
  } catch {
    alarmOverride = value
  }
  listeners.forEach((listener) => listener())
}

export function subscribeToAlarmPreferences(listener: (mutedByEvent?: boolean) => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === muteKey || event.key === alarmKey || event.key === null) {
      listener(event.key === muteKey && event.newValue === 'true')
    }
  }
  listeners.add(listener)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
