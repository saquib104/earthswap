import { ConnectKitButton } from 'connectkit'
import { Zap, Droplets, Activity, TrendingUp, BookOpen, Home, Menu, X, ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { EarthSwapLogo, EarthSwapWordmark } from './Logo'

type Tab = 'home' | 'trade' | 'bridge' | 'markets' | 'pools' | 'activity' | 'analytics' | 'docs'

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: 'home',     icon: <Home className="size-3.5" />,      label: 'Home'     },
  { tab: 'trade',    icon: <Zap className="size-3.5" />,            label: 'Trade'    },
  { tab: 'bridge',   icon: <ArrowLeftRight className="size-3.5" />, label: 'Bridge'   },
  { tab: 'markets',  icon: <TrendingUp className="size-3.5" />,     label: 'Markets'  },
  { tab: 'pools',    icon: <Droplets className="size-3.5" />,  label: 'Pools'    },
  { tab: 'activity', icon: <Activity className="size-3.5" />,  label: 'Activity' },
  { tab: 'docs',     icon: <BookOpen className="size-3.5" />,  label: 'Docs'     },
]

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-6"
        style={{
          background: 'rgba(3, 12, 6, 0.82)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(52,211,153,0.16)',
          boxShadow: '0 1px 0 rgba(52,211,153,0.07)',
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
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

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="flex size-9 items-center justify-center rounded-xl lg:hidden"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            {mobileMenuOpen
              ? <X className="size-4" style={{ color: 'var(--ink)' }} />
              : <Menu className="size-4" style={{ color: 'var(--ink)' }} />
            }
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
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
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              style={
                activeTab === tab
                  ? { background: 'var(--surface-strong)', color: 'var(--ink)' }
                  : { color: 'var(--subtle)' }
              }
            >
              {icon}
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
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
      style={
        active
          ? { background: 'rgba(45,212,191,0.12)', color: 'var(--accent)', borderBottom: '2px solid var(--accent)' }
          : { color: 'var(--subtle)' }
      }
    >
      {icon}
      {label}
    </button>
  )
}

// Keep MobileNav for bottom bar (optional, can be removed since we now have header hamburger)
export function MobileNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const bottomItems = [
    { tab: 'home' as Tab,     icon: <Home className="size-5" />,            label: 'Home'     },
    { tab: 'trade' as Tab,    icon: <Zap className="size-5" />,             label: 'Trade'    },
    { tab: 'bridge' as Tab,   icon: <ArrowLeftRight className="size-5" />,  label: 'Bridge'   },
    { tab: 'markets' as Tab,  icon: <TrendingUp className="size-5" />,      label: 'Markets'  },
    { tab: 'pools' as Tab,    icon: <Droplets className="size-5" />,        label: 'Pools'    },
  ]
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden"
      style={{
        background: 'rgba(2,10,5,0.92)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {bottomItems.map(({ tab, icon, label }) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
          style={{ color: activeTab === tab ? 'var(--accent)' : 'var(--subtle)' }}
        >
          {icon}
          {label}
        </button>
      ))}
    </nav>
  )
}
