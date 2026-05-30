import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { computeRevExp, type OtherLine } from '@/lib/qap-rev-exp-calc'
import { computeFinancing } from '@/lib/qap-financing-calc'
import { ProformaClient } from '@/components/qap/ProformaClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const num = (s: string | null | undefined): number => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
// §28 rate stored as a percent number ("2" = 2%); fall back to the LHC standard when blank.
const pct = (v: string | undefined, std: number): number => {
  const s = (v ?? '').trim()
  return (s === '' ? std : num(s)) / 100
}

export default async function ProformaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [revExpFields, units, s12Fields, s13Fields, s18Fields, s28Fields, s29Fields, proformaFields] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'rev_exp'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_13'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_18'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_28'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_29'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'proforma'))),
  ])
  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s13 = Object.fromEntries(s13Fields.map(f => [f.field_key, f.value ?? '']))
  const s18 = Object.fromEntries(s18Fields.map(f => [f.field_key, f.value ?? '']))
  const s28 = Object.fromEntries(s28Fields.map(f => [f.field_key, f.value ?? '']))
  const s29 = Object.fromEntries(s29Fields.map(f => [f.field_key, f.value ?? '']))
  const pf = Object.fromEntries(proformaFields.map(f => [f.field_key, f.value ?? '']))
  const financing = computeFinancing(s18, s13)

  // Revenues & Expenses year-1 figures.
  const reAmounts: Record<string, number> = {}
  const reOthers: Record<string, OtherLine[]> = {}
  for (const f of revExpFields) {
    const key = f.field_key
    if (key.endsWith('__others')) {
      try {
        const parsed = JSON.parse(f.value || '[]')
        if (Array.isArray(parsed)) reOthers[key.slice(0, -'__others'.length)] = parsed
          .filter((o) => o && typeof o.amount !== 'undefined')
          .map((o) => ({ id: String(o.id ?? ''), label: String(o.label ?? ''), amount: num(String(o.amount)) }))
      } catch { /* ignore */ }
    } else if (key !== 'rev_comment' && key !== 'mustpay_comment' && key !== 'contingent_comment') {
      reAmounts[key] = num(f.value)
    }
  }

  let totalUnits = 0, lihtcUnits = 0, monthlyRent = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (u.is_lihtc) lihtcUnits += cnt
    monthlyRent += (u.monthly_rent ?? 0) * cnt
  }
  const annualGrossRent = monthlyRent * 12

  const revExp = computeRevExp(reAmounts, reOthers, {
    totalUnits, lihtcUnits, annualGrossRent,
    buildingType: s12['building_type'] || undefined,
    cdbgDr: num(s13['cdbg_requested']) > 0,
  })

  const grossRent1 = annualGrossRent
  const otherRevenue1 = Math.max(0, revExp.revenueTotal - grossRent1)
  const pmgmtFee1 = reAmounts['management_fee'] ?? 0                 // Property Management Fee (trends with rent)
  const otherOpEx1 = Math.max(0, revExp.totalOperatingExpenses - pmgmtFee1)
  const reserve1 = num(s29['s29_reserve_pupa']) * totalUnits          // §29 reserve PUPA × units
  const contingentAMFee1 = Math.max(0, revExp.assetMgmt.allowableAsContingent)

  const base = {
    grossRent1, otherRevenue1, pmgmtFee1, otherOpEx1, reserve1, contingentAMFee1,
    vacancyY13: pct(s28['s28_vacancy_y1_3'], 7),
    vacancyY4: pct(s28['s28_vacancy_y4_plus'], 7),
    rentInflY13: pct(s28['s28_rent_infl_y1_3'], 2),
    rentInflY415: pct(s28['s28_rent_infl_y4_15'], 2),
    expenseInfl: pct(s28['s28_expense_infl'], 3),
    reserveEscalation: pct(s28['s28_adrr_escalation'], 0),
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
          <h1 className="text-xl font-bold">Pro Forma Cash Flow</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <ProformaClient
          dealId={deal.id}
          base={base}
          computedDebtService={financing.mustPayDebtService}
          loans={financing.loans}
          initialDebtService={pf['must_pay_debt_service'] ?? ''}
          initialOtherDebt={pf['other_debt_service'] ?? ''}
        />
      </div>
    </div>
  )
}
