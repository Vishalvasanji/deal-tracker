'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'
const selectCls = inputCls

const YES_NO_OPTS = ['Yes', 'No']

const PROJECT_TYPE_OPTS = [
  { value: '', label: 'Select…' },
  { value: 'Family', label: 'Family' },
  { value: 'Seniors', label: 'Seniors' },
  { value: 'Rehab / Other', label: 'Rehab / Other' },
  { value: 'Missing', label: 'Missing' },
]

interface Props {
  dealId: string
  initial: Record<string, string>
  totalUnits: number
}

export function Section29Form({ dealId, initial, totalUnits }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_29', fk, val)
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

  function YesNoToggle({ fk, label }: { fk: string; label: string }) {
    return (
      <div className="space-y-1.5">
        <label className={labelCls}>{label}</label>
        <div className="flex gap-2 flex-wrap">
          {YES_NO_OPTS.map(opt => (
            <button key={opt} type="button"
              onClick={() => handleSelect(fk, opt)}
              className={values[fk] === opt ? activeBtn : inactiveBtn}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const hudRd = values['s29_hud_rd_mortgage'] ?? ''
  const projectType = values['s29_project_type'] ?? ''
  const pupaRaw = parseFloat(values['s29_reserve_pupa'] ?? '')
  const pupa = isNaN(pupaRaw) ? 0 : pupaRaw

  // Compute minPupa
  let minPupa: number | null = null
  let minPupaNote: string | null = null
  if (hudRd === 'Yes') {
    minPupaNote = 'Minimum determined per HUD/RD policies'
  } else if (hudRd === 'No' && projectType) {
    if (projectType === 'Family') minPupa = 350
    else if (projectType === 'Seniors') minPupa = 300
    else minPupa = 500
  }

  const bothAnswered = hudRd !== '' && projectType !== ''
  const belowMin = minPupa !== null && pupa > 0 && pupa < minPupa

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 29 — Replacement Reserve Funding</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* HUD/RD Mortgage */}
      <YesNoToggle
        fk="s29_hud_rd_mortgage"
        label="Does HUD or RD finance the first mortgage?"
      />

      {/* Project Type */}
      <div className="space-y-1.5">
        <label className={labelCls}>Is the project a new construction project?</label>
        <select
          className={selectCls}
          value={values['s29_project_type'] ?? ''}
          onChange={e => handleSelect('s29_project_type', e.target.value)}
        >
          {PROJECT_TYPE_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Other Requirements — only when hud_rd = "No" */}
      {hudRd === 'No' && (
        <YesNoToggle
          fk="s29_other_requirements"
          label="Are there any requirements regarding the funding of the Replacement Reserve, other than LHC's requirements?"
        />
      )}

      {/* Reserve PUPA */}
      <div className="space-y-2">
        <p className={subHeaderCls}>Reserve Deposit</p>
        <div className="flex gap-4 items-start flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Proposed annual Reserve deposit (PUPA)</label>
            <input
              type="text"
              className={inputCls}
              value={values['s29_reserve_pupa'] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, s29_reserve_pupa: e.target.value }))}
              onBlur={e => handleBlur('s29_reserve_pupa', e.target.value)}
              placeholder="e.g. 350"
            />
          </div>

          {/* LHC Minimum read-only */}
          {bothAnswered && (
            <div className="flex-1 min-w-[180px]">
              <label className={labelCls}>LHC Minimum (PUPA)</label>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-semibold tabular-nums">
                {minPupaNote ? (
                  <span className="font-normal text-muted-foreground">{minPupaNote}</span>
                ) : (
                  minPupa ?? '—'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Annual total */}
        {totalUnits > 0 && pupa > 0 && (
          <p className={noteCls}>
            Annual total: ${(pupa * totalUnits).toLocaleString()}
          </p>
        )}

        {/* Below minimum warning */}
        {belowMin && (
          <p className="text-xs text-red-600 font-medium px-1">
            Below minimum — {minPupa} PUPA required
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className={labelCls}>Comment</label>
        <textarea
          className={inputCls}
          rows={3}
          value={values['s29_comment'] ?? ''}
          onChange={e => setValues(prev => ({ ...prev, s29_comment: e.target.value }))}
          onBlur={e => handleBlur('s29_comment', e.target.value)}
        />
      </div>
    </div>
  )
}
