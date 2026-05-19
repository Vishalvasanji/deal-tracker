'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Section10Form } from './Section10Form'
import { Section11Form } from './Section11Form'

const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']
const SECTION_11_REQUIRED = [
  'taxpayer_name',
  'developer_name',
  'developer_meets_vc1',
  'developer_is_new',
  'other_credits_requested',
  'ioi_dev_builder',
  'not_in_good_standing',
  'qualified_nonprofit',
  'is_chdo',
  'mgmt_agent_name',
  'mgmt_agent_ioi',
]

function SectionAccordion({
  number,
  title,
  fields,
  required,
  children,
}: {
  number: string
  title: string
  fields: Record<string, string>
  required: string[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const filled = required.filter(k => fields[k]?.trim()).length
  const total = required.length
  const pct = Math.round((filled / total) * 100)
  const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  const textColor = pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'

  return (
    <div className="bg-card rounded-2xl border border-black/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{number}</p>
              <p className="font-semibold text-sm">{title}</p>
            </div>
          </div>
          <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-3 ml-7">
          <div
            className={`h-1.5 rounded-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-5">{children}</div>
        </div>
      )}
    </div>
  )
}

export function ProjectDescriptionClient({
  dealId,
  section10Initial,
  section11Initial,
}: {
  dealId: string
  section10Initial: Record<string, string>
  section11Initial: Record<string, string>
}) {
  return (
    <div className="space-y-3">
      <SectionAccordion
        number="Section 10"
        title="Project Funding Characteristics"
        fields={section10Initial}
        required={SECTION_10_REQUIRED}
      >
        <Section10Form dealId={dealId} initial={section10Initial} />
      </SectionAccordion>

      <SectionAccordion
        number="Section 11"
        title="Characteristics of The Applicant"
        fields={section11Initial}
        required={SECTION_11_REQUIRED}
      >
        <Section11Form dealId={dealId} initial={section11Initial} />
      </SectionAccordion>
    </div>
  )
}
