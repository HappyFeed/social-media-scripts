import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AudioTooLargeError, createTranscriptionClient } from './transcription'

describe('lib/openrouter createTranscriptionClient', () => {
  let dir: string
  let audioPath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'openrouter-transcription-'))
    audioPath = join(dir, 'audio.mp3')
    await writeFile(audioPath, Buffer.from('fake-audio-bytes'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('sizeBytes por encima de maxAudioBytes rechaza con AudioTooLargeError sin invocar el cliente HTTP inyectado', async () => {
    const post = vi.fn()
    const client = createTranscriptionClient({ apiKey: 'key-123', maxAudioBytes: 1000 }, { post })

    await expect(client.transcribe(audioPath, 1001)).rejects.toBeInstanceOf(AudioTooLargeError)
    expect(post).not.toHaveBeenCalled()
  })

  test('por debajo del límite, invoca el endpoint y devuelve el texto de la respuesta', async () => {
    const post = vi.fn().mockResolvedValue({ data: { text: 'transcripción generada' } })
    const client = createTranscriptionClient({ apiKey: 'key-123', maxAudioBytes: 1000 }, { post })

    const text = await client.transcribe(audioPath, 500)

    expect(text).toBe('transcripción generada')
    expect(post).toHaveBeenCalledTimes(1)
    const call = post.mock.calls[0]
    if (!call) throw new Error('post no fue llamado')
    const [url, body, config] = call
    expect(url).toContain('/audio/transcriptions')
    expect(body).toMatchObject({ format: 'mp3' })
    expect(config.headers.Authorization).toBe('Bearer key-123')
  })

  test('sin maxAudioBytes, el default es 25 MB', async () => {
    const post = vi.fn().mockResolvedValue({ data: { text: 'ok' } })
    const client = createTranscriptionClient({ apiKey: 'key-123' }, { post })

    await expect(client.transcribe(audioPath, 26 * 1024 * 1024)).rejects.toBeInstanceOf(
      AudioTooLargeError,
    )
    await expect(client.transcribe(audioPath, 24 * 1024 * 1024)).resolves.toBe('ok')
  })
})
