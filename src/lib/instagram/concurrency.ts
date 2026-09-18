export interface Semaphore {
  run<T>(fn: () => Promise<T>): Promise<T>
}

export function createSemaphore(limit: number): Semaphore {
  let active = 0
  const queue: Array<() => void> = []

  function acquire(): Promise<void> {
    if (active < limit) {
      active++
      return Promise.resolve()
    }
    return new Promise((resolve) => queue.push(resolve))
  }

  function release(): void {
    active--
    const next = queue.shift()
    if (next) {
      active++
      next()
    }
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire()
      try {
        return await fn()
      } finally {
        release()
      }
    },
  }
}
