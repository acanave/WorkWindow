export default function DependencyPanel({ cards, dependencyInsights, onOpenCard }) {
  const { blockedByByCardId, dependentsByCardId, unresolvedCountByCardId, chainByCardId, cardById } = dependencyInsights

  const cardsWithDependencies = cards
    .filter((card) => (card.dependencies?.length || 0) > 0 || (dependentsByCardId[card.id] || []).length > 0)
    .sort((a, b) => {
      const unresolvedDiff = (unresolvedCountByCardId[b.id] || 0) - (unresolvedCountByCardId[a.id] || 0)
      if (unresolvedDiff !== 0) return unresolvedDiff
      return a.title.localeCompare(b.title)
    })

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Dependency Graph</h3>
        <span className="text-xs text-slate-500">Live blockers and dependents</span>
      </div>

      {cardsWithDependencies.length === 0 && <p className="text-sm text-slate-500">No dependency links yet.</p>}

      <div className="space-y-2">
        {cardsWithDependencies.map((card) => {
          const blockers = blockedByByCardId[card.id] || []
          const dependentIds = dependentsByCardId[card.id] || []
          const chain = (chainByCardId[card.id] || []).map((id) => cardById[id]?.title || 'Unknown')

          return (
            <article key={card.id} className="rounded border border-slate-200 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCard(card.id)}
                  className="truncate text-left text-sm font-semibold text-slate-900 hover:underline"
                >
                  {card.title}
                </button>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {unresolvedCountByCardId[card.id] || 0} unresolved
                </span>
              </div>

              {blockers.length > 0 && (
                <p className="text-xs text-slate-700">Blocked by: {blockers.map((dep) => dep.title).join(', ')}</p>
              )}

              {dependentIds.length > 0 && (
                <p className="text-xs text-slate-700">
                  Blocking: {dependentIds.map((id) => cardById[id]?.title || 'Unknown').join(', ')}
                </p>
              )}

              {chain.length > 1 && <p className="mt-1 text-xs text-slate-600">Chain: {chain.join(' -> ')}</p>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
