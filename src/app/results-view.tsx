import type { ReelView, RunView } from '../lib/domain'

export function ResultsView({ run }: { run: RunView }) {
  return (
    <ul>
      {run.reels.map((reel) => (
        <li key={reel.shortcode} data-reel={reel.shortcode}>
          <ReelCard reel={reel} />
        </li>
      ))}
    </ul>
  )
}

function ReelCard({ reel }: { reel: ReelView }) {
  if (reel.status === 'pending') {
    return (
      <div>
        <span>{reel.shortcode}</span>
        <span>{reel.currentStep}</span>
      </div>
    )
  }

  if (reel.status === 'failed') {
    return (
      <div>
        <span>{reel.rank}</span>
        <span>{reel.shortcode}</span>
        <p>{reel.reason}</p>
      </div>
    )
  }

  return (
    <div>
      <span>{reel.rank}</span>
      <span>{reel.shortcode}</span>
      <span>{reel.metrics.views} views</span>
      <span>{reel.metrics.likes} likes</span>
      <span>{reel.metrics.comments} comments</span>
      <p>{reel.analysis.objective}</p>
      <ul>
        {reel.analysis.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
      <p>{reel.analysis.targetAudience}</p>
      <p>{reel.script.hook}</p>
      <p>{reel.script.body}</p>
      <p>{reel.script.closing}</p>
    </div>
  )
}
