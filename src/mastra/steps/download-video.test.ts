import { describe, expect, test, vi } from 'vitest'
import { downloadVideo, type HydratedReelForDownload } from './download-video'

const reel: HydratedReelForDownload = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
  caption: 'una caption',
  videoUrl: 'https://cdn.example.com/video.mp4',
  durationSeconds: 30,
}

describe('mastra/steps downloadVideo', () => {
  test('éxito adjunta un path local de video', async () => {
    const download = vi.fn().mockResolvedValue(undefined)

    const result = await downloadVideo(reel, { downloadVideo: download })

    expect(download).toHaveBeenCalledTimes(1)
    const [videoUrl, destPath] = download.mock.calls[0] as [string, string]
    expect(videoUrl).toBe('https://cdn.example.com/video.mp4')
    expect(destPath).toContain('media-1')
    expect(result).toEqual({ ...reel, videoPath: destPath })
  })

  test('un rechazo produce failed en el step download', async () => {
    const download = vi.fn().mockRejectedValue(new Error('404'))

    const result = await downloadVideo(reel, { downloadVideo: download })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'download',
      reason: '404',
    })
  })
})
