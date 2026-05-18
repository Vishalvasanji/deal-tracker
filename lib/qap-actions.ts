'use server'

import { db } from './db'
import { qapFields, qapUnitTypes } from './db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { v4 as uuid } from 'uuid'

export async function upsertQapField(
  dealId: string,
  section: string,
  fieldKey: string,
  value: string
) {
  const existing = await db
    .select({ id: qapFields.id })
    .from(qapFields)
    .where(
      and(
        eq(qapFields.deal_id, dealId),
        eq(qapFields.section, section),
        eq(qapFields.field_key, fieldKey)
      )
    )
    .limit(1)

  const now = new Date().toISOString()

  if (existing.length > 0) {
    await db
      .update(qapFields)
      .set({ value, updated_at: now })
      .where(eq(qapFields.id, existing[0].id))
  } else {
    await db.insert(qapFields).values({
      id: uuid(),
      deal_id: dealId,
      section,
      field_key: fieldKey,
      value,
      updated_at: now,
    })
  }

  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/narrative`)
}

export async function upsertQapUnitType(
  dealId: string,
  rowIndex: number,
  data: {
    label?: string | null
    bedrooms?: number | null
    baths?: number | null
    sqft?: number | null
    num_units?: number | null
    is_lihtc?: number
    is_staff?: number
    is_subsidy?: number
    is_psh?: number
    ami_restriction?: string
    monthly_rent?: number | null
  }
) {
  const existing = await db
    .select({ id: qapUnitTypes.id })
    .from(qapUnitTypes)
    .where(and(eq(qapUnitTypes.deal_id, dealId), eq(qapUnitTypes.row_index, rowIndex)))
    .limit(1)

  const now = new Date().toISOString()

  if (existing.length > 0) {
    await db
      .update(qapUnitTypes)
      .set({
        label: data.label ?? null,
        bedrooms: data.bedrooms ?? null,
        baths: data.baths ?? null,
        sqft: data.sqft ?? null,
        num_units: data.num_units ?? null,
        is_lihtc: data.is_lihtc ?? 1,
        is_staff: data.is_staff ?? 0,
        is_subsidy: data.is_subsidy ?? 0,
        is_psh: data.is_psh ?? 0,
        ami_restriction: data.ami_restriction ?? '60',
        monthly_rent: data.monthly_rent ?? null,
        updated_at: now,
      })
      .where(eq(qapUnitTypes.id, existing[0].id))
  } else {
    await db.insert(qapUnitTypes).values({
      id: uuid(),
      deal_id: dealId,
      row_index: rowIndex,
      label: data.label ?? null,
      bedrooms: data.bedrooms ?? null,
      baths: data.baths ?? null,
      sqft: data.sqft ?? null,
      num_units: data.num_units ?? null,
      is_lihtc: data.is_lihtc ?? 1,
      is_staff: data.is_staff ?? 0,
      is_subsidy: data.is_subsidy ?? 0,
      is_psh: data.is_psh ?? 0,
      ami_restriction: data.ami_restriction ?? '60',
      monthly_rent: data.monthly_rent ?? null,
      updated_at: now,
    })
  }

  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/unit-mix`)
}

export async function deleteQapUnitType(id: string, dealId: string) {
  await db.delete(qapUnitTypes).where(eq(qapUnitTypes.id, id))
  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/unit-mix`)
}
