import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, tasks } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { DealProperties } from '@/components/deals/DealProperties'
import { OverviewSection } from '@/components/deals/OverviewSection'
import { NotesSection } from '@/components/deals/NotesSection'
import { TasksSection } from '@/components/deals/TasksSection'
import { formatCurrency } from '@/lib/notes'

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

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)

  if (!deal) notFound()

  const dealTasks = await db.select().from(tasks).where(eq(tasks.deal_id, deal.id))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/deals"
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl mt-0.5 shrink-0 text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{deal.deal_id}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAGE_PILL[deal.stage] ?? 'bg-gray-100 text-gray-600'}`}>
              {deal.stage}
            </span>
            {deal.deal_type && (
              <span className="text-[11px] font-medium text-muted-foreground">{deal.deal_type}</span>
            )}
          </div>
          <h1 className="text-xl font-bold mt-1 leading-tight text-foreground">{deal.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-sm text-muted-foreground">
            {deal.location && <span>{deal.location}</span>}
            {deal.units != null && <span>{deal.units} units</span>}
            {deal.lot_size && <span>{deal.lot_size}</span>}
            {deal.product_type && <span>{deal.product_type}</span>}
            {deal.cost_tbd ? (
              <span className="font-semibold text-foreground italic">TBD</span>
            ) : (deal.development_cost != null || deal.budget != null) && (
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(deal.development_cost ?? deal.budget)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] p-5">
        <DealProperties deal={deal} />
      </div>

      {/* Overview */}
      <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] p-5">
        <OverviewSection dealId={deal.id} initial={deal.overview ?? ''} />
      </div>

      {/* Tasks */}
      <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] p-5">
        <TasksSection dealId={deal.id} initialTasks={dealTasks} />
      </div>

      {/* Notes */}
      <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] p-5">
        <NotesSection dealId={deal.id} initialNotes={deal.notes ?? ''} />
      </div>
    </div>
  )
}
