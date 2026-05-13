import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import { format } from 'date-fns'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const dateStr = body.date ?? format(new Date(), 'yyyy-MM-dd')
  const title = body.title ? ` — ${body.title}` : ''
  const entryBody = (body.body ?? '').trim()

  if (!entryBody) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const entry = `### ${dateStr}${title}\n${entryBody}\n---`
  const existing = deal.notes?.trim() ?? ''
  const newNotes = existing ? `${existing}\n\n${entry}\n` : `${entry}\n`

  const [updated] = await db
    .update(deals)
    .set({ notes: newNotes, updated_at: new Date().toISOString() })
    .where(eq(deals.id, deal.id))
    .returning()

  return NextResponse.json({
    deal: updated,
    entry: { date: dateStr, title: body.title ?? null, body: entryBody },
  })
}
