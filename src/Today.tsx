import { useMemo, useState } from 'react'
import { DAY_TYPES } from './dayTypes'
import { useForecast } from './useForecast'
import { BOSTON, summarize, typicalForecast, weatherLabel, type DayForecast } from './weather'

/** Local calendar date as YYYY-MM-DD. */
function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Today() {
  const forecast = useForecast()
  const [selected, setSelected] = useState(0)
  const [dayType, setDayType] = useState<string | null>(null)

  const today = isoDate(new Date())

  // Real forecast days when we have them; otherwise just today, with typical weather.
  const days: DayForecast[] = useMemo(
    () => (forecast.status === 'ready' ? forecast.days : [typicalForecast(today)]),
    [forecast, today],
  )
  const day = days[Math.min(selected, days.length - 1)]
  const summary = summarize(day)
  const dayTypeLabel = DAY_TYPES.find((d) => d.id === dayType)?.label

  return (
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="section">Today</h2>

      {forecast.status === 'loading' && <p className="notice">Loading the {BOSTON.name} forecast…</p>}
      {forecast.status === 'failed' && (
        <p className="notice" role="status">
          Couldn't load the forecast, so this plans for typical {BOSTON.name} weather this month.
        </p>
      )}

      {forecast.status !== 'loading' && (
        <>
          {days.length > 1 && (
            <div className="chips" role="group" aria-label="Day">
              {days.map((d, i) => (
                <button
                  key={d.date}
                  className={i === selected ? 'chip on' : 'chip'}
                  aria-pressed={i === selected}
                  onClick={() => setSelected(i)}
                >
                  {dayLabel(d.date, i)}
                </button>
              ))}
            </div>
          )}

          <article className="weather" aria-label={`Weather for ${BOSTON.name}`}>
            <div className="temps">
              <span className="big">{day.high}°</span>
              <span className="lo">low {day.low}°</span>
            </div>
            <dl className="facts">
              <div><dt>Sky</dt><dd>{day.typical ? 'Typical for the month' : weatherLabel(day.code)}</dd></div>
              <div><dt>Feels like</dt><dd>{day.feelsLow}° to {day.feelsHigh}°</dd></div>
              <div><dt>Rain chance</dt><dd>{day.rainChance}%</dd></div>
              <div><dt>Wind</dt><dd>up to {day.wind} mph</dd></div>
            </dl>
            <ul className="advice">
              {summary.advice.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </article>

          <h3 className="sub-heading">What kind of day is it?</h3>
          <div className="chips" role="group" aria-label="Kind of day">
            {DAY_TYPES.map((t) => (
              <button
                key={t.id}
                className={t.id === dayType ? 'chip on' : 'chip'}
                aria-pressed={t.id === dayType}
                onClick={() => setDayType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="notice">
            {dayTypeLabel
              ? `${dayTypeLabel}, warmth ${summary.warmth}${summary.rainLikely ? ', rain-safe only' : ''}. Outfits are the next piece to build.`
              : 'Pick a kind of day. Outfits are the next piece to build.'}
          </p>
        </>
      )}
    </section>
  )
}
