import { useState } from 'react'
import History from './History'
import { addEntry, loadLog, removeEntry, saveLog, type WearEntry } from './wearLog'
import Closet from './Closet'
import Today from './Today'
import { useCloset } from './useCloset'

type View = 'today' | 'closet' | 'history'

export default function App() {
  const { pieces, error } = useCloset()
  const [view, setView] = useState<View>('today')
  const [log, setLog] = useState<WearEntry[]>(() => loadLog())
  const update = (next: WearEntry[]) => {
    setLog(next)
    saveLog(next)
  }

  return (
    <main className="page">
      <header className="top">
        <h1>Closet Muse</h1>
        <nav className="tabs" aria-label="Main">
          <button className={view === 'today' ? 'tab on' : 'tab'} aria-current={view === 'today' ? 'page' : undefined} onClick={() => setView('today')}>
            Today
          </button>
          <button className={view === 'closet' ? 'tab on' : 'tab'} aria-current={view === 'closet' ? 'page' : undefined} onClick={() => setView('closet')}>
            Closet
          </button>
          <button className={view === 'history' ? 'tab on' : 'tab'} aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')}>
            History
          </button>
        </nav>
      </header>

      {view === 'today' && <Today log={log} onWear={(e) => update(addEntry(log, e))} />}
      {view === 'closet' && <Closet pieces={pieces} error={error} />}
      {view === 'history' && <History log={log} pieces={pieces} onRemove={(id) => update(removeEntry(log, id))} />}
    </main>
  )
}
