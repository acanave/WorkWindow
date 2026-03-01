import DayChip from './DayChip'

export default function AgendaStrip({
  selectedDate,
  blocks,
  cardTitleById,
  riskByCardId = {},
  onUpdateBlock,
  onDeleteBlock,
}) {
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Agenda: {selectedDate}</h3>
        <span className="text-xs text-slate-500">Day blocks</span>
      </div>
      <div className="space-y-2">
        {blocks.length === 0 && <p className="text-sm text-slate-500">No planned blocks.</p>}
        {blocks.map((block) => {
          const risk = riskByCardId[block.cardId] || null
          return (
            <div key={block.id} className="max-w-sm">
              <div className="mb-1 flex items-center gap-2">
                {risk && (
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                      risk.kind === 'overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                    title={`Due ${risk.dueDate} • ${risk.remainingPoints} pts left • ${risk.plannedBeforeDue} pts planned`}
                  >
                    {risk.kind === 'overdue' ? 'Overdue' : `Short ${risk.shortfall}pt`}
                  </span>
                )}
              </div>
              <DayChip
                block={block}
                cardTitle={cardTitleById[block.cardId] || 'Untitled'}
                onUpdate={onUpdateBlock}
                onDelete={onDeleteBlock}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
