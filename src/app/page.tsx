import { listActors } from '../lib/profiles'
import { RunForm } from './run-form'

const ACTORS_DIR = 'content/actors'

export default async function HomePage() {
  const actors = await listActors(ACTORS_DIR)
  return (
    <main>
      <h1>Reel Script Generation</h1>
      <RunForm actors={actors} />
    </main>
  )
}
