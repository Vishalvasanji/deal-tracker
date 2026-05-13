'use client'

import { type Deal, STAGES } from '@/lib/db/schema'
import Link from 'next/link'

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function TimelineView({ deals }: { deals: Deal[] }) {
  const dealsWithDates = deals.filter((d) => d.loi_date || d.target_completion)
  if (dealsWithDates.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No deals with date ranges yet.</p>
  }

  const allDates = dealsWithDates.flatMap((d) =>
    [parseDate(d.loi_date), parseDate(d.target_completion)].filter(Boolean) as Date[]
  )
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  const totalMs = maxDate.getTime() - minDate.getTime() || 1

  function pct(date: Date | null, fallback: Date): number {
    const d = date ?? fallback
    return ((d.getTime() - minDate.getTime()) / totalMs) * 100
  }

  const byStage = STAGES.reduce<Record<string, Deal[]>>((acc, s) => {
    const group = dealsWithDates.filter((d) => d.stage === s)
    if (group.length) acc[s] = group
    return acc
  }, {})

  const months: Date[] = []
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1)
  while (cursor < end) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Month ruler */}
        <div className="relative h-7 border-b bg-muted/30 ml-36">
          {months.map((m) => {
            const left = pct(m, m)
            return (
              <span
                key={m.toISOString()}
                className="absolute text-xs text-muted-foreground top-1.5 pl-1 border-l border-border/50"
                style={{ left: `${left}%` }}
              >
                {m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
            )
          })}
        </div>

        {Object.entries(byStage).map(([stage, stageDeals]) => (
          <div key={stage}>
            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/20 border-b">
              {stage}
            </div>
            {stageDeals.map((deal) => {
              const start = parseDate(deal.loi_date) ?? parseDate(deal.target_close) ?? minDate
              const end2 = parseDate(deal.target_completion) ?? parseDate(deal.target_close) ?? start
              const left = pct(start, minDate)
              const right = pct(end2, maxDate)
              const width = Math.max(right - left, 1)

              return (
                <div key={deal.id} className="flex items-center border-b last:border-0 h-9">
                  <div className="w-36 shrink-0 px-3">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-xs font-medium hover:underline truncate block"
                    >
                      {deal.name}
                    </Link>
                  </div>
                  <div className="flex-1 relative h-full flex items-center">
                    <div
                      className="absolute h-5 rounded bg-primary/20 border border-primary/40 flex items-center px-1"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${deal.loi_date ?? '?'} → ${deal.target_completion ?? '?'}`}
                    >
                      <span className="text-xs text-primary truncate font-medium">{deal.deal_id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
