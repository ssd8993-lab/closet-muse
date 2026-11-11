import { useState } from 'react'
import Closet from './Closet'
import Today from './Today'
import { useCloset } from './useCloset'

type View = 'today' | 'closet'

export default function App() {
  const { pieces, error } = useCloset()
  const [view, setView] = useState<View>('today')

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
        </nav>
      </header>

      {view === 'today' ? <Today /> : <Closet pieces={pieces} error={error} />}
    </main>
  )
}
