'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Section10Form } from './Section10Form'
import { Section11Form } from './Section11Form'
import { Section12Form } from './Section12Form'
import { Section13Form } from './Section13Form'
import { Section14Form } from './Section14Form'
import { Section15Form } from './Section15Form'
import { Section16Form } from './Section16Form'
import { Section17Form } from './Section17Form'

const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']
const SECTION_11_REQUIRED = [
  'taxpayer_name', 'developer_name', 'developer_meets_vc1', 'developer_is_new',
  'other_credits_requested', 'ioi_dev_builder', 'not_in_good_standing',
  'qualified_nonprofit', 'is_chdo', 'mgmt_agent_name', 'mgmt_agent_ioi',
]
const SECTION_12_REQUIRED = [
  'project_name', 'street_address', 'city', 'parish',
  'is_single_site', 'dev_type',
  'existing_acquired', 'rehab', 'substantial_rehab', 'historic_rehab',
  'purchase_price_500k', 'acq_cost_in_basis',
  'rental_housing_acquired',
  'is_infill', 'is_flood_hazard', 'is_levee',
  'building_type', 'other_building_types',
  'census_tract', 'census_tract_outside',
  'is_dda', 'is_qct', 'is_tribal', 'is_choice_neighborhood', 'is_concerted_revitalization',
  'is_rural', 'is_incorporated', 'is_urban', 'is_town_15k',
  'is_distressed', 'is_redevelopment', 'is_owner_occupied_dev', 'is_existing_lihtc',
  'is_usda_funded', 'is_nonhistoric_rehab', 'is_blighted', 'is_rehab_infill',
  'is_historic_preservation', 'is_hap_contract', 'is_nc_infill_scattered',
  'is_homeownership', 'veteran_preference', 'is_preservation_property',
  'is_sro', 'is_reallocated_credits', 'receives_federal_funds', 'hud_rd_assistance', 'is_pha',
]
const SECTION_13_REQUIRED = ['funding_pool']
const SECTION_14_REQUIRED = ['credits_requested', 'nc_rehab_credit_rate', 'lihtc_set_aside_election']
const SECTION_15_REQUIRED = ['basis_boost_applying']
const SECTION_16_REQUIRED = [
  's16_anchor_date',
  's16_site_acq_days',
  's16_zoning_days',
  's16_site_analysis_days',
  's16_env_clearance_days',
  's16_cl_app_days',
  's16_cl_firm_days',
  's16_pl_firm_days',
  's16_plans_specs_days',
  's16_initial_closing_days',
  's16_constr_start_days',
]
const SECTION_17_REQUIRED = [
  'cp_funding_timeline',
  'cp_cost_coverage_plan',
  'cp_interest_expense_method',
  'cp_funding_sources_detail',
]

function SectionAccordion({
  number, title, fields, required, children,
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
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full p-5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{number}</p>
              <p className="font-semibold text-sm">{title}</p>
            </div>
          </div>
          <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-3 ml-7">
          <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
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
  section12Initial,
  section13Initial,
  section14Initial,
  section15Initial,
  section16Initial,
  section17Initial,
}: {
  dealId: string
  section10Initial: Record<string, string>
  section11Initial: Record<string, string>
  section12Initial: Record<string, string>
  section13Initial: Record<string, string>
  section14Initial: Record<string, string>
  section15Initial: Record<string, string>
  section16Initial: Record<string, string>
  section17Initial: Record<string, string>
}) {
  const isRural = section12Initial.is_rural === 'Yes'
  const isChdo = section11Initial.is_chdo === 'Yes'
  const bondFinancing = section10Initial.bond_financing === 'Yes'
  const lihtc4pct = section10Initial.lihtc_4pct === 'Yes'
  const lihtc9pct = section10Initial.lihtc_9pct === 'Yes'
  const existingAcquired = section12Initial.existing_acquired === 'Yes'
  const isSingleSite = section12Initial.is_single_site === 'Yes'
  const fundingPool = section13Initial.funding_pool ?? ''

  return (
    <div className="space-y-3">
      <SectionAccordion number="Section 10" title="Project Funding Characteristics" fields={section10Initial} required={SECTION_10_REQUIRED}>
        <Section10Form dealId={dealId} initial={section10Initial} />
      </SectionAccordion>

      <SectionAccordion number="Section 11" title="Characteristics of The Applicant" fields={section11Initial} required={SECTION_11_REQUIRED}>
        <Section11Form dealId={dealId} initial={section11Initial} />
      </SectionAccordion>

      <SectionAccordion number="Section 12" title="Characteristics of The Project" fields={section12Initial} required={SECTION_12_REQUIRED}>
        <Section12Form dealId={dealId} initial={section12Initial} />
      </SectionAccordion>

      <SectionAccordion number="Section 13" title="Selection of Funding Pool" fields={section13Initial} required={SECTION_13_REQUIRED}>
        <Section13Form dealId={dealId} initial={section13Initial} isRural={isRural} isChdo={isChdo} />
      </SectionAccordion>

      <SectionAccordion number="Section 14" title="Requests for LIHTCs" fields={section14Initial} required={SECTION_14_REQUIRED}>
        <Section14Form
          dealId={dealId}
          initial={section14Initial}
          bondFinancing={bondFinancing}
          lihtc9pct={lihtc9pct}
          existingAcquired={existingAcquired}
          fundingPool={fundingPool}
          isRural={isRural}
        />
      </SectionAccordion>

      <SectionAccordion number="Section 15" title="Basis Boost" fields={section15Initial} required={SECTION_15_REQUIRED}>
        <Section15Form
          dealId={dealId}
          initial={section15Initial}
          lihtc4pct={lihtc4pct}
          lihtc9pct={lihtc9pct}
          isSingleSite={isSingleSite}
        />
      </SectionAccordion>

      <SectionAccordion number="Section 16" title="Project Schedule" fields={section16Initial} required={SECTION_16_REQUIRED}>
        <Section16Form dealId={dealId} initial={section16Initial} />
      </SectionAccordion>

      <SectionAccordion number="Section 17" title="Construction Period Sources of Funds" fields={section17Initial} required={SECTION_17_REQUIRED}>
        <Section17Form dealId={dealId} initial={section17Initial} />
      </SectionAccordion>
    </div>
  )
}
