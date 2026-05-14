'use client'

import { useState, useTransition } from 'react'
import { type Deal, STAGES, PRODUCT_TYPES } from '@/lib/db/schema'
import { updateDeal } from '@/lib/actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/notes'
import { Check, MapPin } from 'lucide-react'

interface Props { deal: Deal }

const inputCls = 'w-full h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wide'

export function DealProperties({ deal }: Props) {
  const [form, setForm] = useState({
    name: deal.name,
    stage: deal.stage,
    location: deal.location ?? '',
    product_type: deal.product_type ?? '',
    lot_size: deal.lot_size ?? '',
    units: deal.units?.toString() ?? '',
    development_cost: deal.development_cost?.toString() ?? '',
    loi_date: deal.loi_date ?? '',
    target_close: deal.target_close ?? '',
    target_completion: deal.target_completion ?? '',
    broker: deal.broker ?? '',
    partner: deal.partner ?? '',
    lender: deal.lender ?? '',
    gc: deal.gc ?? '',
  })
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  function save() {
    startTransition(async () => {
      await updateDeal(deal.id, {
        ...form,
        development_cost: form.development_cost ? parseFloat(form.development_cost) : null,
        units: form.units ? parseInt(form.units, 10) : null,
        product_type: form.product_type || null,
        location: form.location || null,
        lot_size: form.lot_size || null,
        loi_date: form.loi_date || null,
        target_close: form.target_close || null,
        target_completion: form.target_completion || null,
        broker: form.broker || null,
        partner: form.partner || null,
        lender: form.lender || null,
        gc: form.gc || null,
      })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Properties</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {dirty && (
            <button
              onClick={save}
              disabled={isPending}
              className="h-7 px-3 rounded-lg bg-primary text-white text-xs font-medium transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Section: Basics */}
      <div className="space-y-3">
        <p className={labelCls + ' text-muted-foreground/60'}>Basics</p>

        {/* Row 1: Name · Product Type · Stage */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5 col-span-2">
            <label className={labelCls}>Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls + ' font-medium'}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Product Type</label>
            <Select value={form.product_type} onValueChange={(v) => set('product_type', v ?? '')}>
              <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/50 border-border">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Stage</label>
            <Select value={form.stage} onValueChange={(v) => set('stage', v ?? form.stage)}>
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
        <div className="space-y-1.5">
          <label className={labelCls}>Location</label>
          <div className="flex items-center gap-2">
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="124 Mill St, Asheville, NC 28801"
              className={inputCls}
            />
            {form.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                <MapPin className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Section: Unit & Site */}
      <div className="space-y-3">
        <p className={labelCls + ' text-muted-foreground/60'}>Unit & Site</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}># of Units</label>
            <input
              type="number"
              min="0"
              value={form.units}
              onChange={(e) => set('units', e.target.value)}
              placeholder="84"
              className={inputCls}
            />
          </div>
          <Field label="Lot Size" name="lot_size" placeholder="1.6 acres" />
        </div>
      </div>

      {/* Section: Financials */}
      <div className="space-y-3">
        <p className={labelCls + ' text-muted-foreground/60'}>Financials</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Development Cost</label>
            <input
              type="number"
              value={form.development_cost}
              onChange={(e) => set('development_cost', e.target.value)}
              placeholder="0"
              className={inputCls}
            />
            {form.development_cost && (
              <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(parseFloat(form.development_cost))}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
