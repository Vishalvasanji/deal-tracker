'use client'

import { useState, useTransition } from 'react'
import { type Deal, STAGES, DEAL_TYPES } from '@/lib/db/schema'
import { updateDeal } from '@/lib/actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/notes'
import { Check } from 'lucide-react'

interface Props { deal: Deal }

const inputCls = 'w-full h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wide'

export function DealProperties({ deal }: Props) {
  const [form, setForm] = useState({
    name: deal.name,
    stage: deal.stage,
    location: deal.location ?? '',
    deal_type: deal.deal_type ?? '',
    size: deal.size ?? '',
    budget: deal.budget?.toString() ?? '',
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
        budget: form.budget ? parseFloat(form.budget) : null,
        deal_type: form.deal_type || null,
        location: form.location || null,
        size: form.size || null,
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

  const Field = ({ label, name, type = 'text' }: { label: string; name: keyof typeof form; type?: string }) => (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        className={inputCls}
      />
    </div>
  )

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Name full width */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelCls}>Name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls + ' font-medium'}
          />
        </div>

        {/* Stage */}
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

        <Field label="Location" name="location" />

        {/* Deal Type */}
        <div className="space-y-1.5">
          <label className={labelCls}>Deal Type</label>
          <Select value={form.deal_type} onValueChange={(v) => set('deal_type', v ?? '')}>
            <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/50 border-border">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {DEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Field label="Size" name="size" />

        {/* Budget */}
        <div className="space-y-1.5">
          <label className={labelCls}>Budget</label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) => set('budget', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
          {form.budget && (
            <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(parseFloat(form.budget))}</p>
          )}
        </div>

        <Field label="LOI Date" name="loi_date" type="date" />
        <Field label="Target Close" name="target_close" type="date" />
        <Field label="Target Completion" name="target_completion" type="date" />
        <Field label="Broker" name="broker" />
        <Field label="Partner" name="partner" />
        <Field label="Lender" name="lender" />
        <Field label="General Contractor" name="gc" />
      </div>
    </div>
  )
}
