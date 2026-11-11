import test from 'node:test'
import assert from 'node:assert/strict'
import { addEntry, loadLog, removeEntry, saveLog, wornMap, type Store } from './wearLog.ts'

const mem = (): Store => {
  const d = new Map<string, string>()
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v) }
}

test('log round-trips and survives bad data', () => {
  const s = mem()
  assert.deepEqual(loadLog(s), [])
  saveLog(addEntry([], { date: '2026-11-10', dayTypeId: 'wfh', title: 'A', codes: ['T01'] }), s)
  assert.equal(loadLog(s).length, 1)
  s.setItem('closet-muse-wear-log', '{nope')
  assert.deepEqual(loadLog(s), [])
})

test('logging the same day and kind again replaces it; newest first', () => {
  let log = addEntry([], { date: '2026-11-10', dayTypeId: 'wfh', title: 'A', codes: ['T01'] })
  log = addEntry(log, { date: '2026-11-11', dayTypeId: 'wfh', title: 'B', codes: ['T02'] })
  log = addEntry(log, { date: '2026-11-11', dayTypeId: 'wfh', title: 'C', codes: ['T03'] })
  assert.deepEqual(log.map((e) => e.title), ['C', 'A'])
  assert.deepEqual(removeEntry(log, '2026-11-10|wfh').map((e) => e.title), ['C'])
})

test('wornMap keeps the latest date per piece', () => {
  const log = addEntry(addEntry([], { date: '2026-11-01', dayTypeId: 'wfh', title: 'A', codes: ['T01', 'B01'] }), { date: '2026-11-05', dayTypeId: 'social', title: 'B', codes: ['T01'] })
  assert.deepEqual(wornMap(log), { T01: '2026-11-05', B01: '2026-11-01' })
})
