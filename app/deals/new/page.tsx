'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDeal } from '@/lib/actions'
import { STAGES, PRODUCT_TYPES } from '@/lib/db/schema'
import { buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const inputCls = 'w-full h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wide'

export default function NewDealPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState('Sourcing')
  const [productType, setProductType] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('stage', stage)
    if (productType) fd.set('product_type', productType)
    startTransition(async () => {
      const result = await createDeal(fd)
      if (result?.id) router.push(`/deals/${result.id}`)
    })
  }

  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <input name={name} type={type} placeholder={placeholder} className={inputCls} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/deals" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">New Deal</h1>
      </div>

      <div className="bg-card rounded-2xl card-shadow border border-black/[0.06] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name · Product Type · Stage */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className={labelCls}>Name *</label>
              <input name="name" required placeholder="Riverside Lofts — 124 Mill St" className={inputCls + ' font-medium'} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Product Type</label>
              <Select value={productType} onValueChange={(v) => setProductType(v ?? '')}>
                <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/50 border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Stage</label>
              <Select value={stage} onValueChange={(v) => setStage(v ?? 'Sourcing')}>
                <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Location */}
          <Field label="Location" name="location" placeholder="124 Mill St, Asheville, NC 28801" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="# of Units" name="units" type="number" placeholder="84" />
            <Field label="Lot Size" name="lot_size" placeholder="1.6 acres" />
          </div>

          <Field label="Development Cost (USD)" name="development_cost" type="number" placeholder="32500000" />

          <div className="grid grid-cols-3 gap-3">
            <Field label="LOI Date" name="loi_date" type="date" />
            <Field label="Target Close" name="target_close" type="date" />
            <Field label="Target Completion" name="target_completion" type="date" />
          </div>

          <Field label="Broker" name="broker" />
          <Field label="Partner" name="partner" />
          <Field label="Lender" name="lender" />
          <Field label="General Contractor" name="gc" />

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="h-9 px-5 rounded-xl bg-primary text-white text-sm font-medium transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-primary/25"
            >
              {isPending ? 'Creating…' : 'Create Deal'}
            </button>
            <Link href="/deals" className={buttonVariants({ variant: 'ghost' }) + ' rounded-xl text-muted-foreground'}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
