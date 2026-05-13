import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const allowed = ['title', 'status', 'priority', 'due_date', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (body.status === 'Done' && !body.completed_at) {
    updates.completed_at = new Date().toISOString()
  } else if (body.status && body.status !== 'Done') {
    updates.completed_at = null
  }

  const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(tasks).where(eq(tasks.id, id))
  return NextResponse.json({ ok: true })
}
