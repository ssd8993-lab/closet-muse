import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInventory } from './parse-inventory.mjs'

const row = (over = {}) => {
  const f = {
    category: 'Tops', item: 'Crew tee', color: 'Sage green', details: 'Fitted', vibe: 'Basic',
    weight: 'light', layer: 'base', over: '–', rain: 'yes', warmth: '1', formality: 'casual', code: 'T01',
    ...over,
  }
  return `* \`${[f.category, f.item, f.color, f.details, f.vibe, f.weight, f.layer, f.over, f.rain, f.warmth, f.formality, f.code].join(' | ')}\``
}

test('parses a valid row', () => {
  const { pieces, problems } = parseInventory(row())
  assert.equal(problems.length, 0)
  assert.equal(pieces.length, 1)
  assert.deepEqual(
    { slot: pieces[0].slot, weight: pieces[0].weight, rainSafe: pieces[0].rainSafe, warmth: pieces[0].warmth, overSweater: pieces[0].overSweater },
    { slot: 'top', weight: 'light', rainSafe: true, warmth: 1, overSweater: null },
  )
})

test('ignores headings, notes and blank lines', () => {
  const { pieces, problems } = parseInventory(`# Title\n\nSome note\n## Tops\n${row()}\n`)
  assert.equal(pieces.length, 1)
  assert.equal(problems.length, 0)
})

test('flags a row with the wrong number of fields', () => {
  const { pieces, problems } = parseInventory('* `Tops | Crew tee | Sage`')
  assert.equal(pieces.length, 0)
  assert.equal(problems[0].level, 'error')
})

test('flags invalid enumerated values', () => {
  const { problems } = parseInventory(row({ weight: 'medium', rain: 'maybe', formality: 'fancy' }))
  assert.equal(problems.filter((p) => p.level === 'error').length, 3)
})

test('bags and accessories may use dashes for weight and warmth', () => {
  const bag = row({ category: 'Bags', weight: '–', layer: '–', warmth: '–', rain: 'no', code: 'H01' })
  const { problems } = parseInventory(bag)
  assert.equal(problems.length, 0)
})

test('tops may not use a dash for weight', () => {
  const { problems } = parseInventory(row({ weight: '–' }))
  assert.equal(problems.filter((p) => p.level === 'error').length, 1)
})

test('flags duplicate photo codes', () => {
  const { problems } = parseInventory(`${row()}\n${row({ item: 'Other' })}`)
  assert.ok(problems.some((p) => /Duplicate/.test(p.message)))
})

test('warns on suede marked rain-safe', () => {
  const { problems } = parseInventory(row({ category: 'Shoes', item: 'Ankle boots', color: 'Blush suede', weight: 'heavy', layer: '–', code: 'F29' }))
  assert.ok(problems.some((p) => p.level === 'warning' && /Suede/.test(p.message)))
})

test('grey jeans warn unless marked excluded', () => {
  const grey = row({ category: 'Bottoms', item: 'Straight jeans', color: 'Washed grey', code: 'B15' })
  assert.ok(parseInventory(grey).problems.some((p) => /Grey jeans/.test(p.message)))
  const marked = row({ category: 'Bottoms', item: 'Straight jeans', color: 'Washed grey', vibe: 'Not a favorite; excluded (no grey jeans)', code: 'B15' })
  const r = parseInventory(marked)
  assert.equal(r.problems.length, 0)
  assert.equal(r.pieces[0].excluded, true)
})

test('maps categories to flat-lay slots', () => {
  const slots = ['Tops', 'Sweaters', 'Outerwear', 'Bottoms', 'Skirts', 'Dresses', 'Rompers', 'Jumpsuits', 'Sets'].map((category, i) =>
    parseInventory(row({ category, code: `X${i}` })).pieces[0].slot,
  )
  assert.deepEqual(slots, ['top', 'top', 'outer', 'bottom', 'bottom', 'onepiece', 'onepiece', 'onepiece', 'onepiece'])
})
