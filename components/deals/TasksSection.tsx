'use client'

import { useState, useTransition } from 'react'
import { type Task, TASK_PRIORITIES } from '@/lib/db/schema'
import { createTask, updateTaskStatus, deleteTask } from '@/lib/actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

const PRIORITY_PILL: Record<string, string> = {
  High: 'bg-red-50 text-red-500',
  Med:  'bg-amber-50 text-amber-500',
  Low:  'bg-slate-100 text-slate-500',
}

interface Props { dealId: string; initialTasks: Task[] }

export function TasksSection({ dealId, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('Med')
  const [newDue, setNewDue] = useState('')

  const open = tasks.filter((t) => t.status !== 'Done')
  const done = tasks.filter((t) => t.status === 'Done')

  function toggleDone(task: Task) {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done'
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    startTransition(() => updateTaskStatus(task.id, newStatus as 'To Do' | 'Done', dealId))
  }

  function remove(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    startTransition(() => deleteTask(taskId, dealId))
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const fd = new FormData()
    fd.append('title', newTitle.trim())
    fd.append('priority', newPriority)
    if (newDue) fd.append('due_date', newDue)
    setNewTitle('')
    setNewDue('')
    setShowAdd(false)
    startTransition(() => createTask(dealId, fd))
  }

  const inputCls = 'h-8 px-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'

  const Row = ({ task }: { task: Task }) => (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 group rounded-xl transition-colors hover:bg-muted/30', task.status === 'Done' && 'opacity-50')}>
      <button
        onClick={() => toggleDone(task)}
        className={cn(
          'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
          task.status === 'Done'
            ? 'bg-primary border-primary'
            : 'border-border hover:border-primary/50'
        )}
      >
        {task.status === 'Done' && (
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-foreground leading-snug', task.status === 'Done' && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.notes}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_PILL[task.priority] ?? 'bg-gray-50 text-gray-500'}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{task.due_date}</span>
        )}
        <button
          onClick={() => remove(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Tasks
          {open.length > 0 && <span className="ml-2 text-xs text-muted-foreground font-normal">{open.length} open</span>}
        </h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all border border-black/[0.06]"
        >
          <Plus className="h-3 w-3" />
          Add task
        </button>
      </div>

      <div className="space-y-0.5">
        {open.map((t) => <Row key={t.id} task={t} />)}

        {showAdd && (
          <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/[0.03] border border-primary/10 flex-wrap">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title…"
              autoFocus
              className={inputCls + ' flex-1 min-w-[160px]'}
            />
            <Select value={newPriority} onValueChange={(v) => setNewPriority(v ?? 'Med')}>
              <SelectTrigger className="h-8 w-20 text-xs rounded-lg bg-muted/60 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className={inputCls + ' w-36'} />
            <button type="submit" className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-all">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all">Cancel</button>
          </form>
        )}

        {done.length > 0 && open.length > 0 && (
          <div className="px-4 py-1">
            <div className="border-t border-black/[0.06]" />
          </div>
        )}
        {done.map((t) => <Row key={t.id} task={t} />)}
      </div>

      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-6">No tasks yet.</p>
      )}
    </div>
  )
}
