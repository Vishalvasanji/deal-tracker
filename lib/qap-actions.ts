'use server'

import { db } from './db'
import { qapFields, qapUnitTypes, qapCostItems, qapBasisConfigs } from './db/schema'
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
  revalidatePath(`/deals/${dealId}/qap/revenues-expenses`)
  revalidatePath(`/deals/${dealId}/qap/selection-criteria`)
  revalidatePath(`/deals/${dealId}/qap/development-team`)
  revalidatePath(`/deals/${dealId}/qap/syndication`)
  revalidatePath(`/deals/${dealId}/qap/reserve-adequacy`)
  revalidatePath(`/deals/${dealId}/qap/schedules`)
  revalidatePath(`/deals/${dealId}/qap/financing-cert`)
  revalidatePath(`/deals/${dealId}/qap/demand-cert`)
  revalidatePath(`/deals/${dealId}/qap/proforma`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
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
  revalidatePath(`/deals/${dealId}/qap/proforma`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
}

export async function deleteQapUnitType(id: string, dealId: string) {
  await db.delete(qapUnitTypes).where(eq(qapUnitTypes.id, id))
  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/unit-mix`)
  revalidatePath(`/deals/${dealId}/qap/proforma`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
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
  revalidatePath(`/deals/${dealId}/qap/proforma`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
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
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
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

// ─── Basis Calculation building configurations (qap_basis_configs) ─────────────

type BasisConfigData = {
  config_index: number
  label?: string | null
  num_buildings?: number | null
  resid_staff_sqft?: number | null
  common_sqft?: number | null
  commercial_sqft?: number | null
  lihtc_units?: number | null
  resid_units?: number | null
  lihtc_sqft?: number | null
  resid_sqft?: number | null
  homeless_constr_adj?: number | null
  homeless_acq_adj?: number | null
}

export async function upsertQapBasisConfig(dealId: string, configIndex: number, data: BasisConfigData) {
  const existing = await db
    .select({ id: qapBasisConfigs.id })
    .from(qapBasisConfigs)
    .where(and(eq(qapBasisConfigs.deal_id, dealId), eq(qapBasisConfigs.config_index, configIndex)))
    .limit(1)

  const now = new Date().toISOString()
  const row = {
    label: data.label ?? null,
    num_buildings: data.num_buildings ?? null,
    resid_staff_sqft: data.resid_staff_sqft ?? null,
    common_sqft: data.common_sqft ?? null,
    commercial_sqft: data.commercial_sqft ?? null,
    lihtc_units: data.lihtc_units ?? null,
    resid_units: data.resid_units ?? null,
    lihtc_sqft: data.lihtc_sqft ?? null,
    resid_sqft: data.resid_sqft ?? null,
    homeless_constr_adj: data.homeless_constr_adj ?? null,
    homeless_acq_adj: data.homeless_acq_adj ?? null,
    updated_at: now,
  }

  if (existing.length > 0) {
    await db.update(qapBasisConfigs).set(row).where(eq(qapBasisConfigs.id, existing[0].id))
  } else {
    await db.insert(qapBasisConfigs).values({
      id: uuid(),
      deal_id: dealId,
      config_index: configIndex,
      ...row,
    })
  }

  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/basis-calculation`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
}

export async function deleteQapBasisConfig(id: string, dealId: string) {
  await db.delete(qapBasisConfigs).where(eq(qapBasisConfigs.id, id))
  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/basis-calculation`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
}

export async function replaceQapBasisConfigs(dealId: string, rows: BasisConfigData[]) {
  const now = new Date().toISOString()
  await db.delete(qapBasisConfigs).where(eq(qapBasisConfigs.deal_id, dealId))
  if (rows.length > 0) {
    await db.insert(qapBasisConfigs).values(
      rows.map(r => ({
        id: uuid(),
        deal_id: dealId,
        config_index: r.config_index,
        label: r.label ?? null,
        num_buildings: r.num_buildings ?? null,
        resid_staff_sqft: r.resid_staff_sqft ?? null,
        common_sqft: r.common_sqft ?? null,
        commercial_sqft: r.commercial_sqft ?? null,
        lihtc_units: r.lihtc_units ?? null,
        resid_units: r.resid_units ?? null,
        lihtc_sqft: r.lihtc_sqft ?? null,
        resid_sqft: r.resid_sqft ?? null,
        homeless_constr_adj: r.homeless_constr_adj ?? null,
        homeless_acq_adj: r.homeless_acq_adj ?? null,
        updated_at: now,
      }))
    )
  }
  revalidatePath(`/deals/${dealId}/qap`)
  revalidatePath(`/deals/${dealId}/qap/basis-calculation`)
  revalidatePath(`/deals/${dealId}/qap/flags`)
  revalidatePath(`/deals/${dealId}/qap/summary`)
  revalidatePath(`/deals/${dealId}/qap/checklist`)
}
