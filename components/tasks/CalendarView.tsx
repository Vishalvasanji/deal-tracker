'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TaskRow {
  id: string
  deal_id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  deal_name: string | null
  deal_deal_id: string | null
}

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-red-500',
  Med: 'bg-amber-500',
  Low: 'bg-slate-400',
}

export function CalendarView({ tasks }: { tasks: TaskRow[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const tasksByDate = new Map<string, TaskRow[]>()
  for (const t of tasks) {
    if (!t.due_date) continue
    const [ty, tm, td] = t.due_date.split('-').map(Number)
    if (ty === year && tm - 1 === month) {
      const key = String(td)
      if (!tasksByDate.has(key)) tasksByDate.set(key, [])
      tasksByDate.get(key)!.push(t)
    }
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayKey = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : -1

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <Button variant="ghost" size="sm" onClick={prev} className="h-7 w-7 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="sm" onClick={next} className="h-7 w-7 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1 text-xs text-muted-foreground font-medium border-b">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const dayTasks = day ? tasksByDate.get(String(day)) ?? [] : []
          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] border-b border-r last:border-r-0 p-1 text-xs',
                !day && 'bg-muted/20',
                day === todayKey && 'bg-primary/5'
              )}
            >
              {day && (
                <>
                  <div className={cn(
                    'w-5 h-5 flex items-center justify-center rounded-full mb-0.5 font-medium',
                    day === todayKey ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/deals/${t.deal_id}`}
                        className="flex items-center gap-1 hover:bg-muted/50 rounded px-0.5 py-px truncate"
                        title={t.title}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[t.priority] ?? 'bg-slate-400')} />
                        <span className="truncate text-[10px]">{t.title}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
