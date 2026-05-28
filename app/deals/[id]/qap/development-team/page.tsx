import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapFields } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { DevelopmentTeamClient, type PulledMember } from '@/components/qap/DevelopmentTeamClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function DevelopmentTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [s11r, teamr] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'dev_team'))),
  ])

  const s11 = Object.fromEntries(s11r.map(f => [f.field_key, f.value ?? '']))
  const manualInitial = Object.fromEntries(teamr.map(f => [f.field_key, f.value ?? '']))

  const contact = s11['taxpayer_contact'] || ''
  const phone = s11['taxpayer_phone'] || ''
  const email = s11['taxpayer_email'] || ''

  // Auto-pulled members (Project Description §11). Developer/Taxpayer/Controlling Principal share
  // the single taxpayer point-of-contact (Excel reuses E39/E40/E41). Management Co. is §11.07.
  const pulled: PulledMember[] = [
    { role: 'Developer / Sponsor', name: s11['developer_name'] || '', line2: s11['developer_address'] || '', line3: s11['developer_city_state_zip'] || '', contact, phone, email },
    { role: 'Taxpayer', name: s11['taxpayer_name'] || '', line2: s11['taxpayer_address'] || '', line3: s11['taxpayer_city_state_zip'] || '', contact, phone, email },
    { role: 'Controlling Principal', name: s11['controlling_principal_name'] || '', line2: s11['controlling_principal_is'] || '', contact, phone, email },
    { role: 'Management Co.', name: s11['mgmt_agent_name'] || '', line2: s11['mgmt_agent_address'] || '', line3: s11['mgmt_agent_city_state_zip'] || '' },
  ]

  // Name prefills from the deal record (only when present).
  const prefills: Record<string, string> = {}
  if (deal.partner) prefills['fiscal_partner'] = deal.partner
  if (deal.lender) { prefills['constr_lender'] = deal.lender; prefills['perm_lender'] = deal.lender }
  if (deal.gc) prefills['builder'] = deal.gc

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
          <h1 className="text-xl font-bold">Development Team</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5">
        <DevelopmentTeamClient
          dealId={deal.id}
          pulled={pulled}
          manualInitial={manualInitial}
          prefills={prefills}
        />
      </div>
    </div>
  )
}
