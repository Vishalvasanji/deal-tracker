'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section34Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_34', fk, val)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleBlur(fk: string, val: string) {
    save(fk, val)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 34 — Applicant's Additional Explanation</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Usage note */}
      <p className={noteCls}>
        Use this section to provide any additional context, explanations, or clarifications that should appear
        in the Summary. Common use: explaining temporary DSCR shortfalls, construction period details, or
        special circumstances.
      </p>

      {/* Explanation textarea */}
      <div>
        <label className={labelCls}>
          The contents of this field will appear on the Summary worksheet of the QAP model.
        </label>
        <textarea
          className={inputCls}
          rows={8}
          value={values['s34_explanation'] ?? ''}
          onChange={e => setValues(prev => ({ ...prev, s34_explanation: e.target.value }))}
          onBlur={e => handleBlur('s34_explanation', e.target.value)}
        />
      </div>
    </div>
  )
}
