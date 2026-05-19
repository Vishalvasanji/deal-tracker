import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'

// Narrative tab has exactly one true user input â€” the narrative text itself.
// Project name, parish, and submitting org are referenced from Project Description.
const NARRATIVE_REQUIRED = ['narrative']

export async function getQapCompletion(dealId: string) {
  const [narrativeFields, unitTypes] = await Promise.all([
    db
      .select()
      .from(qapFields)
      .where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'narrative'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId)),
  ])

  // Narrative: only the narrative text itself is a required input here
  const narrativeFilled = narrativeFields.filter(
    f => NARRATIVE_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

  // Unit Mix: binary â€” 100% once at least one fully-populated row exists, 0% otherwise.
  // Always pasted in one shot so row-by-row tracking adds no value.
  const hasCompleteRow = unitTypes.some(
    u =>
      u.bedrooms != null &&
      u.baths != null &&
      u.sqft != null &&
      u.num_units != null &&
      u.monthly_rent != null
  )

  return {
    narrative: { filled: narrativeFilled, total: NARRATIVE_REQUIRED.length },
    unitMix: { filled: hasCompleteRow ? 1 : 0, total: 1 },
  }
}
