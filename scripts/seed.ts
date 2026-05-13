import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { deals, tasks } from '../lib/db/schema'
import { v4 as uuid } from 'uuid'

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const db = drizzle(client)

  const dealId = uuid()
  await db.insert(deals).values({
    id: dealId,
    deal_id: 'DEAL-1',
    name: 'Riverside Lofts — 124 Mill St',
    stage: 'Feasibility',
    location: '124 Mill St, Asheville, NC 28801',
    deal_type: 'Multifamily',
    size: '84 units — 1.6 acres',
    budget: 32500000,
    loi_date: '2026-04-22',
    target_close: '2026-08-15',
    target_completion: '2028-06-30',
    broker: 'Sarah Chen — Marcus & Millichap — (828) 555-0142',
    partner: 'Blue Ridge Capital Partners (50% LP)',
    lender: 'First Citizens Bank — construction loan TBD',
    gc: 'TBD — reviewing bids from Beverly-Grant & Cooper',
    overview: `A 1.6-acre infill site on Mill Street in the River Arts District. Currently a vacant lot with an old warehouse foundation. Zoning is RM-16 — by-right for 84 units. Existing infrastructure to street; sewer capacity confirmed with city.

**Strategy:** Workforce-focused multifamily, 80% market / 20% at 80% AMI to qualify for NC Housing Finance LIHTC 4% deal. Target stabilized cap rate 5.75%.

**Key terms:**
- Purchase price: $2.4M ($28.5K/unit on as-zoned basis)
- Total project cost: $32.5M ($387K/unit all-in)
- Capital stack: ~30% equity / 70% debt; pursuing LIHTC for soft equity
- Schedule: 18-month entitlement → 24-month construction → Q3 2028 delivery`,
    notes: `### 2026-05-01 — LOI accepted
Seller countersigned at $2.4M with 90-day feasibility / 30-day DD. Earnest money $50K, $25K hard at end of feasibility.
---

### 2026-05-08 — Initial site walk
- Walked the site with Sarah (broker). Foundation from prior warehouse is mostly intact — could save ~$200K on excavation if structural eng signs off.
- Adjacent parcel owner (Tomlinson Holdings) reached out unsolicited about a possible assemblage. Worth a 30-min call.
- Flood: lot is just outside FEMA 500-year floodplain per prelim survey. Need formal LOMA.
- City planner (Janet Kowalski) signaled support for the project at pre-app meeting; suggested we apply for the workforce density bonus.
---
`,
  }).onConflictDoNothing()

  const taskRows = [
    {
      title: 'Order Phase I ESA from Terracon',
      status: 'In Progress',
      priority: 'High',
      due_date: '2026-05-15',
      notes: 'Quote received $4,200. Need to sign engagement letter.',
    },
    {
      title: 'Confirm sewer capacity with City of Asheville',
      status: 'To Do',
      priority: 'High',
      due_date: '2026-05-20',
      notes: 'Need formal letter from Public Works.',
    },
    {
      title: '30-min call with Tomlinson Holdings re: assemblage',
      status: 'To Do',
      priority: 'Med',
      due_date: '2026-05-18',
      notes: 'From 5/8 site walk — adjacent parcel owner reached out.',
    },
    {
      title: 'Submit FEMA LOMA application',
      status: 'To Do',
      priority: 'Med',
      due_date: '2026-06-01',
      notes: "Survey says we're just outside the 500-yr line.",
    },
    {
      title: 'Finalize GC shortlist — Beverly-Grant vs Cooper',
      status: 'To Do',
      priority: 'Low',
      due_date: '2026-06-15',
      notes: 'Pre-construction services bids due 6/12.',
    },
    {
      title: 'Pre-app meeting with planning dept',
      status: 'Done',
      priority: 'High',
      due_date: '2026-05-05',
      notes: 'Done 5/6. Janet supportive — suggested workforce density bonus.',
    },
  ]

  const now = new Date().toISOString()
  for (const t of taskRows) {
    await db.insert(tasks).values({
      id: uuid(),
      deal_id: dealId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      notes: t.notes,
      created_at: now,
      completed_at: t.status === 'Done' ? now : null,
    }).onConflictDoNothing()
  }

  console.log('✓ Seeded DEAL-1 with 6 tasks')
  client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
