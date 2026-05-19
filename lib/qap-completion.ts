import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'

// Narrative tab has one true user input — the narrative text itself.
// Project name, parish, and submitting org are referenced from Project Description.
const NARRATIVE_REQUIRED = ['narrative']

// Section 10: always-required core Yes/No answers
const SECTION_10_REQUIRED = ['bond_financing', 'lihtc_9pct', 'other_lhc_funding']

// Section 11: required fields across all subsections
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

export async function getQapCompletion(dealId: string) {
  const [narrativeFields, unitTypes, section10Fields, section11Fields] = await Promise.all([
    db
      .select()
      .from(qapFields)
      .where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'narrative'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId)),
    db
      .select()
      .from(qapFields)
      .where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_10'))),
    db
      .select()
      .from(qapFields)
      .where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'section_11'))),
  ])

  // Narrative: only the narrative text itself is required here
  const narrativeFilled = narrativeFields.filter(
    f => NARRATIVE_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

  // Unit Mix: binary — 100% once at least one fully-populated row exists, 0% otherwise
  const hasCompleteRow = unitTypes.some(
    u =>
      u.bedrooms != null &&
      u.baths != null &&
      u.sqft != null &&
      u.num_units != null &&
      u.monthly_rent != null
  )

  // Section 10: count the three always-required Yes/No answers
  const section10Filled = section10Fields.filter(
    f => SECTION_10_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

  // Section 11: count required fields answered
  const section11Filled = section11Fields.filter(
    f => SECTION_11_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

  return {
    narrative: { filled: narrativeFilled, total: NARRATIVE_REQUIRED.length },
    unitMix: { filled: hasCompleteRow ? 1 : 0, total: 1 },
    section10: { filled: section10Filled, total: SECTION_10_REQUIRED.length },
    section11: { filled: section11Filled, total: SECTION_11_REQUIRED.length },
  }
}
