'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: {
    project_name: string
    parish_county: string
    submitting_org: string
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
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <div>
        <label className={labelCls}>
          Project Name <span className="text-rose-500">*</span>
        </label>
        <input
          className={inputCls}
          value={values.project_name}
          onChange={e => setValues(v => ({ ...v, project_name: e.target.value }))}
          onBlur={e => save('project_name', e.target.value)}
          placeholder="e.g. Mickens BTR Townhomes"
        />
      </div>

      <div>
        <label className={labelCls}>
          Parish / County <span className="text-rose-500">*</span>
        </label>
        <input
          className={inputCls}
          value={values.parish_county}
          onChange={e => setValues(v => ({ ...v, parish_county: e.target.value }))}
          onBlur={e => save('parish_county', e.target.value)}
          placeholder="e.g. East Baton Rouge"
        />
      </div>

      <div>
        <label className={labelCls}>
          Submitting Organization <span className="text-rose-500">*</span>
        </label>
        <input
          className={inputCls}
          value={values.submitting_org}
          onChange={e => setValues(v => ({ ...v, submitting_org: e.target.value }))}
          onBlur={e => save('submitting_org', e.target.value)}
          placeholder="e.g. Acme Housing Partners, LLC"
        />
      </div>

      <div>
        <label className={labelCls}>
          Project Narrative <span className="text-rose-500">*</span>
        </label>
        <textarea
          className={inputCls + ' min-h-[180px] resize-y'}
          value={values.narrative}
          onChange={e => setValues(v => ({ ...v, narrative: e.target.value }))}
          onBlur={e => save('narrative', e.target.value)}
          placeholder="Describe the project, its location, community impact, and development team…"
        />
        <p className="text-xs text-muted-foreground mt-1">{values.narrative.length} characters</p>
      </div>
    </div>
  )
}
