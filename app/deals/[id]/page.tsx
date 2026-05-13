import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, tasks } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { DealProperties } from '@/components/deals/DealProperties'
import { OverviewSection } from '@/components/deals/OverviewSection'
import { NotesSection } from '@/components/deals/NotesSection'
import { TasksSection } from '@/components/deals/TasksSection'
import { formatCurrency } from '@/lib/notes'

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)

  if (!deal) notFound()

  const dealTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.deal_id, deal.id))

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/deals" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' mt-0.5 shrink-0'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{deal.deal_id}</span>
            <Badge variant="secondary" className="text-xs">{deal.stage}</Badge>
            {deal.deal_type && <Badge variant="outline" className="text-xs">{deal.deal_type}</Badge>}
          </div>
          <h1 className="text-xl font-semibold mt-1 leading-tight">{deal.name}</h1>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            {deal.location && <span>{deal.location}</span>}
            {deal.size && <span>{deal.size}</span>}
            {deal.budget != null && <span className="font-medium text-foreground">{formatCurrency(deal.budget)}</span>}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="border rounded-lg p-4">
        <DealProperties deal={deal} />
      </div>

      {/* Overview */}
      <div className="border rounded-lg p-4">
        <OverviewSection dealId={deal.id} initial={deal.overview ?? ''} />
      </div>

      {/* Notes */}
      <div className="border rounded-lg p-4">
        <NotesSection dealId={deal.id} initialNotes={deal.notes ?? ''} />
      </div>

      {/* Tasks */}
      <div className="border rounded-lg p-4">
        <TasksSection dealId={deal.id} initialTasks={dealTasks} />
      </div>
    </div>
  )
}
