import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'

const NARRATIVE_REQUIRED = ['narrative']
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

export async function getQapCompletion(dealId: string) {
  const [narrativeFields, unitTypes, s10, s11, s12, s13, s14, s15] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'narrative'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_10'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_13'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_14'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_15'))),
  ])

  const narrativeFilled = narrativeFields.filter(f => NARRATIVE_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const hasCompleteRow = unitTypes.some(u => u.bedrooms != null && u.baths != null && u.sqft != null && u.num_units != null && u.monthly_rent != null)
  const s10Filled = s10.filter(f => SECTION_10_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const s11Filled = s11.filter(f => SECTION_11_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const s12Filled = s12.filter(f => SECTION_12_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const s13Filled = s13.filter(f => SECTION_13_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const s14Filled = s14.filter(f => SECTION_14_REQUIRED.includes(f.field_key) && f.value?.trim()).length
  const s15Filled = s15.filter(f => SECTION_15_REQUIRED.includes(f.field_key) && f.value?.trim()).length

  return {
    narrative: { filled: narrativeFilled, total: NARRATIVE_REQUIRED.length },
    unitMix: { filled: hasCompleteRow ? 1 : 0, total: 1 },
    section10: { filled: s10Filled, total: SECTION_10_REQUIRED.length },
    section11: { filled: s11Filled, total: SECTION_11_REQUIRED.length },
    section12: { filled: s12Filled, total: SECTION_12_REQUIRED.length },
    section13: { filled: s13Filled, total: SECTION_13_REQUIRED.length },
    section14: { filled: s14Filled, total: SECTION_14_REQUIRED.length },
    section15: { filled: s15Filled, total: SECTION_15_REQUIRED.length },
  }
}
