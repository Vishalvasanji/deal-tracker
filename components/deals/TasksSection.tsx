'use client'

import { useState, useTransition, useRef } from 'react'
import { type Task, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/db/schema'
import { createTask, updateTaskStatus, deleteTask } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Med: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200',
}

interface Props { dealId: string; initialTasks: Task[] }

export function TasksSection({ dealId, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('Med')
  const [newDue, setNewDue] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

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

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
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

  const row = (task: Task) => (
    <tr key={task.id} className={cn('border-b group', task.status === 'Done' && 'opacity-60')}>
      <td className="py-2 px-3 w-8">
        <input
          type="checkbox"
          checked={task.status === 'Done'}
          onChange={() => toggleDone(task)}
          className="rounded"
        />
      </td>
      <td className="py-2 px-3 text-sm">{task.title}</td>
      <td className="py-2 px-3">
        <Badge className={cn('text-xs border', PRIORITY_COLORS[task.priority] ?? '')} variant="outline">
          {task.priority}
        </Badge>
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{task.due_date ?? '—'}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{task.notes ?? ''}</td>
      <td className="py-2 px-3 w-8">
        <button
          onClick={() => remove(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tasks</h2>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add task
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="py-1.5 px-3 w-8" />
              <th className="py-1.5 px-3 text-left text-xs font-medium text-muted-foreground">Task</th>
              <th className="py-1.5 px-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
              <th className="py-1.5 px-3 text-left text-xs font-medium text-muted-foreground">Due</th>
              <th className="py-1.5 px-3 text-left text-xs font-medium text-muted-foreground">Notes</th>
              <th className="py-1.5 px-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {open.map(row)}
            {showAdd && (
              <tr className="border-b bg-muted/20">
                <td className="py-2 px-3" />
                <td className="py-2 px-3" colSpan={5}>
                  <form ref={formRef} onSubmit={handleAdd} className="flex gap-2 items-center flex-wrap">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Task title…"
                      className="h-7 text-sm flex-1 min-w-[180px]"
                      autoFocus
                    />
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v ?? 'Med')}>
                      <SelectTrigger className="h-7 text-xs w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      className="h-7 text-xs w-36"
                    />
                    <Button type="submit" size="sm" className="h-7 text-xs">Add</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAdd(false)}
                    >
                      Cancel
                    </Button>
                  </form>
                </td>
              </tr>
            )}
            {done.map(row)}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No tasks yet.</p>
        )}
      </div>
    </div>
  )
}
