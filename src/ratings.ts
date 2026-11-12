// Likes and dislikes for outfits, kept in this browser for now (moves to the database with Supabase).
import type { Rating, RatingMap } from './engine/index.ts'

export interface RatingEntry {
  /** Sorted piece codes joined with "-" (the outfit's identity). */
  key: string
  rating: Rating
  date: string
  dayTypeId: string
  title: string
  codes: string[]
}

const KEY = 'closet-muse-ratings'

export interface Store {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

const browserStore = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadRatings(store: Store | null = browserStore()): RatingEntry[] {
  try {
    const raw = store?.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveRatings(list: RatingEntry[], store: Store | null = browserStore()): void {
  try {
    store?.setItem(KEY, JSON.stringify(list))
  } catch {
    // storage full or blocked: ratings just won't persist
  }
}

/** Set a rating. Choosing the same rating again clears it. */
export function setRating(list: RatingEntry[], e: RatingEntry): RatingEntry[] {
  const existing = list.find((x) => x.key === e.key)
  const rest = list.filter((x) => x.key !== e.key)
  return existing?.rating === e.rating ? rest : [e, ...rest].sort((a, b) => b.date.localeCompare(a.date))
}

export const clearRating = (list: RatingEntry[], key: string): RatingEntry[] => list.filter((x) => x.key !== key)

export function ratingMap(list: RatingEntry[]): RatingMap {
  const m: RatingMap = {}
  for (const e of list) m[e.key] = e.rating
  return m
}
