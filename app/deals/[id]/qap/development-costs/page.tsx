import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes, qapFields, qapCostItems } from '@/lib/db/schema'
import { eq, or, and, asc } from 'drizzle-orm'
import { DevelopmentCostsClient } from '@/components/qap/DevelopmentCostsClient'
import { seedQapCostItems } from '@/lib/qap-actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function num(s: string | undefined | null): number | null {
  if (!s) return null
  const n = parseInt(String(s).replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? null : n
}

export default async function DevelopmentCostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  // Ensure the faithful line list exists for this deal.
  await seedQapCostItems(deal.id)

  const [costItems, devFields, s12Fields, s10Fields, units] = await Promise.all([
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'development_costs'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)).orderBy(asc(qapUnitTypes.row_index)),
  ])

  const initialAmounts: Record<string, number | null> = {}
  for (const ci of costItems) initialAmounts[ci.line_key] = ci.amount ?? null

  const dc = Object.fromEntries(devFields.map(f => [f.field_key, f.value ?? '']))
  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s10 = Object.fromEntries(s10Fields.map(f => [f.field_key, f.value ?? '']))

  const model = {
    tdc: num(dc['model_tdc']),
    sources: num(dc['model_total_sources']),
    filename: dc['model_filename'] ?? '',
    sourceRef: dc['model_source_ref'] ?? '',
    uploadedAt: dc['model_uploaded_at'] ?? '',
  }

  const initialComments: Record<string, string> = {
    s36_comment: dc['s36_comment'] ?? '',
    s38_acq_comment: dc['s38_acq_comment'] ?? '',
    s38_constr_comment: dc['s38_constr_comment'] ?? '',
    s40_comment: dc['s40_comment'] ?? '',
    s41_comment: dc['s41_comment'] ?? '',
  }

  // Unit counts by bedroom (0–4) for the §40 HUD TDC limit.
  const unitsByBr = [0, 0, 0, 0, 0]
  let totalUnits = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (u.bedrooms != null && u.bedrooms >= 0 && u.bedrooms <= 4) unitsByBr[u.bedrooms] += cnt
  }

  const deps = {
    parish: s12['parish'] || undefined,
    buildingType: s12['building_type'] || undefined,
    unitsByBr,
    totalUnits,
    bondFinanced: s10['bond_financing'] === 'Yes',
    is4pct: s10['bond_financing'] === 'Yes',
  }

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
          <h1 className="text-xl font-bold">Development Costs</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <DevelopmentCostsClient
          dealId={deal.id}
          initialAmounts={initialAmounts}
          model={model}
          initialAcqAdj={num(dc['s38_acq_adj'])}
          initialConstrAdj={num(dc['s38_constr_adj'])}
          initialComments={initialComments}
          deps={deps}
        />
      </div>
    </div>
  )
}
