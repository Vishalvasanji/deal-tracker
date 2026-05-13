import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function PipelinePage() {
  const allDeals = await db.select().from(deals)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h1 className="text-base font-semibold">Pipeline Board</h1>
        <Link href="/deals/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4 mr-1" />
          New Deal
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialDeals={allDeals} />
      </div>
    </div>
  )
}
