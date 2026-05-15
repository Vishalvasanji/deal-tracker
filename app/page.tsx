import { db } from '@/lib/db'
import { deals, tasks } from '@/lib/db/schema'
import { ne, count } from 'drizzle-orm'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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

export default async function PipelinePage() {
  const [allDeals, openTaskRows, firstTasks] = await Promise.all([
    db.select().from(deals),
    db.select({ count: count() }).from(tasks).where(ne(tasks.status, 'Done')),
    db
      .select({ deal_id: tasks.deal_id, title: tasks.title })
      .from(tasks)
      .where(ne(tasks.status, 'Done'))
      .orderBy(tasks.created_at),
  ])

  const nextTaskMap: Record<string, string> = {}
  for (const t of firstTasks) {
    if (!nextTaskMap[t.deal_id]) nextTaskMap[t.deal_id] = t.title
  }

  // ── KPI calculations ────────────────────────────────────────────────────────
  const totalDeals = allDeals.length
  const activeDeals = allDeals.filter((d) => d.stage !== 'Operations').length
  const openTasks = openTaskRows[0]?.count ?? 0

  const knownCostDeals = allDeals.filter((d) => !d.cost_tbd && d.development_cost != null)
  const tbdDeals = allDeals.filter((d) => d.cost_tbd).length
  const pipelineValue = knownCostDeals.reduce((sum, d) => sum + (d.development_cost ?? 0), 0)

  // Stage breakdown for the mini progress bar
  const stageColors: Record<string, string> = {
    Sourcing:            '#94a3b8',
    Feasibility:         '#60a5fa',
    'Site Control':      '#a78bfa',
    DD:                  '#fbbf24',
    'Capital Stack':     '#fb923c',
    'State Application': '#f472b6',
    Permitting:          '#fb7185',
    Construction:        '#34d399',
    Operations:          '#4ade80',
  }
  const stageCounts = allDeals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1
    return acc
  }, {})

  const kpis = [
    { label: 'Total Deals', value: totalDeals.toString() },
    { label: 'Active', value: activeDeals.toString() },
    {
      label: 'Pipeline Value',
      value: knownCostDeals.length ? formatCurrency(pipelineValue) : '—',
      sub: tbdDeals > 0 ? `+ ${tbdDeals} TBD` : undefined,
    },
    { label: 'Open Tasks', value: openTasks.toString() },
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur border-b border-black/[0.06]">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
          <p className="text-xs text-muted-foreground">{totalDeals} deal{totalDeals !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/deals/new" className={buttonVariants({ size: 'sm' }) + ' rounded-xl shadow-sm shadow-primary/20'}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Deal
        </Link>
      </div>

      {/* ── KPI bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-black/[0.06] bg-background px-6 py-4">
        <div className="flex items-stretch gap-px bg-black/[0.06] rounded-2xl overflow-hidden w-full">
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className="flex-1 flex flex-col justify-center px-5 py-3.5 bg-card"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {kpi.label}
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums leading-none">
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              )}
            </div>
          ))}

          {/* Stage breakdown tile */}
          <div className="flex-[1.6] flex flex-col justify-center px-5 py-3.5 bg-card">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              By Stage
            </p>
            {/* Segmented bar */}
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {Object.entries(stageCounts).map(([stage, cnt]) => (
                <div
                  key={stage}
                  title={`${stage}: ${cnt}`}
                  style={{
                    flex: cnt,
                    backgroundColor: stageColors[stage] ?? '#d1d5db',
                  }}
                />
              ))}
              {totalDeals === 0 && (
                <div className="flex-1 bg-muted rounded-full" />
              )}
            </div>
            {/* Legend dots */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {Object.entries(stageCounts).map(([stage, cnt]) => (
                <span key={stage} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: stageColors[stage] ?? '#d1d5db' }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {stage} <span className="font-semibold text-foreground">{cnt}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <KanbanBoard initialDeals={allDeals} nextTaskMap={nextTaskMap} />
      </div>
    </div>
  )
}
