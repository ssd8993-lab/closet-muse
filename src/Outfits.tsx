import { useMemo, useState } from 'react'
import { buildOutfits, piecesOf, type DayContext } from './engine/index'
import { cutoutUrl, useCloset } from './useCloset'
import type { Piece } from './types'

const KIND = { easy: 'Easy go-to', fresh: 'Fresh pairing', bold: 'Bold stretch' } as const

export default function Outfits({ ctx }: { ctx: DayContext }) {
  const { pieces, error } = useCloset()
  const [shuffle, setShuffle] = useState(0)
  const seed = `${ctx.dayLabel}|${ctx.dayTypeId}|${ctx.warmth}|${ctx.rainLikely}|${shuffle}`
  const result = useMemo(() => (pieces ? buildOutfits({ pieces, ctx, seed }) : null), [pieces, ctx, seed])

  if (error) return <p className="notice">{error}</p>
  if (!result) return <p className="notice">Loading your closet…</p>

  return (
    <div>
      <div className="outfit-head">
        <h3 className="sub-heading">Your {result.outfits.length} options</h3>
        <button className="chip" onClick={() => setShuffle((n) => n + 1)}>Shuffle</button>
      </div>
      <div className="outfits">
        {result.outfits.map((o) => (
          <article key={o.id} className="outfit">
            <h4 className="outfit-title">{o.id}  {o.title} · {o.mood}</h4>
            <p className="kind">{KIND[o.kind]}</p>
            <div className="thumbs">
              {piecesOf(o.pieces).map((p: Piece) => {
                const url = cutoutUrl(p)
                return (
                  <div className="thumb" key={p.code} title={`${p.item} (${p.code})`}>
                    {url ? <img src={url} alt={p.item} loading="lazy" /> : <span className="placeholder">{p.code}</span>}
                  </div>
                )
              })}
            </div>
            <ul className="items">
              {piecesOf(o.pieces).map((p: Piece) => <li key={p.code}>{p.item} ({p.code})</li>)}
            </ul>
            <p className="when"><strong>When to wear:</strong> {o.note}</p>
          </article>
        ))}
      </div>
      {result.gaps.map((g) => <p key={g} className="notice">{g}</p>)}
    </div>
  )
}
