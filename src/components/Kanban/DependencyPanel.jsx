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
    <section className="rounded-lg border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[color:var(--ww-heading)]">Dependency Graph</h3>
        <span className="text-xs text-[color:var(--ww-muted)]">Live blockers and dependents</span>
      </div>

      {cardsWithDependencies.length === 0 && (
        <p className="text-sm text-[color:var(--ww-muted)]">No dependency links yet.</p>
      )}

      <div className="space-y-2">
        {cardsWithDependencies.map((card) => {
          const blockers = blockedByByCardId[card.id] || []
          const dependentIds = dependentsByCardId[card.id] || []
          const chain = (chainByCardId[card.id] || []).map((id) => cardById[id]?.title || 'Unknown')

          return (
            <article
              key={card.id}
              className="rounded border border-[color:var(--ww-border-soft)] bg-[color:var(--ww-soft-panel-bg)] p-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCard(card.id)}
                  className="truncate text-left text-sm font-semibold text-[color:var(--ww-heading)] hover:underline"
                >
                  {card.title}
                </button>
                <span className="rounded bg-[color:var(--ww-panel-bg)] px-2 py-0.5 text-xs text-[color:var(--ww-muted)]">
                  {unresolvedCountByCardId[card.id] || 0} unresolved
                </span>
              </div>

              {blockers.length > 0 && (
                <p className="text-xs text-[color:var(--ww-text)]">
                  Blocked by: {blockers.map((dep) => dep.title).join(', ')}
                </p>
              )}

              {dependentIds.length > 0 && (
                <p className="text-xs text-[color:var(--ww-text)]">
                  Blocking: {dependentIds.map((id) => cardById[id]?.title || 'Unknown').join(', ')}
                </p>
              )}

              {chain.length > 1 && (
                <p className="mt-1 text-xs text-[color:var(--ww-muted)]">Chain: {chain.join(' -> ')}</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
