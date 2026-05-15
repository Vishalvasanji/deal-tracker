import Link from 'next/link'
import { STAGES, type Deal } from '@/lib/db/schema'
import { formatCurrency } from '@/lib/notes'

const STAGE_PILL: Record<string, string> = {
  Sourcing:            'bg-slate-100 text-slate-600',
  Feasibility:         'bg-blue-100 text-blue-600',
  'Site Control':      'bg-violet-100 text-violet-600',
  DD:                  'bg-amber-100 text-amber-600',
  'Capital Stack':     'bg-orange-100 text-orange-600',
  'State Application': 'bg-pink-100 text-pink-600',
  Permitting:          'bg-rose-100 text-rose-600',
  Construction:        'bg-emerald-100 text-emerald-600',
  Operations:          'bg-green-100 text-green-600',
}

// Fixed column widths shared by every stage table so they align visually
const COL_WIDTHS = ['28%', '20%', '13%', '10%', '13%', '16%']
const COL_HEADERS = ['Deal', 'Location', 'Product Type', 'Units', 'Dev Cost', 'Next Task']

interface Props {
  initialDeals: Deal[]
  nextTaskMap: Record<string, string>
}

export function KanbanBoard({ initialDeals, nextTaskMap }: Props) {
  const byStage = STAGES.reduce<Record<string, Deal[]>>((acc, s) => {
    acc[s] = initialDeals.filter((d) => d.stage === s)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      {STAGES.map((stage) => {
        const stageDeals = byStage[stage] ?? []
        return (
          <div key={stage} className="space-y-2">
            {/* Stage header */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${STAGE_PILL[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                {stage}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {stageDeals.length === 0
                  ? 'no deals'
                  : `${stageDeals.length} deal${stageDeals.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Table — table-fixed + colgroup keeps widths identical across all stages */}
            <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                </colgroup>
                <thead className="border-b border-black/[0.05]">
                  <tr>
                    {COL_HEADERS.map((h) => (
                      <th key={h} className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stageDeals.length === 0 ? (
                    <tr>
                      <td colSpan={COL_HEADERS.length} className="py-4 px-4 text-sm text-muted-foreground/40 italic">
                        No deals in this stage.
                      </td>
                    </tr>
                  ) : (
                    stageDeals.map((d) => (
                      <tr key={d.id} className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/deals/${d.id}`}
                            className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {d.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground truncate">{d.location ?? '—'}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{d.product_type ?? d.deal_type ?? '—'}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">
                          {d.units != null ? `${d.units}u` : '—'}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium tabular-nums">
                          {formatCurrency(d.development_cost ?? d.budget)}
                        </td>
                        <td className="py-3 px-4">
                          {nextTaskMap[d.id] ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40 mr-1">Next</span>
                              {nextTaskMap[d.id]}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
