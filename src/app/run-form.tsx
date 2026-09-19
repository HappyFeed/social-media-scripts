'use client'

import { useState, type FormEvent } from 'react'

export function RunForm({ actors }: { actors: string[] }) {
  const [account, setAccount] = useState('')
  const [actor, setActor] = useState(actors[0] ?? '')
  const [top, setTop] = useState(3)
  const [runId, setRunId] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, actor, top }),
    })
    const data = (await response.json()) as { runId: string }
    setRunId(data.runId)
  }

  if (runId) {
    return <p>Run en progreso: {runId}</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="account">Cuenta</label>
      <input
        id="account"
        value={account}
        onChange={(event) => setAccount(event.target.value)}
        required
      />

      <label htmlFor="actor">Actor</label>
      <select id="actor" value={actor} onChange={(event) => setActor(event.target.value)}>
        {actors.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <label htmlFor="top">Cantidad de reels</label>
      <input
        id="top"
        type="number"
        min={1}
        value={top}
        onChange={(event) => setTop(Number(event.target.value))}
      />

      <button type="submit">Generar scripts</button>
    </form>
  )
}
