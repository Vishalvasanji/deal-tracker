'use client'

import { useState, useTransition } from 'react'
import { type Deal, STAGES, DEAL_TYPES } from '@/lib/db/schema'
import { updateDeal } from '@/lib/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/notes'
import { Save } from 'lucide-react'

interface Props { deal: Deal }

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
    })
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Properties</h2>
        {dirty && (
          <Button size="sm" onClick={save} disabled={isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
        {saved && !dirty && (
          <span className="text-xs text-green-600">Saved</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-2 lg:col-span-2">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="h-8 text-sm font-medium"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Stage</Label>
          <Select value={form.stage} onValueChange={(v) => set('stage', v ?? 'Sourcing')}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {field('Location', 'location')}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Deal Type</Label>
          <Select value={form.deal_type} onValueChange={(v) => set('deal_type', v ?? '')}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {DEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {field('Size', 'size')}

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Budget</Label>
          <Input
            type="number"
            value={form.budget}
            onChange={(e) => set('budget', e.target.value)}
            className="h-8 text-sm"
            placeholder="0"
          />
          {form.budget && (
            <p className="text-xs text-muted-foreground">{formatCurrency(parseFloat(form.budget))}</p>
          )}
        </div>

        {field('LOI Date', 'loi_date', 'date')}
        {field('Target Close', 'target_close', 'date')}
        {field('Target Completion', 'target_completion', 'date')}
        {field('Broker', 'broker')}
        {field('Partner', 'partner')}
        {field('Lender', 'lender')}
        {field('General Contractor', 'gc')}
      </div>
    </div>
  )
}
