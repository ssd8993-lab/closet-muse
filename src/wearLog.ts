// Wear log, kept in this browser for now (moves to the database with Supabase).
import type { WornMap } from './engine/index.ts'

export interface WearEntry {
  id: string
  date: string
  dayTypeId: string
  title: string
  codes: string[]
}

const KEY = 'closet-muse-wear-log'

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

export function loadLog(store: Store | null = browserStore()): WearEntry[] {
  try {
    const raw = store?.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveLog(log: WearEntry[], store: Store | null = browserStore()): void {
  try {
    store?.setItem(KEY, JSON.stringify(log))
  } catch {
    // storage full or blocked: the log just won't persist
  }
}

/** One entry per day and kind of day: logging again replaces the earlier one. */
export function addEntry(log: WearEntry[], e: Omit<WearEntry, 'id'>): WearEntry[] {
  const id = `${e.date}|${e.dayTypeId}`
  return [{ ...e, id }, ...log.filter((x) => x.id !== id)].sort((a, b) => b.date.localeCompare(a.date))
}

export const removeEntry = (log: WearEntry[], id: string): WearEntry[] => log.filter((e) => e.id !== id)

/** Last worn date per piece code. */
export function wornMap(log: WearEntry[]): WornMap {
  const m: WornMap = {}
  for (const e of log) for (const c of e.codes) if (!m[c] || e.date > m[c]) m[c] = e.date
  return m
}
