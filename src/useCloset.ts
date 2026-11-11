import { useEffect, useState } from 'react'
import type { ClosetFile, Piece } from './types'

const BASE = import.meta.env.BASE_URL

/** URL of a piece's cutout image, or null when it has none. */
export const cutoutUrl = (piece: Piece): string | null =>
  piece.cutout ? `${BASE}closet-data/${piece.cutout}` : null

/** Loads the closet that `npm run import` wrote to public/closet-data/closet.json. */
export function useCloset() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${BASE}closet-data/closet.json`)
      .then((r) => {
        if (!r.ok) throw new Error('closet.json not found')
        return r.json() as Promise<ClosetFile>
      })
      .then((d) => !cancelled && setPieces(d.pieces))
      .catch(() => !cancelled && setError('No closet found yet. Run the importer first (see the README).'))
    return () => {
      cancelled = true
    }
  }, [])

  return { pieces, error }
}
