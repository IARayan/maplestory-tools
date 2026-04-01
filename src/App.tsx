import { useState } from 'react'
import { BatchCalculator } from './components/BatchCalculator'
import { StarForceSimulator } from './components/StarForceSimulator'
import './App.css'

type Tab = 'sim' | 'calc'

function App() {
  const [tab, setTab] = useState<Tab>('sim')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo" aria-hidden />
          <div>
            <h1>Dripyn&apos;s Maplestory Tools</h1>
            <p className="app-tag">
              Fingers itching? Wanna boom your gear like MasterOhad13 did? Simulate
              it here first. Live GMS item search, real icons, and normal gear up
              to 30★.
            </p>
          </div>
        </div>
        <nav className="app-tabs" aria-label="Main">
          <button
            type="button"
            className={tab === 'sim' ? 'active' : ''}
            onClick={() => setTab('sim')}
          >
            Simulator
          </button>
          <button
            type="button"
            className={tab === 'calc' ? 'active' : ''}
            onClick={() => setTab('calc')}
          >
            Calculator
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'sim' ? <StarForceSimulator /> : <BatchCalculator />}
      </main>

      <footer className="app-foot">
        Fan tool. Normal-equipment rules are aligned to current GMS references;
        superior gear is surfaced but not fully specialized yet.
      </footer>
    </div>
  )
}

export default App
