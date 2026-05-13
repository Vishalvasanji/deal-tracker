'use client'

import { useTransition } from 'react'
import { updateTaskStatus } from '@/lib/actions'
import type { TaskStatus } from '@/lib/db/schema'
import { CheckSquare, RotateCcw } from 'lucide-react'

interface Props { taskId: string; status: string; dealId: string }

export function TaskRowActions({ taskId, status, dealId }: Props) {
  const [, startTransition] = useTransition()

  function toggle() {
    const next: TaskStatus = status === 'Done' ? 'To Do' : 'Done'
    startTransition(() => updateTaskStatus(taskId, next, dealId))
  }

  return (
    <button
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title={status === 'Done' ? 'Mark incomplete' : 'Mark done'}
    >
      {status === 'Done'
        ? <RotateCcw className="h-3.5 w-3.5" />
        : <CheckSquare className="h-3.5 w-3.5" />}
    </button>
  )
}
