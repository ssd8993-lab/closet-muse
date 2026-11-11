import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildOutfits } from './engine/compose.ts'
import { blurbOf, columnWidth, flatlayFilename, hasOverlap, layoutOutfit, W, H } from './flatlay.ts'
import type { Piece, Formality } from './types.ts'

const path = 'public/closet-data/closet.json'

test('filename follows the project convention', () => {
  assert.equal(flatlayFilename('2026-11-11', 'Client polished', 3), '2026-11-11 Client polished - 3 options.png')
})

test('real closet: no overlap, everything inside its column and above the captions', { skip: !existsSync(path) }, () => {
  const pieces: Piece[] = JSON.parse(readFileSync(path, 'utf8')).pieces
  const days: [string, Formality[]][] = [['errands', ['casual']], ['client', ['dressy', 'smart']], ['social', ['smart', 'dressy', 'casual']]]
  for (const [id, f] of days) for (const w of [1, 2, 3] as const) {
    const ctx = { warmth: w, rainLikely: w === 3, windy: false, formality: f, dayTypeId: id, dayLabel: 'Today', temp: 50, sky: 'clear' }
    const { outfits } = buildOutfits({ pieces, ctx, seed: 'x' })
    // vary image shapes: tall, wide and square
    const sizes: Record<string, { w: number; h: number }> = {}
    pieces.forEach((p, i) => (sizes[p.code] = [{ w: 300, h: 600 }, { w: 800, h: 500 }, { w: 500, h: 500 }][i % 3]))
    outfits.forEach((o, i) => {
      const placed = layoutOutfit(o.pieces, i, outfits.length, sizes)
      assert.equal(hasOverlap(placed), false, `${id} w${w} ${o.id}`)
      for (const p of placed) assert.ok(p.y >= 149.99 && p.y + p.h <= 800.01 && p.x >= 0 && p.x + p.w <= W && p.h <= H)
    })
  }
  assert.ok(columnWidth(3) > 500)
})

test('blurb is about 20 words', () => {
  const o = { note: 'Today, 44° and rain. An easy go-to that needs no thought, with a warm layer under the coat. Shoes and bag are rain-safe.' } as never
  assert.ok(blurbOf(o).split(' ').length <= 21)
})
