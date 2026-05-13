'use server'

import { db } from './db'
import { deals, tasks, STAGES } from './db/schema'
import type { Stage, TaskStatus } from './db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'

export async function updateDealStage(dealId: string, stage: Stage) {
  await db
    .update(deals)
    .set({ stage, updated_at: new Date().toISOString() })
    .where(eq(deals.id, dealId))
  revalidatePath('/')
  revalidatePath('/deals')
}

export async function updateDeal(dealId: string, data: Record<string, unknown>) {
  const allowed = [
    'name', 'stage', 'location', 'deal_type', 'size', 'budget',
    'loi_date', 'target_close', 'target_completion', 'broker',
    'partner', 'lender', 'gc', 'overview',
  ]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in data) updates[key] = data[key]
  }
  await db.update(deals).set(updates).where(eq(deals.id, dealId))
  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/deals')
}

export async function appendNote(dealId: string, formData: FormData) {
  const title = formData.get('title') as string | null
  const body = (formData.get('body') as string | null)?.trim()
  if (!body) return { error: 'Body is required' }

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const titlePart = title?.trim() ? ` — ${title.trim()}` : ''
  const entry = `### ${dateStr}${titlePart}\n${body}\n---`

  const [deal] = await db.select({ notes: deals.notes }).from(deals).where(eq(deals.id, dealId))
  const existing = deal?.notes?.trim() ?? ''
  const newNotes = existing ? `${existing}\n\n${entry}\n` : `${entry}\n`

  await db
    .update(deals)
    .set({ notes: newNotes, updated_at: new Date().toISOString() })
    .where(eq(deals.id, dealId))
  revalidatePath(`/deals/${dealId}`)
}

export async function createDeal(formData: FormData) {
  const maxRow = await db
    .select({ deal_id: deals.deal_id })
    .from(deals)
    .orderBy(desc(sql`CAST(SUBSTR(deal_id, 6) AS INTEGER)`))
    .limit(1)
  let nextNum = 1
  if (maxRow.length > 0) {
    const m = maxRow[0].deal_id.match(/DEAL-(\d+)/)
    if (m) nextNum = parseInt(m[1], 10) + 1
  }

  const budget = formData.get('budget') as string
  const id = uuid()
  await db.insert(deals).values({
    id,
    deal_id: `DEAL-${nextNum}`,
    name: formData.get('name') as string,
    stage: (formData.get('stage') as Stage) ?? 'Sourcing',
    location: (formData.get('location') as string) || null,
    deal_type: (formData.get('deal_type') as string) || null,
    size: (formData.get('size') as string) || null,
    budget: budget ? parseFloat(budget) : null,
    loi_date: (formData.get('loi_date') as string) || null,
    target_close: (formData.get('target_close') as string) || null,
    target_completion: (formData.get('target_completion') as string) || null,
    broker: (formData.get('broker') as string) || null,
    partner: (formData.get('partner') as string) || null,
    lender: (formData.get('lender') as string) || null,
    gc: (formData.get('gc') as string) || null,
  })
  revalidatePath('/')
  revalidatePath('/deals')
  return { id }
}

export async function createTask(dealId: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) return
  const status = (formData.get('status') as TaskStatus) ?? 'To Do'
  const now = new Date().toISOString()
  await db.insert(tasks).values({
    id: uuid(),
    deal_id: dealId,
    title,
    status,
    priority: (formData.get('priority') as string) ?? 'Med',
    due_date: (formData.get('due_date') as string) || null,
    notes: (formData.get('notes') as string) || null,
    created_at: now,
    completed_at: status === 'Done' ? now : null,
  })
  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/tasks')
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, dealId?: string) {
  const updates: Record<string, unknown> = { status }
  if (status === 'Done') {
    updates.completed_at = new Date().toISOString()
  } else {
    updates.completed_at = null
  }
  await db.update(tasks).set(updates).where(eq(tasks.id, taskId))
  if (dealId) revalidatePath(`/deals/${dealId}`)
  revalidatePath('/tasks')
}

export async function updateTask(taskId: string, data: Record<string, unknown>, dealId?: string) {
  const allowed = ['title', 'status', 'priority', 'due_date', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in data) updates[key] = data[key]
  }
  if (data.status === 'Done' && !data.completed_at) {
    updates.completed_at = new Date().toISOString()
  } else if (data.status && data.status !== 'Done') {
    updates.completed_at = null
  }
  await db.update(tasks).set(updates).where(eq(tasks.id, taskId))
  if (dealId) revalidatePath(`/deals/${dealId}`)
  revalidatePath('/tasks')
}

export async function deleteTask(taskId: string, dealId?: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId))
  if (dealId) revalidatePath(`/deals/${dealId}`)
  revalidatePath('/tasks')
}
