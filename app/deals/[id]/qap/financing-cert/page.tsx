import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { FinancingCertClient } from '@/components/qap/FinancingCertClient'
import type { FinCertPulled } from '@/lib/qap-financing-cert'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

function num(s: string | null | undefined): number {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}

export default async function FinancingCertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [finFields, s11Fields, syndFields] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'financing_cert'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'syndication'))),
  ])

  const s11 = Object.fromEntries(s11Fields.map(f => [f.field_key, f.value ?? '']))
  const synd = Object.fromEntries(syndFields.map(f => [f.field_key, f.value ?? '']))

  const pulled: FinCertPulled = {
    controllingPrincipalName: s11['controlling_principal_name'] ?? '',
    syndName: synd['synd_name'] ?? '',
    syndAddress: [synd['synd_address'], synd['synd_city']].filter(Boolean).join(' '),
    syndPhone: synd['synd_phone'] ?? '',
    grossEquity: num(synd['gross_equity']),
    netEquity: num(synd['net_equity']),
  }

  const initialVals = Object.fromEntries(finFields.map(f => [f.field_key, f.value ?? '']))

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
          <h1 className="text-xl font-bold">Financing Certification</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <FinancingCertClient dealId={deal.id} pulled={pulled} initialVals={initialVals} />
      </div>
    </div>
  )
}
