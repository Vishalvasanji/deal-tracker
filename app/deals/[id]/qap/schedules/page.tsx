import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { SchedulesClient } from '@/components/qap/SchedulesClient'
import type { SchedulesPulled } from '@/lib/qap-schedules'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

type Row = Record<string, string>

export default async function SchedulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [schedFields, s11Fields, s12Fields] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'schedules'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
  ])

  const s11 = Object.fromEntries(s11Fields.map(f => [f.field_key, f.value ?? '']))
  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))

  const pulled: SchedulesPulled = {
    taxpayerName: s11['taxpayer_name'] ?? '',
    taxpayerIs: s11['taxpayer_is'] ?? '',
    taxpayerTaxId: s11['taxpayer_tax_id'] ?? '',
    controllingPrincipalName: s11['controlling_principal_name'] ?? '',
    controllingPrincipalRole: s11['controlling_principal_is'] ?? '',
    taxpayerContact: s11['taxpayer_contact'] ?? '',
    taxpayerEmail: s11['taxpayer_email'] ?? '',
    taxpayerPhone: s11['taxpayer_phone'] ?? '',
    taxpayerAddress: s11['taxpayer_address'] ?? '',
    taxpayerCityStateZip: s11['taxpayer_city_state_zip'] ?? '',
    builderRelated: s11['ioi_dev_builder'] ?? '',
    projectName: s12['project_name'] ?? '',
    streetAddress: s12['street_address'] ?? '',
    city: s12['city'] ?? '',
    parish: s12['parish'] ?? '',
    zip: s12['zip'] ?? '',
    isDistressed: s12['is_distressed'] ?? '',
  }

  const npGate = (s11['qualified_nonprofit'] ?? '') === 'Yes'
  const existingLhcGate = (s12['is_existing_lihtc'] ?? '') === 'Yes'
  const existingBuildingGate = (s12['existing_acquired'] ?? '') === 'Yes'

  const initialVals: Record<string, string> = {}
  const initialLists: Record<string, Row[]> = {}
  for (const f of schedFields) {
    if (f.field_key.endsWith('__json')) {
      const key = f.field_key.slice(0, -'__json'.length)
      try {
        const parsed = JSON.parse(f.value || '[]')
        if (Array.isArray(parsed)) initialLists[key] = parsed.filter(x => x && typeof x === 'object')
      } catch { /* ignore malformed */ }
    } else {
      initialVals[f.field_key] = f.value ?? ''
    }
  }

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
          <h1 className="text-xl font-bold">Schedules</h1>
        </div>
      </div>

      <SchedulesClient
        dealId={deal.id}
        pulled={pulled}
        npGate={npGate}
        existingLhcGate={existingLhcGate}
        existingBuildingGate={existingBuildingGate}
        initialVals={initialVals}
        initialLists={initialLists}
      />
    </div>
  )
}
