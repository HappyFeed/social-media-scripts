import type { DiscoveredReel, InstagramClient } from '../../lib/instagram/client'
import { SessionExpiredError } from '../../lib/instagram/client'
import { FatalRunError } from '../../lib/preflight'
import { rankReels } from '../../lib/ranking'

export async function discoverAndRank(
  account: string,
  scan: number,
  top: number,
  instagram: Pick<InstagramClient, 'discoverReels'>,
): Promise<Array<DiscoveredReel & { rank: number }>> {
  let reels: DiscoveredReel[]
  try {
    reels = await instagram.discoverReels(account, scan)
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw new FatalRunError('ig-session-expired', error.message)
    }
    throw new FatalRunError('account-not-found', `No se pudo alcanzar la cuenta ${account}`)
  }

  if (reels.length === 0) {
    throw new FatalRunError('account-not-found', `La cuenta ${account} no tiene reels`)
  }

  return rankReels(reels, top)
}
