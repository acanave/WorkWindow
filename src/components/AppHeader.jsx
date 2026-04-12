import { useRef } from 'react'

const SYNC_STATUS_LABELS = {
  saved: 'Synced',
  saving: 'Syncing...',
  error: 'Sync error',
}

export default function AppHeader({
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
    <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">WorkWindow</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {modeLabel && (
            <span className="mr-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {modeLabel}
            </span>
          )}
          {userEmail && (
            <div className="mr-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span
                className={`rounded-full px-2 py-1 font-medium ${
                  syncStatus === 'error'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                }`}
              >
                {SYNC_STATUS_LABELS[syncStatus] || SYNC_STATUS_LABELS.saved}
              </span>
              <span className="max-w-[220px] truncate">{userEmail}</span>
            </div>
          )}
          <button
            onClick={onToggleTheme}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
          <button
            onClick={onNewCard}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            New Card
          </button>
          <button
            onClick={onExport}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Export JSON
          </button>
          <button
            onClick={handlePickFile}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Import JSON
          </button>
          {onShowCloudSetup && (
            <button
              onClick={onShowCloudSetup}
              className="rounded-md border border-cyan-300 px-3 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/40"
            >
              Cloud Setup
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign Out
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      </div>
    </header>
  )
}
