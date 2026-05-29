import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields, qapUnitTypes } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { ProjectDescriptionClient } from '@/components/qap/ProjectDescriptionClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function ProjectDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db.select().from(deals).where(or(eq(deals.id, id), eq(deals.deal_id, id))).limit(1)
  if (!deal) notFound()

  const sections = ['section_10','section_11','section_12','section_13','section_14',
    'section_15','section_16','section_17','section_18','section_19',
    'section_20','section_21','section_22','section_23','section_24',
    'section_25','section_26','section_27','section_28',
    'section_29','section_30','section_31','section_32','section_33','section_34'] as const

  const [results, unitTypes, syndFields] = await Promise.all([
    Promise.all(
      sections.map(sec =>
        db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, sec)))
      )
    ),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, deal.id)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'syndication'))),
  ])

  // PD18-1: Syndication gross equity invested, for the §18.10 match check.
  const syndGrossEquityRaw = syndFields.find(f => f.field_key === 'gross_equity')?.value ?? ''
  const syndGrossEquity = (() => {
    const v = parseFloat(String(syndGrossEquityRaw).replace(/[$,\s]/g, ''))
    return isNaN(v) ? 0 : v
  })()

  const totalUnits = unitTypes.reduce((sum, u) => sum + (u.num_units ?? 0), 0)
  const lihtcUnits = unitTypes.filter(u => u.is_lihtc).reduce((sum, u) => sum + (u.num_units ?? 0), 0)

  const [
    section10Fields, section11Fields, section12Fields, section13Fields, section14Fields,
    section15Fields, section16Fields, section17Fields, section18Fields, section19Fields,
    section20Fields, section21Fields, section22Fields, section23Fields, section24Fields,
    section25Fields, section26Fields, section27Fields, section28Fields,
    section29Fields, section30Fields, section31Fields, section32Fields, section33Fields, section34Fields,
  ] = results

  function toMap(fields: { field_key: string; value: string | null }[]) {
    return Object.fromEntries(fields.map(f => [f.field_key, f.value ?? '']))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/deals/${deal.id}/qap`} className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Project Description</h1>
        </div>
      </div>

      <ProjectDescriptionClient
        dealId={deal.id}
        totalUnits={totalUnits}
        lihtcUnits={lihtcUnits}
        syndGrossEquity={syndGrossEquity}
        section10Initial={toMap(section10Fields)}
        section11Initial={toMap(section11Fields)}
        section12Initial={toMap(section12Fields)}
        section13Initial={toMap(section13Fields)}
        section14Initial={toMap(section14Fields)}
        section15Initial={toMap(section15Fields)}
        section16Initial={toMap(section16Fields)}
        section17Initial={toMap(section17Fields)}
        section18Initial={toMap(section18Fields)}
        section19Initial={toMap(section19Fields)}
        section20Initial={toMap(section20Fields)}
        section21Initial={toMap(section21Fields)}
        section22Initial={toMap(section22Fields)}
        section23Initial={toMap(section23Fields)}
        section24Initial={toMap(section24Fields)}
        section25Initial={toMap(section25Fields)}
        section26Initial={toMap(section26Fields)}
        section27Initial={toMap(section27Fields)}
        section28Initial={toMap(section28Fields)}
        section29Initial={toMap(section29Fields)}
        section30Initial={toMap(section30Fields)}
        section31Initial={toMap(section31Fields)}
        section32Initial={toMap(section32Fields)}
        section33Initial={toMap(section33Fields)}
        section34Initial={toMap(section34Fields)}
      />
    </div>
  )
}
