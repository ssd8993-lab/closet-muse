// Builds outfits: sample many valid combinations, score them, pick three that differ.
import type { Piece } from '../types.ts'
import type { DayContext, EngineResult, Kind, Outfit, OutfitPieces } from './types.ts'
import { piecesOf } from './types.ts'
import { allowed, isSkirtLike, roleOf, validateOutfit, type Role } from './rules.ts'
import { colorFamily, colorWord, moodOf, scoreOutfit, topVolume, bottomVolume } from './style.ts'

// ---------- seeded randomness ----------

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rngFrom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)]

// ---------- ratings ----------

export type Rating = 'like' | 'dislike'
/** Rating per outfit, keyed by outfitKey(). */
export type RatingMap = Record<string, Rating>

/** Identity of an outfit: its piece codes, sorted. */
export const outfitKey = (o: OutfitPieces): string => piecesOf(o).map((p) => p.code).sort().join('-')

// ---------- wear history ----------

/** Last worn date (YYYY-MM-DD) by piece code. */
export type WornMap = Record<string, string>

const DAY_MS = 86400000
const FRESH_ROLES: (keyof OutfitPieces)[] = ['coat', 'light', 'top', 'onepiece', 'bottom', 'shoes', 'bag']

/** Gentle nudge: avoid what was worn lately, bring back what has been forgotten. */
export function freshness(o: OutfitPieces, worn: WornMap | undefined, today: string | undefined): number {
  if (!worn || !today) return 0
  const now = Date.parse(`${today}T12:00:00Z`)
  let s = 0
  for (const role of FRESH_ROLES) {
    const p = o[role]
    if (!p) continue
    const last = worn[p.code]
    if (!last) {
      if (role === 'top' || role === 'onepiece' || role === 'bottom') s += 0.5
      continue
    }
    const days = (now - Date.parse(`${last}T12:00:00Z`)) / DAY_MS
    if (days < 0) continue
    if (days < 7) s -= 1.5
    else if (days < 14) s -= 0.7
    else if (days > 60 && (role === 'top' || role === 'onepiece' || role === 'bottom')) s += 0.5
  }
  return s
}

// ---------- pools ----------

type Pools = Record<Role, Piece[]>

export function buildPools(pieces: Piece[], ctx: DayContext, relaxFormality: boolean): Pools {
  const pools: Pools = { coat: [], light: [], top: [], onepiece: [], bottom: [], legwear: [], shoes: [], bag: [], accessory: [] }
  for (const p of pieces) {
    const role = roleOf(p)
    if (allowed(p, role, ctx, { relaxFormality })) pools[role].push(p)
  }
  // Footed tights are not a bottom, and a bottom must be a real garment.
  return pools
}

// ---------- sampling ----------

function sample(pools: Pools, ctx: DayContext, rng: () => number): OutfitPieces | null {
  if (!pools.shoes.length) return null
  const o: OutfitPieces = {}
  const useOne = pools.onepiece.length > 0 && (pools.top.length === 0 || pools.bottom.length === 0 || rng() < 0.35)
  if (useOne) o.onepiece = pick(pools.onepiece, rng)
  else {
    if (!pools.top.length || !pools.bottom.length) return null
    o.top = pick(pools.top, rng)
    o.bottom = pick(pools.bottom, rng)
  }
  const main = o.onepiece ?? o.top!

  if (ctx.warmth === 3) {
    const warm = pools.coat.filter((c) => c.warmth === 3)
    o.coat = pools.coat.length ? pick(warm.length && rng() < 0.7 ? warm : pools.coat, rng) : undefined
    if ((main.warmth ?? 0) < 2) {
      if (!pools.light.length) return null
      o.light = pick(pools.light.filter((l) => (l.warmth ?? 0) >= 2), rng)
    } else if (pools.light.length && rng() < 0.2) o.light = pick(pools.light, rng)
  } else if (ctx.warmth === 2) {
    const needs = (main.warmth ?? 0) < 2
    const r = rng()
    if (needs || r < 0.5) {
      const useLight = pools.light.length > 0 && (r < 0.5 || !pools.coat.length)
      if (useLight) o.light = pick(pools.light, rng)
      else if (pools.coat.length) o.coat = pick(pools.coat, rng)
    }
  }
  const skirtLike = (o.bottom && isSkirtLike(o.bottom)) || o.onepiece
  if (skirtLike && ctx.warmth >= 2 && pools.legwear.length && rng() < (ctx.warmth === 3 ? 0.85 : 0.4)) {
    o.legwear = pick(pools.legwear, rng)
  }
  o.shoes = pick(pools.shoes, rng)
  if (pools.bag.length) o.bag = pick(pools.bag, rng)

  // A belt only when it lifts the outfit: it defines the waist of a dress or a loose top over slim bottoms.
  const beltEligible =
    Boolean(o.onepiece) || Boolean(o.top && o.bottom && topVolume(o.top) >= 1 && bottomVolume(o.bottom) <= 0)
  if (beltEligible && pools.accessory.length && rng() < 0.5) o.accessory = pick(pools.accessory, rng)
  return o
}

interface Candidate {
  pieces: OutfitPieces
  score: number
  boldness: number
  key: string
}

function generate(pieces: Piece[], ctx: DayContext, rng: () => number, relaxFormality: boolean, closetCodes?: Set<string>, worn?: WornMap, today?: string, ratings?: RatingMap): Candidate[] {
  const pools = buildPools(pieces, ctx, relaxFormality)
  const seen = new Set<string>()
  const out: Candidate[] = []
  for (let i = 0; i < 700; i++) {
    const o = sample(pools, ctx, rng)
    if (!o) break
    if (validateOutfit(o, ctx, closetCodes).errors.length) continue
    const key = outfitKey(o)
    if (seen.has(key) || ratings?.[key] === 'dislike') continue
    seen.add(key)
    const st = scoreOutfit(o, ctx)
    let score = st.score + freshness(o, worn, today) + (ratings?.[key] === 'like' ? 2 : 0)
    if (o.accessory) {
      const fam = colorFamily(o.accessory)
      score += fam === colorFamily(o.shoes!) || (o.bag && fam === colorFamily(o.bag)) ? 1 : -1
    }
    out.push({ pieces: o, score, boldness: st.boldness, key })
  }
  return out
}

// ---------- choosing three ----------

const MAIN_ROLES: (keyof OutfitPieces)[] = ['top', 'onepiece', 'bottom']

function overlaps(a: OutfitPieces, b: OutfitPieces, roles: (keyof OutfitPieces)[]): boolean {
  return roles.some((r) => a[r] && b[r] && a[r]!.code === b[r]!.code)
}

const mainOf = (o: OutfitPieces): Piece => (o.onepiece ?? o.top)!

function pickTop(cands: Candidate[], rng: () => number, k = 4): Candidate | undefined {
  const top = cands.slice(0, k)
  return top.length ? top[Math.floor(rng() * top.length)] : undefined
}

function chooseThree(cands: Candidate[], rng: () => number): { kind: Kind; c: Candidate }[] {
  const chosen: { kind: Kind; c: Candidate }[] = []
  const distinct = (c: Candidate, strict: boolean) =>
    chosen.every(({ c: x }) => !overlaps(c.pieces, x.pieces, strict ? [...MAIN_ROLES, 'coat', 'light', 'shoes'] : MAIN_ROLES))

  const choose = (kind: Kind, rank: (c: Candidate) => number, filter: (c: Candidate) => boolean) => {
    for (const strict of [true, false]) {
      const pool = cands.filter((c) => !chosen.some((x) => x.c === c) && distinct(c, strict) && filter(c)).sort((a, b) => rank(b) - rank(a))
      const c = pickTop(pool, rng)
      if (c) return void chosen.push({ kind, c })
    }
  }

  // A: the easy go-to, the best-scoring outfit with little pattern or statement color
  choose('easy', (c) => c.score - c.boldness * 0.5, (c) => c.boldness <= 1.5)
  if (!chosen.length) choose('easy', (c) => c.score, () => true)
  // B: a fresh pairing in a different color family from A
  const famA = chosen[0] ? colorFamily(mainOf(chosen[0].c.pieces)) : ''
  choose('fresh', (c) => c.score + (colorFamily(mainOf(c.pieces)) !== famA ? 2 : 0), (c) => c.boldness <= 3)
  // C: the bold stretch, pattern or a statement color within the palette
  choose('bold', (c) => c.score + c.boldness * 1.5, (c) => c.boldness >= 2)
  if (chosen.length < 3) choose('bold', (c) => c.score + c.boldness, () => true)
  return chosen
}

// ---------- words ----------

const DAY_WORD: Record<string, string> = {
  wfh: 'at home', 'office-casual': 'for the office', client: 'for clients', errands: 'for errands',
  social: 'for socializing', travel: 'for travel', lounge: 'for the weekend',
}

const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase())

function titleOf(o: OutfitPieces): string {
  const main = mainOf(o)
  const words = main.item.replace(/\([^)]*\)/g, '').split(/\s+/).filter(Boolean).slice(0, 3).join(' ')
  const color = colorWord(main)
  return titleCase(words.toLowerCase().includes(color.toLowerCase()) ? words : `${color} ${words}`)
}

function noteOf(o: OutfitPieces, kind: Kind, ctx: DayContext): string {
  const weather = `${ctx.dayLabel} ${DAY_WORD[ctx.dayTypeId] ?? ''}, ${ctx.temp}° and ${ctx.sky}`.replace(/\s+,/, ',')
  const layers = o.coat && o.light ? 'with a warm layer under the coat' : o.coat ? 'with a coat on top' : o.light ? 'with a light layer you can drop indoors' : 'with no layers needed'
  const rain = ctx.rainLikely ? ' Shoes and bag are rain-safe.' : ctx.windy ? ' Fastened layers keep the wind out.' : ''
  const how = {
    easy: 'An easy go-to that needs no thought',
    fresh: 'A fresh pairing from less-worn pieces',
    bold: 'A bolder stretch with color or pattern from your palette',
  }[kind]
  return `${weather[0].toUpperCase()}${weather.slice(1)}. ${how}, ${layers}.${rain}`
}

// ---------- public ----------

export interface BuildInput {
  pieces: Piece[]
  ctx: DayContext
  /** Same seed gives the same outfits; change it to shuffle. */
  seed: string
  /** When each piece was last worn, to avoid repeats and revive forgotten pieces. */
  worn?: WornMap
  /** Today's date, YYYY-MM-DD; needed with `worn`. */
  today?: string
  /** Outfits Sonal liked (shown more) or disliked (never shown again). */
  ratings?: RatingMap
}

export function buildOutfits({ pieces, ctx, seed, worn, today, ratings }: BuildInput): EngineResult {
  const rng = rngFrom(hashSeed(seed))
  const codes = new Set(pieces.map((p) => p.code))
  const gaps: string[] = []

  let cands = generate(pieces, ctx, rng, false, codes, worn, today, ratings)
  if (cands.length < 6) {
    const relaxed = generate(pieces, ctx, rng, true, codes, worn, today, ratings)
    if (relaxed.length > cands.length) {
      cands = relaxed
      gaps.push(`Few pieces are marked ${ctx.formality.join(' or ')} for this kind of day, so some outfits go a little more or less dressed.`)
    }
  }
  cands.sort((a, b) => b.score - a.score)

  const picked = chooseThree(cands, rng)
  const outfits: Outfit[] = picked.map(({ kind, c }, i) => ({
    id: (['A', 'B', 'C'] as const)[i],
    kind,
    title: titleOf(c.pieces),
    mood: moodOf(piecesOf(c.pieces), ctx),
    note: noteOf(c.pieces, kind, ctx),
    pieces: c.pieces,
    score: Math.round(c.score * 10) / 10,
  }))

  if (outfits.length < 3) gaps.push(...explainGaps(pieces, ctx, outfits.length))
  return { outfits, gaps }
}

function explainGaps(pieces: Piece[], ctx: DayContext, built: number): string[] {
  const pools = buildPools(pieces, ctx, true)
  const out: string[] = [`Only ${built} outfit${built === 1 ? '' : 's'} could be built for these conditions.`]
  const wet = ctx.rainLikely ? 'rain-safe ' : ''
  const warm = ctx.warmth === 3 ? 'warm ' : ''
  if (pools.shoes.length < 3) out.push(`Gap: ${warm}${wet}shoes. A ${ctx.rainLikely ? 'rain-safe leather ankle boot in cognac or chocolate' : 'warm ankle boot in a palette color'} would open up more outfits.`)
  if (pools.bag.length < 3) out.push(`Gap: ${wet}bags. A ${ctx.rainLikely ? 'rain-safe tote in camel or olive' : 'bag in a palette color'} would help.`)
  if (ctx.warmth === 3 && pools.coat.length < 3) out.push('Gap: warm coats that fit over knitwear.')
  if (pools.top.length < 3 || pools.bottom.length < 3) out.push('Gap: tops or bottoms that suit this kind of day in this weather.')
  return out
}

// ---------- swap ----------

/** Rebuild an outfit's words and score after a piece changes. */
export function restyle(o: Outfit, pieces: OutfitPieces, ctx: DayContext): Outfit {
  return {
    ...o,
    pieces,
    title: titleOf(pieces),
    mood: moodOf(piecesOf(pieces), ctx),
    note: noteOf(pieces, o.kind, ctx),
    score: Math.round(scoreOutfit(pieces, ctx).score * 10) / 10,
  }
}

/** Other pieces that can replace the one in `role` and still follow every rule, best first. */
export function alternatives(
  current: OutfitPieces,
  role: keyof OutfitPieces,
  pieces: Piece[],
  ctx: DayContext,
  worn?: WornMap,
  today?: string,
  limit = 12,
): Piece[] {
  const now = current[role]
  if (!now) return []
  const inUse = new Set(piecesOf(current).map((p) => p.code))
  const codes = new Set(pieces.map((p) => p.code))
  const ranked: { p: Piece; score: number }[] = []
  for (const p of pieces) {
    if (inUse.has(p.code) || roleOf(p) !== role || !allowed(p, role, ctx)) continue
    const next = { ...current, [role]: p }
    if (validateOutfit(next, ctx, codes).errors.length) continue
    ranked.push({ p, score: scoreOutfit(next, ctx).score + freshness(next, worn, today) })
  }
  return ranked.sort((a, b) => b.score - a.score).slice(0, limit).map((r) => r.p)
}

const REMOVABLE: (keyof OutfitPieces)[] = ['coat', 'light', 'legwear', 'bag', 'accessory']

/** Can this piece simply be left off? Only extras, and only when every rule still holds without it. */
export function canRemove(current: OutfitPieces, role: keyof OutfitPieces, ctx: DayContext): boolean {
  if (!REMOVABLE.includes(role) || !current[role]) return false
  const next = { ...current }
  delete next[role]
  return validateOutfit(next, ctx).errors.length === 0
}
