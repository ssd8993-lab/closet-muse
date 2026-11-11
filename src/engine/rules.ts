// Hard rules. An outfit that breaks any of these is never shown.
import type { Piece } from '../types.ts'
import type { DayContext, OutfitPieces } from './types.ts'
import { ROLE_ORDER } from './types.ts'

export type Role = keyof OutfitPieces

/** Sonal's exclusions, applied on top of the "excluded" flag in the inventory. */
export function profileExcluded(p: Piece): boolean {
  const c = p.color.toLowerCase()
  const isJeans = /\bjeans\b/.test(p.item.toLowerCase())
  return p.excluded || (isJeans && /\b(grey|gray)\b/.test(c)) // no grey jeans; grey trousers are fine
}

/** The role a piece plays in an outfit. */
export function roleOf(p: Piece): Role {
  const item = p.item.toLowerCase()
  if (/\btights\b/.test(item)) return 'legwear'
  if (p.slot === 'onepiece') return 'onepiece'
  if (p.slot === 'top' && /\bdress\b/.test(item)) return 'onepiece' // sweater dresses
  if (p.slot === 'top' && /\bvest\b/.test(item)) return 'light'
  if (p.slot === 'outer') return p.layer === 'mid' ? 'light' : 'coat'
  return p.slot as Role
}

/** Knitwear is bulky, so a coat over it must be marked "over sweater". */
export function isKnit(p: Piece): boolean {
  const item = p.item.toLowerCase()
  if (/\b(tank|vest)\b/.test(item)) return false
  if (p.category === 'Sweaters') return !/\bdress\b/.test(item)
  return /\b(sweater|pullover|cardigan|knit)\b/.test(item)
}

export const isSkirtLike = (p: Piece): boolean => p.category === 'Skirts' || roleOf(p) === 'onepiece'

/** The lowest warmth a piece may have for the day. */
export function minWarmth(role: Role, ctx: DayContext): number {
  if (role === 'bag' || role === 'accessory' || role === 'legwear') return 0
  return ctx.warmth === 3 ? 2 : 1
}

export interface AllowOptions {
  /** Ignore the day's formality (used only when nothing else fits). */
  relaxFormality?: boolean
}

const FORMAL_ROLES = new Set<Role>(['top', 'bottom', 'onepiece', 'shoes', 'bag'])

/** Can this piece be worn on this day at all? */
export function allowed(p: Piece, role: Role, ctx: DayContext, opts: AllowOptions = {}): boolean {
  if (profileExcluded(p)) return false

  // warmth: never too hot, and warm enough on cold days
  if (p.warmth !== null) {
    if (p.warmth > ctx.warmth) return false
    if (p.warmth < minWarmth(role, ctx)) {
      // a top one step too light is fine when a light layer covers it; checked in validate()
      if (!(role === 'top' && ctx.warmth === 3 && p.warmth === 1)) return false
    }
  }

  // rain: no suede or other non-rain-safe shoes, bags or belts
  if (ctx.rainLikely && (role === 'shoes' || role === 'bag' || role === 'accessory') && !p.rainSafe) return false

  // formality
  if (!opts.relaxFormality && FORMAL_ROLES.has(role) && !ctx.formality.includes(p.formality)) return false
  return true
}

export interface Validation {
  errors: string[]
  /** Things that are allowed but worth knowing (formality had to be relaxed). */
  warnings: string[]
}

/**
 * Check a finished outfit against every hard rule.
 * `closetCodes`, when given, confirms each piece really is in the closet.
 */
export function validateOutfit(o: OutfitPieces, ctx: DayContext, closetCodes?: Set<string>): Validation {
  const errors: string[] = []
  const warnings: string[] = []

  // structure
  const hasTwoPiece = Boolean(o.top && o.bottom)
  if (o.onepiece && (o.top || o.bottom)) errors.push('A one-piece outfit cannot also have a top or bottom')
  if (!o.onepiece && !hasTwoPiece) errors.push('Needs a top and bottom, or a one-piece')
  if (!o.shoes) errors.push('Needs shoes')

  // each role holds a piece of that role, once
  const seen = new Set<string>()
  for (const role of ROLE_ORDER) {
    const p = o[role]
    if (!p) continue
    if (roleOf(p) !== role) errors.push(`${p.code} is not a ${role}`)
    if (seen.has(p.code)) errors.push(`${p.code} is used twice`)
    seen.add(p.code)
    if (closetCodes && !closetCodes.has(p.code)) errors.push(`${p.code} is not in the closet`)
    if (!allowed(p, role, ctx, { relaxFormality: true })) errors.push(`${p.code} breaks a rule for this day`)
    else if (!allowed(p, role, ctx)) warnings.push(`${p.code} is ${p.formality}, outside this day's usual formality`)
  }

  // layering by warmth
  const main = o.onepiece ?? o.top
  if (ctx.warmth === 3) {
    if (!o.coat) errors.push('A cold day needs a coat')
    if (main && main.warmth === 1 && !(o.light && (o.light.warmth ?? 0) >= 2)) {
      errors.push('A light top on a cold day needs a warm layer over it')
    }
  }
  if (ctx.warmth === 2 && main && (main.warmth ?? 0) < 2 && !o.coat && !o.light) {
    errors.push('A cool day needs a layer over a light top')
  }
  if (ctx.warmth === 1 && (o.coat || o.light)) errors.push('A warm day needs no outer layer')

  // coats over knitwear must be marked "over sweater"
  if (o.coat) {
    const knitUnder = (o.top && isKnit(o.top)) || (o.light && isKnit(o.light))
    if (knitUnder && o.coat.overSweater !== true) errors.push(`${o.coat.code} does not fit over knitwear`)
  }

  // tights go under skirts and dresses only, and cold days want them
  const skirtLike = Boolean((o.bottom && isSkirtLike(o.bottom)) || o.onepiece)
  if (o.legwear && !skirtLike) errors.push('Tights only go under a skirt or dress')

  return { errors, warnings }
}
