import { db } from '@/lib/db'
import { deals, tasks, STAGES } from '@/lib/db/schema'
import { ne, eq, count } from 'drizzle-orm'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/notes'
import { Plus } from 'lucide-react'
import { TimelineView } from '@/components/deals/TimelineView'

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
  const sortedActive = [...active].sort((a, b) =>
    stageOrder[a.stage] - stageOrder[b.stage] || a.name.localeCompare(b.name)
  )

  const cols = (d: typeof allDeals[0], extra?: React.ReactNode) => (
    <tr key={d.id} className="border-b hover:bg-muted/40 transition-colors">
      <td className="py-2 px-3">
        <Link href={`/deals/${d.id}`} className="font-medium hover:underline text-sm">
          {d.name}
        </Link>
        <div className="text-xs text-muted-foreground">{d.deal_id}</div>
      </td>
      <td className="py-2 px-3 text-sm">{d.stage}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{d.location ?? '—'}</td>
      <td className="py-2 px-3">
        {d.deal_type ? <Badge variant="secondary">{d.deal_type}</Badge> : '—'}
      </td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{d.size ?? '—'}</td>
      <td className="py-2 px-3 text-sm">{formatCurrency(d.budget)}</td>
      {extra}
    </tr>
  )

  return (
    <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Deals</h1>
        <Link href="/deals/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4 mr-1" />
          New Deal
        </Link>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="all">All ({allDeals.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Deal', 'Stage', 'Location', 'Type', 'Size', 'Budget', 'Close', 'Open Tasks'].map((h) => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedActive.map((d) =>
                  cols(
                    d,
                    <>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{d.target_close ?? '—'}</td>
                      <td className="py-2 px-3 text-sm">{countMap[d.id] ?? 0}</td>
                    </>
                  )
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Deal', 'Stage', 'Location', 'Type', 'Size', 'Budget', 'LOI', 'Close', 'Completion'].map((h) => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDeals.map((d) =>
                  cols(
                    d,
                    <>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{d.loi_date ?? '—'}</td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{d.target_close ?? '—'}</td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{d.target_completion ?? '—'}</td>
                    </>
                  )
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView deals={allDeals} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
