import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.DATABASE_URL ?? 'file:local.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })

// Auto-migrate: add new columns/tables if they don't exist yet (safe to re-run)
client.execute('ALTER TABLE deals ADD COLUMN cost_tbd INTEGER NOT NULL DEFAULT 0').catch(() => {})
client.execute('ALTER TABLE qap_basis_configs ADD COLUMN commercial_sqft INTEGER').catch(() => {})

client.execute(`
  CREATE TABLE IF NOT EXISTS qap_fields (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {})

client.execute(`
  CREATE TABLE IF NOT EXISTS qap_unit_types (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    label TEXT,
    bedrooms INTEGER,
    baths REAL,
    sqft INTEGER,
    num_units INTEGER,
    is_lihtc INTEGER DEFAULT 1,
    is_staff INTEGER DEFAULT 0,
    is_subsidy INTEGER DEFAULT 0,
    is_psh INTEGER DEFAULT 0,
    ami_restriction TEXT DEFAULT '60',
    monthly_rent INTEGER,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {})

client.execute(`
  CREATE TABLE IF NOT EXISTS qap_cost_items (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    line_key TEXT NOT NULL,
    label TEXT NOT NULL,
    amount INTEGER,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {})

client.execute(`
  CREATE TABLE IF NOT EXISTS qap_basis_configs (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    config_index INTEGER NOT NULL,
    label TEXT,
    num_buildings INTEGER,
    resid_staff_sqft INTEGER,
    common_sqft INTEGER,
    commercial_sqft INTEGER,
    lihtc_units INTEGER,
    resid_units INTEGER,
    lihtc_sqft INTEGER,
    resid_sqft INTEGER,
    homeless_constr_adj INTEGER,
    homeless_acq_adj INTEGER,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {})
