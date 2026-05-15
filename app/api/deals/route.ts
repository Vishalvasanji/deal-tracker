import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, like, desc, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const stage = searchParams.get('stage')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  let query = db
    .select()
    .from(deals)
    .$dynamic()

  if (name) {
    query = query.where(like(deals.name, `%${name}%`))
  }
  if (stage) {
    query = query.where(eq(deals.stage, stage))
  }

  const rows = await query.limit(limit)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()

  const maxDealId = await db
    .select({ deal_id: deals.deal_id })
    .from(deals)
    .orderBy(desc(sql`CAST(SUBSTR(deal_id, 6) AS INTEGER)`))
    .limit(1)

  let nextNum = 1
  if (maxDealId.length > 0) {
    const match = maxDealId[0].deal_id.match(/DEAL-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const newDeal = {
    id: uuid(),
    deal_id: `DEAL-${nextNum}`,
    name: body.name,
    stage: body.stage ?? 'Sourcing',
    location: body.location ?? null,
    deal_type: body.deal_type ?? null,
    size: body.size ?? null,
    budget: body.budget ?? null,
    loi_date: body.loi_date ?? null,
    target_close: body.target_close ?? null,
    target_completion: body.target_completion ?? null,
    broker: body.broker ?? null,
    partner: body.partner ?? null,
    lender: body.lender ?? null,
    gc: body.gc ?? null,
    overview: body.overview ?? '',
    notes: body.notes ?? '',
  }

  const [created] = await db.insert(deals).values(newDeal).returning()
  return NextResponse.json(created, { status: 201 })
}
