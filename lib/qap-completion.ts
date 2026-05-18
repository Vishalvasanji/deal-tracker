import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'

const NARRATIVE_REQUIRED = ['project_name', 'parish_county', 'submitting_org', 'narrative']

export async function getQapCompletion(dealId: string) {
  const [narrativeFields, unitTypes] = await Promise.all([
    db
      .select()
      .from(qapFields)
      .where(and(eq(qapFields.deal_id, dealId), eq(qapFields.section, 'narrative'))),
    db.select().from(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId)),
  ])

  const narrativeFilled = narrativeFields.filter(
    f => NARRATIVE_REQUIRED.includes(f.field_key) && f.value?.trim()
  ).length

  const hasUnits = unitTypes.length > 0
  const unitMixFilled = unitTypes.filter(
    u => u.label && u.bedrooms != null && u.num_units != null && u.monthly_rent != null && u.ami_restriction
  ).length

  return {
    narrative: { filled: narrativeFilled, total: NARRATIVE_REQUIRED.length },
    unitMix: { filled: hasUnits ? unitMixFilled : 0, total: hasUnits ? unitTypes.length : 1 },
  }
}
