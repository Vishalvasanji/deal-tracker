'use server'

import { db } from './db'
import { qapFields, qapUnitTypes, qapCostItems } from './db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { v4 as uuid } from 'uuid'
import { DEV_COST_LINES } from './qap-dev-costs'

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
  revalidatePath(`/deals/${dealId}/qap/project-description`)
  revalidatePath(`/deals/${dealId}/qap/project-description/section-10`)
  revalidatePath(`/deals/${dealId}/qap/development-costs`)
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

type UnitRowData = {
  row_index: number
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

export async function replaceQapUnitTypes(dealId: string, rows: UnitRowData[]) {
  const now = new Date().toISOString()

  await db.delete(qapUnitTypes).where(eq(qapUnitTypes.deal_id, dealId))

  if (rows.length > 0) {
    await db.insert(qapUnitTypes).values(
      rows.map(row => ({
        id: uuid(),
        deal_id: dealId,
        row_index: row.row_index,
        label: row.label ?? null,
        bedrooms: row.bedrooms ?? null,
        baths: row.baths ?? null,
        sqft: row.sqft ?? null,
        num_units: row.num_units ?? null,
        is_lihtc: row.is_lihtc ?? 1,
        is_staff: row.is_staff ?? 0,
        is_subsidy: row.is_subsidy ?? 0,
        is_psh: row.is_psh ?? 0,
        ami_restriction: row.ami_restriction ?? '60',
        monthly_rent: row.monthly_rent ?? null,
        updated_at: now,
      }))
    )
  }

  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/unit-mix`)
}

// ─── Development Costs (qap_cost_items) ────────────────────────────────────────

/** Upsert a single development-cost line amount (keyed by deal_id + line_key). */
export async function upsertQapCostItem(dealId: string, lineKey: string, amount: number | null) {
  const cfg = DEV_COST_LINES.find(l => l.line_key === lineKey)
  if (!cfg) return

  const existing = await db
    .select({ id: qapCostItems.id })
    .from(qapCostItems)
    .where(and(eq(qapCostItems.deal_id, dealId), eq(qapCostItems.line_key, lineKey)))
    .limit(1)

  const now = new Date().toISOString()

  if (existing.length > 0) {
    await db
      .update(qapCostItems)
      .set({ amount, updated_at: now })
      .where(eq(qapCostItems.id, existing[0].id))
  } else {
    await db.insert(qapCostItems).values({
      id: uuid(),
      deal_id: dealId,
      category: cfg.category,
      line_key: cfg.line_key,
      label: cfg.label,
      amount,
      updated_at: now,
    })
  }

  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/development-costs`)
}

/** Idempotently insert any missing development-cost line rows for a deal. */
export async function seedQapCostItems(dealId: string) {
  const existing = await db
    .select({ line_key: qapCostItems.line_key })
    .from(qapCostItems)
    .where(eq(qapCostItems.deal_id, dealId))

  const have = new Set(existing.map(e => e.line_key))
  const missing = DEV_COST_LINES.filter(l => !have.has(l.line_key))
  if (missing.length === 0) return

  const now = new Date().toISOString()
  await db.insert(qapCostItems).values(
    missing.map(l => ({
      id: uuid(),
      deal_id: dealId,
      category: l.category,
      line_key: l.line_key,
      label: l.label,
      amount: null,
      updated_at: now,
    }))
  )
}
