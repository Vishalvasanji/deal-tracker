import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'

const NARRATIVE_REQUIRED  = ['narrative']
const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']
const SECTION_11_REQUIRED = [
  'taxpayer_name', 'taxpayer_is', 'taxpayer_is_a',
  'developer_name', 'developer_meets_vc1', 'developer_is_new',
  'other_credits_requested', 'ioi_dev_builder', 'not_in_good_standing',
  'qualified_nonprofit', 'is_chdo', 'mgmt_agent_name', 'mgmt_agent_ioi',
]
const SECTION_12_REQUIRED = [
  'project_name', 'street_address', 'city', 'parish', 'is_single_site', 'dev_type',
  'existing_acquired', 'rehab', 'substantial_rehab', 'historic_rehab',
  'purchase_price_500k', 'acq_cost_in_basis', 'rental_housing_acquired',
  'is_infill', 'is_flood_hazard', 'is_levee', 'building_type', 'other_building_types',
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
  's26_01_grocery_store', 's26_01_fresh_produce', 's26_01_public_library',
  's26_01_hospital_clinic', 's26_01_bank', 's26_01_school', 's26_01_college',
  's26_01_pharmacy', 's26_01_public_transit', 's26_01_day_care',
  's26_01_recreational_center', 's26_01_public_park', 's26_01_police_fire',
  's26_01_laundry', 's26_01_gym',
  's26_01_movie_theater', 's26_01_bowling_alley', 's26_01_trampoline_park',
  's26_01_laser_tag', 's26_01_entertainment_other',
  's26_02_junk_yard', 's26_02_processing_plant', 's26_02_high_voltage',
  's26_02_solid_waste', 's26_02_heavy_industrial', 's26_02_pig_chicken_farm',
  's26_02_distribution_facility', 's26_02_airport', 's26_02_salvage_yard', 's26_02_prison',
]
const SECTION_27_REQUIRED = [
  's27_01_green_building', 's27_02_community_facilities',
  's27_03_washers_dryers', 's27_03_dishwashers', 's27_03_free_wifi',
  's27_03_universal_design', 's27_03_hud_defensible_space',
  's27_03_fqhc',
  's27_04_playground', 's27_04_basketball_court', 's27_04_computer_center',
  's27_04_exercise_room', 's27_04_picnic_area', 's27_04_paved_walking_trail',
  's27_04_off_street_parking', 's27_04_community_garden', 's27_04_patio_balcony',
  's27_04_tennis_court', 's27_04_courtyard_seating', 's27_04_dog_park',
  's27_04_multipurpose_room',
  's27_05_accessible_units', 's27_08_onsite_security', 's27_09_resiliency',
  's27_09_tier1_2_parish',
  's27_10_eviction_prevention_plan', 's27_10_low_barrier_screening',
  's27_11_professional_services', 's27_11_sub_1_5pct', 's27_11_sub_over_5pct',
  's27_12_joint_venture',
]
// L-7: Added s28_proposed_vacancy
const SECTION_28_REQUIRED = ['s28_soft_market', 's28_adrr_escalation', 's28_proposed_vacancy']
const SECTION_29_REQUIRED = ['s29_hud_rd_mortgage', 's29_project_type', 's29_reserve_pupa']
// Sections 30, 31, 32, 34 have no user inputs — always complete (1/1)
const SECTION_33_REQUIRED = ['s33_agree_score']

export async function getQapCompletion(dealId: string) {
  const [
    narrativeFields, unitTypes,
    s10, s11, s12, s13, s14, s15, s16, s17, s18, s19,
    s20, s21, s22, s23, s24, s25, s26, s27, s28,
    s29, s33,
  ] = await Promise.all([
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'narrative'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId)),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_10'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_11'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_13'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_14'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_15'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_16'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_17'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_18'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_19'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_20'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_21'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_22'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_23'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_24'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_25'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_26'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_27'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_28'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_29'))),
    db.select().from(qapFields).where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_33'))),
  ])

  function count(rows: { field_key: string; value: string | null }[], req: string[]) {
    return rows.filter(f => req.includes(f.field_key) && f.value?.trim()).length
  }

  const hasCompleteRow = unitTypes.some(u =>
    u.bedrooms != null && u.baths != null && u.sqft != null && u.num_units != null && u.monthly_rent != null
  )

  return {
    narrative:  { filled: count(narrativeFields, NARRATIVE_REQUIRED),  total: NARRATIVE_REQUIRED.length },
    unitMix:    { filled: hasCompleteRow ? 1 : 0,                       total: 1 },
    section10:  { filled: count(s10, SECTION_10_REQUIRED),  total: SECTION_10_REQUIRED.length },
    section11:  { filled: count(s11, SECTION_11_REQUIRED),  total: SECTION_11_REQUIRED.length },
    section12:  { filled: count(s12, SECTION_12_REQUIRED),  total: SECTION_12_REQUIRED.length },
    section13:  { filled: count(s13, SECTION_13_REQUIRED),  total: SECTION_13_REQUIRED.length },
    section14:  { filled: count(s14, SECTION_14_REQUIRED),  total: SECTION_14_REQUIRED.length },
    section15:  { filled: count(s15, SECTION_15_REQUIRED),  total: SECTION_15_REQUIRED.length },
    section16:  { filled: count(s16, SECTION_16_REQUIRED),  total: SECTION_16_REQUIRED.length },
    section17:  { filled: count(s17, SECTION_17_REQUIRED),  total: SECTION_17_REQUIRED.length },
    section18:  { filled: count(s18, SECTION_18_REQUIRED),  total: SECTION_18_REQUIRED.length },
    section19:  { filled: count(s19, SECTION_19_REQUIRED),  total: SECTION_19_REQUIRED.length },
    section20:  { filled: count(s20, SECTION_20_REQUIRED),  total: SECTION_20_REQUIRED.length },
    section21:  { filled: count(s21, SECTION_21_REQUIRED),  total: SECTION_21_REQUIRED.length },
    section22:  { filled: count(s22, SECTION_22_REQUIRED),  total: SECTION_22_REQUIRED.length },
    section23:  { filled: count(s23, SECTION_23_REQUIRED),  total: SECTION_23_REQUIRED.length },
    section24:  { filled: count(s24, SECTION_24_REQUIRED),  total: SECTION_24_REQUIRED.length },
    section25:  { filled: count(s25, SECTION_25_REQUIRED),  total: SECTION_25_REQUIRED.length },
    section26:  { filled: count(s26, SECTION_26_REQUIRED),  total: SECTION_26_REQUIRED.length },
    section27:  { filled: count(s27, SECTION_27_REQUIRED),  total: SECTION_27_REQUIRED.length },
    section28:  { filled: count(s28, SECTION_28_REQUIRED),  total: SECTION_28_REQUIRED.length },
    section29:  { filled: count(s29, SECTION_29_REQUIRED),  total: SECTION_29_REQUIRED.length },
    section30:  { filled: 1, total: 1 }, // read-only, always complete
    section31:  { filled: 1, total: 1 }, // read-only, always complete
    section32:  { filled: 1, total: 1 }, // computed from unit mix, always complete
    section33:  { filled: count(s33, SECTION_33_REQUIRED),  total: SECTION_33_REQUIRED.length },
    section34:  { filled: 1, total: 1 }, // optional free-text, always complete
  }
}
