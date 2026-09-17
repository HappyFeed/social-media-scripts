export function rankReels<T extends { views: number }>(
  reels: readonly T[],
  top: number,
): Array<T & { rank: number }> {
  return [...reels]
    .sort((a, b) => b.views - a.views)
    .slice(0, top)
    .map((reel, index) => ({ ...reel, rank: index + 1 }))
}
