import { describe, expect, test } from 'vitest'
import { createEmptyWorkflowSnapshot } from '@mastra/core/storage'
import { mastra } from './index'

describe('mastra/index', () => {
  test('persistir un snapshot de run fake y releerlo por id devuelve el mismo contenido', async () => {
    const storage = mastra.getStorage()
    if (!storage) throw new Error('mastra instance sin storage configurado')
    const workflows = await storage.getStore('workflows')
    if (!workflows) throw new Error('workflows storage no disponible')

    const runId = 'run-fake-1'
    const snapshot = createEmptyWorkflowSnapshot(runId)

    await workflows.persistWorkflowSnapshot({
      workflowName: 'generateScriptsWorkflow',
      runId,
      snapshot,
    })
    const reloaded = await workflows.loadWorkflowSnapshot({
      workflowName: 'generateScriptsWorkflow',
      runId,
    })

    expect(reloaded).toEqual(snapshot)
  })
})
