import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes, qapCostItems } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { SelectionCriteriaClient } from '@/components/qap/SelectionCriteriaClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function num(s: string | null | undefined): number {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}

export default async function SelectionCriteriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const section = (s: string) =>
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, s)))

  const [s12r, s24r, s25r, s26r, s27r, selr, devr, units, costItems] = await Promise.all([
    section('section_12'), section('section_24'), section('section_25'),
    section('section_26'), section('section_27'), section('selection'), section('development_costs'),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
  ])

  const map = (rows: { field_key: string; value: string | null }[]) =>
    Object.fromEntries(rows.map(f => [f.field_key, f.value ?? '']))
  const s12 = map(s12r), s24 = map(s24r), s25 = map(s25r), s26 = map(s26r), s27 = map(s27r)
  const dev = map(devr)

  // Unit Mix aggregates: total units + share at ≤30% AMI.
  let totalUnits = 0, unitsAt30 = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (num(u.ami_restriction) > 0 && num(u.ami_restriction) <= 30) unitsAt30 += cnt
  }
  const pctUnitsAt30Ami = totalUnits > 0 ? unitsAt30 / totalUnits : 0

  // TDC for the §III.C additional-financial ratio: prefer the uploaded model TDC, else sum cost items.
  const costSum = costItems.reduce((s, c) => s + (c.amount ?? 0), 0)
  const tdc = num(dev['model_tdc']) || costSum

  // Self-scores (section 'selection', field_key = criterion key → number).
  const initialSelfScores: Record<string, number> = {}
  for (const f of selr) initialSelfScores[f.field_key] = num(f.value)

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
          <h1 className="text-xl font-bold">Selection Criteria</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <SelectionCriteriaClient
          dealId={deal.id}
          deps={{ s12, s24, s25, s26, s27, totalUnits, pctUnitsAt30Ami, tdc }}
          initialSelfScores={initialSelfScores}
        />
      </div>
    </div>
  )
}
