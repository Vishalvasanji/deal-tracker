import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes, qapFields, qapCostItems } from '@/lib/db/schema'
import { eq, or, and, asc } from 'drizzle-orm'
import { DevelopmentCostsClient } from '@/components/qap/DevelopmentCostsClient'
import { seedQapCostItems } from '@/lib/qap-actions'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import type { BasisAdjustment } from '@/lib/qap-dev-costs-calc'
import { computeRevExp, type OtherLine } from '@/lib/qap-rev-exp-calc'
import { computeFinancing } from '@/lib/qap-financing-calc'
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

  const [costItems, devFields, s12Fields, s10Fields, s20Fields, revExpFields, units, s18Fields, s13Fields] = await Promise.all([
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'development_costs'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_20'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'rev_exp'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)).orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_18'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_13'))),
  ])

  const initialAmounts: Record<string, number | null> = {}
  for (const ci of costItems) initialAmounts[ci.line_key] = ci.amount ?? null

  const dc = Object.fromEntries(devFields.map(f => [f.field_key, f.value ?? '']))
  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s10 = Object.fromEntries(s10Fields.map(f => [f.field_key, f.value ?? '']))
  const s20 = Object.fromEntries(s20Fields.map(f => [f.field_key, f.value ?? '']))
  const s18 = Object.fromEntries(s18Fields.map(f => [f.field_key, f.value ?? '']))
  const s13 = Object.fromEntries(s13Fields.map(f => [f.field_key, f.value ?? '']))
  const s20n = (k: string) => num(s20[k]) ?? 0

  // §20 read-only pulls into the §36 line items (Excel formula cells).
  const pulledAmounts: Record<string, number> = {}
  for (const cat of DEV_COST_CATEGORIES) {
    for (const line of cat.lines) {
      if (line.pullKey) pulledAmounts[line.key] = s20n(line.pullKey)
    }
  }

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

  // §38 basis adjustments (stored as a JSON array)
  let initialAdjustments: BasisAdjustment[] = []
  try {
    const parsed = JSON.parse(dc['s38_adjustments_json'] || '[]')
    if (Array.isArray(parsed)) {
      initialAdjustments = parsed
        .filter((a) => a && (a.basis_type === 'acq' || a.basis_type === 'constr') && typeof a.amount === 'number')
        .map((a) => ({
          id: String(a.id ?? `${Date.now()}-${Math.random()}`),
          basis_type: a.basis_type,
          explanation: String(a.explanation ?? ''),
          amount: a.amount,
        }))
    }
  } catch {
    initialAdjustments = []
  }

  // Unit counts by bedroom (0–4) for the §40 HUD TDC limit.
  const unitsByBr = [0, 0, 0, 0, 0]
  let totalUnits = 0
  let lihtcUnits = 0
  let monthlyRent = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (u.is_lihtc) lihtcUnits += cnt
    monthlyRent += (u.monthly_rent ?? 0) * cnt
    if (u.bedrooms != null && u.bedrooms >= 0 && u.bedrooms <= 4) unitsByBr[u.bedrooms] += cnt
  }

  // §36 Operating Deficit Reserve minimum = ½ × Total Operating Expenses (Revenues & Expenses C89/2).
  const reAmounts: Record<string, number> = {}
  const reOthers: Record<string, OtherLine[]> = {}
  for (const f of revExpFields) {
    const key = f.field_key
    if (key.endsWith('__others')) {
      try {
        const parsed = JSON.parse(f.value || '[]')
        if (Array.isArray(parsed)) {
          reOthers[key.slice(0, -'__others'.length)] = parsed
            .filter((o) => o && typeof o.amount !== 'undefined')
            .map((o) => ({ id: String(o.id ?? ''), label: String(o.label ?? ''), amount: num(String(o.amount)) ?? 0 }))
        }
      } catch { /* ignore */ }
    } else if (key !== 'rev_comment' && key !== 'mustpay_comment' && key !== 'contingent_comment') {
      reAmounts[key] = num(f.value) ?? 0
    }
  }
  const revExp = computeRevExp(reAmounts, reOthers, { totalUnits, lihtcUnits, annualGrossRent: monthlyRent * 12 })
  const operatingDeficitReserveMin = revExp.operatingDeficitReserveMin

  const deps = {
    parish: s12['parish'] || undefined,
    buildingType: s12['building_type'] || undefined,
    unitsByBr,
    totalUnits,
    bondFinanced: s10['bond_financing'] === 'Yes',
    is4pct: s10['lihtc_4pct'] === 'Yes',
    bondIssuanceCosts: num(s10['costs_of_issuance']) ?? 0,
    // §38 out-of-basis = total cost − amount includable in LIHTC basis (floored at 0)
    outOfBasisCommunityFacilities: Math.max(0, s20n('s20_06_community_fac_cost') - s20n('s20_06_in_basis')),
    outOfBasisCommunityService: Math.max(0, s20n('s20_07_cost') - s20n('s20_07_in_basis')),
    commercialDevCost: s20n('s20_14_commercial_cost'),
    // §41 developer fee base subtracts related-party payments (sum of §20.04 list)
    relatedPartyPayments: [1, 2, 3, 4, 5, 6].reduce((sum, i) => sum + s20n(`s20_04_payment_${i}_amount`), 0),
    // §40 TDC-limit exception flags (§12)
    isSro: s12['is_sro'] === 'Yes',
    isAntiDiscrimination: s12['is_reallocated_credits'] === 'Yes',
    // §36 Operating Deficit Reserve minimum (½ of operating expenses, from Revenues & Expenses)
    operatingDeficitReserveMin,
    // DC-5: §38 basis reductions — federal grants (§18.14–16 flagged) + forgivable HOME (§18.04)
    federalGrants: [14, 15, 16].reduce(
      (sum, i) => sum + (s18[`s18_${i}_federal_grant`] === 'Yes' ? (num(s18[`s18_${i}_funding_amount`]) ?? 0) : 0),
      0,
    ),
    homeBasisReduction: s18['s18_04_loan_type'] === 'Forgiven at maturity' ? (num(s13['home_requested']) ?? 0) : 0,
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
          initialAdjustments={initialAdjustments}
          initialComments={initialComments}
          pulledAmounts={pulledAmounts}
          computedSources={computeFinancing(s18, s13).totalSources}
          deps={deps}
        />
      </div>
    </div>
  )
}
