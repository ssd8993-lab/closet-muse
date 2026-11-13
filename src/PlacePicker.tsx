import { useEffect, useRef, useState } from 'react'
import { BOSTON, searchPlaces, type Place } from './places'

interface Props {
  places: Place[]
  selectedId: string
  onSelect: (id: string) => void
  /** Saves the place and switches to it. */
  onAdd: (p: Place) => void
  onRemove: (id: string) => void
}

export default function PlacePicker({ places, selectedId, onSelect, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [failed, setFailed] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) input.current?.focus()
  }, [adding])

  useEffect(() => {
    setFailed(false)
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(query, ctrl.signal)
        .then(setResults)
        .catch((e) => {
          if (e?.name !== 'AbortError') setFailed(true)
        })
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  const close = () => {
    setAdding(false)
    setQuery('')
    setResults(null)
  }

  return (
    <div className="places">
      <div className="chips" role="group" aria-label="Place">
        {places.map((p) => (
          <span key={p.id} className="place-chip">
            <button className={p.id === selectedId ? 'chip on' : 'chip'} aria-pressed={p.id === selectedId} onClick={() => onSelect(p.id)}>
              📍 {p.name}{p.id === BOSTON.id ? ' (home)' : ''}
            </button>
            {p.id !== BOSTON.id && (
              <button className="swap" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p.id)}>✕</button>
            )}
          </span>
        ))}
        {!adding && <button className="chip" onClick={() => setAdding(true)}>+ Add place</button>}
      </div>

      {adding && (
        <div className="place-search">
          <div className="place-search-row">
            <input
              ref={input}
              type="search"
              value={query}
              placeholder="Search a city, for example Luxembourg"
              aria-label="Search for a city"
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="chip" onClick={close}>Cancel</button>
          </div>
          {failed && <p className="notice">Couldn't search right now. Check your connection and try again.</p>}
          {results && results.length === 0 && !failed && <p className="notice">No city found for "{query}".</p>}
          {results && results.length > 0 && (
            <ul className="place-results">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      onAdd(r)
                      close()
                    }}
                  >
                    {r.name}
                    <span className="sub"> · {r.timezone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
