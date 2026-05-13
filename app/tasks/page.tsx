import { db } from '@/lib/db'
import { tasks, deals } from '@/lib/db/schema'
import { ne, eq, asc, desc, sql } from 'drizzle-orm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { TaskRowActions } from '@/components/tasks/TaskRowActions'
import { CalendarView } from '@/components/tasks/CalendarView'

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Med: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200',
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

function TaskTable({ rows, showDeal = true }: { rows: TaskRow[]; showDeal?: boolean }) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Task</th>
            {showDeal && (
              <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
            )}
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Due</th>
            <th className="py-2 px-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className={cn('border-b hover:bg-muted/30', t.status === 'Done' && 'opacity-60')}>
              <td className="py-2 px-3 text-sm max-w-[240px]">
                <div className="truncate">{t.title}</div>
                {t.notes && <div className="text-xs text-muted-foreground truncate">{t.notes}</div>}
              </td>
              {showDeal && (
                <td className="py-2 px-3">
                  <Link
                    href={`/deals/${t.deal_id}`}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {t.deal_deal_id ?? t.deal_id}
                  </Link>
                </td>
              )}
              <td className="py-2 px-3">
                <span className="text-xs text-muted-foreground">{t.status}</span>
              </td>
              <td className="py-2 px-3">
                <Badge className={cn('text-xs border', PRIORITY_COLORS[t.priority] ?? '')} variant="outline">
                  {t.priority}
                </Badge>
              </td>
              <td className="py-2 px-3 text-xs text-muted-foreground">
                {t.due_date ?? '—'}
              </td>
              <td className="py-2 px-3">
                <TaskRowActions taskId={t.id} status={t.status} dealId={t.deal_id} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm italic">
                No tasks.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

  const done = all.filter((t) => t.status === 'Done').sort((a, b) => {
    if (!a.completed_at && !b.completed_at) return 0
    if (!a.completed_at) return 1
    if (!b.completed_at) return -1
    return b.completed_at.localeCompare(a.completed_at)
  })

  // Group by deal for "By Deal" tab
  const byDeal = new Map<string, { dealName: string; dealDealId: string; tasks: TaskRow[] }>()
  for (const t of open) {
    if (!byDeal.has(t.deal_id)) {
      byDeal.set(t.deal_id, {
        dealName: t.deal_name ?? t.deal_id,
        dealDealId: t.deal_deal_id ?? '',
        tasks: [],
      })
    }
    byDeal.get(t.deal_id)!.tasks.push(t)
  }

  return (
    <div className="p-4 space-y-4 max-w-[1200px] mx-auto">
      <h1 className="text-lg font-semibold">Tasks</h1>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="by-deal">By Deal</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <TaskTable rows={open} />
        </TabsContent>

        <TabsContent value="by-deal" className="space-y-4">
          {[...byDeal.entries()].map(([dealId, group]) => (
            <div key={dealId}>
              <Link
                href={`/deals/${dealId}`}
                className="text-sm font-semibold hover:underline block mb-1"
              >
                {group.dealDealId && <span className="text-muted-foreground mr-1">{group.dealDealId}</span>}
                {group.dealName}
              </Link>
              <TaskTable rows={group.tasks} showDeal={false} />
            </div>
          ))}
          {byDeal.size === 0 && (
            <p className="text-muted-foreground text-sm italic text-center py-8">No open tasks.</p>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView tasks={open} />
        </TabsContent>

        <TabsContent value="done">
          <TaskTable rows={done} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
