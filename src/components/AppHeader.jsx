import { useRef } from 'react'

const SYNC_STATUS_LABELS = {
  saved: 'Synced',
  saving: 'Syncing...',
  error: 'Sync error',
}

const NAV_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: 'Cal' },
  { id: 'timeline', label: 'Timeline', icon: 'Line', disabled: true },
  { id: 'cards', label: 'Cards', icon: 'Grid' },
  { id: 'workloads', label: 'Workloads', icon: 'Load', disabled: true },
  { id: 'projects', label: 'Projects', icon: 'Proj', disabled: true },
  { id: 'insights', label: 'Insights', icon: 'Bars', disabled: true },
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

  const handlePickFile = () => {
    inputRef.current?.click()
  }

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    onImport(text)
    event.target.value = ''
  }

  return (
    <aside className="flex w-[224px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5">
      <div className="mb-8 flex items-center gap-3 px-1">
        <BrandMark />
        <span className="text-xl font-bold tracking-normal text-slate-950">WorkWindow</span>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onChangeView?.(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : item.disabled
                    ? 'cursor-not-allowed text-slate-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] ${
                  active ? 'border-blue-200 bg-white text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-7 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onNewCard}
          className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          New Work Item
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePickFile}
            className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Import
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Export
          </button>
        </div>
        <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={handleImportChange} />
      </div>

      <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
        <NavUtilityButton label="Settings" onClick={onToggleTheme} detail={theme === 'dark' ? 'Light' : 'Dark'} />
        {onShowCloudSetup && <NavUtilityButton label="Cloud setup" onClick={onShowCloudSetup} detail={modeLabel} />}
        {userEmail && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <div
              className={`mb-1 inline-flex rounded-full px-2 py-0.5 font-medium ${
                syncStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign Out
          </button>
        )}
      </div>
    </aside>
  )
}

function BrandMark() {
  return (
    <div className="relative h-8 w-9">
      <span className="absolute left-0 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-blue-600" />
      <span className="absolute left-3 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-sky-500" />
      <span className="absolute left-6 top-1 h-7 w-2.5 rotate-[-25deg] rounded-full bg-fuchsia-600" />
    </div>
  )
}

function NavUtilityButton({ label, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    >
      <span>{label}</span>
      {detail && <span className="text-xs text-slate-400">{detail}</span>}
    </button>
  )
}
