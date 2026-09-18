import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'

export interface AudioExtractor {
  extractAudio(videoPath: string, destPath: string): Promise<{ path: string; sizeBytes: number }>
}

export function createFfmpegExtractor(ffmpegBin = 'ffmpeg'): AudioExtractor {
  return {
    async extractAudio(videoPath, destPath) {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpegBin, [
          '-y',
          '-i',
          videoPath,
          '-vn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-acodec',
          'libmp3lame',
          destPath,
        ])
        proc.on('error', reject)
        proc.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`ffmpeg terminó con código ${code}`))
          }
        })
      })

      const { size } = await stat(destPath)
      return { path: destPath, sizeBytes: size }
    },
  }
}
