import { Mastra } from '@mastra/core/mastra'
import { InMemoryStore } from '@mastra/core/storage'

export const mastra = new Mastra({
  storage: new InMemoryStore(),
})
