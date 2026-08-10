import { useRef, useState } from 'react'

const SYNC_STATUS_LABELS = {
  saved: 'Synced',
  saving: 'Syncing...',
  error: 'Sync error',
}

const NAV_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'timeline', label: 'Timeline', icon: 'timeline', disabled: true },
  { id: 'cards', label: 'Cards', icon: 'cards' },
  { id: 'workloads', label: 'Workloads', icon: 'workloads', disabled: true },
  { id: 'projects', label: 'Projects', icon: 'projects', disabled: true },
  { id: 'insights', label: 'Insights', icon: 'insights', disabled: true },
]

export default function AppHeader({
  activeView = 'calendar',
  onChangeView,
  onNewCard,
  onExport,
  onImport,
  onSignOut,
  onShowCloudSetup,
  theme,
  onToggleTheme,
  userEmail,
  modeLabel,
  syncStatus = 'saved',
}) {
  const inputRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handlePickFile = () => {
    inputRef.current?.click()
  }

  const handleChangeView = (view) => {
    onChangeView?.(view)
    setMobileMenuOpen(false)
  }

  const handleNewCard = () => {
    setMobileMenuOpen(false)
    onNewCard?.()
  }

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    onImport(text)
    event.target.value = ''
  }

  return (
    <aside
      aria-label="Workspace navigation"
      className="sticky top-0 z-40 flex w-full shrink-0 flex-col border-b border-[color:var(--ww-border)] px-3 py-3 [background:var(--ww-soft-panel-bg)] md:static md:w-[224px] md:border-b-0 md:border-r md:px-4 md:py-5"
    >
      <div className="flex items-center justify-between gap-3 px-1 md:mb-8 md:justify-start">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-xl font-semibold tracking-normal text-[color:var(--ww-heading)]">WorkWindow</span>
        </div>
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="workspace-navigation-menu"
          aria-label={`${mobileMenuOpen ? 'Close' : 'Open'} navigation menu`}
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ww-button px-3 py-2 text-sm font-semibold md:hidden"
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <div
        id="workspace-navigation-menu"
        className={`${mobileMenuOpen ? 'flex' : 'hidden'} mt-4 min-h-0 flex-col md:mt-0 md:flex md:flex-1`}
      >
        <nav aria-label="Primary" className="grid grid-cols-2 gap-2 md:block md:space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => handleChangeView(item.id)}
                className={`${item.disabled ? 'hidden md:flex' : 'flex'} w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  active
                    ? 'border border-[color:var(--ww-accent-border)] bg-[color:var(--ww-accent-soft)] text-[color:var(--ww-accent)]'
                    : item.disabled
                      ? 'cursor-not-allowed text-slate-400'
                      : 'border border-transparent text-[color:var(--ww-muted)] hover:border-[color:var(--ww-border-soft)] hover:bg-[color:var(--ww-panel-bg)] hover:text-[color:var(--ww-heading)]'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] ${
                    active
                      ? 'border-[color:var(--ww-accent-border)] bg-[color:var(--ww-panel-bg)] text-[color:var(--ww-accent)]'
                      : 'border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] text-[color:var(--ww-muted)]'
                  }`}
                >
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-4 border-t border-[color:var(--ww-border)] pt-4 md:mt-7 md:pt-5">
          <button
            type="button"
            onClick={handleNewCard}
            className="ww-button ww-button-primary w-full px-3 py-2.5 text-sm font-semibold"
          >
            New Work Item
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePickFile}
              className="ww-button px-2 py-2 text-xs text-[color:var(--ww-muted)]"
            >
              Import
            </button>
            <button
              type="button"
              onClick={onExport}
              className="ww-button px-2 py-2 text-xs text-[color:var(--ww-muted)]"
            >
              Export
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[color:var(--ww-border)] pt-4 md:mt-auto md:block md:space-y-3 md:pt-5">
          <NavUtilityButton label="Settings" onClick={onToggleTheme} detail={theme === 'dark' ? 'Light' : 'Dark'} />
          {onShowCloudSetup && <NavUtilityButton label="Cloud setup" onClick={onShowCloudSetup} detail={modeLabel} />}
          {userEmail && (
            <div className="rounded-lg border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-3 text-xs text-[color:var(--ww-muted)]">
              <div
                className={`mb-1 inline-flex rounded-full px-2 py-0.5 font-medium ${
                  syncStatus === 'error'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
                }`}
              >
                {SYNC_STATUS_LABELS[syncStatus] || SYNC_STATUS_LABELS.saved}
              </div>
              <div className="truncate">{userEmail}</div>
            </div>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="ww-button w-full px-3 py-2 text-sm font-medium text-[color:var(--ww-muted)]"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

function BrandMark() {
  return (
    <div className="relative h-8 w-9">
      <span className="absolute left-0 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-blue-500" />
      <span className="absolute left-3 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-cyan-400" />
      <span className="absolute left-6 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-violet-500" />
    </div>
  )
}

function NavIcon({ name }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      {name === 'calendar' && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="3" {...common} />
          <path d="M8 3v4M16 3v4M4 10h16" {...common} />
        </>
      )}
      {name === 'timeline' && (
        <>
          <path d="M5 7h8M5 17h14M11 12h8" {...common} />
          <circle cx="17" cy="7" r="2" {...common} />
          <circle cx="7" cy="12" r="2" {...common} />
        </>
      )}
      {name === 'cards' && (
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" {...common} />
          <rect x="13" y="4" width="7" height="7" rx="2" {...common} />
          <rect x="4" y="13" width="7" height="7" rx="2" {...common} />
          <rect x="13" y="13" width="7" height="7" rx="2" {...common} />
        </>
      )}
      {name === 'workloads' && (
        <>
          <path d="M5 19V9M12 19V5M19 19v-7" {...common} />
          <path d="M4 19h16" {...common} />
        </>
      )}
      {name === 'projects' && (
        <>
          <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" {...common} />
          <path d="M4 9V6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1" {...common} />
        </>
      )}
      {name === 'insights' && (
        <>
          <path d="M5 16c3-7 6-7 9-3 2 3 3 3 5-2" {...common} />
          <path d="M5 20h14" {...common} />
        </>
      )}
    </svg>
  )
}

function NavUtilityButton({ label, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[color:var(--ww-muted)] hover:border-[color:var(--ww-border-soft)] hover:bg-[color:var(--ww-panel-bg)] hover:text-[color:var(--ww-heading)]"
    >
      <span>{label}</span>
      {detail && <span className="text-xs text-[color:var(--ww-muted)]">{detail}</span>}
    </button>
  )
}
