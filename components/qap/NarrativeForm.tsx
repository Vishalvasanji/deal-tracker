'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: {
    narrative: string
  }
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export function NarrativeForm({ dealId, initial }: Props) {
  const [values, setValues] = useState(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'narrative', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Narrative</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Savingâ€¦' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <div>
        <label className={labelCls}>
          Project Narrative <span className="text-rose-500">*</span>
        </label>
        <textarea
          className={inputCls + ' min-h-[240px] resize-y'}
          value={values.narrative}
          onChange={e => setValues(v => ({ ...v, narrative: e.target.value }))}
          onBlur={e => save('narrative', e.target.value)}
          placeholder="Describe the project, its location, community impact, and development teamâ€¦"
        />
        <p className="text-xs text-muted-foreground mt-1">{values.narrative.length} characters</p>
      </div>
    </div>
  )
}
