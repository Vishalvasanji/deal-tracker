import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const STAGES = [
  'Sourcing',
  'Feasibility',
  'Site Control',
  'DD',
  'Capital Stack',
  'State Application',
  'Permitting',
  'Construction',
  'Operations',
] as const
export type Stage = (typeof STAGES)[number]

export const DEAL_TYPES = [
  'Multifamily',
  'Retail',
  'Office',
  'Industrial',
  'Mixed-Use',
  'Land',
  'Other',
] as const
export type DealType = (typeof DEAL_TYPES)[number]

export const PRODUCT_TYPES = ['Multifamily', 'Townhome', 'SF Homes'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['High', 'Med', 'Low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const AMI_RESTRICTIONS = ['20', '30', '40', '50', '60', '70', '80', '120', 'unrestricted'] as const
export type AmiRestriction = (typeof AMI_RESTRICTIONS)[number]

export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id').unique().notNull(),
  name: text('name').notNull(),
  stage: text('stage').notNull().default('Sourcing'),
  location: text('location'),
  deal_type: text('deal_type'),
  product_type: text('product_type'),
  lot_size: text('lot_size'),
  units: integer('units'),
  size: text('size'),
  budget: real('budget'),
  development_cost: real('development_cost'),
  cost_tbd: integer('cost_tbd').notNull().default(0),
  loi_date: text('loi_date'),
  target_close: text('target_close'),
  target_completion: text('target_completion'),
  broker: text('broker'),
  partner: text('partner'),
  lender: text('lender'),
  gc: text('gc'),
  overview: text('overview').default(''),
  notes: text('notes').default(''),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status').notNull().default('To Do'),
  priority: text('priority').notNull().default('Med'),
  due_date: text('due_date'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  completed_at: text('completed_at'),
})

// QAP scalar fields (narrative, project description, etc.)
export const qapFields = sqliteTable('qap_fields', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),
  field_key: text('field_key').notNull(),
  value: text('value'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
})

// QAP unit mix rows (up to 30 per deal)
export const qapUnitTypes = sqliteTable('qap_unit_types', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  row_index: integer('row_index').notNull(),
  label: text('label'),
  bedrooms: integer('bedrooms'),
  baths: real('baths'),
  sqft: integer('sqft'),
  num_units: integer('num_units'),
  is_lihtc: integer('is_lihtc').default(1),
  is_staff: integer('is_staff').default(0),
  is_subsidy: integer('is_subsidy').default(0),
  is_psh: integer('is_psh').default(0),
  ami_restriction: text('ami_restriction').default('60'),
  monthly_rent: integer('monthly_rent'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
})

// QAP development cost line items
export const qapCostItems = sqliteTable('qap_cost_items', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  line_key: text('line_key').notNull(),
  label: text('label').notNull(),
  amount: integer('amount'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
})

// QAP Basis Calculation building configurations (one row per configuration)
export const qapBasisConfigs = sqliteTable('qap_basis_configs', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  config_index: integer('config_index').notNull(),
  label: text('label'),
  num_buildings: integer('num_buildings'),
  resid_staff_sqft: integer('resid_staff_sqft'),
  common_sqft: integer('common_sqft'),
  commercial_sqft: integer('commercial_sqft'),
  lihtc_units: integer('lihtc_units'),
  resid_units: integer('resid_units'),
  lihtc_sqft: integer('lihtc_sqft'),
  resid_sqft: integer('resid_sqft'),
  homeless_constr_adj: integer('homeless_constr_adj'),
  homeless_acq_adj: integer('homeless_acq_adj'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
})

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type QapField = typeof qapFields.$inferSelect
export type QapUnitType = typeof qapUnitTypes.$inferSelect
export type QapCostItem = typeof qapCostItems.$inferSelect
export type QapBasisConfig = typeof qapBasisConfigs.$inferSelect
