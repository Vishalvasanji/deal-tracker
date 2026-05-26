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

const FIELDS: { key: string; label: string; hint?: string; placeholder: string }[] = [
  {
    key: 'cp_funding_timeline',
    label: 'When is each permanent source of funding expected to be received?',
    hint: 'Describe the expected timing for each permanent source (e.g., equity close, loan closings, grants).',
    placeholder: 'e.g. LHC Risk Sharing loan expected to close at construction closing in Q3 2026; LIHTC equity expected at construction closing and 50% completion…',
  },
  {
    key: 'cp_cost_coverage_plan',
    label: 'How do you plan to meet construction period development costs prior to all permanent sources being received?',
    hint: 'Explain the bridge financing, construction loan, or other mechanism used to cover costs before permanent sources are in place.',
    placeholder: 'e.g. Construction period costs will be funded via a construction loan from [Lender]…',
  },
  {
    key: 'cp_interest_expense_method',
    label: 'How did you estimate construction period interest expense?',
    hint: 'Describe the method or assumptions used (loan amount, rate, draw schedule, term).',
    placeholder: 'e.g. Construction period interest calculated on a $X construction loan at Y% over Z months, assuming a straight-line draw schedule…',
  },
  {
    key: 'cp_funding_sources_detail',
    label: 'Describe each construction period source of funding.',
    hint: 'For each source include: (a) who is providing the funds, (b) whether the provider is third party or identity of interest (IOI), (c) the amount, (d) whether any source involves tax-exempt bond financing (LHC or other issuer), and (e) key business terms.',
    placeholder: 'e.g. Source 1: [Lender] — Third Party — $X construction loan — Tax-exempt bonds issued by LHC — Fixed rate Y%, 18-month term, interest-only…',
  },
]

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

      <p className={sectionHeaderCls}>17.01 — Construction Period Financing</p>

      {FIELDS.map((f, i) => (
        <div key={f.key} className="space-y-1">
          <label className={labelCls}>
            <span className="text-xs font-semibold text-muted-foreground mr-2">{i + 1}.</span>
            {f.label} <span className="text-rose-500">*</span>
          </label>
          {f.hint && (
            <p className="text-xs text-muted-foreground mb-1">{f.hint}</p>
          )}
          <textarea
            className={inputCls + ' min-h-[100px] resize-y'}
            value={values[f.key] ?? ''}
            placeholder={f.placeholder}
            onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
            onBlur={e => handleBlur(f.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}
