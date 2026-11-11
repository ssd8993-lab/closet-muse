import { useEffect, useState } from 'react'
import { fetchForecast, type DayForecast } from './weather'

export type ForecastState =
  | { status: 'loading' }
  | { status: 'ready'; days: DayForecast[] }
  | { status: 'failed' }

/** Loads the 7-day Boston forecast once. */
export function useForecast(): ForecastState {
  const [state, setState] = useState<ForecastState>({ status: 'loading' })

  useEffect(() => {
    const ctrl = new AbortController()
    fetchForecast(ctrl.signal)
      .then((days) => setState({ status: 'ready', days }))
      .catch((e) => {
        if (e?.name !== 'AbortError') setState({ status: 'failed' })
      })
    return () => ctrl.abort()
  }, [])

  return state
}
