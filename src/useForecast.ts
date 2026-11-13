import { useEffect, useState } from 'react'
import type { Place } from './places'
import { fetchForecast, type DayForecast } from './weather'

export type ForecastState =
  | { status: 'loading' }
  | { status: 'ready'; days: DayForecast[] }
  | { status: 'failed' }

/** Loads the 7-day forecast for a place. Change `attempt` to try again. */
export function useForecast(place: Place, attempt = 0): ForecastState {
  const [state, setState] = useState<ForecastState>({ status: 'loading' })

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    fetchForecast(place, ctrl.signal)
      .then((days) => setState({ status: 'ready', days }))
      .catch((e) => {
        if (e?.name !== 'AbortError') setState({ status: 'failed' })
      })
    return () => ctrl.abort()
  }, [place, attempt])

  return state
}
