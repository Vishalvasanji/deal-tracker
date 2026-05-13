import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, deals } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dealId = searchParams.get('deal_id')
  const status = searchParams.get('status')

  let query = db
    .select({
      id: tasks.id,
      deal_id: tasks.deal_id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      due_date: tasks.due_date,
      notes: tasks.notes,
      created_at: tasks.created_at,
      completed_at: tasks.completed_at,
      deal_name: deals.name,
      deal_deal_id: deals.deal_id,
    })
    .from(tasks)
    .leftJoin(deals, eq(tasks.deal_id, deals.id))
    .$dynamic()

  if (dealId) query = query.where(eq(tasks.deal_id, dealId))
  if (status) query = query.where(eq(tasks.status, status))

  const rows = await query.orderBy(asc(sql`CASE WHEN ${tasks.due_date} IS NULL THEN 1 ELSE 0 END`), asc(tasks.due_date))
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.deal_id || !body.title) {
    return NextResponse.json({ error: 'deal_id and title are required' }, { status: 400 })
  }
  const now = new Date().toISOString()
  const newTask = {
    id: uuid(),
    deal_id: body.deal_id,
    title: body.title,
    status: body.status ?? 'To Do',
    priority: body.priority ?? 'Med',
    due_date: body.due_date ?? null,
    notes: body.notes ?? null,
    created_at: now,
    completed_at: body.status === 'Done' ? now : null,
  }
  const [created] = await db.insert(tasks).values(newTask).returning()
  return NextResponse.json(created, { status: 201 })
}
