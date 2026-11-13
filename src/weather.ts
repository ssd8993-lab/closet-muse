// Forecast loading and the "what does this weather mean for dressing" rules.
// Forecast source: Open-Meteo (free, no key).

export const BOSTON = { name: 'Boston, MA', latitude: 42.3601, longitude: -71.0589 }

/** Tunable cut-offs. Warmth uses the closet scale: 1 = summer, 2 = cool, 3 = cold Boston day. */
export const THRESHOLDS = {
  /** Feels-like high at or below this (°C) is a cold day: warmth 3. */
  coldFeelsHigh: 10,
  /** Feels-like high at or below this (°C) is a cool day: warmth 2. Above it: warmth 1. */
  coolFeelsHigh: 20,
  /** Rain chance (%) at or above this counts as rain likely. */
  rainChance: 40,
  /** Wind (km/h) at or above this counts as windy. */
  windKmh: 32,
}

export interface DayForecast {
  /** YYYY-MM-DD */
  date: string
  high: number
  low: number
  feelsHigh: number
  feelsLow: number
  /** Chance of rain, percent. */
  rainChance: number
  /** Top wind speed, km/h. */
  wind: number
  /** WMO weather code. */
  code: number
  /** True when this is typical weather for the month, not a real forecast. */
  typical?: boolean
}

export interface WeatherSummary {
  warmth: 1 | 2 | 3
  rainLikely: boolean
  windy: boolean
  /** Short sentences about what to wear. */
  advice: string[]
}

interface OpenMeteoDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  apparent_temperature_max: number[]
  apparent_temperature_min: number[]
  precipitation_probability_max: (number | null)[]
  wind_speed_10m_max: number[]
  weather_code: number[]
}

export function forecastUrl(days = 7): string {
  const p = new URLSearchParams({
    latitude: String(BOSTON.latitude),
    longitude: String(BOSTON.longitude),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'weather_code',
    ].join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'America/New_York',
    forecast_days: String(days),
  })
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`
}

export function parseForecast(json: { daily?: OpenMeteoDaily }): DayForecast[] {
  const d = json.daily
  if (!d || !Array.isArray(d.time)) throw new Error('Unexpected forecast format')
  return d.time.map((date, i) => ({
    date,
    high: Math.round(d.temperature_2m_max[i]),
    low: Math.round(d.temperature_2m_min[i]),
    feelsHigh: Math.round(d.apparent_temperature_max[i]),
    feelsLow: Math.round(d.apparent_temperature_min[i]),
    rainChance: Math.round(d.precipitation_probability_max[i] ?? 0),
    wind: Math.round(d.wind_speed_10m_max[i]),
    code: d.weather_code[i],
  }))
}

export async function fetchForecast(signal?: AbortSignal): Promise<DayForecast[]> {
  const res = await fetch(forecastUrl(), { signal })
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`)
  return parseForecast(await res.json())
}

// Approximate typical Boston highs and lows (°C) by month, January first.
const TYPICAL_HIGH = [3, 4, 8, 14, 19, 25, 28, 27, 23, 17, 12, 6]
const TYPICAL_LOW = [-4, -3, 1, 6, 11, 17, 20, 19, 16, 9, 4, -1]

/** Used when no forecast can be loaded: typical weather for that month. */
export function typicalForecast(date: string): DayForecast {
  const month = Number(date.slice(5, 7)) - 1
  const high = TYPICAL_HIGH[month]
  const low = TYPICAL_LOW[month]
  return {
    date,
    high,
    low,
    feelsHigh: high,
    feelsLow: low,
    rainChance: 30,
    wind: 20,
    code: 2,
    typical: true,
  }
}

export function summarize(f: DayForecast): WeatherSummary {
  const warmth: 1 | 2 | 3 =
    f.feelsHigh <= THRESHOLDS.coldFeelsHigh ? 3 : f.feelsHigh <= THRESHOLDS.coolFeelsHigh ? 2 : 1
  const rainLikely = f.rainChance >= THRESHOLDS.rainChance
  const windy = f.wind >= THRESHOLDS.windKmh

  const advice: string[] = []
  advice.push(
    warmth === 3
      ? 'Cold day: warmth 3 pieces and a warm outer layer.'
      : warmth === 2
        ? 'Cool day: warmth 2 pieces and a light layer.'
        : 'Warm day: light, warmth 1 pieces.',
  )
  if (rainLikely) advice.push('Rain is likely: prefer rain-safe pieces and skip suede shoes and bags.')
  if (windy) advice.push('Windy: favor a closed outer layer.')
  return { warmth, rainLikely, windy, advice }
}

/** Plain-words label for a WMO weather code. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed'
}
