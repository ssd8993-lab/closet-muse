// Places: where the forecast is for. Boston is home; others are added by city search.
export interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
  /** IANA time zone, so "today" and "tomorrow" follow the place's own calendar. */
  timezone: string
}

export const BOSTON: Place = {
  id: 'boston',
  name: 'Boston, MA',
  latitude: 42.3601,
  longitude: -71.0589,
  timezone: 'America/New_York',
}

// ---------- city search (Open-Meteo geocoding, free, no key) ----------

export function geocodeUrl(query: string, count = 6): string {
  const p = new URLSearchParams({ name: query.trim(), count: String(count), language: 'en', format: 'json' })
  return `https://geocoding-api.open-meteo.com/v1/search?${p.toString()}`
}

interface GeoResult {
  name: string
  latitude: number
  longitude: number
  timezone?: string
  country?: string
  country_code?: string
  admin1?: string
}

/** "Boston, Massachusetts" style label; US places get the state, others the country. */
function labelOf(r: GeoResult): string {
  const region = r.country_code === 'US' ? r.admin1 : r.country
  return region && region !== r.name ? `${r.name}, ${region}` : r.name
}

export const placeId = (lat: number, lon: number): string => `${lat.toFixed(2)},${lon.toFixed(2)}`

export function parseGeocode(json: { results?: GeoResult[] }): Place[] {
  const rows = Array.isArray(json.results) ? json.results : []
  return rows
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.name)
    .map((r) => ({
      id: placeId(r.latitude, r.longitude),
      name: labelOf(r),
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? 'auto',
    }))
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (query.trim().length < 2) return []
  const res = await fetch(geocodeUrl(query), { signal })
  if (!res.ok) throw new Error(`City search failed (${res.status})`)
  return parseGeocode(await res.json())
}

// ---------- saved places (kept in this browser for now) ----------

const PLACES_KEY = 'closet-muse-places'
const SELECTED_KEY = 'closet-muse-place'

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

const isPlace = (p: unknown): p is Place => {
  const x = p as Place
  return Boolean(x) && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.latitude === 'number' && typeof x.longitude === 'number' && typeof x.timezone === 'string'
}

/** Saved places other than Boston. */
export function loadSaved(store: Store | null = browserStore()): Place[] {
  try {
    const raw = store?.getItem(PLACES_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter(isPlace).filter((p) => p.id !== BOSTON.id) : []
  } catch {
    return []
  }
}

export function saveSaved(list: Place[], store: Store | null = browserStore()): void {
  try {
    store?.setItem(PLACES_KEY, JSON.stringify(list))
  } catch {
    // blocked or full: places just won't persist
  }
}

export const allPlaces = (saved: Place[]): Place[] => [BOSTON, ...saved]

export function addPlace(saved: Place[], p: Place): Place[] {
  return p.id === BOSTON.id || saved.some((x) => x.id === p.id) ? saved : [...saved, p]
}

export const removePlace = (saved: Place[], id: string): Place[] => saved.filter((p) => p.id !== id)

export function loadSelected(saved: Place[], store: Store | null = browserStore()): Place {
  try {
    const id = store?.getItem(SELECTED_KEY)
    return allPlaces(saved).find((p) => p.id === id) ?? BOSTON
  } catch {
    return BOSTON
  }
}

export function saveSelected(id: string, store: Store | null = browserStore()): void {
  try {
    store?.setItem(SELECTED_KEY, id)
  } catch {
    // ignore
  }
}
