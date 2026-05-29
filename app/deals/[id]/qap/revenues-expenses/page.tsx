import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { RevenueExpensesClient } from '@/components/qap/RevenueExpensesClient'
import type { OtherLine } from '@/lib/qap-rev-exp-calc'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const COMMENT_KEYS = new Set(['rev_comment', 'mustpay_comment', 'contingent_comment'])

function num(s: string | null | undefined): number {
  const v = parseFloat(String(s ?? '').replace(/[$,\s]/g, ''))
  return isNaN(v) ? 0 : v
}

export default async function RevenuesExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [revExpFields, units, s12Fields, s13Fields] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'rev_exp'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_13'))),
  ])
  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s13 = Object.fromEntries(s13Fields.map(f => [f.field_key, f.value ?? '']))

  const initialAmounts: Record<string, number> = {}
  const initialOthers: Record<string, OtherLine[]> = {}
  const initialComments: Record<string, string> = {}

  for (const f of revExpFields) {
    const key = f.field_key
    if (key.endsWith('__others')) {
      const groupKey = key.slice(0, -'__others'.length)
      try {
        const parsed = JSON.parse(f.value || '[]')
        if (Array.isArray(parsed)) {
          initialOthers[groupKey] = parsed
            .filter((o) => o && typeof o.amount !== 'undefined')
            .map((o) => ({ id: String(o.id ?? crypto.randomUUID()), label: String(o.label ?? ''), amount: num(String(o.amount)) }))
        }
      } catch { /* ignore malformed */ }
    } else if (COMMENT_KEYS.has(key)) {
      initialComments[key] = f.value ?? ''
    } else {
      initialAmounts[key] = num(f.value)
    }
  }

  // Unit Mix aggregates: total units and annual gross potential rents (Σ monthly rent × 12).
  let totalUnits = 0
  let lihtcUnits = 0
  let monthlyRent = 0
  for (const u of units) {
    const cnt = u.num_units ?? 0
    totalUnits += cnt
    if (u.is_lihtc) lihtcUnits += cnt
    monthlyRent += (u.monthly_rent ?? 0) * cnt
  }
  const annualGrossRent = monthlyRent * 12
  const cdbgDr = num(s13['cdbg_requested']) > 0

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
          <h1 className="text-xl font-bold">Revenues &amp; Expenses</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <RevenueExpensesClient
          dealId={deal.id}
          initialAmounts={initialAmounts}
          initialOthers={initialOthers}
          initialComments={initialComments}
          deps={{ totalUnits, annualGrossRent, lihtcUnits, buildingType: s12['building_type'] || undefined, cdbgDr }}
        />
      </div>
    </div>
  )
}
