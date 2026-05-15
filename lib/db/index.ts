import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.DATABASE_URL ?? 'file:local.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })

// Auto-migrate: add new columns if they don't exist yet (safe to re-run)
client.execute('ALTER TABLE deals ADD COLUMN cost_tbd INTEGER NOT NULL DEFAULT 0').catch(() => {})
