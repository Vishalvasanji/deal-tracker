import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import { getQapCompletion } from '@/lib/qap-completion'
import Link from 'next/link'
import { ArrowLeft, FileText, Building2, ClipboardList, Wallet, Calculator, Receipt, Users, Landmark, PiggyBank } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function ProgressCard({
  title,
  icon: Icon,
  filled,
  total,
  href,
}: {
  title: string
  icon: React.ElementType
  filled: number
  total: number
  href: string
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  const textColor = pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'

  return (
    <Link
      href={href}
      className="block bg-card rounded-2xl border border-black/[0.06] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {filled} of {total} fields complete
      </p>
    </Link>
  )
}

export default async function QapHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const completion = await getQapCompletion(deal.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/deals/${deal.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id}</p>
          <h1 className="text-xl font-bold">{deal.name} — QAP Application</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ProgressCard
          title="Narrative"
          icon={FileText}
          filled={completion.narrative.filled}
          total={completion.narrative.total}
          href={`/deals/${deal.id}/qap/narrative`}
        />
        <ProgressCard
          title="Unit Mix & Rents"
          icon={Building2}
          filled={completion.unitMix.filled}
          total={completion.unitMix.total}
          href={`/deals/${deal.id}/qap/unit-mix`}
        />
        <ProgressCard
          title="Project Description"
          icon={ClipboardList}
          filled={completion.section10.filled}
          total={completion.section10.total}
          href={`/deals/${deal.id}/qap/project-description`}
        />
        <ProgressCard
          title="Development Costs"
          icon={Wallet}
          filled={completion.developmentCosts.filled}
          total={completion.developmentCosts.total}
          href={`/deals/${deal.id}/qap/development-costs`}
        />
        <ProgressCard
          title="Basis Calculation"
          icon={Calculator}
          filled={completion.basisCalculation.filled}
          total={completion.basisCalculation.total}
          href={`/deals/${deal.id}/qap/basis-calculation`}
        />
        <ProgressCard
          title="Revenues & Expenses"
          icon={Receipt}
          filled={completion.revenuesExpenses.filled}
          total={completion.revenuesExpenses.total}
          href={`/deals/${deal.id}/qap/revenues-expenses`}
        />
        <ProgressCard
          title="Development Team"
          icon={Users}
          filled={completion.developmentTeam.filled}
          total={completion.developmentTeam.total}
          href={`/deals/${deal.id}/qap/development-team`}
        />
        <ProgressCard
          title="Syndication"
          icon={Landmark}
          filled={completion.syndication.filled}
          total={completion.syndication.total}
          href={`/deals/${deal.id}/qap/syndication`}
        />
        <ProgressCard
          title="Reserve Adequacy"
          icon={PiggyBank}
          filled={completion.reserveAdequacy.filled}
          total={completion.reserveAdequacy.total}
          href={`/deals/${deal.id}/qap/reserve-adequacy`}
        />
        {/* Selection Criteria — hidden for now; typically the last section filled, after every
            other module is complete. Re-add the `Award` import to restore this tile.
        <ProgressCard
          title="Selection Criteria"
          icon={Award}
          filled={completion.selectionCriteria.filled}
          total={completion.selectionCriteria.total}
          href={`/deals/${deal.id}/qap/selection-criteria`}
        />
        */}
      </div>
    </div>
  )
}
