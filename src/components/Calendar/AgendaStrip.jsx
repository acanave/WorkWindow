import DayChip from './DayChip'

export default function AgendaStrip({
  selectedDate,
  anchors = [],
  blocks,
  cardMetaById,
  riskByCardId = {},
  onUpdateBlock,
  onDeleteBlock,
}) {
  const totalPoints = blocks.reduce((sum, block) => sum + block.points, 0)
  const primaryAnchor = anchors[0] || null
  const primaryAnchorMeta = primaryAnchor ? cardMetaById[primaryAnchor.cardId] || {} : null

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-950">{selectedDate}</h3>
        <span className="text-xl text-slate-400">x</span>
      </div>

      {primaryAnchor && (
        <div
          className={`mb-5 rounded-lg border p-4 ${
            primaryAnchor.accent?.anchor || 'border-blue-600 bg-blue-600 text-white'
          }`}
        >
          <p className="text-center text-xs font-bold uppercase tracking-wide opacity-90">Anchor Task</p>
          <p className="mt-1 text-xl font-bold">{primaryAnchorMeta.title || 'Untitled'}</p>
          <p className="mt-3 text-sm opacity-90">Deadline: {primaryAnchor.date}</p>
        </div>
      )}

      {anchors.length > 1 && (
        <div className="mb-5 space-y-2">
          {anchors.slice(1).map((anchor) => {
            const meta = cardMetaById[anchor.cardId] || {}
            return (
              <div
                key={anchor.id}
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  anchor.accent?.anchor || 'border-slate-900 bg-slate-900 text-white'
                }`}
              >
                Anchor: {meta.title || 'Untitled'}
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-950">Work Window</h4>
          <span className="text-sm font-bold text-blue-600">
            {blocks.length} item{blocks.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="space-y-2">
          {anchors.length === 0 && blocks.length === 0 && (
            <p className="text-sm text-slate-500">No work windows or anchors.</p>
          )}
          {blocks.map((block) => {
            const risk = riskByCardId[block.cardId] || null
            const meta = cardMetaById[block.cardId] || {}
            return (
              <div key={block.id}>
                <div className="mb-1 flex items-center gap-2">
                  {risk && (
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        risk.kind === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'
                      }`}
                      title={`Due ${risk.dueDate} • ${risk.remainingPoints} pts left • ${risk.plannedBeforeDue} pts planned`}
                    >
                      {risk.kind === 'overdue' ? 'Overdue' : `Short ${risk.shortfall}pt`}
                    </span>
                  )}
                </div>
                <DayChip
                  block={block}
                  cardTitle={meta.title || 'Untitled'}
                  accent={block.accent}
                  onUpdate={onUpdateBlock}
                  onDelete={onDeleteBlock}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-slate-950">True Time Footprint</p>
          <p className="text-lg font-bold text-blue-600">{totalPoints}pt</p>
        </div>
        <p className="mt-1 text-sm text-slate-500">{Math.max(0.5, totalPoints / 8).toFixed(1)} days of real work</p>
      </div>
    </aside>
  )
}
