import { readFile } from 'node:fs/promises'
import axios from 'axios'
import { TRANSCRIPTION_MODEL } from '../models'

export class AudioTooLargeError extends Error {
  constructor(sizeBytes: number, maxAudioBytes: number) {
    super(`El audio pesa ${sizeBytes} bytes, supera el límite de ${maxAudioBytes} bytes`)
    this.name = 'AudioTooLargeError'
  }
}

export interface TranscriptionClient {
  /** Rechaza con AudioTooLargeError por encima de maxBytes, antes de pedir nada. */
  transcribe(audioPath: string, sizeBytes: number): Promise<string>
}

export interface TranscriptionHttpClient {
  post(
    url: string,
    body: unknown,
    config: { headers: Record<string, string> },
  ): Promise<{ data: { text: string } }>
}

const DEFAULT_MAX_AUDIO_BYTES = 25 * 1024 * 1024
const TRANSCRIPTIONS_URL = 'https://openrouter.ai/api/v1/audio/transcriptions'

export function createTranscriptionClient(
  opts: { apiKey: string; maxAudioBytes?: number },
  httpClient: TranscriptionHttpClient = axios,
): TranscriptionClient {
  const maxAudioBytes = opts.maxAudioBytes ?? DEFAULT_MAX_AUDIO_BYTES

  return {
    async transcribe(audioPath, sizeBytes) {
      if (sizeBytes > maxAudioBytes) {
        throw new AudioTooLargeError(sizeBytes, maxAudioBytes)
      }

      const audioBase64 = (await readFile(audioPath)).toString('base64')
      const response = await httpClient.post(
        TRANSCRIPTIONS_URL,
        { model: TRANSCRIPTION_MODEL, file: audioBase64, format: 'mp3' },
        { headers: { Authorization: `Bearer ${opts.apiKey}` } },
      )
      return response.data.text
    },
  }
}
