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

const STAGE_COLORS: Record<string, string> = {
  Sourcing:          'bg-slate-100 text-slate-600',
  Feasibility:       'bg-blue-100 text-blue-600',
  'Site Control':    'bg-violet-100 text-violet-600',
  DD:                'bg-amber-100 text-amber-600',
  'Capital Stack':   'bg-orange-100 text-orange-600',
  'State Application':'bg-pink-100 text-pink-600',
  Permitting:        'bg-rose-100 text-rose-600',
  Construction:      'bg-emerald-100 text-emerald-600',
  Operations:        'bg-green-100 text-green-600',
}

const TYPE_COLORS: Record<string, string> = {
  Multifamily:  'bg-blue-50 text-blue-500',
  Retail:       'bg-amber-50 text-amber-500',
  Office:       'bg-violet-50 text-violet-500',
  Industrial:   'bg-slate-100 text-slate-500',
  'Mixed-Use':  'bg-teal-50 text-teal-500',
  Land:         'bg-green-50 text-green-500',
  Other:        'bg-gray-50 text-gray-500',
}

function DealCard({ deal, isDragging, overlay }: { deal: Deal; isDragging?: boolean; overlay?: boolean }) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-black/[0.06] p-3.5 space-y-2.5
        transition-all duration-150 select-none
        ${overlay ? 'shadow-2xl shadow-black/10 rotate-1 scale-[1.02]' : 'card-shadow hover:shadow-md hover:border-black/[0.09]'}
        ${isDragging ? 'opacity-40' : ''}
        cursor-grab active:cursor-grabbing
      `}
    >
      <Link
        href={`/deals/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-[13px] font-semibold text-foreground hover:text-primary transition-colors leading-snug"
      >
        {deal.name}
      </Link>

      {deal.location && (
        <p className="text-[11px] text-muted-foreground truncate leading-none">{deal.location}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {deal.product_type && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TYPE_COLORS[deal.deal_type ?? ''] ?? 'bg-gray-50 text-gray-500'}`}>
            {deal.product_type}
          </span>
        )}
        {deal.units != null && (
          <span className="text-[11px] text-muted-foreground">{deal.units} units</span>
        )}
        {deal.lot_size && (
          <span className="text-[11px] text-muted-foreground">{deal.lot_size}</span>
        )}
      </div>

      {(deal.development_cost != null || deal.budget != null) && (
        <p className="text-[12px] font-semibold text-foreground tabular-nums">
          {formatCurrency(deal.development_cost ?? deal.budget)}
        </p>
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
    <div className="flex flex-col min-w-[210px] w-[210px] shrink-0">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {stage}
        </h3>
        {deals.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground bg-black/[0.05] rounded-full px-1.5 py-0.5 tabular-nums">
            {deals.length}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`
          flex flex-col gap-2 flex-1 min-h-[60px] rounded-2xl p-2 transition-all duration-150
          ${isOver
            ? 'bg-primary/8 ring-1 ring-primary/20'
            : 'bg-black/[0.025]'
          }
        `}
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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
    startTransition(() => updateDealStage(deal.id, newStage))
  }

  const byStage = STAGES.reduce<Record<string, Deal[]>>((acc, s) => {
    acc[s] = dealsState.filter((d) => d.stage === s)
    return acc
  }, {})

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 p-4 overflow-x-auto h-full">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} deals={byStage[stage] ?? []} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeDeal ? <DealCard deal={activeDeal} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
