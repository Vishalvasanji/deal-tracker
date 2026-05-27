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

// H979 accepts: 'Family' (350 PUPA), 'Seniors' (300 PUPA), anything else (500 PUPA)
const PROJECT_TYPE_OPTS = [
  { value: '',         label: 'Select…' },
  { value: 'Family',   label: 'Family' },
  { value: 'Seniors',  label: 'Seniors' },
  { value: 'Other',    label: 'Other / Rehab' },
]

function minPupaFor(hudRd: string, projectType: string): { min: number | null; note: string | null } {
  if (hudRd === 'Yes') {
    return { min: null, note: 'Minimum Reserve deposit may be determined in accordance with HUD/RD policies.' }
  }
  if (!projectType) return { min: null, note: null }
  if (projectType === 'Seniors') return { min: 300, note: null }
  if (projectType === 'Family')  return { min: 350, note: null }
  return { min: 500, note: null }
}

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

  const hudRd      = values['s29_hud_rd_mortgage'] ?? ''
  const projectType = values['s29_project_type'] ?? ''
  const pupaRaw    = parseFloat(values['s29_reserve_pupa'] ?? '')
  const pupa       = isNaN(pupaRaw) ? 0 : pupaRaw
  const otherReqs  = values['s29_other_requirements'] ?? ''

  const { min: minPupa, note: minPupaNote } = minPupaFor(hudRd, projectType)

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

      {/* 29.01 — HUD/RD First Mortgage */}
      <YesNoToggle
        fk="s29_hud_rd_mortgage"
        label="Does HUD or RD finance the first mortgage?"
      />

      {/* 29.02 — Project Type */}
      <div className="space-y-1.5">
        <label className={labelCls}>Is the project a new construction project? If so, what type?</label>
        <select
          className={selectCls}
          value={values['s29_project_type'] ?? ''}
          onChange={e => handleSelect('s29_project_type', e.target.value)}
        >
          {PROJECT_TYPE_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className={noteCls}>
          Family = 350 PUPA minimum · Seniors = 300 PUPA minimum · Other/Rehab = 500 PUPA minimum
        </p>
      </div>

      {/* 29.03 — Other funder requirements (always shown once both questions answered) */}
      {hudRd !== '' && (
        <YesNoToggle
          fk="s29_other_requirements"
          label="Are there any requirements regarding the funding of the Replacement Reserve, other than LHC's requirements under the QAP?"
        />
      )}
      {otherReqs === 'Yes' && (
        <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">
          Explain those additional requirements in the comment box below.
        </p>
      )}

      {/* 29.04 — Reserve PUPA deposit */}
      <div className="space-y-2">
        <p className={subHeaderCls}>Reserve Deposit</p>
        <div className="flex gap-4 items-start flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Proposed annual Reserve deposit (PUPA)</label>
            <input
              type="text"
              className={`${inputCls} ${belowMin ? 'border-red-400 bg-red-50' : ''}`}
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
                {minPupaNote
                  ? <span className="font-normal text-muted-foreground text-xs">{minPupaNote}</span>
                  : minPupa ?? '—'
                }
              </div>
            </div>
          )}
        </div>

        {/* Annual total */}
        {totalUnits > 0 && pupa > 0 && (
          <p className={noteCls}>
            Annual total: ${(pupa * totalUnits).toLocaleString()} ({pupa} PUPA × {totalUnits} units)
          </p>
        )}

        {/* Below minimum warning */}
        {belowMin && (
          <p className="text-xs text-red-600 font-medium px-1">
            Below minimum — {minPupa} PUPA required for this project type.
          </p>
        )}
      </div>

      {/* 29.05 — Comment */}
      <div>
        <label className={labelCls}>Comment on annual Reserve deposit</label>
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
