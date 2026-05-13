import { db } from '@/lib/db'
import { tasks, deals } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TaskRowActions } from '@/components/tasks/TaskRowActions'
import { CalendarView } from '@/components/tasks/CalendarView'

const PRIORITY_PILL: Record<string, string> = {
  High: 'bg-red-50 text-red-500',
  Med:  'bg-amber-50 text-amber-500',
  Low:  'bg-slate-100 text-slate-500',
}

async function getAllTasks() {
  return db
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
}

type TaskRow = Awaited<ReturnType<typeof getAllTasks>>[number]

function TaskList({ rows, showDeal = true }: { rows: TaskRow[]; showDeal?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground text-sm italic py-10">No tasks.</p>
  }
  return (
    <div className="divide-y divide-black/[0.04]">
      {rows.map((t) => (
        <div key={t.id} className={cn('flex items-center gap-3 px-5 py-3 group hover:bg-muted/20 transition-colors', t.status === 'Done' && 'opacity-50')}>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm text-foreground font-medium', t.status === 'Done' && 'line-through text-muted-foreground')}>
              {t.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {showDeal && t.deal_deal_id && (
                <Link href={`/deals/${t.deal_id}`} className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                  {t.deal_deal_id}
                </Link>
              )}
              {t.notes && <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{t.notes}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_PILL[t.priority] ?? ''}`}>
              {t.priority}
            </span>
            <span className="text-xs text-muted-foreground">{t.status}</span>
            {t.due_date && (
              <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:inline">{t.due_date}</span>
            )}
            <TaskRowActions taskId={t.id} status={t.status} dealId={t.deal_id} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function TasksPage() {
  const all = await getAllTasks()
  const open = all
    .filter((t) => t.status !== 'Done')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })

  const done = all
    .filter((t) => t.status === 'Done')
    .sort((a, b) => {
      if (!a.completed_at && !b.completed_at) return 0
      if (!a.completed_at) return 1
      if (!b.completed_at) return -1
      return b.completed_at.localeCompare(a.completed_at)
    })

  const byDeal = new Map<string, { dealName: string; dealDealId: string; tasks: TaskRow[] }>()
  for (const t of open) {
    if (!byDeal.has(t.deal_id)) {
      byDeal.set(t.deal_id, { dealName: t.deal_name ?? t.deal_id, dealDealId: t.deal_deal_id ?? '', tasks: [] })
    }
    byDeal.get(t.deal_id)!.tasks.push(t)
  }

  return (
    <div className="p-6 space-y-5 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
        <p className="text-sm text-muted-foreground">{open.length} open</p>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="rounded-xl bg-black/[0.04] p-0.5 h-auto gap-0.5">
          {[
            { value: 'open', label: `Open (${open.length})` },
            { value: 'by-deal', label: 'By Deal' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'done', label: `Done (${done.length})` },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-hidden">
            <TaskList rows={open} />
          </div>
        </TabsContent>

        <TabsContent value="by-deal" className="mt-4 space-y-4">
          {[...byDeal.entries()].map(([dealId, group]) => (
            <div key={dealId} className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-3 border-b border-black/[0.05]">
                <Link href={`/deals/${dealId}`} className="text-sm font-semibold hover:text-primary transition-colors">
                  {group.dealDealId && <span className="text-muted-foreground font-normal mr-1.5">{group.dealDealId}</span>}
                  {group.dealName}
                </Link>
              </div>
              <TaskList rows={group.tasks} showDeal={false} />
            </div>
          ))}
          {byDeal.size === 0 && (
            <p className="text-muted-foreground text-sm italic text-center py-10">No open tasks.</p>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <CalendarView tasks={open} />
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] overflow-hidden">
            <TaskList rows={done} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
