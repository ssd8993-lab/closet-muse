import { useMemo, useState } from 'react'
import { cutoutUrl } from './useCloset'
import type { Piece } from './types'

const CATEGORY_ORDER = [
  'Tops', 'Sweaters', 'Outerwear', 'Bottoms', 'Skirts', 'Dresses',
  'Rompers', 'Jumpsuits', 'Sets', 'Shoes', 'Bags', 'Accessories',
]

function PieceCard({ piece }: { piece: Piece }) {
  const url = cutoutUrl(piece)
  return (
    <li className="card">
      <div className="tile">
        {url ? (
          <img src={url} alt={`${piece.item}, ${piece.color}`} loading="lazy" />
        ) : (
          <span className="placeholder" aria-hidden="true">{piece.category[0]}</span>
        )}
      </div>
      <div className="meta">
        <span className="code">{piece.code}</span>
        <span className="name">{piece.item}</span>
        <span className="sub">
          {piece.color}
          {piece.excluded ? ' · excluded' : ''}
        </span>
      </div>
    </li>
  )
}

export default function Closet({ pieces, error }: { pieces: Piece[] | null; error: string | null }) {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [rainOnly, setRainOnly] = useState(false)

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    pieces?.forEach((p) => c.set(p.category, (c.get(p.category) ?? 0) + 1))
    return c
  }, [pieces])

  const categories = CATEGORY_ORDER.filter((c) => counts.has(c))

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (pieces ?? []).filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        (!rainOnly || p.rainSafe) &&
        (!q || `${p.item} ${p.color} ${p.details} ${p.vibe} ${p.code}`.toLowerCase().includes(q)),
    )
  }, [pieces, category, query, rainOnly])

  return (
    <section aria-labelledby="closet-heading">
      <h2 id="closet-heading" className="section">Closet</h2>
      <p className="count">{pieces ? `${shown.length} of ${pieces.length} pieces` : ' '}</p>

      {error && <p className="notice" role="alert">{error}</p>}
      {!pieces && !error && <p className="notice">Loading your closet…</p>}

      {pieces && (
        <>
          <div className="controls">
            <input
              type="search"
              placeholder="Search by name, color or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the closet"
            />
            <label className="check">
              <input type="checkbox" checked={rainOnly} onChange={(e) => setRainOnly(e.target.checked)} />
              Rain-safe only
            </label>
          </div>

          <div className="chips" role="group" aria-label="Category">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                className={c === category ? 'chip on' : 'chip'}
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
                <span className="n">{c === 'All' ? pieces.length : counts.get(c)}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="notice">Nothing matches those filters.</p>
          ) : (
            <ul className="grid">
              {shown.map((p) => (
                <PieceCard key={p.code} piece={p} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
