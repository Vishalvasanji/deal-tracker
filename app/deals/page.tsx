import { db } from '@/lib/db'
import { deals, tasks, STAGES } from '@/lib/db/schema'
import { ne, eq, count } from 'drizzle-orm'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/notes'
import { Plus } from 'lucide-react'
import { TimelineView } from '@/components/deals/TimelineView'

const STAGE_PILL: Record<string, string> = {
  Sourcing:           'bg-slate-100 text-slate-600',
  Feasibility:        'bg-blue-100 text-blue-600',
  'Site Control':     'bg-violet-100 text-violet-600',
  DD:                 'bg-amber-100 text-amber-600',
  'Capital Stack':    'bg-orange-100 text-orange-600',
  'State Application':'bg-pink-100 text-pink-600',
  Permitting:         'bg-rose-100 text-rose-600',
  Construction:       'bg-emerald-100 text-emerald-600',
  Operations:         'bg-green-100 text-green-600',
}

export default async function DealsPage() {
  const allDeals = await db.select().from(deals)
  const taskCounts = await db
    .select({ deal_id: tasks.deal_id, count: count() })
    .from(tasks)
    .where(ne(tasks.status, 'Done'))
    .groupBy(tasks.deal_id)

  const countMap = Object.fromEntries(taskCounts.map((r) => [r.deal_id, r.count]))
  const active = allDeals.filter((d) => d.stage !== 'Operations')
  const stageOrder = Object.fromEntries(STAGES.map((s, i) => [s, i]))
  const sortedActive = [...active].sort(
    (a, b) => stageOrder[a.stage] - stageOrder[b.stage] || a.name.localeCompare(b.name)
  )

  const Th = ({ label }: { label: string }) => (
    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
    </th>
  )

  const Row = ({ d, extra }: { d: typeof allDeals[0]; extra?: React.ReactNode }) => (
    <tr key={d.id} className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors group">
      <td className="py-3 px-4">
        <Link href={`/deals/${d.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors">
          {d.name}
        </Link>
        <div className="text-[11px] text-muted-foreground mt-0.5">{d.deal_id}</div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STAGE_PILL[d.stage] ?? 'bg-gray-100 text-gray-600'}`}>
          {d.stage}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{d.location ?? '—'}</td>
      <td className="py-3 px-4">
        {d.deal_type
          ? <span className="text-[11px] font-medium text-muted-foreground">{d.deal_type}</span>
          : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{d.size ?? '—'}</td>
      <td className="py-3 px-4 text-sm font-medium tabular-nums">{formatCurrency(d.budget)}</td>
      {extra}
    </tr>
  )

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground">{allDeals.length} total</p>
        </div>
        <Link href="/deals/new" className={buttonVariants({ size: 'sm' }) + ' rounded-xl shadow-sm shadow-primary/20'}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Deal
        </Link>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="rounded-xl bg-black/[0.04] p-0.5 h-auto gap-0.5">
          <TabsTrigger value="active" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All ({allDeals.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-black/[0.05]">
                <tr>
                  {['Deal', 'Stage', 'Location', 'Type', 'Size', 'Budget', 'Close', 'Open Tasks'].map(h => <Th key={h} label={h} />)}
                </tr>
              </thead>
              <tbody>
                {sortedActive.map((d) => (
                  <Row key={d.id} d={d} extra={
                    <>
                      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{d.target_close ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium tabular-nums ${(countMap[d.id] ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {countMap[d.id] ?? 0}
                        </span>
                      </td>
                    </>
                  } />
                ))}
              </tbody>
            </table>
            {sortedActive.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-12">No active deals.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-black/[0.05]">
                <tr>
                  {['Deal', 'Stage', 'Location', 'Type', 'Size', 'Budget', 'LOI', 'Close', 'Completion'].map(h => <Th key={h} label={h} />)}
                </tr>
              </thead>
              <tbody>
                {allDeals.map((d) => (
                  <Row key={d.id} d={d} extra={
                    <>
                      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{d.loi_date ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{d.target_close ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{d.target_completion ?? '—'}</td>
                    </>
                  } />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView deals={allDeals} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
