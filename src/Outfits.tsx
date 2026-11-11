import { useEffect, useMemo, useState } from 'react'
import { buildOutfits, piecesOf, type DayContext } from './engine/index'
import { cutoutUrl, useCloset } from './useCloset'
import type { Piece } from './types'
import { DAY_TYPES } from './dayTypes'
import { flatlayFilename, renderFlatlay } from './flatlay'

const KIND = { easy: 'Easy go-to', fresh: 'Fresh pairing', bold: 'Bold stretch' } as const

export default function Outfits({ ctx }: { ctx: DayContext }) {
  const { pieces, error } = useCloset()
  const [shuffle, setShuffle] = useState(0)
  const [image, setImage] = useState<{ url: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const seed = `${ctx.dayLabel}|${ctx.dayTypeId}|${ctx.warmth}|${ctx.rainLikely}|${shuffle}`
  const result = useMemo(() => (pieces ? buildOutfits({ pieces, ctx, seed }) : null), [pieces, ctx, seed])

  // a new set of outfits makes any old picture stale
  const setKey = result ? result.outfits.map((o) => o.title + o.score).join('|') : ''
  useEffect(() => setImage(null), [setKey])

  async function makeImage() {
    if (!result) return
    setBusy(true)
    const occasion = DAY_TYPES.find((d) => d.id === ctx.dayTypeId)?.label ?? 'Outfits'
    const title = `${occasion}, ${ctx.temp}° ${ctx.sky} — ${result.outfits.length} options`
    const canvas = await renderFlatlay(result.outfits, title, cutoutUrl)
    const name = flatlayFilename(ctx.date ?? new Date().toISOString().slice(0, 10), occasion, result.outfits.length)
    setImage({ url: canvas.toDataURL('image/png'), name })
    setBusy(false)
  }

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
      <div className="flatlay">
        <button className="chip" onClick={makeImage} disabled={busy || !result.outfits.length}>
          {busy ? 'Making picture…' : 'Make flat-lay picture'}
        </button>
        {image && (
          <>
            <a className="chip" href={image.url} download={image.name}>Download PNG</a>
            <img className="flatlay-img" src={image.url} alt="Flat-lay of the outfit options" />
          </>
        )}
      </div>
      {result.gaps.map((g) => <p key={g} className="notice">{g}</p>)}
    </div>
  )
}
