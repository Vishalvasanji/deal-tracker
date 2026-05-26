'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

export function Section17Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_17', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Construction Period Sources of Funds</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderCls}>17.01 — Construction Period Financing</p>
        <p className="text-xs text-muted-foreground">
          Please explain: (1) when each permanent source of funding is expected to be received;
          (2) how construction period development costs will be met prior to all permanent sources
          being received; (3) how you estimated construction period interest expense; and (4) for
          each construction period source of funding, describe the provider, whether third party or
          identity of interest, the amount, whether any source involves tax-exempt bond financing,
          and key business terms.
        </p>
        <div>
          <label className={labelCls}>
            Comment <span className="text-rose-500">*</span>
          </label>
          <textarea
            className={inputCls + ' min-h-[160px] resize-y'}
            value={values.cp_comment ?? ''}
            placeholder="Describe your construction period financing plan…"
            onChange={e => setValues(v => ({ ...v, cp_comment: e.target.value }))}
            onBlur={e => handleBlur('cp_comment', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
