import { describe, expect, test, vi } from 'vitest'
import { SessionExpiredError } from '../../lib/instagram/client'
import { FatalRunError } from '../../lib/preflight'
import { discoverAndRank } from './discover-rank'

function reel(overrides: Partial<{ shortcode: string; views: number }> = {}) {
  return {
    shortcode: overrides.shortcode ?? 'abc',
    mediaId: 'media-1',
    views: overrides.views ?? 100,
    likes: 10,
    comments: 1,
    thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
    takenAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('mastra/steps discoverAndRank', () => {
  test('devuelve exactamente rankReels(reels, top)', async () => {
    const reels = [reel({ shortcode: 'a', views: 100 }), reel({ shortcode: 'b', views: 900 })]
    const discoverReels = vi.fn().mockResolvedValue(reels)

    const result = await discoverAndRank('north.star', 20, 1, { discoverReels })

    expect(discoverReels).toHaveBeenCalledWith('north.star', 20)
    expect(result).toEqual([{ ...reels[1], rank: 1 }])
  })

  test('SessionExpiredError se propaga como FatalRunError(ig-session-expired)', async () => {
    const discoverReels = vi.fn().mockRejectedValue(new SessionExpiredError())

    await expect(discoverAndRank('north.star', 20, 3, { discoverReels })).rejects.toMatchObject({
      code: 'ig-session-expired',
    })
    await expect(discoverAndRank('north.star', 20, 3, { discoverReels })).rejects.toBeInstanceOf(
      FatalRunError,
    )
  })

  test('un resultado vacío se propaga como FatalRunError(account-not-found)', async () => {
    const discoverReels = vi.fn().mockResolvedValue([])

    await expect(discoverAndRank('north.star', 20, 3, { discoverReels })).rejects.toMatchObject({
      code: 'account-not-found',
    })
  })

  test('una cuenta inalcanzable se propaga como FatalRunError(account-not-found)', async () => {
    const discoverReels = vi.fn().mockRejectedValue(new Error('cuenta no encontrada'))

    await expect(discoverAndRank('north.star', 20, 3, { discoverReels })).rejects.toMatchObject({
      code: 'account-not-found',
    })
  })
})
