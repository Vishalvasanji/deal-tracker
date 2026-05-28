import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { SyndicationClient } from '@/components/qap/SyndicationClient'
import type { SyndEvent, SyndLender, SyndOther } from '@/lib/qap-syndication'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function num(s: string | null | undefined): number {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
function arr<T>(raw: string | undefined, map: (o: Record<string, unknown>) => T): T[] {
  try {
    const p = JSON.parse(raw || '[]')
    return Array.isArray(p) ? p.filter(x => x && typeof x === 'object').map(map) : []
  } catch { return [] }
}

export default async function SyndicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [syndr, s14r] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'syndication'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_14'))),
  ])

  const s = Object.fromEntries(syndr.map(f => [f.field_key, f.value ?? '']))
  const s14 = Object.fromEntries(s14r.map(f => [f.field_key, f.value ?? '']))
  const taxCredits = num(s14['credits_requested'])

  const initialScalars: Record<string, string> = {}
  for (const f of syndr) if (!f.field_key.endsWith('__json')) initialScalars[f.field_key] = f.value ?? ''

  const sstr = (o: Record<string, unknown>, k: string) => String(o[k] ?? '')
  const snum = (o: Record<string, unknown>, k: string) => num(String(o[k] ?? ''))

  const events = arr<SyndEvent>(s['events__json'], o => ({
    id: sstr(o, 'id') || crypto.randomUUID(), event: sstr(o, 'event'), date: sstr(o, 'date'),
    percentage: snum(o, 'percentage'), installment: snum(o, 'installment'),
  }))
  const lenders = arr<SyndLender>(s['lenders__json'], o => ({
    id: sstr(o, 'id') || crypto.randomUUID(), name: sstr(o, 'name'), address: sstr(o, 'address'),
    phone: sstr(o, 'phone'), contact: sstr(o, 'contact'), loanAmount: snum(o, 'loanAmount'),
    interestRate: snum(o, 'interestRate'), totalInterest: snum(o, 'totalInterest'), security: sstr(o, 'security'),
  }))
  const mapOther = (o: Record<string, unknown>): SyndOther => ({
    id: sstr(o, 'id') || crypto.randomUUID(), item: sstr(o, 'item'), payee: sstr(o, 'payee'), amount: snum(o, 'amount'),
  })
  const vOthers = arr<SyndOther>(s['v_others__json'], mapOther)
  const viOthers = arr<SyndOther>(s['vi_others__json'], mapOther)

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
          <h1 className="text-xl font-bold">Syndication</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <SyndicationClient
          dealId={deal.id}
          taxCredits={taxCredits}
          initialScalars={initialScalars}
          initialEvents={events}
          initialLenders={lenders}
          initialVOthers={vOthers}
          initialViOthers={viOthers}
        />
      </div>
    </div>
  )
}
