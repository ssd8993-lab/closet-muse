import { useEffect, useMemo, useRef, useState } from 'react'
import { alternatives, buildOutfits, canRemove, outfitKey, piecesOf, restyle, ROLE_ORDER, type DayContext, type OutfitPieces } from './engine/index'
import { cutoutUrl, useCloset } from './useCloset'
import type { Piece } from './types'
import { DAY_TYPES } from './dayTypes'
import { flatlayFilename, renderFlatlay } from './flatlay'
import { wornMap, type WearEntry } from './wearLog'
import { ratingMap, type RatingEntry } from './ratings'

const KIND = { easy: 'Easy go-to', fresh: 'Fresh pairing', bold: 'Bold stretch' } as const
const ROLE_NAME: Record<keyof OutfitPieces, string> = {
  coat: 'coat', light: 'light layer', top: 'top', onepiece: 'dress or one-piece', bottom: 'bottoms',
  legwear: 'tights', shoes: 'shoes', bag: 'bag', accessory: 'belt',
}

function localIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  ctx: DayContext
  log: WearEntry[]
  onWear: (e: Omit<WearEntry, 'id'>) => void
  ratings: RatingEntry[]
  onRate: (e: RatingEntry) => void
}

export default function Outfits({ ctx, log, onWear, ratings, onRate }: Props) {
  const { pieces, error } = useCloset()
  const [shuffle, setShuffle] = useState(0)
  const [swaps, setSwaps] = useState<Record<string, OutfitPieces>>({})
  const [picker, setPicker] = useState<{ id: string; role: keyof OutfitPieces } | null>(null)
  const [image, setImage] = useState<{ url: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // The wear log shapes new suggestions, but logging an outfit must not reshuffle the ones on screen.
  const logRef = useRef(log)
  logRef.current = log
  const ratingsRef = useRef(ratings)
  ratingsRef.current = ratings
  const today = localIso()
  const seed = `${ctx.dayLabel}|${ctx.dayTypeId}|${ctx.warmth}|${ctx.rainLikely}|${shuffle}`
  const result = useMemo(
    () => (pieces ? buildOutfits({ pieces, ctx, seed, worn: wornMap(logRef.current), today, ratings: ratingMap(ratingsRef.current) }) : null),
    [pieces, ctx, seed, today],
  )

  useEffect(() => {
    setSwaps({})
    setPicker(null)
  }, [result])

  const outfits = useMemo(
    () => (result ? result.outfits.map((o) => (swaps[o.id] ? restyle(o, swaps[o.id], ctx) : o)) : []),
    [result, swaps, ctx],
  )
  const setKey = outfits.map((o) => piecesOf(o.pieces).map((p) => p.code).join('.')).join('|')
  useEffect(() => setImage(null), [setKey])

  const options = useMemo(
    () => (picker && pieces ? alternatives(outfits.find((o) => o.id === picker.id)!.pieces, picker.role, pieces, ctx, wornMap(log), today) : []),
    [picker, pieces, outfits, ctx, log, today],
  )

  const occasion = DAY_TYPES.find((d) => d.id === ctx.dayTypeId)?.label ?? 'Outfits'
  const wearDate = ctx.date ?? today

  async function makeImage() {
    setBusy(true)
    const title = `${occasion}, ${ctx.temp}° ${ctx.sky} — ${outfits.length} options`
    const canvas = await renderFlatlay(outfits, title, cutoutUrl)
    setImage({ url: canvas.toDataURL('image/png'), name: flatlayFilename(wearDate, occasion, outfits.length) })
    setBusy(false)
  }

  if (error) return <p className="notice">{error}</p>
  if (!result) return <p className="notice">Loading your closet…</p>

  const wornCodes = (o: { pieces: OutfitPieces }) => piecesOf(o.pieces).map((p) => p.code)
  const isWorn = (o: { pieces: OutfitPieces }) =>
    log.some((e) => e.id === `${wearDate}|${ctx.dayTypeId}` && e.codes.join() === wornCodes(o).join())

  return (
    <div>
      <div className="outfit-head">
        <h3 className="sub-heading">Your {outfits.length} options</h3>
        <button className="chip" onClick={() => setShuffle((n) => n + 1)}>Shuffle</button>
      </div>
      <div className="outfits">
        {outfits.map((o) => (
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
              {ROLE_ORDER.filter((r) => o.pieces[r]).map((r) => {
                const p = o.pieces[r]!
                const open = picker?.id === o.id && picker.role === r
                const extra = canRemove(o.pieces, r, ctx)
                return (
                  <li key={r}>
                    <span>{p.item} ({p.code})</span>
                    <button
                      className="swap"
                      aria-expanded={open}
                      aria-label={`${extra ? 'Swap or remove' : 'Swap'} ${ROLE_NAME[r]} in option ${o.id}`}
                      onClick={() => setPicker(open ? null : { id: o.id, role: r })}
                    >
                      {extra ? 'Swap or remove' : 'Swap'}
                    </button>
                  </li>
                )
              })}
            </ul>
            {picker?.id === o.id && (
              <div className="picker" role="group" aria-label={`Other ${ROLE_NAME[picker.role]} options`}>
                {canRemove(o.pieces, picker.role, ctx) && (
                  <button
                    className="alt remove"
                    onClick={() => {
                      const next = { ...o.pieces }
                      delete next[picker.role]
                      setSwaps((s) => ({ ...s, [o.id]: next }))
                      setPicker(null)
                    }}
                  >
                    <span className="thumb"><span className="placeholder">✕</span></span>
                    <span className="alt-name">Leave off the {ROLE_NAME[picker.role]}</span>
                  </button>
                )}
                {options.length === 0 && <p className="notice">No other {ROLE_NAME[picker.role]} fits the rules for this day.</p>}
                {options.map((p) => {
                  const url = cutoutUrl(p)
                  return (
                    <button
                      key={p.code}
                      className="alt"
                      title={`${p.item} (${p.code})`}
                      onClick={() => {
                        setSwaps((s) => ({ ...s, [o.id]: { ...o.pieces, [picker.role]: p } }))
                        setPicker(null)
                      }}
                    >
                      <span className="thumb">{url ? <img src={url} alt="" loading="lazy" /> : <span className="placeholder">{p.code}</span>}</span>
                      <span className="alt-name">{p.item}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <p className="when"><strong>When to wear:</strong> {o.note}</p>
            <div className="actions">
            <button
              className={isWorn(o) ? 'chip on' : 'chip'}
              onClick={() => onWear({ date: wearDate, dayTypeId: ctx.dayTypeId, title: `${o.title} · ${o.mood}`, codes: wornCodes(o) })}
            >
              {isWorn(o) ? 'Logged ✓' : 'I wore this'}
            </button>
            {(['like', 'dislike'] as const).map((r) => {
              const key = outfitKey(o.pieces)
              const on = ratings.some((x) => x.key === key && x.rating === r)
              return (
                <button
                  key={r}
                  className={on ? 'chip on' : 'chip'}
                  aria-pressed={on}
                  onClick={() => onRate({ key, rating: r, date: wearDate, dayTypeId: ctx.dayTypeId, title: `${o.title} · ${o.mood}`, codes: wornCodes(o) })}
                >
                  {r === 'like' ? '👍 Like' : '👎 Dislike'}
                </button>
              )
            })}
            </div>
          </article>
        ))}
      </div>
      <div className="flatlay">
        <button className="chip" onClick={makeImage} disabled={busy || !outfits.length}>
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
