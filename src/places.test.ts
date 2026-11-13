import test from 'node:test'
import assert from 'node:assert/strict'
import { BOSTON, addPlace, allPlaces, geocodeUrl, loadSaved, loadSelected, parseGeocode, removePlace, saveSaved, saveSelected, type Place, type Store } from './places.ts'
import { forecastUrl } from './weather.ts'

const mem = (): Store => {
  const d = new Map<string, string>()
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v) }
}

const lux: Place = { id: '49.61,6.13', name: 'Luxembourg, Luxembourg', latitude: 49.6117, longitude: 6.1319, timezone: 'Europe/Luxembourg' }

test('geocode url asks for a few English matches', () => {
  const u = new URL(geocodeUrl('  Luxembourg '))
  assert.equal(u.searchParams.get('name'), 'Luxembourg')
  assert.equal(u.searchParams.get('language'), 'en')
})

test('parses geocoding results into labelled places', () => {
  const out = parseGeocode({
    results: [
      { name: 'Luxembourg', latitude: 49.6117, longitude: 6.1319, timezone: 'Europe/Luxembourg', country: 'Luxembourg', country_code: 'LU', admin1: 'Luxembourg' },
      { name: 'San Francisco', latitude: 37.77493, longitude: -122.41942, timezone: 'America/Los_Angeles', country: 'United States', country_code: 'US', admin1: 'California' },
      { name: 'Broken', latitude: 1 } as never,
    ],
  })
  assert.deepEqual(out.map((p) => p.name), ['Luxembourg', 'San Francisco, California'])
  assert.equal(out[1].timezone, 'America/Los_Angeles')
  assert.deepEqual(parseGeocode({}), [])
})

test('forecast url follows the place and its time zone', () => {
  const u = new URL(forecastUrl(lux))
  assert.equal(u.searchParams.get('timezone'), 'Europe/Luxembourg')
  assert.ok(u.searchParams.get('latitude')?.startsWith('49.61'))
  assert.equal(new URL(forecastUrl()).searchParams.get('timezone'), 'America/New_York')
})

test('saved places: add once, never duplicate Boston, remove, and remember the choice', () => {
  const s = mem()
  let saved = addPlace([], lux)
  saved = addPlace(saved, lux)
  saved = addPlace(saved, BOSTON)
  assert.equal(saved.length, 1)
  saveSaved(saved, s)
  assert.deepEqual(loadSaved(s), saved)
  saveSelected(lux.id, s)
  assert.equal(loadSelected(loadSaved(s), s).id, lux.id)
  assert.deepEqual(allPlaces(saved).map((p) => p.id), ['boston', lux.id])
  assert.deepEqual(removePlace(saved, lux.id), [])
  // a removed place falls back to Boston
  assert.equal(loadSelected([], s).id, 'boston')
})

test('bad stored data falls back safely', () => {
  const s = mem()
  s.setItem('closet-muse-places', '[{"id":1}, 5, null]')
  assert.deepEqual(loadSaved(s), [])
  s.setItem('closet-muse-places', 'nope')
  assert.deepEqual(loadSaved(s), [])
})
