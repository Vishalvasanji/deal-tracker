import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes, qapFields } from '@/lib/db/schema'
import { eq, or, asc, and } from 'drizzle-orm'
import { UnitMixTable } from '@/components/qap/UnitMixTable'
import { deriveRentLimits } from '@/lib/qap-unit-mix-eval'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function UnitMixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [units, s12Fields, s23Fields, s14Fields] = await Promise.all([
    db.select().from(qapUnitTypes)
      .where(eq(qapUnitTypes.deal_id, deal.id))
      .orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_23'))),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_14'))),
  ])

  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s23 = Object.fromEntries(s23Fields.map(f => [f.field_key, f.value ?? '']))
  const s14 = Object.fromEntries(s14Fields.map(f => [f.field_key, f.value ?? '']))

  // Market rents (§23.09), HUD FMRs (§23.10), and AMI contract rent limits
  // (parish AMI + §23.06 utility allowances) — derived in the shared eval module.
  const { marketRents, fmrRents, amiRentLimits } = deriveRentLimits(s12, s23)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/deals/${deal.id}/qap`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Unit Mix & Rents</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5 overflow-x-auto">
        <UnitMixTable
          dealId={deal.id}
          initialUnits={units}
          marketRents={marketRents}
          fmrRents={fmrRents}
          amiRentLimits={amiRentLimits}
          setAsideElection={s14['lihtc_set_aside_election'] || undefined}
        />
      </div>
    </div>
  )
}
