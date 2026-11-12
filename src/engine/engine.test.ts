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

import { alternatives, freshness, restyle } from './compose.ts'

test('alternatives keep every rule and never repeat a piece in the outfit', { skip: !existsSync('public/closet-data/closet.json') }, () => {
  const pieces: Piece[] = JSON.parse(readFileSync('public/closet-data/closet.json', 'utf8')).pieces
  const codes = new Set(pieces.map((p) => p.code))
  const ctx = ctxFor('errands', ['casual'], 3, true)
  const [first] = buildOutfits({ pieces, ctx, seed: 'swap' }).outfits
  let checked = 0
  for (const role of Object.keys(first.pieces) as (keyof typeof first.pieces)[]) {
    const have = new Set(piecesOf(first.pieces).map((p) => p.code))
    for (const alt of alternatives(first.pieces, role, pieces, ctx)) {
      assert.ok(!have.has(alt.code))
      assert.deepEqual(validateOutfit({ ...first.pieces, [role]: alt }, ctx, codes).errors, [], `${role} ${alt.code}`)
      checked++
    }
  }
  assert.ok(checked > 0)
  const swapped = restyle(first, { ...first.pieces, shoes: alternatives(first.pieces, 'shoes', pieces, ctx)[0] ?? first.pieces.shoes }, ctx)
  assert.equal(swapped.id, first.id)
})

test('freshness penalizes recent wear and rewards forgotten pieces', () => {
  const top = mk({}), bottom = mk({ slot: 'bottom', category: 'Bottoms' }), shoes = mk({ slot: 'shoes', category: 'Shoes' })
  const o = { top, bottom, shoes }
  const today = '2026-11-11'
  assert.equal(freshness(o, undefined, today), 0)
  assert.ok(freshness(o, { [top.code]: '2026-11-09' }, today) < freshness(o, {}, today))
  assert.ok(freshness(o, { [top.code]: '2026-08-01', [bottom.code]: '2026-08-01' }, today) > 0)
})

import { canRemove } from './compose.ts'

test('only extras can be removed, and only when the rules still hold', { skip: !existsSync('public/closet-data/closet.json') }, () => {
  const pieces: Piece[] = JSON.parse(readFileSync('public/closet-data/closet.json', 'utf8')).pieces
  let removable = 0, blocked = 0
  for (const w of [1, 2, 3] as const) for (const [id, f] of DAYS) {
    const ctx = ctxFor(id, f, w, w === 3)
    for (const o of buildOutfits({ pieces, ctx, seed: 'rm' }).outfits) {
      for (const role of Object.keys(o.pieces) as (keyof typeof o.pieces)[]) {
        const ok = canRemove(o.pieces, role, ctx)
        if (['top', 'bottom', 'onepiece', 'shoes'].includes(role)) assert.equal(ok, false, `${role} must stay`)
        if (ok) {
          removable++
          const next = { ...o.pieces }
          delete next[role]
          assert.deepEqual(validateOutfit(next, ctx).errors, [])
        } else if (['coat', 'light'].includes(role)) blocked++
      }
    }
  }
  assert.ok(removable > 0)
  console.log(`removable extras: ${removable}; layers kept by the rules: ${blocked}`)
})
