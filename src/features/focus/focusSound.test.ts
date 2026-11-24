import { waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { connectCountdownSound, setFocusSoundMuted } from './focusSound'

const connections: ReturnType<typeof connectCountdownSound>[] = []

function connect(now = 100, scope = 'guest', isCurrent = () => true) {
  const sound = connectCountdownSound(scope, () => now, isCurrent)
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
  const createOscillator = vi.fn(() => ({
    frequency: parameter,
    connect: () => envelope,
    disconnect: vi.fn(),
    start,
    stop: vi.fn(),
  }))
  const audio = {
    state: 'suspended',
    currentTime: 0,
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
  return { audio, AudioContext, start }
}

afterEach(() => {
  for (const connection of connections.splice(0)) connection.disconnect()
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
