import { useState } from 'react'
import { Header, MobileNav } from './components/Header'
import { FluidBackground } from './components/FluidBackground'
import { WaterCursor } from './components/WaterCursor'
import { HomeView } from './components/HomeView'
import { SwapCard } from './components/SwapCard'
import { MarketsView } from './components/MarketsView'
import { PoolsView } from './components/PoolsView'
import { ActivityView } from './components/ActivityView'
import { StatsView } from './components/StatsView'
import { DocsView } from './components/DocsView'
import { BridgeView } from './components/BridgeView'

type Tab = 'home' | 'trade' | 'bridge' | 'markets' | 'pools' | 'activity' | 'analytics' | 'docs'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <FluidBackground />
      <WaterCursor />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main>
        {/* Home: hero is full-bleed, inner sections are contained */}
        {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}

        {/* All other tabs: standard centred container */}
        {activeTab !== 'home' && (
          <div className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:pb-8">
            {activeTab === 'trade'    && <SwapCard />}
            {activeTab === 'bridge'   && <BridgeView />}
            {activeTab === 'markets'  && <MarketsView />}
            {activeTab === 'pools'    && <PoolsView />}
            {activeTab === 'activity' && <ActivityView />}
            {activeTab === 'analytics'&& <StatsView />}
            {activeTab === 'docs'     && <DocsView />}
          </div>
        )}
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
