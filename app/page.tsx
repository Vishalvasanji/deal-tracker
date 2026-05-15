import { db } from '@/lib/db'
import { deals, tasks } from '@/lib/db/schema'
import { ne } from 'drizzle-orm'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function PipelinePage() {
  const allDeals = await db.select().from(deals)

  const firstTasks = await db
    .select({ deal_id: tasks.deal_id, title: tasks.title })
    .from(tasks)
    .where(ne(tasks.status, 'Done'))
    .orderBy(tasks.created_at)

  const nextTaskMap: Record<string, string> = {}
  for (const t of firstTasks) {
    if (!nextTaskMap[t.deal_id]) nextTaskMap[t.deal_id] = t.title
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur border-b border-black/[0.06]">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
          <p className="text-xs text-muted-foreground">{allDeals.length} deal{allDeals.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/deals/new" className={buttonVariants({ size: 'sm' }) + ' rounded-xl shadow-sm shadow-primary/20'}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Deal
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <KanbanBoard initialDeals={allDeals} nextTaskMap={nextTaskMap} />
      </div>
    </div>
  )
}
