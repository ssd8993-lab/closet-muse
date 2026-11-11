import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildOutfits } from './compose.ts'
import { validateOutfit, profileExcluded } from './rules.ts'
import { piecesOf } from './types.ts'
import type { DayContext } from './types.ts'
import type { Piece, Formality } from '../types.ts'

const DAYS: [string, Formality[]][] = [
  ['wfh', ['casual', 'smart']], ['office-casual', ['smart', 'casual']], ['client', ['dressy', 'smart']],
  ['errands', ['casual']], ['social', ['smart', 'dressy', 'casual']], ['travel', ['casual', 'smart']], ['lounge', ['casual']],
]

function ctxFor(id: string, formality: Formality[], warmth: 1 | 2 | 3, rainLikely: boolean): DayContext {
  return { warmth, rainLikely, windy: false, formality, dayTypeId: id, dayLabel: 'Today', temp: 50, sky: rainLikely ? 'rain' : 'clear' }
}

let n = 0
const mk = (o: Partial<Piece>): Piece => ({
  code: `X${n++}`, category: 'Tops', slot: 'top', item: 'Tee', color: 'Cream', details: '', vibe: '', weight: 'light',
  layer: 'base', overSweater: null, rainSafe: false, warmth: 1, formality: 'casual', excluded: false, cutout: null, ...o,
})

test('grey jeans are excluded, grey trousers are not', () => {
  assert.equal(profileExcluded(mk({ slot: 'bottom', item: 'Straight jeans', color: 'Grey' })), true)
  assert.equal(profileExcluded(mk({ slot: 'bottom', item: 'Trousers', color: 'Grey' })), false)
})

test('tiny closet: builds a valid outfit and respects rain', () => {
  const pieces = [
    mk({ item: 'Tee', color: 'Cream' }),
    mk({ category: 'Bottoms', slot: 'bottom', item: 'Jeans', color: 'Denim' }),
    mk({ category: 'Shoes', slot: 'shoes', item: 'Suede loafers', color: 'Tan', rainSafe: false, warmth: 1 }),
    mk({ category: 'Shoes', slot: 'shoes', item: 'Leather sneakers', color: 'White', rainSafe: true, warmth: 1 }),
  ]
  const ctx = ctxFor('errands', ['casual'], 1, true)
  const r = buildOutfits({ pieces, ctx, seed: 't' })
  assert.ok(r.outfits.length >= 1)
  for (const o of r.outfits) assert.equal(o.pieces.shoes?.item, 'Leather sneakers')
})

test('same seed gives same outfits; different seed can differ', () => {
  const path = 'public/closet-data/closet.json'
  if (!existsSync(path)) return
  const pieces: Piece[] = JSON.parse(readFileSync(path, 'utf8')).pieces
  const ctx = ctxFor('wfh', ['casual', 'smart'], 2, false)
  const a = buildOutfits({ pieces, ctx, seed: 's1' })
  const b = buildOutfits({ pieces, ctx, seed: 's1' })
  assert.deepEqual(a.outfits.map((o) => piecesOf(o.pieces).map((p) => p.code)), b.outfits.map((o) => piecesOf(o.pieces).map((p) => p.code)))
})

test('real closet: every day type x warmth x rain gives valid, distinct outfits', { skip: !existsSync('public/closet-data/closet.json') }, () => {
  const pieces: Piece[] = JSON.parse(readFileSync('public/closet-data/closet.json', 'utf8')).pieces
  const codes = new Set(pieces.map((p) => p.code))
  const report: string[] = []
  for (const [id, f] of DAYS) for (const w of [1, 2, 3] as const) for (const rain of [false, true]) {
    const ctx = ctxFor(id, f, w, rain)
    const r = buildOutfits({ pieces, ctx, seed: `${id}${w}${rain}` })
    if (r.outfits.length < 3) report.push(`${id} w${w} rain=${rain}: ${r.outfits.length} outfits; ${r.gaps.join(' | ')}`)
    for (const o of r.outfits) {
      const v = validateOutfit(o.pieces, ctx, codes)
      assert.deepEqual(v.errors, [], `${id} w${w} rain=${rain} ${o.id}`)
      for (const p of piecesOf(o.pieces)) assert.ok(!profileExcluded(p), p.code)
      if (rain) for (const k of ['shoes', 'bag', 'accessory'] as const) if (o.pieces[k]) assert.equal(o.pieces[k]!.rainSafe, true)
    }
    const tops = r.outfits.map((o) => (o.pieces.onepiece ?? o.pieces.top)!.code)
    assert.equal(new Set(tops).size, tops.length, 'main pieces differ')
  }
  console.log(report.join('\n') || 'all scenarios gave 3 outfits')
})
