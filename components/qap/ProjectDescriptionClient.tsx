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
import { Section18Form } from './Section18Form'
import { Section19Form } from './Section19Form'
import { Section20Form } from './Section20Form'
import { Section21Form } from './Section21Form'
import { Section22Form } from './Section22Form'
import { Section23Form } from './Section23Form'
import { Section24Form } from './Section24Form'
import { Section25Form } from './Section25Form'
import { Section26Form } from './Section26Form'
import { Section27Form } from './Section27Form'
import { Section28Form } from './Section28Form'

const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']
const SECTION_11_REQUIRED = [
  'taxpayer_name', 'taxpayer_is', 'taxpayer_is_a',
  'developer_name', 'developer_meets_vc1', 'developer_is_new',
  'other_credits_requested', 'ioi_dev_builder', 'not_in_good_standing',
  'qualified_nonprofit', 'is_chdo', 'mgmt_agent_name', 'mgmt_agent_ioi',
]
const SECTION_12_REQUIRED = [
  'project_name', 'street_address', 'city', 'parish',
  'is_single_site', 'dev_type',
  'existing_acquired', 'rehab', 'substantial_rehab', 'historic_rehab',
  'purchase_price_500k', 'acq_cost_in_basis', 'rental_housing_acquired',
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
const SECTION_14_REQUIRED = ['credits_requested', 'lihtc_set_aside_election']
const SECTION_15_REQUIRED = ['basis_boost_applying']
const SECTION_16_REQUIRED = [
  's16_anchor_date',
  's16_site_acq_days', 's16_zoning_days', 's16_site_analysis_days',
  's16_env_clearance_days', 's16_cl_app_days', 's16_cl_conditional_days',
  's16_cl_firm_days', 's16_pl_app_days', 's16_pl_conditional_days',
  's16_pl_firm_days', 's16_plans_specs_days', 's16_initial_closing_days',
  's16_constr_start_days', 's16_complete_10_days', 's16_complete_50_days',
  's16_complete_90_days', 's16_completion_days', 's16_cert_occ_days',
  's16_pis_first_days', 's16_pis_final_days', 's16_occ_10pct_days', 's16_final_closing_days',
]
const SECTION_17_REQUIRED = ['cp_comment']
const SECTION_18_REQUIRED = [
  's18_01_active', 's18_02_active', 's18_03_active', 's18_04_active',
  's18_05_active', 's18_06_active', 's18_07_active', 's18_08_active',
  's18_09_active', 's18_10_active', 's18_11_active', 's18_12_active',
  's18_13_active', 's18_14_active', 's18_15_active', 's18_16_active',
]
const SECTION_19_REQUIRED = ['s19_comment']
const SECTION_20_REQUIRED = [
  's20_01_equipment', 's20_03_constr_mgr_fee', 's20_04_related_party_payments',
  's20_05_extraordinary_site_cost', 's20_07_community_svc', 's20_08_excess_costs_request',
  's20_09_total_buildings', 's20_09_total_configurations', 's20_10_cash_flow_note',
  's20_11_return_on_capital', 's20_12_has_staff_units', 's20_14_has_commercial',
]
const SECTION_21_REQUIRED = [
  's21_01_status', 's21_02_status', 's21_05_status', 's21_06_status',
  's21_07_status', 's21_08_status', 's21_09_status', 's21_10_status',
  's21_04_community_fac_sqft', 's21_04_community_svc_sqft', 's21_04_other_sqft',
]
const SECTION_22_REQUIRED = ['s22_comment']
const SECTION_23_REQUIRED = [
  's23_01_nonmetro_income_limit',
  's23_04_oven_range', 's23_04_refrigerator', 's23_04_microwave',
  's23_04_dishwasher', 's23_04_garbage_disposal', 's23_04_washer_dryer',
  's23_04_washer_dryer_hookup', 's23_04_heating_fuel', 's23_04_system_type',
  's23_05_cooking_fuel', 's23_05_cooking_payer', 's23_05_lighting_payer',
  's23_05_hot_water_fuel', 's23_05_hot_water_payer', 's23_05_water_payer',
  's23_05_heating_payer', 's23_05_ac_payer', 's23_05_sewer_payer', 's23_05_trash_payer',
  's23_06_ua_0br', 's23_06_ua_1br', 's23_06_ua_2br', 's23_06_ua_3br', 's23_06_ua_4br',
  's23_09_market_0br', 's23_09_market_1br', 's23_09_market_2br', 's23_09_market_3br', 's23_09_market_4br',
  's23_10_fmr_0br', 's23_10_fmr_1br', 's23_10_fmr_2br', 's23_10_fmr_3br', 's23_10_fmr_4br',
]
const SECTION_24_REQUIRED = ['s24_01_special_needs_points', 's24_03_elderly_100pct']
const SECTION_25_REQUIRED = ['s25_01_extended_afford_points', 's25_02_additional_financial']
const SECTION_26_REQUIRED = [
  's26_01_grocery_store', 's26_01_fresh_produce',
  's26_01_hospital_clinic', 's26_01_bank', 's26_01_school', 's26_01_college',
  's26_01_pharmacy', 's26_01_public_transit', 's26_01_day_care',
  's26_01_public_park', 's26_01_police_fire',
  's26_02_junk_yard', 's26_02_processing_plant', 's26_02_high_voltage',
  's26_02_solid_waste', 's26_02_heavy_industrial', 's26_02_pig_chicken_farm',
  's26_02_distribution_facility', 's26_02_airport', 's26_02_salvage_yard', 's26_02_prison',
]
const SECTION_27_REQUIRED = [
  's27_01_green_building', 's27_02_community_facilities',
  's27_03_washers_dryers', 's27_03_dishwashers', 's27_03_free_wifi',
  's27_03_universal_design', 's27_03_hud_defensible_space',
  's27_031_ceiling_fans', 's27_032_smart_thermostat',
  's27_04_playground', 's27_04_basketball_court', 's27_04_computer_center',
  's27_04_exercise_room', 's27_04_picnic_area', 's27_04_walking_trail',
  's27_04_off_street_parking', 's27_04_community_garden', 's27_04_patio_balcony',
  's27_04_tennis_court', 's27_04_courtyard_seating', 's27_04_dog_park',
  's27_04_multipurpose_room',
  's27_05_accessible_units', 's27_08_onsite_security', 's27_09_resiliency',
  's27_10_eviction_prevention_plan', 's27_10_low_barrier_screening',
  's27_11_professional_services', 's27_11_sub_1_5pct', 's27_11_sub_over_5pct',
  's27_12_joint_venture',
]
const SECTION_28_REQUIRED = ['s28_soft_market', 's28_adrr_escalation']

function SectionAccordion({
  number, title, fields, required, children,
}: {
  number: string; title: string
  fields: Record<string, string>; required: string[]
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
  section10Initial, section11Initial, section12Initial,
  section13Initial, section14Initial, section15Initial,
  section16Initial, section17Initial, section18Initial,
  section19Initial, section20Initial, section21Initial,
  section22Initial, section23Initial, section24Initial,
  section25Initial, section26Initial, section27Initial,
  section28Initial,
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
  section18Initial: Record<string, string>
  section19Initial: Record<string, string>
  section20Initial: Record<string, string>
  section21Initial: Record<string, string>
  section22Initial: Record<string, string>
  section23Initial: Record<string, string>
  section24Initial: Record<string, string>
  section25Initial: Record<string, string>
  section26Initial: Record<string, string>
  section27Initial: Record<string, string>
  section28Initial: Record<string, string>
}) {
  const isRural         = section12Initial.is_rural === 'Yes'
  const isChdo          = section11Initial.is_chdo === 'Yes'
  const bondFinancing   = section10Initial.bond_financing === 'Yes'
  const lihtc4pct       = section10Initial.lihtc_4pct === 'Yes'
  const lihtc9pct       = section10Initial.lihtc_9pct === 'Yes'
  const existingAcquired = section12Initial.existing_acquired === 'Yes'
  const isSingleSite    = section12Initial.is_single_site === 'Yes'
  const fundingPool     = section13Initial.funding_pool ?? ''

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
        <Section14Form dealId={dealId} initial={section14Initial} bondFinancing={bondFinancing} lihtc9pct={lihtc9pct} existingAcquired={existingAcquired} fundingPool={fundingPool} isRural={isRural} />
      </SectionAccordion>
      <SectionAccordion number="Section 15" title="Basis Boost" fields={section15Initial} required={SECTION_15_REQUIRED}>
        <Section15Form dealId={dealId} initial={section15Initial} lihtc4pct={lihtc4pct} lihtc9pct={lihtc9pct} isSingleSite={isSingleSite} />
      </SectionAccordion>
      <SectionAccordion number="Section 16" title="Project Schedule" fields={section16Initial} required={SECTION_16_REQUIRED}>
        <Section16Form dealId={dealId} initial={section16Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 17" title="Construction Period Sources of Funds" fields={section17Initial} required={SECTION_17_REQUIRED}>
        <Section17Form dealId={dealId} initial={section17Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 18" title="Permanent Sources of Funds" fields={section18Initial} required={SECTION_18_REQUIRED}>
        <Section18Form dealId={dealId} initial={section18Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 19" title="Summary — Permanent Sources" fields={section19Initial} required={SECTION_19_REQUIRED}>
        <Section19Form dealId={dealId} section18={section18Initial} initial={section19Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 20" title="Construction / Development of the Project" fields={section20Initial} required={SECTION_20_REQUIRED}>
        <Section20Form dealId={dealId} initial={section20Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 21" title="Complete Remaining Key Worksheets" fields={section21Initial} required={SECTION_21_REQUIRED}>
        <Section21Form dealId={dealId} initial={section21Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 22" title="Allowable LIHTCs" fields={section22Initial} required={SECTION_22_REQUIRED}>
        <Section22Form dealId={dealId} section14={section14Initial} section18={section18Initial} initial={section22Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 23" title="Information Related to Rent Limits" fields={section23Initial} required={SECTION_23_REQUIRED}>
        <Section23Form dealId={dealId} initial={section23Initial} parish={section12Initial.parish ?? ''} />
      </SectionAccordion>
      <SectionAccordion number="Section 24" title="Targeted Population Type" fields={section24Initial} required={SECTION_24_REQUIRED}>
        <Section24Form dealId={dealId} initial={section24Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 25" title="Priority Development Areas and Other Preferences" fields={section25Initial} required={SECTION_25_REQUIRED}>
        <Section25Form dealId={dealId} initial={section25Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 26" title="Location Characteristics" fields={section26Initial} required={SECTION_26_REQUIRED}>
        <Section26Form dealId={dealId} isRural={isRural} initial={section26Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 27" title="Project Characteristics" fields={section27Initial} required={SECTION_27_REQUIRED}>
        <Section27Form dealId={dealId} initial={section27Initial} />
      </SectionAccordion>
      <SectionAccordion number="Section 28" title="Trending Rates for Cash Flow Pro Forma" fields={section28Initial} required={SECTION_28_REQUIRED}>
        <Section28Form dealId={dealId} initial={section28Initial} />
      </SectionAccordion>
    </div>
  )
}
