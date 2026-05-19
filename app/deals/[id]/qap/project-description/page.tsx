import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']

function SectionCard({
  number,
  title,
  filled,
  total,
  href,
}: {
  number: string
  title: string
  filled: number
  total: number
  href: string
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  const textColor = pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'

  return (
    <Link
      href={href}
      className="block bg-card rounded-2xl border border-black/[0.06] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{number}</p>
        <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
      </div>
      <p className="font-semibold text-sm mb-3">{title}</p>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{filled} of {total} fields complete</p>
    </Link>
  )
}

export default async function ProjectDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const section10Fields = await db
    .select()
    .from(qapFields)
    .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10')))

  const section10Filled = section10Fields.filter(
    f => SECTION_10_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

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
          <h1 className="text-xl font-bold">Project Description</h1>
        </div>
      </div>

      <div className="space-y-3">
        <SectionCard
          number="Section 10"
          title="Project Funding Characteristics"
          filled={section10Filled}
          total={SECTION_10_REQUIRED.length}
          href={`/deals/${deal.id}/qap/project-description/section-10`}
        />
      </div>
    </div>
  )
}
