import test from 'node:test'
import assert from 'node:assert/strict'
import { clearRating, loadRatings, ratingMap, saveRatings, setRating, type RatingEntry, type Store } from './ratings.ts'

const mem = (): Store => {
  const d = new Map<string, string>()
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v) }
}
const e = (key: string, rating: 'like' | 'dislike', date = '2026-11-11'): RatingEntry => ({ key, rating, date, dayTypeId: 'wfh', title: key, codes: key.split('-') })

test('rating round-trips and survives bad data', () => {
  const s = mem()
  saveRatings(setRating([], e('A-B', 'like')), s)
  assert.equal(loadRatings(s).length, 1)
  s.setItem('closet-muse-ratings', 'nope')
  assert.deepEqual(loadRatings(s), [])
})

test('same rating twice clears it; a different rating replaces it', () => {
  let list = setRating([], e('A-B', 'like'))
  assert.deepEqual(ratingMap(list), { 'A-B': 'like' })
  list = setRating(list, e('A-B', 'dislike'))
  assert.deepEqual(ratingMap(list), { 'A-B': 'dislike' })
  list = setRating(list, e('A-B', 'dislike'))
  assert.deepEqual(list, [])
  assert.deepEqual(clearRating(setRating([], e('C-D', 'like')), 'C-D'), [])
})
