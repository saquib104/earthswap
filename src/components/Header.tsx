import { ConnectKitButton } from 'connectkit'
import { Zap, Droplets, Activity, TrendingUp, BookOpen, Home, Menu, X, ArrowLeftRight, BarChart2 } from 'lucide-react'
import { useState } from 'react'
import { EarthSwapLogo, EarthSwapWordmark } from './Logo'

type Tab = 'home' | 'trade' | 'bridge' | 'markets' | 'pools' | 'activity' | 'analytics' | 'docs'

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: 'home',      icon: <Home className="size-4.5" strokeWidth={2.2} />,          label: 'Home'     },
  { tab: 'trade',     icon: <Zap className="size-4.5" strokeWidth={2.2} />,           label: 'Trade'    },
  { tab: 'bridge',    icon: <ArrowLeftRight className="size-4.5" strokeWidth={2.2} />,label: 'Bridge'   },
  { tab: 'markets',   icon: <TrendingUp className="size-4.5" strokeWidth={2.2} />,    label: 'Markets'  },
  { tab: 'pools',     icon: <Droplets className="size-4.5" strokeWidth={2.2} />,      label: 'Pools'    },
  { tab: 'activity',  icon: <Activity className="size-4.5" strokeWidth={2.2} />,      label: 'Activity' },
  { tab: 'analytics', icon: <BarChart2 className="size-4.5" strokeWidth={2.2} />,     label: 'Analytics'},
  { tab: 'docs',      icon: <BookOpen className="size-4.5" strokeWidth={2.2} />,      label: 'Docs'     },
]

// All 8 tabs for mobile — split into two rows of 4
const MOBILE_ROW1 = NAV_ITEMS.slice(0, 4)
const MOBILE_ROW2 = NAV_ITEMS.slice(4)

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-6"
        style={{
          background: 'rgba(3, 12, 6, 0.88)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(52,211,153,0.18)',
          boxShadow: '0 1px 0 rgba(52,211,153,0.08)',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <EarthSwapLogo size={34} />
          <EarthSwapWordmark className="text-lg" />
          <span
            className="hidden sm:inline rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--accent)' }}
          >
            Arc
          </span>
        </button>

        {/* Desktop nav — larger, bolder icons + labels */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(({ tab, icon, label }) => (
            <TabButton
              key={tab}
              icon={icon}
              label={label}
              active={activeTab === tab}
              onClick={() => onTabChange(tab)}
            />
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ConnectKitButton.Custom>
            {({ isConnected, show, address, truncatedAddress }) => (
              <button
                onClick={show}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${isConnected ? '' : 'btn-accent'}`}
                style={
                  isConnected
                    ? { background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.25)', color: 'var(--ink)' }
                    : {}
                }
              >
                {isConnected ? (truncatedAddress ?? address?.slice(0, 6) + '...' + address?.slice(-4)) : 'Connect Wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="flex size-9 items-center justify-center rounded-xl lg:hidden"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            {mobileMenuOpen
              ? <X className="size-5" style={{ color: 'var(--ink)' }} />
              : <Menu className="size-5" style={{ color: 'var(--ink)' }} />
            }
          </button>
        </div>
      </header>

      {/* Mobile dropdown — full list */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden sticky top-[57px] z-30 px-4 py-3 space-y-1"
          style={{
            background: 'rgba(3,14,8,0.97)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {NAV_ITEMS.map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => { onTabChange(tab); setMobileMenuOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={
                activeTab === tab
                  ? { background: 'rgba(45,212,191,0.12)', color: 'var(--accent)', borderLeft: '3px solid var(--accent)' }
                  : { color: 'var(--muted)' }
              }
            >
              <span className="size-5 flex items-center justify-center">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function TabButton({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:scale-[1.03]"
      style={
        active
          ? {
              background: 'rgba(45,212,191,0.14)',
              color: 'var(--accent)',
              borderBottom: '2px solid var(--accent)',
              boxShadow: '0 0 12px rgba(45,212,191,0.18)',
            }
          : {
              color: 'var(--muted)',
              borderBottom: '2px solid transparent',
            }
      }
    >
      <span
        className="flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
      >
        {icon}
      </span>
      {label}
    </button>
  )
}

// Mobile bottom nav — two rows so all 8 tabs fit above the Netlify/browser bar
export function MobileNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col lg:hidden"
      style={{
        background: 'rgba(2,10,5,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(52,211,153,0.18)',
        /* push content above browser chrome / Netlify bar */
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      {/* Row 1 */}
      <div className="flex">
        {MOBILE_ROW1.map(({ tab, icon, label }) => (
          <MobileNavBtn
            key={tab}
            tab={tab}
            icon={icon}
            label={label}
            active={activeTab === tab}
            onTabChange={onTabChange}
          />
        ))}
      </div>
      {/* Row 2 */}
      <div className="flex border-t" style={{ borderColor: 'rgba(52,211,153,0.10)' }}>
        {MOBILE_ROW2.map(({ tab, icon, label }) => (
          <MobileNavBtn
            key={tab}
            tab={tab}
            icon={icon}
            label={label}
            active={activeTab === tab}
            onTabChange={onTabChange}
          />
        ))}
      </div>
    </nav>
  )
}

function MobileNavBtn({
  tab, icon, label, active, onTabChange,
}: {
  tab: Tab
  icon: React.ReactNode
  label: string
  active: boolean
  onTabChange: (tab: Tab) => void
}) {
  return (
    <button
      onClick={() => onTabChange(tab)}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold transition-all active:scale-95"
      style={{
        color: active ? 'var(--accent)' : 'var(--subtle)',
        background: active ? 'rgba(45,212,191,0.07)' : 'transparent',
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          color: active ? 'var(--accent)' : 'var(--subtle)',
          filter: active ? 'drop-shadow(0 0 6px rgba(45,212,191,0.6))' : 'none',
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: '10px', letterSpacing: '0.02em' }}>{label}</span>
    </button>
  )
}
