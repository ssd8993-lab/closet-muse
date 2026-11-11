import type { Formality, Piece } from '../types.ts'

export type Mood = 'Relaxed' | 'Boho' | 'Polished' | 'Romantic'
export type Kind = 'easy' | 'fresh' | 'bold'

/** Everything the engine needs to know about the day. */
export interface DayContext {
  /** 1 = warm, 2 = cool, 3 = cold (the closet's warmth scale). */
  warmth: 1 | 2 | 3
  rainLikely: boolean
  windy: boolean
  /** Formality levels this kind of day can use, most fitting first. */
  formality: Formality[]
  dayTypeId: string
  dayLabel: string
  /** Calendar date, YYYY-MM-DD (used to name saved images). */
  date?: string
  temp: number
  /** Plain-words sky, for example "rain" or "partly cloudy". */
  sky: string
}

/** The pieces of one outfit, by role. */
export interface OutfitPieces {
  /** Outermost layer: coat or jacket. */
  coat?: Piece
  /** Light layer: cardigan or vest. */
  light?: Piece
  top?: Piece
  onepiece?: Piece
  bottom?: Piece
  /** Tights, worn under skirts and dresses. */
  legwear?: Piece
  shoes?: Piece
  bag?: Piece
  accessory?: Piece
}

export interface Outfit {
  id: 'A' | 'B' | 'C'
  kind: Kind
  title: string
  mood: Mood
  /** "When to wear" note. */
  note: string
  pieces: OutfitPieces
  score: number
}

export interface EngineResult {
  outfits: Outfit[]
  /** Wardrobe gaps found while building, in plain words. */
  gaps: string[]
}

/** Display order of the roles, outermost first. */
export const ROLE_ORDER: (keyof OutfitPieces)[] = [
  'coat', 'light', 'top', 'onepiece', 'bottom', 'legwear', 'shoes', 'bag', 'accessory',
]

export const piecesOf = (o: OutfitPieces): Piece[] =>
  ROLE_ORDER.map((k) => o[k]).filter((p): p is Piece => Boolean(p))
