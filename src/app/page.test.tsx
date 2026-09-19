// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('../lib/profiles', () => ({
  listActors: vi.fn().mockResolvedValue(['juanse', 'maria']),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const Page = (await import('./page')).default

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
})

describe('app/page', () => {
  test('el select de actor se puebla con exactamente los nombres devueltos por listActors', async () => {
    render(await Page())

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['juanse', 'maria'])
  })

  test('enviar el formulario llama a POST /api/runs y la página pasa a mostrar el runId recibido', async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ runId: 'run-123' }) })
    render(await Page())

    fireEvent.change(screen.getByLabelText(/cuenta/i), { target: { value: 'north.star' } })
    fireEvent.click(screen.getByRole('button', { name: /generar/i }))

    await waitFor(() => screen.getByText(/run-123/))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/runs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ account: 'north.star', actor: 'juanse', top: 3 }),
      }),
    )
  })
})
