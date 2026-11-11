export type Slot = 'outer' | 'top' | 'bottom' | 'onepiece' | 'shoes' | 'bag' | 'accessory'
export type Formality = 'casual' | 'smart' | 'dressy'

export interface Piece {
  code: string
  category: string
  slot: Slot
  item: string
  color: string
  details: string
  vibe: string
  weight: 'light' | 'mid' | 'heavy' | null
  layer: 'base' | 'mid' | 'outer' | null
  overSweater: boolean | null
  rainSafe: boolean
  warmth: 1 | 2 | 3 | null
  formality: Formality
  excluded: boolean
  /** Path of the cutout image under closet-data/, or null when there is none. */
  cutout: string | null
}

export interface ClosetFile {
  importedAt: string
  pieces: Piece[]
}
