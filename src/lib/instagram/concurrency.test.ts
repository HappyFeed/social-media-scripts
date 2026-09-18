import { beforeEach, describe, expect, test, vi } from 'vitest'

const fetchUserReel = vi.fn()
const fetchPostByMediaId = vi.fn()

vi.mock('insta-fetcher', () => ({
  igApi: vi.fn().mockImplementation(() => ({
    fetchUserReel,
    fetchPostByMediaId,
  })),
}))

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

const { createInstagramClient } = await import('./client')

interface InFlightTracker {
  count: number
  max: number
}

function trackedHydrateImpl(tracker: InFlightTracker) {
  return async () => {
    tracker.count++
    tracker.max = Math.max(tracker.max, tracker.count)
    await new Promise((resolve) => setTimeout(resolve, 10))
    tracker.count--
    return {
      items: [
        {
          caption: { text: 'caption' },
          video_versions: [{ url: 'https://cdn.example.com/video.mp4' }],
          video_duration: 1,
        },
      ],
    }
  }
}

describe('lib/instagram hydrateConcurrency', () => {
  beforeEach(() => {
    fetchPostByMediaId.mockReset()
  })

  test('con hydrateConcurrency: 2, nunca hay más de 2 llamadas hydrateReel en vuelo', async () => {
    const tracker: InFlightTracker = { count: 0, max: 0 }
    fetchPostByMediaId.mockImplementation(trackedHydrateImpl(tracker))

    const client = createInstagramClient({ sessionId: 'session-123', hydrateConcurrency: 2 })
    await Promise.all(Array.from({ length: 10 }, (_, i) => client.hydrateReel(`media-${i}`)))

    expect(tracker.max).toBe(2)
    expect(fetchPostByMediaId).toHaveBeenCalledTimes(10)
  })

  test('sin hydrateConcurrency, el default es 5 (REEL_FETCH_CONCURRENCY)', async () => {
    const tracker: InFlightTracker = { count: 0, max: 0 }
    fetchPostByMediaId.mockImplementation(trackedHydrateImpl(tracker))

    const client = createInstagramClient({ sessionId: 'session-123' })
    await Promise.all(Array.from({ length: 10 }, (_, i) => client.hydrateReel(`media-${i}`)))

    expect(tracker.max).toBe(5)
    expect(fetchPostByMediaId).toHaveBeenCalledTimes(10)
  })
})
