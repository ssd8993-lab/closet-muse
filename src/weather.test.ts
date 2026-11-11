import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseForecast, summarize, typicalForecast, weatherLabel, forecastUrl, type DayForecast } from './weather.ts'

const day = (over: Partial<DayForecast> = {}): DayForecast => ({
  date: '2026-11-11', high: 55, low: 42, feelsHigh: 52, feelsLow: 38, rainChance: 10, wind: 8, code: 3, ...over,
})

test('parses an Open-Meteo daily response', () => {
  const out = parseForecast({
    daily: {
      time: ['2026-11-11', '2026-11-12'],
      temperature_2m_max: [54.6, 61.2],
      temperature_2m_min: [41.4, 45.9],
      apparent_temperature_max: [50.2, 58.7],
      apparent_temperature_min: [36.8, 43.1],
      precipitation_probability_max: [20, null],
      wind_speed_10m_max: [12.4, 22.6],
      weather_code: [3, 61],
    },
  })
  assert.equal(out.length, 2)
  assert.deepEqual(out[0], { date: '2026-11-11', high: 55, low: 41, feelsHigh: 50, feelsLow: 37, rainChance: 20, wind: 12, code: 3 })
  assert.equal(out[1].rainChance, 0)
  assert.equal(out[1].wind, 23)
})

test('rejects a response with no daily data', () => {
  assert.throws(() => parseForecast({}))
})

test('warmth follows the feels-like high', () => {
  assert.equal(summarize(day({ feelsHigh: 50 })).warmth, 3)
  assert.equal(summarize(day({ feelsHigh: 51 })).warmth, 2)
  assert.equal(summarize(day({ feelsHigh: 68 })).warmth, 2)
  assert.equal(summarize(day({ feelsHigh: 69 })).warmth, 1)
})

test('rain and wind flags use their thresholds', () => {
  assert.equal(summarize(day({ rainChance: 39 })).rainLikely, false)
  assert.equal(summarize(day({ rainChance: 40 })).rainLikely, true)
  assert.equal(summarize(day({ wind: 19 })).windy, false)
  assert.equal(summarize(day({ wind: 20 })).windy, true)
})

test('rain advice mentions suede', () => {
  const s = summarize(day({ rainChance: 70 }))
  assert.ok(s.advice.some((a) => /suede/.test(a)))
})

test('typical forecast is labelled and uses the month', () => {
  const nov = typicalForecast('2026-11-20')
  assert.equal(nov.typical, true)
  assert.equal(nov.high, 53)
  assert.equal(nov.low, 40)
  assert.equal(typicalForecast('2026-07-04').high, 83)
})

test('weather codes have plain labels', () => {
  assert.equal(weatherLabel(0), 'Clear')
  assert.equal(weatherLabel(63), 'Rain')
  assert.equal(weatherLabel(73), 'Snow')
  assert.equal(weatherLabel(96), 'Thunderstorms')
})

test('forecast url asks for Boston in Fahrenheit and mph', () => {
  const u = new URL(forecastUrl())
  assert.equal(u.searchParams.get('temperature_unit'), 'fahrenheit')
  assert.equal(u.searchParams.get('wind_speed_unit'), 'mph')
  assert.equal(u.searchParams.get('timezone'), 'America/New_York')
  assert.ok(u.searchParams.get('latitude')?.startsWith('42.36'))
})
