import { waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { setFocusSoundMuted } from './focusAlarmPreferences'
import { connectCountdownSound } from './focusSound'

const connections: ReturnType<typeof connectCountdownSound>[] = []

function connect(
  now = 100,
  scope = 'guest',
  isCurrent = () => true,
  leave?: { current: () => void },
) {
  const sound = connectCountdownSound(scope, () => now, isCurrent)
  const unmount = sound.enterFocus()
  if (leave && unmount) leave.current = unmount
  connections.push(sound)
  return sound
}

function mockAudio() {
  const parameter = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  const envelope = { gain: parameter, connect: vi.fn(), disconnect: vi.fn() }
  const start = vi.fn()
  let currentTone: { onended?: () => void } | undefined
  const createOscillator = vi.fn(() => {
    const tone: { onended?: () => void } = {}
    currentTone = tone
    return Object.assign(tone, {
      frequency: parameter,
      connect: () => envelope,
      disconnect: vi.fn(),
      start,
      stop: vi.fn(),
    })
  })
  const audio = {
    state: 'suspended',
    currentTime: 0,
    endTone: () => currentTone?.onended?.(),
    createOscillator,
    createGain: () => envelope,
    resume: vi.fn(async () => {
      audio.state = 'running'
    }),
    close: vi.fn(async () => undefined),
  }
  const AudioContext = vi.fn(function AudioContext() {
    return audio
  })
  vi.stubGlobal('AudioContext', AudioContext)
  return { audio, AudioContext, start, parameter }
}

afterEach(() => {
  for (const connection of connections.splice(0)) connection.disconnect()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('plays one short chime for a live deadline after unlocking audio', () => {
  const { AudioContext, start } = mockAudio()
  const sound = connect()

  sound.notify(99)
  expect(AudioContext).not.toHaveBeenCalled()
  sound.unlock()
  sound.notify(90)
  expect(start).not.toHaveBeenCalled()
  sound.notify(110)
  sound.notify(110)
  expect(AudioContext).toHaveBeenCalledTimes(1)
  expect(start).toHaveBeenCalledTimes(1)
})

it('honors mute changes without replaying a recovered deadline on unlock', () => {
  const { AudioContext, start } = mockAudio()
  const sound = connect(200)

  setFocusSoundMuted(true)
  sound.unlock()
  sound.notify(150)
  expect(AudioContext).not.toHaveBeenCalled()

  setFocusSoundMuted(false)
  sound.unlock()
  sound.notify(150)
  expect(start).not.toHaveBeenCalled()
  sound.notify(250)
  expect(start).toHaveBeenCalledTimes(1)

  setFocusSoundMuted(true)
  sound.notify(300)
  expect(start).toHaveBeenCalledTimes(1)
})

it('routes a passive tab expiry to the enabled document in that scope', async () => {
  const { AudioContext, start } = mockAudio()
  const enabled = connect()
  const peer = connect()
  const otherScope = connect(100, 'account:example')

  enabled.unlock()
  otherScope.notify(110)
  expect(start).not.toHaveBeenCalled()
  peer.notify(110)
  await waitFor(() => expect(start).toHaveBeenCalledTimes(1))
  expect(AudioContext).toHaveBeenCalledTimes(1)
})

it('keeps going when audio construction, resume or playback fails', async () => {
  const { AudioContext, audio, start } = mockAudio()
  const sound = connect()
  AudioContext.mockImplementationOnce(() => {
    throw new Error('Unsupported audio')
  })
  audio.resume.mockRejectedValueOnce(new Error('Playback blocked'))
  audio.createOscillator.mockImplementationOnce(() => {
    throw new Error('Output failed')
  })

  expect(() => sound.unlock()).not.toThrow()
  sound.unlock()
  await Promise.resolve()
  sound.notify(110)
  expect(audio.createOscillator).not.toHaveBeenCalled()
  sound.unlock()
  expect(() => sound.notify(120)).not.toThrow()
  sound.notify(130)
  expect(start).toHaveBeenCalledTimes(1)
})

it('plays three times with two seconds of silence after each completed tone', () => {
  vi.useFakeTimers()
  const { audio, start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'repeat' }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)
  expect(start).toHaveBeenCalledTimes(1)
  expect(sound.isActive()).toBe(true)

  audio.endTone()
  vi.advanceTimersByTime(1999)
  expect(start).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(1)
  expect(start).toHaveBeenCalledTimes(2)
  audio.endTone()
  vi.advanceTimersByTime(2000)
  expect(start).toHaveBeenCalledTimes(3)
  audio.endTone()
  vi.advanceTimersByTime(2000)
  expect(start).toHaveBeenCalledTimes(3)
  expect(sound.isActive()).toBe(false)
})

it('stops a loop at the two-minute limit and suppresses redelivery', () => {
  vi.useFakeTimers()
  const { audio, start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)
  audio.endTone()
  vi.advanceTimersByTime(2000)
  expect(start).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(118_000)
  expect(sound.isActive()).toBe(false)
  sound.notify(110)
  expect(start).toHaveBeenCalledTimes(2)
})

it('stops a ringing alarm when muted and leaves no scheduled plays', () => {
  vi.useFakeTimers()
  const { audio, start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)
  audio.endTone()
  setFocusSoundMuted(true)
  expect(sound.isActive()).toBe(false)
  setFocusSoundMuted(false)
  vi.advanceTimersByTime(3000)
  expect(start).toHaveBeenCalledTimes(1)
})

it('applies the chosen sound and its volume while zero volume stays silent', () => {
  const { parameter, audio, start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ sound: 'wood', volume: 25 }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)
  expect(parameter.setValueAtTime).toHaveBeenCalledWith(392, 0)
  expect(parameter.linearRampToValueAtTime).toHaveBeenCalledWith(0.05, expect.any(Number))
  audio.endTone()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ volume: 0 }))
  sound.notify(120)
  expect(start).toHaveBeenCalledTimes(1)
})

it('requires activation and a mounted Focus screen to start a fresh alarm', () => {
  const { AudioContext, start } = mockAudio()
  const activation = { isActive: false }
  vi.stubGlobal('navigator', { userActivation: activation })
  const leave: { current: () => void } = { current: () => undefined }
  const sound = connect(100, 'guest', () => true, leave)
  sound.unlock()
  sound.notify(109)
  expect(AudioContext).not.toHaveBeenCalled()
  activation.isActive = true
  sound.unlock()
  sound.notify(110)
  expect(start).toHaveBeenCalledTimes(1)
  leave.current()
  expect(sound.isActive()).toBe(false)
  sound.notify(120)
  expect(start).toHaveBeenCalledTimes(1)
})

it('relays one alarm to the enabled tab and cancels it when a peer starts the next phase', async () => {
  const { start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const enabled = connect()
  const peer = connect()

  enabled.unlock()
  peer.notify(110)
  peer.notify(110)
  await waitFor(() => expect(enabled.isActive()).toBe(true))
  expect(start).toHaveBeenCalledTimes(1)
  peer.phaseStarted(120)
  await waitFor(() => expect(enabled.isActive()).toBe(false))
  peer.notify(110)
  enabled.notify(110)
  expect(start).toHaveBeenCalledTimes(1)
})

it('cleans up active playback on pagehide and disconnect', () => {
  const { start } = mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const sound = connect()

  sound.unlock()
  sound.notify(110)
  expect(sound.isActive()).toBe(true)
  window.dispatchEvent(new Event('pagehide'))
  expect(sound.isActive()).toBe(false)
  sound.notify(120)
  expect(start).toHaveBeenCalledTimes(1)

  sound.unlock()
  sound.notify(130)
  expect(sound.isActive()).toBe(true)
  sound.disconnect()
  expect(sound.isActive()).toBe(false)
})

it('cancels a ringing alarm on a scoped storage event without BroadcastChannel', () => {
  vi.stubGlobal('BroadcastChannel', undefined)
  mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'loomora.focus.audioCancelled.account:other',
      newValue: '120',
    }),
  )
  expect(sound.isActive()).toBe(true)
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'loomora.focus.audioCancelled.guest',
      newValue: '120',
    }),
  )
  expect(sound.isActive()).toBe(false)
  sound.notify(110)
  expect(sound.isActive()).toBe(false)
})

it('cancels on a queued mute event even if the latest stored preference is already unmuted', () => {
  mockAudio()
  localStorage.setItem('loomora.focus.alarm', JSON.stringify({ mode: 'loop' }))
  const sound = connect()
  sound.unlock()
  sound.notify(110)

  localStorage.setItem('loomora.focus.muted', 'false')
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'loomora.focus.muted',
      newValue: 'true',
    }),
  )
  expect(sound.isActive()).toBe(false)
})
