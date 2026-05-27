'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const YES_NO_OPTS = ['Yes', 'No', 'Missing']

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section24Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_24', fk, val)
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

  const specialNeedsPopulations: { activeFk: string; unitsFk: string; label: string }[] = [
    { activeFk: 's24_02_homeless_active', unitsFk: 's24_02_homeless_units', label: 'Homeless Households' },
    { activeFk: 's24_02_disabled_active', unitsFk: 's24_02_disabled_units', label: 'Disabled Households' },
    { activeFk: 's24_02_single_parent_active', unitsFk: 's24_02_single_parent_units', label: 'Single Parent Households' },
    { activeFk: 's24_02_veterans_active', unitsFk: 's24_02_veterans_units', label: 'Veterans' },
  ]

  const anySpecialNeedsActive = specialNeedsPopulations.some(
    ({ activeFk }) => values[activeFk] === 'Yes'
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 24 — Targeted Population Type</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 24.01 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>24.01 Special Needs Housing Points</p>
        <YesNoToggle
          fk="s24_01_special_needs_points"
          label="Do you intend to claim QAP points in Selection Criterion II.A Special Needs Housing?"
        />
      </div>

      {/* 24.02 — shown if 24.01 = Yes */}
      {values['s24_01_special_needs_points'] === 'Yes' && (
        <div className="space-y-4 pl-4 border-l-2 border-border">
          <p className={subHeaderCls}>24.02 Special Needs Population Served</p>
          <p className={noteCls}>
            Select Yes for each population served and enter the number of units dedicated to that population.
          </p>

          <div className="space-y-4">
            {specialNeedsPopulations.map(({ activeFk, unitsFk, label }) => (
              <div key={activeFk} className="grid grid-cols-2 gap-4 items-end">
                <YesNoToggle fk={activeFk} label={label} />
                <div>
                  <label className={labelCls}>Units Dedicated</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={values[unitsFk] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [unitsFk]: e.target.value }))}
                    onBlur={e => handleBlur(unitsFk, e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            ))}
          </div>

          {anySpecialNeedsActive && (
            <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              An information request will appear on the Checklist for Special Needs Housing documentation.
            </p>
          )}
        </div>
      )}

      {/* 24.03 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>24.03 Elderly Housing</p>
        <YesNoToggle
          fk="s24_03_elderly_100pct"
          label="Are 100% of the project units designated for elderly households?"
        />
      </div>
    </div>
  )
}
