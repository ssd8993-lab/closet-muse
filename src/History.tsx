import { DAY_TYPES } from './dayTypes'
import type { Piece } from './types'
import { cutoutUrl } from './useCloset'
import type { WearEntry } from './wearLog'

interface Props {
  log: WearEntry[]
  pieces: Piece[] | null
  onRemove: (id: string) => void
}

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function History({ log, pieces, onRemove }: Props) {
  const byCode = new Map((pieces ?? []).map((p) => [p.code, p]))
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
                <div className="sub">{e.title}</div>
              </div>
              <button className="swap" onClick={() => onRemove(e.id)} aria-label={`Remove ${fmt(e.date)} from the log`}>Remove</button>
            </div>
            <div className="thumbs small">
              {e.codes.map((c) => {
                const p = byCode.get(c)
                const url = p ? cutoutUrl(p) : null
                return (
                  <div className="thumb" key={c} title={p ? `${p.item} (${c})` : c}>
                    {url ? <img src={url} alt={p?.item ?? c} loading="lazy" /> : <span className="placeholder">{c}</span>}
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
