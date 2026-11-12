import { DAY_TYPES } from './dayTypes'
import type { Piece } from './types'
import { cutoutUrl } from './useCloset'
import type { WearEntry } from './wearLog'
import type { RatingEntry } from './ratings'

interface Props {
  log: WearEntry[]
  pieces: Piece[] | null
  ratings: RatingEntry[]
  onRemove: (id: string) => void
  onClearRating: (key: string) => void
}

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function History({ log, ratings, pieces, onRemove, onClearRating }: Props) {
  const byCode = new Map((pieces ?? []).map((p) => [p.code, p]))
  const ratingOf = (codes: string[]) => ratings.find((r) => r.key === [...codes].sort().join('-'))?.rating
  const Thumbs = ({ codes }: { codes: string[] }) => (
    <div className="thumbs small">
      {codes.map((c) => {
        const p = byCode.get(c)
        const url = p ? cutoutUrl(p) : null
        return (
          <div className="thumb" key={c} title={p ? `${p.item} (${c})` : c}>
            {url ? <img src={url} alt={p?.item ?? c} loading="lazy" /> : <span className="placeholder">{c}</span>}
          </div>
        )
      })}
    </div>
  )
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="section">What you wore</h2>
      {log.length === 0 && <p className="notice">Nothing logged yet. Tap "I wore this" on an outfit and it shows up here.</p>}
      <ul className="history">
        {log.map((e) => (
          <li key={e.id} className="entry">
            <div className="entry-head">
              <div>
                <strong>{fmt(e.date)}</strong> · {DAY_TYPES.find((d) => d.id === e.dayTypeId)?.label ?? e.dayTypeId}
                <div className="sub">{e.title}{ratingOf(e.codes) ? (ratingOf(e.codes) === 'like' ? ' · 👍 Liked' : ' · 👎 Disliked') : ''}</div>
              </div>
              <button className="swap" onClick={() => onRemove(e.id)} aria-label={`Remove ${fmt(e.date)} from the log`}>Remove</button>
            </div>
            <Thumbs codes={e.codes} />
          </li>
        ))}
      </ul>

      <h2 className="section rated-heading">Liked and disliked outfits</h2>
      {ratings.length === 0 && <p className="notice">Tap Like or Dislike on an outfit to remember it. Liked outfits come back more often; disliked ones never do.</p>}
      <ul className="history">
        {ratings.map((r) => (
          <li key={r.key} className="entry">
            <div className="entry-head">
              <div>
                <strong>{r.rating === 'like' ? '👍 Liked' : '👎 Disliked'}</strong> · {fmt(r.date)} · {DAY_TYPES.find((d) => d.id === r.dayTypeId)?.label ?? r.dayTypeId}
                <div className="sub">{r.title}</div>
              </div>
              <button className="swap" onClick={() => onClearRating(r.key)} aria-label={`Clear rating for ${r.title}`}>Clear</button>
            </div>
            <Thumbs codes={r.codes} />
          </li>
        ))}
      </ul>
    </section>
  )
}
