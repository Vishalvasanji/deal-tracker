import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { Section10Form } from '@/components/qap/Section10Form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function Section10Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const fields = await db
    .select()
    .from(qapFields)
    .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10')))

  const initial = Object.fromEntries(fields.map(f => [f.field_key, f.value ?? '']))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/deals/${deal.id}/qap`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Project Funding Characteristics</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <Section10Form dealId={deal.id} initial={initial} />
      </div>
    </div>
  )
}
