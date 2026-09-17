import { describe, expect, test } from 'vitest'
import { reelAnalysisSchema, reelScriptSchema } from './domain'

describe('reelAnalysisSchema', () => {
  test('acepta un análisis válido', () => {
    const result = reelAnalysisSchema.safeParse({
      objective: 'Explicar un tip de productividad',
      highlights: ['Hook visual fuerte', 'Cierre con CTA'],
      targetAudience: 'Emprendedores early-stage',
    })
    expect(result.success).toBe(true)
  })

  test('rechaza sin objective', () => {
    const result = reelAnalysisSchema.safeParse({
      objective: '',
      highlights: ['algo'],
      targetAudience: 'alguien',
    })
    expect(result.success).toBe(false)
  })

  test('rechaza con highlights vacío', () => {
    const result = reelAnalysisSchema.safeParse({
      objective: 'algo',
      highlights: [],
      targetAudience: 'alguien',
    })
    expect(result.success).toBe(false)
  })
})

describe('reelScriptSchema', () => {
  test('acepta un script válido', () => {
    const result = reelScriptSchema.safeParse({
      hook: '¿Sabías que...?',
      body: 'Contenido del script',
      closing: 'Seguime para más tips',
    })
    expect(result.success).toBe(true)
  })

  test('rechaza con body vacío', () => {
    const result = reelScriptSchema.safeParse({
      hook: 'hook',
      body: '',
      closing: 'closing',
    })
    expect(result.success).toBe(false)
  })
})
