'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDeal } from '@/lib/actions'
import { STAGES, DEAL_TYPES } from '@/lib/db/schema'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewDealPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState('Sourcing')
  const [dealType, setDealType] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('stage', stage)
    if (dealType) fd.set('deal_type', dealType)
    startTransition(async () => {
      const result = await createDeal(fd)
      if (result?.id) router.push(`/deals/${result.id}`)
    })
  }

  const field = (label: string, name: string, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/deals" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">New Deal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required placeholder="Riverside Lofts — 124 Mill St" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v ?? 'Sourcing')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Deal Type</Label>
                <Select value={dealType} onValueChange={(v) => setDealType(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {field('Location', 'location', 'text', '124 Mill St, Asheville, NC 28801')}
            {field('Size', 'size', 'text', '84 units — 1.6 acres')}
            {field('Budget (USD)', 'budget', 'number', '32500000')}

            <div className="grid grid-cols-3 gap-4">
              {field('LOI Date', 'loi_date', 'date')}
              {field('Target Close', 'target_close', 'date')}
              {field('Target Completion', 'target_completion', 'date')}
            </div>

            {field('Broker', 'broker')}
            {field('Partner', 'partner')}
            {field('Lender', 'lender')}
            {field('General Contractor', 'gc')}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Deal'}
              </Button>
              <Link href="/deals" className={buttonVariants({ variant: 'outline' })}>Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
