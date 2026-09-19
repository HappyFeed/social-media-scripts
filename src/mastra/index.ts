import { Mastra } from '@mastra/core/mastra'
import { InMemoryStore } from '@mastra/core/storage'
import { generateScriptsWorkflow } from './workflows/generate-scripts'
import { processReelWorkflow } from './workflows/process-reel'

export const mastra = new Mastra({
  storage: new InMemoryStore(),
  workflows: { generateScriptsWorkflow, processReelWorkflow },
})
