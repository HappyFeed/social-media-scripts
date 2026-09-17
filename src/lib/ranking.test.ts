import { describe, expect, test } from 'vitest'
import { rankReels } from './ranking'

describe('rankReels', () => {
  test('ordena descendente por views', () => {
    const reels = [{ id: 'a', views: 100 }, { id: 'b', views: 300 }, { id: 'c', views: 200 }]
    const result = rankReels(reels, 3)
    expect(result.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  test('empate en views preserva el orden de llegada (más reciente primero)', () => {
    const reels = [
      { id: 'newest', views: 100 },
      { id: 'middle', views: 100 },
      { id: 'oldest', views: 100 },
    ]
    const result = rankReels(reels, 3)
    expect(result.map((r) => r.id)).toEqual(['newest', 'middle', 'oldest'])
  })

  test('top mayor que la cantidad de reels devuelve todos', () => {
    const reels = [{ id: 'a', views: 10 }, { id: 'b', views: 20 }]
    const result = rankReels(reels, 5)
    expect(result).toHaveLength(2)
  })

  test('rank arranca en 1', () => {
    const reels = [{ id: 'a', views: 10 }, { id: 'b', views: 20 }]
    const result = rankReels(reels, 2)
    expect(result.map((r) => r.rank)).toEqual([1, 2])
  })

  test('input vacío devuelve []', () => {
    expect(rankReels([], 3)).toEqual([])
  })
})
