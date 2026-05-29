import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes, qapCostItems } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { ReserveAdequacyClient } from '@/components/qap/ReserveAdequacyClient'
import { RESERVE_YEARS } from '@/lib/qap-reserve-adequacy'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function num(s: string | null | undefined): number {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}

export default async function ReserveAdequacyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [raFields, s28Fields, s29Fields, rrItems, units] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'reserve_adequacy'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_28'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_29'))),
    db.select().from(qapCostItems).where(and(eq(qapCostItems.deal_id, deal.id), eq(qapCostItems.line_key, 'replacement_reserve_deposit'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
  ])

  const ra = Object.fromEntries(raFields.map(f => [f.field_key, f.value ?? '']))
  const s28 = Object.fromEntries(s28Fields.map(f => [f.field_key, f.value ?? '']))
  const s29 = Object.fromEntries(s29Fields.map(f => [f.field_key, f.value ?? '']))

  let totalUnits = 0
  for (const u of units) totalUnits += u.num_units ?? 0

  const initialDeposit = rrItems[0]?.amount ?? 0          // Development Costs · Replacement Reserve Deposit
  const reservePupa = num(s29['s29_reserve_pupa'])         // PD §29 proposed reserve deposit (PUPA)
  const annualDepositY1 = reservePupa * totalUnits         // PD!H987 = H985 × Unit Mix!F41
  const escalation = num(s28['s28_adrr_escalation'])       // PD §28 ADRR escalation rate (decimal)

  let capitalNeeds: number[] = []
  try {
    const parsed = JSON.parse(ra['capital_needs__json'] || '[]')
    if (Array.isArray(parsed)) capitalNeeds = parsed.map((v) => num(String(v)))
  } catch { capitalNeeds = [] }
  capitalNeeds = Array.from({ length: RESERVE_YEARS }, (_, i) => capitalNeeds[i] ?? 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/deals/${deal.id}/qap`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Reserve Adequacy</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <ReserveAdequacyClient
          dealId={deal.id}
          initialDeposit={initialDeposit}
          annualDepositY1={annualDepositY1}
          reservePupa={reservePupa}
          escalation={escalation}
          totalUnits={totalUnits}
          initialInterestPct={ra['interest_rate'] ?? ''}
          initialInflationPct={ra['inflation_rate'] ?? ''}
          initialCapitalNeeds={capitalNeeds}
        />
      </div>
    </div>
  )
}
