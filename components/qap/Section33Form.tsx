'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const YES_NO_OPTS = ['Yes', 'No']

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section33Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_33', fk, val)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleSelect(fk: string, val: string) {
    setValues(prev => ({ ...prev, [fk]: val }))
    save(fk, val)
  }

  function handleBlur(fk: string, val: string) {
    save(fk, val)
  }

  const agree = values['s33_agree_score'] ?? ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 33 — Selection Criteria</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Instruction note */}
      <p className={noteCls}>
        Review the Selection Criteria worksheet in the QAP model to verify your score before answering.
      </p>

      {/* Agree with score toggle */}
      <div className="space-y-1.5">
        <label className={labelCls}>Do you agree with the score shown on the Selection Criteria worksheet?</label>
        <div className="flex gap-2 flex-wrap">
          {YES_NO_OPTS.map(opt => (
            <button key={opt} type="button"
              onClick={() => handleSelect('s33_agree_score', opt)}
              className={agree === opt ? activeBtn : inactiveBtn}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional feedback */}
      {agree === 'Yes' && (
        <p className="text-xs font-medium text-green-700 dark:text-green-400 rounded-lg px-3 py-2 bg-green-50 dark:bg-green-950/30">
          Agreement confirmed.
        </p>
      )}

      {agree === 'No' && (
        <div>
          <label className={labelCls}>Please explain your disagreement</label>
          <textarea
            className={inputCls}
            rows={4}
            value={values['s33_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s33_comment: e.target.value }))}
            onBlur={e => handleBlur('s33_comment', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
