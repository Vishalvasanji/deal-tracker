'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import Link from 'next/link'
import { STAGES, type Stage, type Deal } from '@/lib/db/schema'
import { updateDealStage } from '@/lib/actions'
import { formatCurrency } from '@/lib/notes'
import { Badge } from '@/components/ui/badge'

const STAGE_COLORS: Record<string, string> = {
  Sourcing: 'bg-slate-100 text-slate-700',
  Feasibility: 'bg-blue-100 text-blue-700',
  'Site Control': 'bg-violet-100 text-violet-700',
  DD: 'bg-amber-100 text-amber-700',
  'Capital Stack': 'bg-orange-100 text-orange-700',
  'State Application': 'bg-pink-100 text-pink-700',
  Permitting: 'bg-rose-100 text-rose-700',
  Construction: 'bg-emerald-100 text-emerald-700',
  Operations: 'bg-green-100 text-green-700',
}

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  return (
    <div
      className={`bg-card border rounded-lg p-3 shadow-sm space-y-1.5 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Link
        href={`/deals/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-sm font-medium hover:underline leading-snug"
      >
        {deal.name}
      </Link>
      {deal.location && (
        <p className="text-xs text-muted-foreground truncate">{deal.location}</p>
      )}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {deal.deal_type && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {deal.deal_type}
          </Badge>
        )}
        {deal.size && (
          <span className="text-xs text-muted-foreground">{deal.size}</span>
        )}
      </div>
      {deal.budget != null && (
        <p className="text-xs font-medium text-foreground">{formatCurrency(deal.budget)}</p>
      )}
    </div>
  )
}

function DraggableCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <DealCard deal={deal} isDragging={isDragging} />
    </div>
  )
}

function Column({ stage, deals }: { stage: Stage; deals: Deal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {stage}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5">
          {deals.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 min-h-[80px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/40'
        }`}
      >
        {deals.map((d) => (
          <DraggableCard key={d.id} deal={d} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({ initialDeals }: { initialDeals: Deal[] }) {
  const [dealsState, setDealsState] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeDeal = activeId ? dealsState.find((d) => d.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const deal = dealsState.find((d) => d.id === active.id)
    if (!deal) return
    const newStage = over.id as Stage
    if (deal.stage === newStage) return

    setDealsState((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stage: newStage } : d))
    )
    startTransition(() => {
      updateDealStage(deal.id, newStage)
    })
  }

  const byStage = STAGES.reduce<Record<string, Deal[]>>((acc, s) => {
    acc[s] = dealsState.filter((d) => d.stage === s)
    return acc
  }, {})

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} deals={byStage[stage] ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
