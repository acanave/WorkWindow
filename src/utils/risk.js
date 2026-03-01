import { formatDateKey } from './date'

export function buildRiskByCardId(cards, todayDateKey = formatDateKey(new Date())) {
  const byId = {}

  cards.forEach((card) => {
    byId[card.id] = getCardRisk(card, todayDateKey)
  })

  return byId
}

export function getCardRisk(card, todayDateKey = formatDateKey(new Date())) {
  const remainingPoints = Math.max(0, card.estimate_points - card.completed_points)

  if (!card.due_date || remainingPoints <= 0 || card.status === 'Done') {
    return null
  }

  const plannedBeforeDue = card.planned_day_blocks.reduce((sum, block) => {
    if (block.date <= card.due_date) return sum + block.points
    return sum
  }, 0)

  const shortfall = Math.max(0, remainingPoints - plannedBeforeDue)

  if (card.due_date < todayDateKey) {
    return {
      kind: 'overdue',
      dueDate: card.due_date,
      remainingPoints,
      plannedBeforeDue,
      shortfall,
    }
  }

  if (shortfall > 0) {
    return {
      kind: 'at_risk',
      dueDate: card.due_date,
      remainingPoints,
      plannedBeforeDue,
      shortfall,
    }
  }

  return null
}
