import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes, qapCostItems } from '@/lib/db/schema'
import { eq, or, asc } from 'drizzle-orm'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts } from '@/lib/qap-dev-costs-calc'
import { computeRevExp, type OtherLine } from '@/lib/qap-rev-exp-calc'
import { computeProforma } from '@/lib/qap-proforma-calc'
import { computeFinancing } from '@/lib/qap-financing-calc'
import { computeSelection } from '@/lib/qap-selection-calc'
import { evaluateUnitMix, unitMixMatrix, deriveRentLimits } from '@/lib/qap-unit-mix-eval'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const intOf = (s: string | undefined | null): number => {
  const n = parseInt(String(s ?? '').replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}
const num = (s: string | undefined | null): number => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const money = (n: number) => (n < 0 ? '-$' + Math.abs(Math.round(n)).toLocaleString() : '$' + Math.round(n).toLocaleString())
const dscrStr = (n: number) => (n > 0 ? n.toFixed(2) : '—')
const BR_HEADERS = ['0 BR', '1 BR', '2 BR', '3 BR', '4 BR']

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [allFields, units, costItems] = await Promise.all([
    db.select().from(qapFields).where(eq(qapFields.deal_id, deal.id)),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)).orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapCostItems).where(eq(qapCostItems.deal_id, deal.id)),
  ])
  const s: Record<string, Record<string, string>> = {}
  for (const f of allFields) (s[f.section] ??= {})[f.field_key] = f.value ?? ''
  const sec = (n: string) => s[n] ?? {}
  const s11 = sec('section_11'), s12 = sec('section_12'), s13 = sec('section_13'), s14 = sec('section_14')
  const s18 = sec('section_18'), s20 = sec('section_20'), s23 = sec('section_23'), s28 = sec('section_28'), s29 = sec('section_29')
  const dc = sec('development_costs'), pfSec = sec('proforma')
  const s20n = (k: string) => intOf(s20[k])

  // Unit mix aggregates
  let totalUnits = 0, lihtcUnits = 0, monthlyRent = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (u.is_lihtc) lihtcUnits += cnt
    monthlyRent += (u.monthly_rent ?? 0) * cnt
  }
  const annualGrossRent = monthlyRent * 12
  const matrix = unitMixMatrix(units)
  const um = evaluateUnitMix(units, s14['lihtc_set_aside_election'] ?? '', deriveRentLimits(s12, s23))

  // Revenues & Expenses
  const reAmounts: Record<string, number> = {}
  const reOthers: Record<string, OtherLine[]> = {}
  for (const f of allFields.filter(f => f.section === 'rev_exp')) {
    const key = f.field_key
    if (key.endsWith('__others')) {
      try {
        const p = JSON.parse(f.value || '[]')
        if (Array.isArray(p)) reOthers[key.slice(0, -'__others'.length)] = p
          .filter((o) => o && typeof o.amount !== 'undefined')
          .map((o) => ({ id: String(o.id ?? ''), label: String(o.label ?? ''), amount: num(String(o.amount)) }))
      } catch { /* ignore */ }
    } else if (key !== 'rev_comment' && key !== 'mustpay_comment' && key !== 'contingent_comment') {
      reAmounts[key] = num(f.value)
    }
  }
  const revExp = computeRevExp(reAmounts, reOthers, {
    totalUnits, lihtcUnits, annualGrossRent,
    buildingType: s12['building_type'] || undefined,
    cdbgDr: num(s13['cdbg_requested']) > 0,
  })

  // Development Costs (total + category subtotals + sources/uses balance)
  const amounts: Record<string, number> = {}
  for (const ci of costItems) amounts[ci.line_key] = ci.amount ?? 0
  for (const cat of DEV_COST_CATEGORIES) for (const line of cat.lines) if (line.pullKey) amounts[line.key] = s20n(line.pullKey)
  const modelSources = dc['model_total_sources'] ? intOf(dc['model_total_sources']) : null
  // Total permanent sources: prefer the structured §18 sum; fall back to the uploaded-model value.
  const financing = computeFinancing(s18, s13)
  const totalSources = financing.totalSources > 0 ? financing.totalSources : modelSources
  const devCosts = computeDevCosts(amounts, { totalUnits, totalSources })

  // Pro Forma (operating budget + DSCRs)
  const pmgmt = reAmounts['management_fee'] ?? 0
  const pct = (v: string | undefined, std: number) => { const t = (v ?? '').trim(); return (t === '' ? std : num(t)) / 100 }
  const pf = computeProforma({
    grossRent1: annualGrossRent,
    otherRevenue1: Math.max(0, revExp.revenueTotal - annualGrossRent),
    pmgmtFee1: pmgmt,
    otherOpEx1: Math.max(0, revExp.totalOperatingExpenses - pmgmt),
    reserve1: num(s29['s29_reserve_pupa']) * totalUnits,
    contingentAMFee1: Math.max(0, revExp.assetMgmt.allowableAsContingent),
    mustPayDebtService: (pfSec['must_pay_debt_service'] ?? '').trim() !== '' ? num(pfSec['must_pay_debt_service']) : financing.mustPayDebtService,
    otherDebtService: num(pfSec['other_debt_service']),
    vacancyY13: pct(s28['s28_vacancy_y1_3'], 7), vacancyY4: pct(s28['s28_vacancy_y4_plus'], 7),
    rentInflY13: pct(s28['s28_rent_infl_y1_3'], 2), rentInflY415: pct(s28['s28_rent_infl_y4_15'], 2),
    expenseInfl: pct(s28['s28_expense_infl'], 3), reserveEscalation: pct(s28['s28_adrr_escalation'], 0),
  })
  const y1 = pf.years[0]

  // Selection self-score
  const selfScores: Record<string, number> = {}
  for (const [k, v] of Object.entries(sec('selection'))) selfScores[k] = num(v)
  const selection = computeSelection({
    s12, s24: sec('section_24'), s25: sec('section_25'), s26: sec('section_26'), s27: sec('section_27'),
    totalUnits, pctUnitsAt30Ami: um.under30Pct, tdc: devCosts.total, selfScores,
  })

  const perUnit = (n: number) => (totalUnits > 0 ? money(n / totalUnits) : '—')
  const opexPupa = totalUnits > 0 ? Math.round(revExp.totalOperatingExpenses / totalUnits) : 0

  const info: [string, string][] = [
    ['Taxpayer', s11['taxpayer_name'] || '—'],
    ['Developer', s11['developer_name'] || '—'],
    ['Management Agent', s11['mgmt_agent_name'] || '—'],
    ['City', s12['city'] || '—'],
    ['Parish', s12['parish'] || '—'],
    ['Number of Units', totalUnits ? String(totalUnits) : '—'],
    ['Primary Development Type', s12['dev_type'] || '—'],
    ['LHC Funding Pool', s13['funding_pool'] || '—'],
    ['Credits Requested', s14['credits_requested'] ? money(num(s14['credits_requested'])) : '—'],
    ['Applicant Self-Score', `${Math.round(selection.totalSelf)} of ${selection.totalMax}`],
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/deals/${deal.id}/qap`} className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Project Summary</h1>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">A read-only roll-up of the application. Every figure is computed from the other modules.</p>

      {/* Project info */}
      <Card title="Project">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-black/[0.04] py-1.5">
              <span className="text-xs text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Unit mix matrix */}
      {matrix.grandTotal > 0 && (
        <Card title="Unit Mix Summary">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="text-left px-3 py-2 font-semibold">AMI Level</th>
                  {BR_HEADERS.map(h => <th key={h} className="text-center px-3 py-2 font-semibold">{h}</th>)}
                  <th className="text-center px-3 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {matrix.levels.map(l => (
                  <tr key={l.ami} className="border-b border-border/30 last:border-b-0">
                    <td className="px-3 py-1.5 font-medium">{l.label}</td>
                    {l.byBr.map((c, i) => <td key={i} className="px-3 py-1.5 text-center">{c > 0 ? c : <span className="text-muted-foreground/30">—</span>}</td>)}
                    <td className="px-3 py-1.5 text-center font-semibold">{l.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                  <td className="px-3 py-2">Total Units</td>
                  {matrix.brTotals.map((c, i) => <td key={i} className="px-3 py-2 text-center">{c > 0 ? c : <span className="text-muted-foreground/30">—</span>}</td>)}
                  <td className="px-3 py-2 text-center font-bold">{matrix.grandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Operating budget */}
      <Card title="Operating Budget (Year 1)">
        <Rows rows={[
          ['Effective Gross Income', money(y1.egi)],
          [`Total Operating Expenses  ($${opexPupa.toLocaleString()} PUPA)`, money(revExp.totalOperatingExpenses)],
          ['Replacement Reserve', money(y1.reserve)],
          ['Net Operating Income', money(y1.noi)],
          ['Must-Pay Debt Service', money(pf.totalDebtService)],
          ['Operating Cash Flow', money(y1.cashFlow)],
          ['Year 1 DSCR', dscrStr(pf.year1Dscr)],
        ]} />
      </Card>

      {/* Sources & Uses */}
      <Card title="Sources & Uses">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Uses · Total Development Cost</p>
            <Rows rows={[
              ...DEV_COST_CATEGORIES
                .map(c => [c.label, devCosts.subtotals[c.key] ?? 0] as [string, number])
                .filter(([, v]) => v !== 0)
                .map(([label, v]) => [label, `${money(v)}  ·  ${perUnit(v)}/unit`] as [string, string]),
              ['Total Development Cost', `${money(devCosts.total)}  ·  ${perUnit(devCosts.total)}/unit`],
            ]} strongLast />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources</p>
            <Rows rows={[
              ['Total Permanent Sources', totalSources != null && totalSources > 0 ? money(totalSources) : 'Not entered'],
              ['Total Development Cost', money(devCosts.total)],
            ]} strongLast />
            <p className={`text-xs mt-2 ${devCosts.sourcesUses.balanced ? 'text-emerald-600' : 'text-amber-600'}`}>
              {devCosts.sourcesUses.message}
            </p>
          </div>
        </div>
      </Card>

      {/* Future-year DSCRs */}
      <Card title="DSCR from Cash-Flow Pro Forma">
        <div className="flex flex-wrap gap-2">
          {[{ year: 1, dscr: pf.year1Dscr }, ...pf.futureDscr].map(f => (
            <div key={f.year} className="rounded-xl border border-border px-3 py-2 text-center min-w-[72px]">
              <p className="text-[11px] text-muted-foreground">Year {f.year}</p>
              <p className="text-sm font-semibold tabular-nums">{dscrStr(f.dscr)}</p>
            </div>
          ))}
        </div>
        {pf.hasDebtService && (pf.dscr15Above || pf.dscr15Below) && (
          <p className="text-xs text-rose-600 mt-2">
            {pf.dscr15Above ? 'Projected DSCR exceeds 1.40 through year 15.' : 'Projected DSCR falls below 1.00 through year 15.'} See Serious Problems.
          </p>
        )}
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-black/[0.06] p-5 space-y-3">
      <h2 className="font-semibold text-sm">{title}</h2>
      {children}
    </div>
  )
}

function Rows({ rows, strongLast }: { rows: [string, string][]; strongLast?: boolean }) {
  return (
    <div className="space-y-0">
      {rows.map(([k, v], i) => {
        const strong = strongLast && i === rows.length - 1
        return (
          <div key={k} className={`flex justify-between gap-3 py-1.5 ${strong ? 'border-t border-border mt-1 pt-2 font-semibold' : 'border-b border-black/[0.04]'}`}>
            <span className={`text-xs ${strong ? 'text-foreground' : 'text-muted-foreground'}`}>{k}</span>
            <span className="text-sm font-medium text-right tabular-nums">{v}</span>
          </div>
        )
      })}
    </div>
  )
}
