import { writeFile } from 'node:fs/promises'
import axios from 'axios'
import { igApi } from 'insta-fetcher'
import { withInstagramRetry } from './resilience'

export { SessionExpiredError } from './resilience'

export interface DiscoveredReel {
  shortcode: string
  mediaId: string
  views: number
  likes: number
  comments: number
  thumbnailUrl: string
  takenAt: string
}

export interface HydratedReel {
  caption: string
  videoUrl: string
  durationSeconds: number
}

export interface InstagramClient {
  discoverReels(account: string, scan: number): Promise<DiscoveredReel[]>
  hydrateReel(mediaId: string): Promise<HydratedReel>
  downloadVideo(videoUrl: string, destPath: string): Promise<void>
}

interface RawReelMedia {
  pk: string
  code: string
  play_count: number
  like_count: number
  comment_count: number
  taken_at: number
  image_versions2: { candidates: Array<{ url: string }> }
}

interface RawUserReelResponse {
  xdt_api__v1__clips__user__connection_v2: {
    edges: Array<{ node: { media: RawReelMedia } }>
  }
}

interface RawPostItem {
  caption: { text: string } | null
  video_versions: Array<{ url: string }>
  video_duration: number
}

interface RawPostByMediaIdResponse {
  items: RawPostItem[]
}

export function createInstagramClient(opts: {
  sessionId: string
  hydrateConcurrency?: number
  retry?: { attempts: number; baseDelayMs: number }
}): InstagramClient {
  const ig = new igApi(opts.sessionId)

  return {
    async discoverReels(account, scan) {
      const raw = (await withInstagramRetry(
        () => ig.fetchUserReel(account, undefined, scan),
        opts.retry,
      )) as unknown as RawUserReelResponse
      return raw.xdt_api__v1__clips__user__connection_v2.edges.map((edge) => {
        const media = edge.node.media
        return {
          shortcode: media.code,
          mediaId: media.pk,
          views: media.play_count,
          likes: media.like_count,
          comments: media.comment_count,
          thumbnailUrl: media.image_versions2.candidates[0]?.url ?? '',
          takenAt: new Date(media.taken_at * 1000).toISOString(),
        }
      })
    },

    async hydrateReel(mediaId) {
      const raw = (await withInstagramRetry(
        () => ig.fetchPostByMediaId(mediaId),
        opts.retry,
      )) as unknown as RawPostByMediaIdResponse
      const item = raw.items[0]
      if (!item) {
        throw new Error(`No se encontró el post con mediaId ${mediaId}`)
      }
      return {
        caption: item.caption?.text ?? '',
        videoUrl: item.video_versions[0]?.url ?? '',
        durationSeconds: item.video_duration,
      }
    },

    async downloadVideo(videoUrl, destPath) {
      const response = await withInstagramRetry(
        () => axios.get(videoUrl, { responseType: 'arraybuffer' }),
        opts.retry,
      )
      await writeFile(destPath, response.data)
    },
  }
}
