import { useMemo, useState } from 'react'
import { DAY_TYPES } from './dayTypes'
import Outfits from './Outfits'
import type { WearEntry } from './wearLog'
import type { DayContext } from './engine/index'
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

export default function Today({ log, onWear }: { log: WearEntry[]; onWear: (e: Omit<WearEntry, 'id'>) => void }) {
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
  const dt = DAY_TYPES.find((d) => d.id === dayType)
  const ctx: DayContext | null = useMemo(
    () => dt ? {
      warmth: summary.warmth, rainLikely: summary.rainLikely, windy: summary.windy, formality: dt.formality,
      dayTypeId: dt.id, dayLabel: dayLabel(day.date, selected), date: day.date, temp: day.high,
      sky: day.typical ? 'typical for the month' : weatherLabel(day.code).toLowerCase(),
    } : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dt, summary.warmth, summary.rainLikely, summary.windy, day.date, day.high, day.code, day.typical, selected],
  )

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

          {dayType ? <Outfits ctx={ctx!} log={log} onWear={onWear} /> : <p className="notice">Pick a kind of day to see outfits.</p>}
        </>
      )}
    </section>
  )
}
