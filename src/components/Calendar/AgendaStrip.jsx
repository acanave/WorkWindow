import DayChip from './DayChip'

export default function AgendaStrip({ selectedDate, blocks, cardTitleById, onUpdateBlock, onDeleteBlock }) {
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Agenda: {selectedDate}</h3>
        <span className="text-xs text-slate-500">Day blocks</span>
      </div>
      <div className="space-y-2">
        {blocks.length === 0 && <p className="text-sm text-slate-500">No planned blocks.</p>}
        {blocks.map((block) => (
          <div key={block.id} className="max-w-sm">
            <DayChip
              block={block}
              cardTitle={cardTitleById[block.cardId] || 'Untitled'}
              onUpdate={onUpdateBlock}
              onDelete={onDeleteBlock}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
