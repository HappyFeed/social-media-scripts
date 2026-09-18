import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const spawn = vi.fn()
const stat = vi.fn()

vi.mock('node:child_process', () => ({ spawn }))
vi.mock('node:fs/promises', () => ({ stat }))

const { createFfmpegExtractor } = await import('./media')

function fakeProcess(exitCode: number) {
  const proc = new EventEmitter()
  queueMicrotask(() => proc.emit('close', exitCode))
  return proc
}

describe('lib/media createFfmpegExtractor', () => {
  beforeEach(() => {
    spawn.mockReset()
    stat.mockReset()
  })

  test('extractAudio invoca ffmpeg con argumentos de mp3 mono 16 kHz y resuelve path/sizeBytes', async () => {
    spawn.mockImplementation(() => fakeProcess(0))
    stat.mockResolvedValue({ size: 12345 })

    const extractor = createFfmpegExtractor()
    const result = await extractor.extractAudio('/tmp/video.mp4', '/tmp/audio.mp3')

    expect(spawn).toHaveBeenCalledWith('ffmpeg', [
      '-y',
      '-i',
      '/tmp/video.mp4',
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-acodec',
      'libmp3lame',
      '/tmp/audio.mp3',
    ])
    expect(result).toEqual({ path: '/tmp/audio.mp3', sizeBytes: 12345 })
  })

  test('un spawn con exit code distinto de 0 rechaza', async () => {
    spawn.mockImplementation(() => fakeProcess(1))

    const extractor = createFfmpegExtractor()
    await expect(extractor.extractAudio('/tmp/video.mp4', '/tmp/audio.mp3')).rejects.toThrow(
      /ffmpeg/i,
    )
    expect(stat).not.toHaveBeenCalled()
  })
})
