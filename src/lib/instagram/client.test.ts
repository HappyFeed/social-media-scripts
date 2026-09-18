import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const fetchUserReel = vi.fn()
const fetchPostByMediaId = vi.fn()

vi.mock('insta-fetcher', () => ({
  igApi: vi.fn().mockImplementation(() => ({
    fetchUserReel,
    fetchPostByMediaId,
  })),
}))

const axiosGet = vi.fn()

vi.mock('axios', () => ({
  default: { get: axiosGet },
}))

const { createInstagramClient } = await import('./client')

describe('lib/instagram createInstagramClient', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'instagram-client-'))
    fetchUserReel.mockReset()
    fetchPostByMediaId.mockReset()
    axiosGet.mockReset()
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('discoverReels mapea el fixture de api/v1 a DiscoveredReel[] en orden, con las tres métricas', async () => {
    fetchUserReel.mockResolvedValue({
      xdt_api__v1__clips__user__connection_v2: {
        edges: [
          {
            cursor: 'cursor-1',
            node: {
              __typename: 'XDTClipsItemDict',
              media: {
                pk: '1002',
                id: '1002_555',
                code: 'BBB222',
                play_count: 900,
                like_count: 400,
                comment_count: 5,
                taken_at: 1732100000,
                image_versions2: {
                  candidates: [{ url: 'https://cdn.example.com/thumb2.jpg', width: 480, height: 852 }],
                },
              },
            },
          },
          {
            cursor: 'cursor-2',
            node: {
              __typename: 'XDTClipsItemDict',
              media: {
                pk: '1001',
                id: '1001_555',
                code: 'AAA111',
                play_count: 500,
                like_count: 200,
                comment_count: 10,
                taken_at: 1732000000,
                image_versions2: {
                  candidates: [{ url: 'https://cdn.example.com/thumb1.jpg', width: 480, height: 852 }],
                },
              },
            },
          },
        ],
        page_info: { has_next_page: true, end_cursor: 'cursor-2' },
      },
      xdt_viewer: {},
    })

    const client = createInstagramClient({ sessionId: 'session-123' })
    const reels = await client.discoverReels('north.star', 2)

    expect(fetchUserReel).toHaveBeenCalledWith('north.star', undefined, 2)
    expect(reels).toEqual([
      {
        shortcode: 'BBB222',
        mediaId: '1002',
        views: 900,
        likes: 400,
        comments: 5,
        thumbnailUrl: 'https://cdn.example.com/thumb2.jpg',
        takenAt: new Date(1732100000 * 1000).toISOString(),
      },
      {
        shortcode: 'AAA111',
        mediaId: '1001',
        views: 500,
        likes: 200,
        comments: 10,
        thumbnailUrl: 'https://cdn.example.com/thumb1.jpg',
        takenAt: new Date(1732000000 * 1000).toISOString(),
      },
    ])
  })

  test('hydrateReel mapea un fixture de detalle de post a HydratedReel', async () => {
    fetchPostByMediaId.mockResolvedValue({
      items: [
        {
          caption: { text: 'Una caption con #hashtags' },
          video_versions: [
            { type: 101, width: 720, height: 1280, url: 'https://cdn.example.com/video.mp4', id: 'v1' },
          ],
          video_duration: 34.5,
        },
      ],
      num_results: 1,
      more_available: false,
      auto_load_more_enabled: false,
    })

    const client = createInstagramClient({ sessionId: 'session-123' })
    const hydrated = await client.hydrateReel('1002')

    expect(fetchPostByMediaId).toHaveBeenCalledWith('1002')
    expect(hydrated).toEqual({
      caption: 'Una caption con #hashtags',
      videoUrl: 'https://cdn.example.com/video.mp4',
      durationSeconds: 34.5,
    })
  })

  test('downloadVideo escribe los bytes recibidos en destPath', async () => {
    const bytes = Buffer.from('contenido-fake-de-video')
    axiosGet.mockResolvedValue({ data: bytes })

    const client = createInstagramClient({ sessionId: 'session-123' })
    const destPath = join(dir, 'reel.mp4')
    await client.downloadVideo('https://cdn.example.com/video.mp4', destPath)

    expect(axiosGet).toHaveBeenCalledWith('https://cdn.example.com/video.mp4', {
      responseType: 'arraybuffer',
    })
    await expect(readFile(destPath)).resolves.toEqual(bytes)
  })
})
