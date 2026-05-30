import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes, qapCostItems } from '@/lib/db/schema'
import { eq, or, asc } from 'drizzle-orm'
import { getQapCompletion } from '@/lib/qap-completion'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts } from '@/lib/qap-dev-costs-calc'
import { MIN_SQFT, MIN_BATHS } from '@/lib/qap-unit-mix-eval'
import { evaluateChecklist, CHECKLIST_WORKSHEETS, type ChecklistContext, type ChecklistItem } from '@/lib/qap-checklist'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const intOf = (s: string | undefined | null): number => {
  const n = parseInt(String(s ?? '').replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}
const num = (s: string | undefined | null): number => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const yes = (v: string | undefined) => (v ?? '') === 'Yes'

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [allFields, units, costItems, completion] = await Promise.all([
    db.select().from(qapFields).where(eq(qapFields.deal_id, deal.id)),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)).orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
    getQapCompletion(deal.id),
  ])
  const s: Record<string, Record<string, string>> = {}
  for (const f of allFields) (s[f.section] ??= {})[f.field_key] = f.value ?? ''
  const sec = (n: string) => s[n] ?? {}
  const s10 = sec('section_10'), s11 = sec('section_11'), s12 = sec('section_12'), s13 = sec('section_13')
  const s15 = sec('section_15'), s18 = sec('section_18'), s20 = sec('section_20')
  const s24 = sec('section_24'), s25 = sec('section_25')
  const s20n = (k: string) => intOf(s20[k])

  // Dev Costs — for the TDC-over-limit and fee-violation conditions.
  const amounts: Record<string, number> = {}
  for (const ci of costItems) amounts[ci.line_key] = ci.amount ?? 0
  for (const cat of DEV_COST_CATEGORIES) for (const line of cat.lines) if (line.pullKey) amounts[line.key] = s20n(line.pullKey)
  let basisAdjustments: { id: string; basis_type: 'acq' | 'constr'; explanation: string; amount: number }[] = []
  try {
    const p = JSON.parse(sec('development_costs')['s38_adjustments_json'] || '[]')
    if (Array.isArray(p)) basisAdjustments = p.filter((a) => a && (a.basis_type === 'acq' || a.basis_type === 'constr') && typeof a.amount === 'number')
  } catch { basisAdjustments = [] }
  const unitsByBr = [0, 0, 0, 0, 0]
  let totalUnits = 0
  for (const u of units) { const c = u.num_units ?? 0; totalUnits += c; if (u.bedrooms != null && u.bedrooms >= 0 && u.bedrooms <= 4) unitsByBr[u.bedrooms] += c }
  const devCosts = computeDevCosts(amounts, {
    parish: s12['parish'] || undefined, buildingType: s12['building_type'] || undefined, unitsByBr, totalUnits,
    bondFinanced: s10['bond_financing'] === 'Yes', is4pct: s10['lihtc_4pct'] === 'Yes',
    basisAdjustments,
    outOfBasisCommunityFacilities: Math.max(0, s20n('s20_06_community_fac_cost') - s20n('s20_06_in_basis')),
    outOfBasisCommunityService: Math.max(0, s20n('s20_07_cost') - s20n('s20_07_in_basis')),
    commercialDevCost: s20n('s20_14_commercial_cost'),
    relatedPartyPayments: [1, 2, 3, 4, 5, 6].reduce((t, i) => t + s20n(`s20_04_payment_${i}_amount`), 0),
    isSro: s12['is_sro'] === 'Yes', isAntiDiscrimination: s12['is_reallocated_credits'] === 'Yes',
    federalGrants: [14, 15, 16].reduce((t, i) => t + (s18[`s18_${i}_federal_grant`] === 'Yes' ? intOf(s18[`s18_${i}_funding_amount`]) : 0), 0),
  })

  // Unit min size/bath failure (Checklist AO/AP).
  const unitSizeBathsFlag = units.some(u => {
    const br = u.bedrooms
    if (br == null || br < 0 || br > 4 || (u.num_units ?? 0) <= 0) return false
    return (u.sqft != null && u.sqft < MIN_SQFT[br]) || (u.baths != null && u.baths < MIN_BATHS[br])
  })

  const claimsSelectionPoints = Object.values(sec('selection')).some(v => num(v) > 0)

  const ctx: ChecklistContext = {
    existingAcquired: yes(s12['existing_acquired']),
    floodHazard: yes(s12['is_flood_hazard']),
    levee: yes(s12['is_levee']),
    historicRehab: yes(s12['historic_rehab']),
    rehab: yes(s12['rehab']),
    rentalHousingAcquired: yes(s12['rental_housing_acquired']),
    scatteredSite: (s12['is_single_site'] ?? '') === 'No',
    preservationProperty: yes(s12['is_preservation_property']),
    federalFunds: yes(s12['receives_federal_funds']),
    notInGoodStanding: yes(s11['not_in_good_standing']),
    chdo: yes(s11['is_chdo']),
    nonProfitPool: s13['funding_pool'] === 'Qualified Non-Profit/CHDO Set-Aside',
    basisBoost: num(s15['construction_basis_boost']) > 0 || num(s15['acquisition_basis_boost']) > 0,
    tdcExceeds: devCosts.hudTdc.exceeds,
    feeViolations: devCosts.violations.length > 0,
    unitSizeBathsFlag,
    specialNeeds: num(s24['s24_01_special_needs_points']) > 0,
    extendedAffordability: num(s25['s25_01_extended_afford_points']) > 0,
    claimsSelectionPoints,
  }

  const { required, notRequired } = evaluateChecklist(ctx)
  type Comp = Record<string, { filled: number; total: number }>
  const comp = completion as unknown as Comp
  const wsStatus = (key?: string) => {
    if (!key || !comp[key]) return null
    const c = comp[key]
    return c.total > 0 && c.filled >= c.total
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/deals/${deal.id}/qap`} className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Checklist</h1>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Threshold requirements and exhibits, sorted into what this project must submit and what it doesn&apos;t — driven by your answers. Verify each against the current QAP before submission.
      </p>

      {/* Worksheets */}
      <div className="bg-card rounded-2xl border border-black/[0.06] p-5 space-y-3">
        <h2 className="font-semibold text-sm">Worksheets to Complete</h2>
        <ul className="space-y-1.5">
          {CHECKLIST_WORKSHEETS.map((w, i) => {
            const done = wsStatus(w.completionKey)
            return (
              <li key={i} className="flex items-center gap-2 text-sm">
                {done === true
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : done === false
                  ? <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  : <Minus className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                <span className={done === true ? 'text-foreground' : 'text-muted-foreground'}>{w.label}</span>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground">A check marks worksheets the app tracks as complete; the rest are completed outside the app.</p>
      </div>

      {/* Required */}
      <Section title={`Required (${required.length})`} tone="required" items={required} />

      {/* Not currently required */}
      <Section title={`Not Currently Required (${notRequired.length})`} tone="not" items={notRequired} />
    </div>
  )
}

function Section({ title, tone, items }: { title: string; tone: 'required' | 'not'; items: ChecklistItem[] }) {
  const groups: Record<string, ChecklistItem[]> = {}
  for (const it of items) (groups[it.group] ??= []).push(it)
  return (
    <div className="bg-card rounded-2xl border border-black/[0.06] p-5 space-y-3">
      <h2 className="font-semibold text-sm">{title}</h2>
      {Object.entries(groups).map(([g, list]) => (
        <div key={g} className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{g}</p>
          <ul className="space-y-1">
            {list.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {tone === 'required'
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  : <Minus className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                <span className={tone === 'required' ? 'text-foreground' : 'text-muted-foreground'}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
