import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes } from '@/lib/db/schema'
import { eq, or, asc } from 'drizzle-orm'
import { UnitMixTable } from '@/components/qap/UnitMixTable'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function UnitMixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const units = await db
    .select()
    .from(qapUnitTypes)
    .where(eq(qapUnitTypes.deal_id, deal.id))
    .orderBy(asc(qapUnitTypes.row_index))

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
          <h1 className="text-xl font-bold">Unit Mix & Rents</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5 overflow-x-auto">
        <UnitMixTable dealId={deal.id} initialUnits={units} />
      </div>
    </div>
  )
}
