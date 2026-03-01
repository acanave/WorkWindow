export function buildDependencyInsights(cards) {
  const cardById = Object.fromEntries(cards.map((card) => [card.id, card]))
  const dependentsByCardId = Object.fromEntries(cards.map((card) => [card.id, []]))

  cards.forEach((card) => {
    card.dependencies.forEach((depId) => {
      if (!dependentsByCardId[depId]) return
      dependentsByCardId[depId].push(card.id)
    })
  })

  const unresolvedIdsByCardId = {}
  const blockedByByCardId = {}

  cards.forEach((card) => {
    const unresolvedIds = card.dependencies.filter((depId) => {
      const dep = cardById[depId]
      return dep && dep.status !== 'Done'
    })
    unresolvedIdsByCardId[card.id] = unresolvedIds
    blockedByByCardId[card.id] = unresolvedIds.map((depId) => cardById[depId]).filter(Boolean)
  })

  const chainMemo = new Map()
  const stack = new Set()

  function getLongestUnresolvedChain(cardId) {
    if (chainMemo.has(cardId)) return chainMemo.get(cardId)
    if (stack.has(cardId)) {
      return { path: [cardId], hasCycle: true }
    }

    stack.add(cardId)
    const unresolvedIds = unresolvedIdsByCardId[cardId] || []
    let best = { path: [cardId], hasCycle: false }

    unresolvedIds.forEach((depId) => {
      const child = getLongestUnresolvedChain(depId)
      const candidate = {
        path: [cardId, ...child.path],
        hasCycle: child.hasCycle,
      }

      if (candidate.path.length > best.path.length) {
        best = candidate
      } else if (candidate.path.length === best.path.length && candidate.hasCycle && !best.hasCycle) {
        best = candidate
      }
    })

    stack.delete(cardId)
    chainMemo.set(cardId, best)
    return best
  }

  const unresolvedCountByCardId = {}
  const chainDepthByCardId = {}
  const chainByCardId = {}
  const hasCycleByCardId = {}

  cards.forEach((card) => {
    const unresolvedIds = unresolvedIdsByCardId[card.id] || []
    unresolvedCountByCardId[card.id] = unresolvedIds.length
    const chain = getLongestUnresolvedChain(card.id)
    chainByCardId[card.id] = chain.path
    chainDepthByCardId[card.id] = Math.max(0, chain.path.length - 1)
    hasCycleByCardId[card.id] = chain.hasCycle
  })

  return {
    cardById,
    dependentsByCardId,
    blockedByByCardId,
    unresolvedCountByCardId,
    chainByCardId,
    chainDepthByCardId,
    hasCycleByCardId,
  }
}
