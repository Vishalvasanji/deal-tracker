import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes, qapCostItems, qapBasisConfigs } from '@/lib/db/schema'
import { eq, or, asc } from 'drizzle-orm'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts, type BasisAdjustment } from '@/lib/qap-dev-costs-calc'
import { computeBasis, type BasisConfigInput } from '@/lib/qap-basis-calc'
import { computeRevExp, type OtherLine } from '@/lib/qap-rev-exp-calc'
import { computeReserveAdequacy } from '@/lib/qap-reserve-adequacy-calc'
import { RESERVE_YEARS, INTEREST_RATE_DEFAULT, INFLATION_RATE_DEFAULT } from '@/lib/qap-reserve-adequacy'
import { computeSyndication } from '@/lib/qap-syndication-calc'
import { V_FIXED_ITEMS, VI_FIXED_ITEMS } from '@/lib/qap-syndication'
import { computeFlags, type Flag } from '@/lib/qap-flags'
import { evaluateUnitMix, deriveRentLimits } from '@/lib/qap-unit-mix-eval'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

// ── parse helpers ────────────────────────────────────────────────────────────
const intOf = (s: string | undefined | null): number => {
  const n = parseInt(String(s ?? '').replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}
const num = (s: string | undefined | null): number => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
// Normalize a rate/boost: "0.09" | "9" | "9%" → 0.09
const normRate = (s: string | undefined | null): number => {
  const v = parseFloat(String(s ?? '').replace(/[%\s]/g, ''))
  if (isNaN(v)) return 0
  return v >= 1 ? v / 100 : v
}
function jsonArr(raw: string | undefined): Record<string, unknown>[] {
  try { const p = JSON.parse(raw || '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
}

// Display order + icon route for the module groups.
const MODULE_ORDER = [
  'Project Description', 'Unit Mix and Rents', 'Development Costs', 'Basis Calculation',
  'Revenues and Expenses', 'Reserve Adequacy', 'Syndication', 'Proforma',
]

export default async function SeriousProblemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [allFields, units, costItems, basisConfigs] = await Promise.all([
    db.select().from(qapFields).where(eq(qapFields.deal_id, deal.id)),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)).orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
    db.select().from(qapBasisConfigs).where(eq(qapBasisConfigs.deal_id, deal.id)).orderBy(asc(qapBasisConfigs.config_index)),
  ])

  // Group all scalar fields by section: s['section_12']['parish'], etc.
  const s: Record<string, Record<string, string>> = {}
  for (const f of allFields) (s[f.section] ??= {})[f.field_key] = f.value ?? ''
  const sec = (name: string) => s[name] ?? {}
  const s10 = sec('section_10'), s12 = sec('section_12'), s13 = sec('section_13')
  const s14 = sec('section_14'), s15 = sec('section_15'), s18 = sec('section_18')
  const s20 = sec('section_20'), s23 = sec('section_23'), s28 = sec('section_28'), s29 = sec('section_29')
  const dc = sec('development_costs'), syn = sec('syndication'), ra = sec('reserve_adequacy')
  const s20n = (k: string) => intOf(s20[k])

  // ── Unit Mix aggregates (shared by Dev Costs / Basis / Rev-Exp) ──
  const unitsByBr = [0, 0, 0, 0, 0]
  let totalUnits = 0, staffUnits = 0, lihtcUnits = 0
  let totalSqft = 0, staffSqft = 0, lihtcSqft = 0, monthlyRent = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    const sf = (u.sqft ?? 0) * cnt
    totalUnits += cnt; totalSqft += sf; monthlyRent += (u.monthly_rent ?? 0) * cnt
    if (u.is_lihtc) { lihtcUnits += cnt; lihtcSqft += sf }
    if (u.is_staff && !u.is_lihtc) { staffUnits += cnt; staffSqft += sf }
    if (u.bedrooms != null && u.bedrooms >= 0 && u.bedrooms <= 4) unitsByBr[u.bedrooms] += cnt
  }
  const residUnits = totalUnits - staffUnits
  const residSqft = totalSqft - staffSqft
  const annualGrossRent = monthlyRent * 12

  // ── Revenues & Expenses ──
  const reAmounts: Record<string, number> = {}
  const reOthers: Record<string, OtherLine[]> = {}
  for (const f of allFields.filter(f => f.section === 'rev_exp')) {
    const key = f.field_key
    if (key.endsWith('__others')) {
      reOthers[key.slice(0, -'__others'.length)] = jsonArr(f.value ?? '')
        .map(o => ({ id: String(o.id ?? ''), label: String(o.label ?? ''), amount: num(String(o.amount)) }))
    } else if (key !== 'rev_comment' && key !== 'mustpay_comment' && key !== 'contingent_comment') {
      reAmounts[key] = num(f.value)
    }
  }
  const revExp = computeRevExp(reAmounts, reOthers, {
    totalUnits, lihtcUnits, annualGrossRent,
    buildingType: s12['building_type'] || undefined,
    cdbgDr: num(s13['cdbg_requested']) > 0,
  })

  // ── Development Costs ──
  const amounts: Record<string, number> = {}
  for (const ci of costItems) amounts[ci.line_key] = ci.amount ?? 0
  for (const cat of DEV_COST_CATEGORIES) for (const line of cat.lines) {
    if (line.pullKey) amounts[line.key] = s20n(line.pullKey) // §20 read-only pulls override
  }
  let basisAdjustments: BasisAdjustment[] = []
  try {
    const p = JSON.parse(dc['s38_adjustments_json'] || '[]')
    if (Array.isArray(p)) basisAdjustments = p.filter((a) => a && (a.basis_type === 'acq' || a.basis_type === 'constr') && typeof a.amount === 'number')
  } catch { basisAdjustments = [] }
  const modelSources = dc['model_total_sources'] ? intOf(dc['model_total_sources']) : null

  const devCosts = computeDevCosts(amounts, {
    parish: s12['parish'] || undefined,
    buildingType: s12['building_type'] || undefined,
    unitsByBr, totalUnits,
    totalSources: modelSources,
    bondFinanced: s10['bond_financing'] === 'Yes',
    is4pct: s10['lihtc_4pct'] === 'Yes',
    bondIssuanceCosts: intOf(s10['costs_of_issuance']),
    basisAdjustments,
    outOfBasisCommunityFacilities: Math.max(0, s20n('s20_06_community_fac_cost') - s20n('s20_06_in_basis')),
    outOfBasisCommunityService: Math.max(0, s20n('s20_07_cost') - s20n('s20_07_in_basis')),
    commercialDevCost: s20n('s20_14_commercial_cost'),
    relatedPartyPayments: [1, 2, 3, 4, 5, 6].reduce((t, i) => t + s20n(`s20_04_payment_${i}_amount`), 0),
    isSro: s12['is_sro'] === 'Yes',
    isAntiDiscrimination: s12['is_reallocated_credits'] === 'Yes',
    federalGrants: [14, 15, 16].reduce((t, i) => t + (s18[`s18_${i}_federal_grant`] === 'Yes' ? intOf(s18[`s18_${i}_funding_amount`]) : 0), 0),
    homeBasisReduction: s18['s18_04_loan_type'] === 'Forgiven at maturity' ? intOf(s13['home_requested']) : 0,
  })

  // ── Basis Calculation ──
  const dealType: '9%' | '4%' | 'none' =
    s10['lihtc_9pct'] === 'Yes' ? '9%' : s10['lihtc_4pct'] === 'Yes' ? '4%' : 'none'
  let constructionCreditRate = 0, acquisitionCreditRate = 0
  if (dealType === '9%') {
    constructionCreditRate = 0.09
    acquisitionCreditRate = normRate(s14['acq_credit_rate'])
  } else if (dealType === '4%') {
    const r = normRate(s10['housing_credit_rate'])
    constructionCreditRate = r; acquisitionCreditRate = r
  }
  const basisInputs: BasisConfigInput[] = basisConfigs.map(c => ({
    config_index: c.config_index, label: c.label,
    num_buildings: c.num_buildings ?? 0,
    resid_staff_sqft: c.resid_staff_sqft ?? 0, common_sqft: c.common_sqft ?? 0, commercial_sqft: c.commercial_sqft ?? 0,
    lihtc_units: c.lihtc_units ?? 0, resid_units: c.resid_units ?? 0,
    lihtc_sqft: c.lihtc_sqft ?? 0, resid_sqft: c.resid_sqft ?? 0,
    homeless_constr_adj: c.homeless_constr_adj ?? 0, homeless_acq_adj: c.homeless_acq_adj ?? 0,
  }))
  const basis = computeBasis(basisInputs, {
    adjustedConstructionBasis: devCosts.basis.adjustedConstructionBasis,
    adjustedAcquisitionBasis: devCosts.basis.adjustedAcquisitionBasis,
    constructionBoost: normRate(s15['construction_basis_boost']),
    acquisitionBoost: normRate(s15['acquisition_basis_boost']),
    constructionCreditRate, acquisitionCreditRate, dealType,
    projTotalBuildings: s20n('s20_09_total_buildings'),
    projResidStaffSqft: residSqft + staffSqft,
    projLihtcUnits: lihtcUnits, projResidUnits: residUnits,
    projLihtcSqft: lihtcSqft, projResidSqft: residSqft,
  })

  // ── Reserve Adequacy (only surfaced once a capital need is entered) ──
  const rawNeeds = jsonArr(ra['capital_needs__json']).map(v => num(String(v)))
  const capitalNeeds = Array.from({ length: RESERVE_YEARS }, (_, i) => rawNeeds[i] ?? 0)
  const reserveStarted = capitalNeeds.some(v => v > 0)
  const rrDeposit = costItems.find(ci => ci.line_key === 'replacement_reserve_deposit')?.amount ?? 0
  const reservePupa = num(s29['s29_reserve_pupa'])
  const reserve = computeReserveAdequacy({
    initialDeposit: rrDeposit,
    annualDepositY1: reservePupa * totalUnits,
    escalation: num(s28['s28_adrr_escalation']),
    totalUnits,
    interestRate: num((ra['interest_rate'] || String(INTEREST_RATE_DEFAULT))) / 100,
    inflationRate: num((ra['inflation_rate'] || String(INFLATION_RATE_DEFAULT))) / 100,
    capitalNeeds,
  })

  // ── Syndication ──
  const vTotal = V_FIXED_ITEMS.reduce((t, it) => t + num(syn[`${it.key}_amount`]), 0)
    + jsonArr(syn['v_others__json']).reduce((t, o) => t + num(String(o.amount)), 0)
  const viTotal = VI_FIXED_ITEMS.reduce((t, it) => t + num(syn[`${it.key}_amount`]), 0)
    + jsonArr(syn['vi_others__json']).reduce((t, o) => t + num(String(o.amount)), 0)
  const synd = computeSyndication({
    pctAcquired: num(syn['pct_acquired']) / 100,
    proceeds: num(syn['proceeds']),
    grossEquity: num(syn['gross_equity']),
    taxCredits: num(s14['credits_requested']),
    isPublic: (syn['is_public'] ?? 'Private') === 'Public',
    eventInstallments: jsonArr(syn['events__json']).map(e => num(String(e.installment))),
    vCostTotal: vTotal, viCostTotal: viTotal,
    netCompounding: num(syn['vii_compounding']),
    netDiscounting: num(syn['vii_discounting']),
  })
  const devCostsSyndTotal = costItems.filter(ci => ci.category === 'syndication').reduce((t, ci) => t + (ci.amount ?? 0), 0)

  // ── Unit Mix evaluation ──
  const um = evaluateUnitMix(units, s14['lihtc_set_aside_election'] ?? '', deriveRentLimits(s12, s23))

  // ── Aggregate every flag ──
  const flags = computeFlags({
    s,
    devCosts,
    basis,
    revExp: revExp.totalOperatingExpenses > 0 ? revExp : null, // suppress "below minimum" before any expense entered
    reserve: reserveStarted ? reserve : null,
    synd,
    devCostsSyndTotal,
    unitMix: {
      setAsideElection: um.setAsideElection,
      setAsideMet: um.setAsideMet,
      totalUnits: um.totalUnits,
      unitsUnder30: um.unitsUnder30,
      rowFlagCount: um.rowFlagCount,
    },
  })

  const errorCount = flags.filter(f => f.severity === 'error').length
  const warnCount = flags.filter(f => f.severity === 'warning').length

  // Group by module, errors first within a group, modules in MODULE_ORDER.
  const groups = new Map<string, { route: string; flags: Flag[] }>()
  for (const f of flags) {
    const g = groups.get(f.module) ?? { route: f.route, flags: [] }
    g.flags.push(f)
    groups.set(f.module, g)
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => {
    const ia = MODULE_ORDER.indexOf(a[0]); const ib = MODULE_ORDER.indexOf(b[0])
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  for (const [, g] of orderedGroups) {
    g.flags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
  }

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
          <h1 className="text-xl font-bold">Serious Problems</h1>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Every error and warning the application computes across modules, each linked back to its source.
        Mirrors the QAP &ldquo;Serious Problems&rdquo; sheet.
      </p>

      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${errorCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-muted text-muted-foreground'}`}>
          <AlertCircle className="h-3.5 w-3.5" /> {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${warnCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground'}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> {warnCount} {warnCount === 1 ? 'Warning' : 'Warnings'}
        </span>
      </div>

      {flags.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">No serious problems found</p>
            <p className="text-xs text-emerald-600/80">No module is reporting an error or warning for this application.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedGroups.map(([module, g]) => (
            <div key={module} className="bg-card rounded-2xl border border-black/[0.06] overflow-hidden">
              <Link
                href={`/deals/${deal.id}/qap/${g.route}`}
                className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] hover:bg-muted/40 transition-colors"
              >
                <span className="font-semibold text-sm">{module}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {g.flags.length} {g.flags.length === 1 ? 'issue' : 'issues'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <ul className="divide-y divide-black/[0.04]">
                {g.flags.map((f, i) => (
                  <li key={i}>
                    <Link
                      href={`/deals/${deal.id}/qap/${f.route}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      {f.severity === 'error'
                        ? <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        {f.section && <p className="text-[11px] font-medium text-muted-foreground">{f.section}</p>}
                        <p className="text-sm text-foreground">{f.message}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
