// Style knowledge: color families, palette, patterns, necklines, silhouette and mood.
// This is Sonal's styling profile expressed as rules. Everything is a soft preference
// (a score), except the exclusions in rules.ts.
import type { Piece } from '../types.ts'
import type { DayContext, Mood, OutfitPieces } from './types.ts'

export const textOf = (p: Piece): string => `${p.item} ${p.color} ${p.details} ${p.vibe}`.toLowerCase()
const detailText = (p: Piece): string => `${p.item} ${p.details}`.toLowerCase()

// ---------- color ----------

const FAMILIES: [string, RegExp][] = [
  ['cream', /\b(cream|ivory|oatmeal|beige|off-white|ecru)\b/],
  ['white', /\bwhite\b/],
  ['black', /\bblack\b/],
  ['grey', /\b(grey|gray|charcoal|heather|silver)\b/],
  ['teal', /\b(teal|aqua)\b/],
  ['blue', /\b(navy|blue|denim|cobalt|powder)\b/],
  ['green', /\b(green|sage|olive|forest|kelly|mint|lime)\b/],
  ['earth', /\b(brown|camel|tan|cognac|chocolate|rust|brick|taupe|cork|khaki)\b/],
  ['yellow', /\b(mustard|yellow|marigold)\b/],
  ['orange', /\b(orange|coral|peach)\b/],
  ['red', /\b(red|burgundy|berry|raspberry|wine)\b/],
  ['pink', /\b(pink|blush|rose|mauve)\b/],
  ['purple', /\b(lilac|purple|lavender)\b/],
]

/** The main color family of a piece: the first color word in its color. */
export function colorFamily(p: Piece): string {
  const c = p.color.toLowerCase()
  if (/jean|denim/.test(p.item.toLowerCase()) && !/(grey|gray|black|white|cream)/.test(c)) return 'blue'
  let best = 'other'
  let bestIdx = Infinity
  for (const [fam, re] of FAMILIES) {
    const m = re.exec(c)
    if (m && m.index < bestIdx) {
      best = fam
      bestIdx = m.index
    }
  }
  return best
}

/** First word of the color, for titles ("Brick red marl" gives "Brick"). */
export function colorWord(p: Piece): string {
  const w = p.color.split(/[\s,/]+/)[0] ?? ''
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''
}

const CORE_PALETTE = /\b(rust|camel|mustard|olive|burgundy|cream|ivory|sage|denim)\b/
const EXT_PALETTE = /\b(tan|brown|cognac|chocolate|marigold|oatmeal|brick|forest|beige|taupe|khaki|cork|ecru)\b/
const OFF_PALETTE = new Set(['teal', 'pink', 'purple', 'red'])

export function inPalette(p: Piece): boolean {
  const c = p.color.toLowerCase()
  return CORE_PALETTE.test(c) || EXT_PALETTE.test(c) || colorFamily(p) === 'blue'
}

function paletteScore(p: Piece): number {
  const c = p.color.toLowerCase()
  if (CORE_PALETTE.test(c) || (colorFamily(p) === 'blue' && /jean|denim/.test(p.item.toLowerCase()))) return 2
  if (EXT_PALETTE.test(c)) return 1
  if (OFF_PALETTE.has(colorFamily(p))) return -0.5
  return 0
}

const STATEMENT = /\b(mustard|rust|burgundy|marigold|olive|brick|forest)\b/
export const isStatementColor = (p: Piece): boolean => STATEMENT.test(p.color.toLowerCase())

const PATTERN = /\b(floral|florals|print|plaid|stripe|stripes|striped|gingham|embroider\w*|dots|ditsy|tulip|camo|buffalo|fair-isle|multicolor|paisley|motif|checked?|colorblock|leopard|snowflake)\b/
export const isPatterned = (p: Piece): boolean => PATTERN.test(`${p.color} ${p.details} ${p.item}`.toLowerCase())

// ---------- silhouette ----------

/** Volume of a top: 2 = voluminous, 1 = relaxed, 0 = neutral, -1 = fitted. */
export function topVolume(p: Piece): number {
  const t = detailText(p)
  if (/\b(oversized|boxy|chunky|balloon|puff|tunic|flowy|baggy)\b/.test(t)) return 2
  if (/\brelaxed\b/.test(t)) return 1
  if (/\b(fitted|ribbed|skinny|slim|bodycon|racer-style|cropped)\b/.test(t)) return -1
  return 0
}

/** Volume of a bottom: 2 = wide or full, 0 = neutral, -1 = slim. */
export function bottomVolume(p: Piece): number {
  const t = detailText(p)
  if (/\b(wide-leg|wide leg|flare|flared|flowy|maxi|pleated|ruffle|tiered|a-line|skater|parachute)\b/.test(t)) return 2
  if (/\b(skinny|straight|slim|pencil|tailored|slip|leggings)\b/.test(t)) return -1
  return 0
}

// ---------- mood ----------

const MOOD_WORDS: Record<Mood, RegExp> = {
  Relaxed: /\b(tee|denim|jeans?|sneakers?|hoodie|casual|basic|athleisure|lounge|everyday|sweatshirt|windbreaker|chore|utility|canvas|tank|shorts|sporty|cozy)\b/g,
  Boho: /\b(boho|embroider\w*|crochet|peasant|fringe|tiered|ditsy|festival|jutti\w*|maxi|flowy|tulip|woven|paisley|block-print|smocked)\b/g,
  Polished: /\b(blazer|tailored|trousers?|button-up|structured|classic|work|preppy|loafers?|trench|wool|tweed|pointed|collared|leather|heels?|chelsea|slingback)\b/g,
  Romantic: /\b(ruffle|lace|floral|puff|smocked|wrap|bow|satin|slip|mary jane|feminine|date|dressy|evening|pleated|midi|ballet)\b/g,
}

export function moodScores(pieces: Piece[]): Record<Mood, number> {
  const out: Record<Mood, number> = { Relaxed: 0, Boho: 0, Polished: 0, Romantic: 0 }
  for (const p of pieces) {
    const t = textOf(p)
    for (const m of Object.keys(MOOD_WORDS) as Mood[]) out[m] += (t.match(MOOD_WORDS[m]) ?? []).length
  }
  return out
}

const MOOD_TIEBREAK: Record<string, Mood[]> = {
  client: ['Polished', 'Romantic', 'Relaxed', 'Boho'],
  'office-casual': ['Polished', 'Relaxed', 'Romantic', 'Boho'],
  social: ['Romantic', 'Boho', 'Polished', 'Relaxed'],
}

export function moodOf(pieces: Piece[], ctx: DayContext): Mood {
  const s = moodScores(pieces)
  const order = MOOD_TIEBREAK[ctx.dayTypeId] ?? ['Relaxed', 'Boho', 'Romantic', 'Polished']
  return order.reduce((best, m) => (s[m] > s[best] ? m : best), order[0])
}

// ---------- scoring ----------

const FORMAL_ROLES = new Set(['top', 'bottom', 'onepiece', 'shoes', 'bag'])

/** How much one piece suits Sonal's profile on its own (higher is better). */
export function pieceScore(p: Piece, role: keyof OutfitPieces, ctx: DayContext): number {
  const t = detailText(p)
  let s = paletteScore(p)

  // cream or ivory near the face, not stark white
  if (role === 'top' || role === 'onepiece' || role === 'light') {
    if (colorFamily(p) === 'cream') s += 1.5
    if (/^white\b/.test(p.color.toLowerCase())) s -= 1.5
  }

  // necklines: V, scoop and open layers; avoid bulky high necks and heavy chest detail
  if (role === 'top' || role === 'onepiece') {
    if (/\b(v-neck|scoop|plunge|wrap|crossover|sweetheart|button front|button-front)\b/.test(t)) s += 2
    if (/\b(turtleneck|cowl|chunky)\b/.test(t)) s -= 2
    else if (/\b(mock-neck|mock neck|high neck|funnel)\b/.test(t)) s -= 1
    if (/\b(ruffle|embroider\w*|bib|bow|bustier|patches|applique)\b/.test(t)) s -= 1
    if (/\bgraphic\b/.test(t)) s -= 0.5
  }

  // waist: cropped tops and high-rise bottoms show it; wraps and ties define it
  if (role === 'top' && /\bcropped\b/.test(t)) s += 1
  if (role === 'bottom' && /\b(high-rise|high waist|wrap|crossover)\b/.test(t)) s += 1
  if (role === 'onepiece' && /\b(wrap|waist|tie|fit-and-flare|smocked|belt|bodice)\b/.test(t)) s += 1

  // length: cropped or waist-length layers; midi hems suit a petite frame
  if (role === 'coat' || role === 'light') {
    if (/\b(cropped|waist-length)\b/.test(t)) s += 2
    if (/\b(long|knee length|mid-thigh|mid-length)\b/.test(t)) s -= 1
  }
  if ((role === 'bottom' || role === 'onepiece') && /\bmidi\b/.test(t)) s += 1

  // formality: first choice for the day scores highest
  if (FORMAL_ROLES.has(role)) {
    const i = ctx.formality.indexOf(p.formality)
    s += i === -1 ? -3 : i === 0 ? 2 : 1
  } else if (ctx.formality[0] === p.formality) s += 0.5

  // weather
  if (ctx.rainLikely && p.rainSafe) s += role === 'coat' ? 2 : 0.5
  if (ctx.windy && role === 'coat' && /\b(zip|button|hooded|parka|shell)\b/.test(t)) s += 1

  // walking days (errands, travel): comfortable shoes
  if (role === 'shoes' && (ctx.dayTypeId === 'errands' || ctx.dayTypeId === 'travel')) {
    if (/\b(heels?|slingback|mules?|t-strap|platform|juttis)\b/.test(t)) s -= 3
    if (/\b(sneakers?|loafers?|flats|boots|running)\b/.test(t)) s += 1
  }
  return s
}

export interface OutfitStats {
  score: number
  patterned: number
  statements: number
  /** Higher means a bolder outfit. */
  boldness: number
}

const roleEntries = (o: OutfitPieces): [keyof OutfitPieces, Piece][] =>
  (Object.entries(o) as [keyof OutfitPieces, Piece | undefined][]).filter(
    (e): e is [keyof OutfitPieces, Piece] => Boolean(e[1]),
  )

/** Score a whole outfit: the pieces plus how they work together. */
export function scoreOutfit(o: OutfitPieces, ctx: DayContext): OutfitStats {
  const entries = roleEntries(o)
  let score = entries.reduce((sum, [role, p]) => sum + pieceScore(p, role, ctx), 0)

  // one volume at a time
  if (o.top && o.bottom) {
    const tv = topVolume(o.top)
    const bv = bottomVolume(o.bottom)
    if (tv >= 1 && bv >= 1) score -= 3
    else if ((tv >= 1 && bv <= -1) || (tv <= -1 && bv >= 1)) score += 2
    else if (tv <= -1 && bv <= -1) score += 0.5
    // tonal top and bottom make a column
    if (colorFamily(o.top) === colorFamily(o.bottom)) score += 1.5
  }
  if (o.coat && o.top && colorFamily(o.coat) === colorFamily(o.top)) score += 0.5

  // shoes and bag belong together
  if (o.shoes && o.bag && colorFamily(o.shoes) === colorFamily(o.bag)) score += 1

  // patterns: one is easy, two need to sit within the palette, three is too many
  const patterned = entries.filter(([, p]) => isPatterned(p))
  if (patterned.length === 1) score += 0.5
  if (patterned.length === 2) score += patterned.every(([, p]) => inPalette(p)) ? 0 : -3
  if (patterned.length >= 3) score -= 6

  const statements = entries.filter(([r, p]) => r !== 'shoes' && r !== 'bag' && isStatementColor(p)).length
  return { score, patterned: patterned.length, statements, boldness: patterned.length * 1.5 + statements }
}
