import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseForecast, summarize, typicalForecast, weatherLabel, forecastUrl, type DayForecast } from './weather.ts'

const day = (over: Partial<DayForecast> = {}): DayForecast => ({
  date: '2026-11-11', high: 13, low: 6, feelsHigh: 11, feelsLow: 3, rainChance: 10, wind: 13, code: 3, ...over,
})

test('parses an Open-Meteo daily response', () => {
  const out = parseForecast({
    daily: {
      time: ['2026-11-11', '2026-11-12'],
      temperature_2m_max: [12.6, 16.2],
      temperature_2m_min: [5.4, 7.9],
      apparent_temperature_max: [10.2, 14.7],
      apparent_temperature_min: [2.8, 6.1],
      precipitation_probability_max: [20, null],
      wind_speed_10m_max: [20.4, 36.6],
      weather_code: [3, 61],
    },
  })
  assert.equal(out.length, 2)
  assert.deepEqual(out[0], { date: '2026-11-11', high: 13, low: 5, feelsHigh: 10, feelsLow: 3, rainChance: 20, wind: 20, code: 3 })
  assert.equal(out[1].rainChance, 0)
  assert.equal(out[1].wind, 37)
})

test('rejects a response with no daily data', () => {
  assert.throws(() => parseForecast({}))
})

test('warmth follows the feels-like high', () => {
  assert.equal(summarize(day({ feelsHigh: 10 })).warmth, 3)
  assert.equal(summarize(day({ feelsHigh: 11 })).warmth, 2)
  assert.equal(summarize(day({ feelsHigh: 20 })).warmth, 2)
  assert.equal(summarize(day({ feelsHigh: 21 })).warmth, 1)
})

test('rain and wind flags use their thresholds', () => {
  assert.equal(summarize(day({ rainChance: 39 })).rainLikely, false)
  assert.equal(summarize(day({ rainChance: 40 })).rainLikely, true)
  assert.equal(summarize(day({ wind: 31 })).windy, false)
  assert.equal(summarize(day({ wind: 32 })).windy, true)
})

test('rain advice mentions suede', () => {
  const s = summarize(day({ rainChance: 70 }))
  assert.ok(s.advice.some((a) => /suede/.test(a)))
})

test('typical forecast is labelled and uses the month', () => {
  const nov = typicalForecast('2026-11-20')
  assert.equal(nov.typical, true)
  assert.equal(nov.high, 12)
  assert.equal(nov.low, 4)
  assert.equal(typicalForecast('2026-07-04').high, 28)
})

test('weather codes have plain labels', () => {
  assert.equal(weatherLabel(0), 'Clear')
  assert.equal(weatherLabel(63), 'Rain')
  assert.equal(weatherLabel(73), 'Snow')
  assert.equal(weatherLabel(96), 'Thunderstorms')
})

test('forecast url asks for Boston in Celsius and km/h', () => {
  const u = new URL(forecastUrl())
  assert.equal(u.searchParams.get('temperature_unit'), 'celsius')
  assert.equal(u.searchParams.get('wind_speed_unit'), 'kmh')
  assert.equal(u.searchParams.get('timezone'), 'America/New_York')
  assert.ok(u.searchParams.get('latitude')?.startsWith('42.36'))
})
