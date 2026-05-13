import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
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

export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['High', 'Med', 'Low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  deal_id: text('deal_id').unique().notNull(),
  name: text('name').notNull(),
  stage: text('stage').notNull().default('Sourcing'),
  location: text('location'),
  deal_type: text('deal_type'),
  size: text('size'),
  budget: real('budget'),
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

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
