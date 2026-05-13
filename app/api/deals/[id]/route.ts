import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'

async function findDeal(id: string) {
  const [row] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  return row ?? null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await findDeal(id)
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(deal)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await findDeal(id)
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const allowed = [
    'name', 'stage', 'location', 'deal_type', 'size', 'budget',
    'loi_date', 'target_close', 'target_completion', 'broker',
    'partner', 'lender', 'gc', 'overview', 'notes',
  ]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const [updated] = await db
    .update(deals)
    .set(updates)
    .where(eq(deals.id, deal.id))
    .returning()
  return NextResponse.json(updated)
}
