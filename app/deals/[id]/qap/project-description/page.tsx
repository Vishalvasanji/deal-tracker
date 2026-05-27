import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { ProjectDescriptionClient } from '@/components/qap/ProjectDescriptionClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function ProjectDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [
    section10Fields, section11Fields, section12Fields,
    section13Fields, section14Fields, section15Fields,
    section16Fields, section17Fields, section18Fields,
    section19Fields, section20Fields, section21Fields,
    section22Fields,
  ] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_10'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_13'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_14'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_15'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_16'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_17'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_18'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_19'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_20'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_21'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_22'))),
  ])

  const section10Initial = Object.fromEntries(section10Fields.map(f => [f.field_key, f.value ?? '']))
  const section11Initial = Object.fromEntries(section11Fields.map(f => [f.field_key, f.value ?? '']))
  const section12Initial = Object.fromEntries(section12Fields.map(f => [f.field_key, f.value ?? '']))
  const section13Initial = Object.fromEntries(section13Fields.map(f => [f.field_key, f.value ?? '']))
  const section14Initial = Object.fromEntries(section14Fields.map(f => [f.field_key, f.value ?? '']))
  const section15Initial = Object.fromEntries(section15Fields.map(f => [f.field_key, f.value ?? '']))
  const section16Initial = Object.fromEntries(section16Fields.map(f => [f.field_key, f.value ?? '']))
  const section17Initial = Object.fromEntries(section17Fields.map(f => [f.field_key, f.value ?? '']))
  const section18Initial = Object.fromEntries(section18Fields.map(f => [f.field_key, f.value ?? '']))
  const section19Initial = Object.fromEntries(section19Fields.map(f => [f.field_key, f.value ?? '']))
  const section20Initial = Object.fromEntries(section20Fields.map(f => [f.field_key, f.value ?? '']))
  const section21Initial = Object.fromEntries(section21Fields.map(f => [f.field_key, f.value ?? '']))
  const section22Initial = Object.fromEntries(section22Fields.map(f => [f.field_key, f.value ?? '']))

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

      <ProjectDescriptionClient
        dealId={deal.id}
        section10Initial={section10Initial}
        section11Initial={section11Initial}
        section12Initial={section12Initial}
        section13Initial={section13Initial}
        section14Initial={section14Initial}
        section15Initial={section15Initial}
        section16Initial={section16Initial}
        section17Initial={section17Initial}
        section18Initial={section18Initial}
        section19Initial={section19Initial}
        section20Initial={section20Initial}
        section21Initial={section21Initial}
        section22Initial={section22Initial}
      />
    </div>
  )
}
