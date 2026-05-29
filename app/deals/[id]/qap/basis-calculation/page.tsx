import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes, qapFields, qapCostItems, qapBasisConfigs } from '@/lib/db/schema'
import { eq, or, and, asc } from 'drizzle-orm'
import { BasisCalculationClient } from '@/components/qap/BasisCalculationClient'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts } from '@/lib/qap-dev-costs-calc'
import type { BasisConfigInput } from '@/lib/qap-basis-calc'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function intOf(s: string | undefined | null): number {
  const n = parseInt(String(s ?? '').replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}
// Normalize a rate/boost: accept "0.09" or "9" or "9%" → 0.09
function normRate(s: string | undefined | null): number {
  const v = parseFloat(String(s ?? '').replace(/[%\s]/g, ''))
  if (isNaN(v)) return 0
  return v >= 1 ? v / 100 : v
}

export default async function BasisCalculationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [configs, costItems, devFields, s10Fields, s14Fields, s15Fields, s20Fields, units] = await Promise.all([
    db.select().from(qapBasisConfigs).where(eq(qapBasisConfigs.deal_id, deal.id)).orderBy(asc(qapBasisConfigs.config_index)),
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'development_costs'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_14'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_15'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_20'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
  ])

  const dc = Object.fromEntries(devFields.map(f => [f.field_key, f.value ?? '']))
  const s10 = Object.fromEntries(s10Fields.map(f => [f.field_key, f.value ?? '']))
  const s14 = Object.fromEntries(s14Fields.map(f => [f.field_key, f.value ?? '']))
  const s15 = Object.fromEntries(s15Fields.map(f => [f.field_key, f.value ?? '']))
  const s20 = Object.fromEntries(s20Fields.map(f => [f.field_key, f.value ?? '']))
  const s20n = (k: string) => intOf(s20[k])

  // ── Adjusted Construction / Acquisition Basis (Dev Costs §38 C193 / C164) ──
  const amounts: Record<string, number> = {}
  for (const ci of costItems) amounts[ci.line_key] = ci.amount ?? 0
  for (const cat of DEV_COST_CATEGORIES) {
    for (const line of cat.lines) {
      if (line.pullKey) amounts[line.key] = s20n(line.pullKey)
    }
  }
  let basisAdjustments: { id: string; basis_type: 'acq' | 'constr'; explanation: string; amount: number }[] = []
  try {
    const p = JSON.parse(dc['s38_adjustments_json'] || '[]')
    if (Array.isArray(p)) basisAdjustments = p.filter((a) => a && (a.basis_type === 'acq' || a.basis_type === 'constr') && typeof a.amount === 'number')
  } catch { basisAdjustments = [] }

  const dev = computeDevCosts(amounts, {
    basisAdjustments,
    outOfBasisCommunityFacilities: Math.max(0, s20n('s20_06_community_fac_cost') - s20n('s20_06_in_basis')),
    outOfBasisCommunityService: Math.max(0, s20n('s20_07_cost') - s20n('s20_07_in_basis')),
    commercialDevCost: s20n('s20_14_commercial_cost'),
  })
  const adjustedConstructionBasis = dev.basis.adjustedConstructionBasis
  const adjustedAcquisitionBasis = dev.basis.adjustedAcquisitionBasis

  // ── Unit Mix aggregates ──
  let totalUnits = 0, staffUnits = 0, lihtcUnits = 0
  let totalSqft = 0, staffSqft = 0, lihtcSqft = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    const sf = (u.sqft ?? 0) * cnt
    totalUnits += cnt
    totalSqft += sf
    if (u.is_lihtc) { lihtcUnits += cnt; lihtcSqft += sf }
    if (u.is_staff && !u.is_lihtc) { staffUnits += cnt; staffSqft += sf }
  }
  const residUnits = totalUnits - staffUnits
  const residSqft = totalSqft - staffSqft

  // ── Credit rates by deal type (§10 / §14) ──
  const dealType: '9%' | '4%' | 'none' =
    s10['lihtc_9pct'] === 'Yes' ? '9%' : s10['lihtc_4pct'] === 'Yes' ? '4%' : 'none'
  let constructionCreditRate = 0
  let acquisitionCreditRate = 0
  if (dealType === '9%') {
    constructionCreditRate = 0.09 // 9% deals: fixed 70% PV rate (constant, no override per QAP)
    acquisitionCreditRate = normRate(s14['acq_credit_rate']) // §14.02 acquisition rate (applicant-entered)
  } else if (dealType === '4%') {
    const r = normRate(s10['housing_credit_rate'])
    constructionCreditRate = r
    acquisitionCreditRate = r
  }

  const deps = {
    adjustedConstructionBasis,
    adjustedAcquisitionBasis,
    constructionBoost: normRate(s15['construction_basis_boost']),
    acquisitionBoost: normRate(s15['acquisition_basis_boost']),
    constructionCreditRate,
    acquisitionCreditRate,
    dealType,
    projTotalBuildings: s20n('s20_09_total_buildings'),
    projResidStaffSqft: residSqft + staffSqft,
    projLihtcUnits: lihtcUnits,
    projResidUnits: residUnits,
    projLihtcSqft: lihtcSqft,
    projResidSqft: residSqft,
  }

  const initialConfigs: BasisConfigInput[] = configs.map(c => ({
    config_index: c.config_index,
    label: c.label,
    num_buildings: c.num_buildings ?? 0,
    resid_staff_sqft: c.resid_staff_sqft ?? 0,
    common_sqft: c.common_sqft ?? 0,
    lihtc_units: c.lihtc_units ?? 0,
    resid_units: c.resid_units ?? 0,
    lihtc_sqft: c.lihtc_sqft ?? 0,
    resid_sqft: c.resid_sqft ?? 0,
    homeless_constr_adj: c.homeless_constr_adj ?? 0,
    homeless_acq_adj: c.homeless_acq_adj ?? 0,
  }))

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
          <h1 className="text-xl font-bold">Basis Calculation</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <BasisCalculationClient dealId={deal.id} initialConfigs={initialConfigs} deps={deps} />
      </div>
    </div>
  )
}
