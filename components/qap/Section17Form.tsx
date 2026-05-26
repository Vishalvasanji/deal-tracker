'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

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

      {/* 17.01 — Comment */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>17.01 — Construction Period Financing</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please explain: (1) When each permanent source of funding is expected to be received;
          (2) How you plan to meet construction period development costs, prior to the time that
          all permanent sources of funds have been received; (3) How you estimated construction
          period interest expense; and (4) Each construction period source of funding including
          at least: who is providing the funds, whether the funds provider is third party or IOI,
          the amount of each source of funds, whether any source of funds involves tax-exempt bond
          financing (whether by LHC or by another issuer), and the key business terms on which
          funding will be provided. The explanation can be provided below, or in an attachment,
          whichever approach the applicant prefers.
        </p>
        <div>
          <textarea
            className={inputCls + ' min-h-[160px] resize-y'}
            value={values.construction_period_comment ?? ''}
            placeholder="Enter your explanation here, or note that it is provided as an attachment…"
            onChange={e => setValues(v => ({ ...v, construction_period_comment: e.target.value }))}
            onBlur={e => handleBlur('construction_period_comment', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
