'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const YES_NO_OPTS = ['Yes', 'No', 'Missing']
const EXTENDED_AFFORD_OPTS = [
  'Until after the 35th year',
  'Until after the 40th year',
  'Until after the 45th year',
  'Missing',
]

interface Props {
  dealId: string
  initial: Record<string, string>
}

function extendedAffordPoints(val: string): number {
  if (val === 'Until after the 35th year') return 3
  if (val === 'Until after the 40th year') return 4
  if (val === 'Until after the 45th year') return 5
  return 0
}

export default function Section25Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_25', fk, val)
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

  const affordPts = extendedAffordPoints(values['s25_01_waiver_length'] ?? '')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 25 — Priority Development Areas and Other Preferences</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 25.01 Extended Affordability */}
      <div className="space-y-3">
        <p className={subHeaderCls}>25.01 Extended Affordability</p>
        <YesNoToggle
          fk="s25_01_extended_afford_points"
          label="Do you intend to claim QAP points in Selection Criterion III.A Extended Affordability Period?"
        />

        {values['s25_01_extended_afford_points'] === 'Yes' && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <YesNoToggle
              fk="s25_01_written_agreement"
              label="Do you agree to execute a written agreement, acceptable to LHC, in which the tax credit regulatory agreement is extended?"
            />

            <div>
              <label className={labelCls}>Length of extended affordability period</label>
              <select
                className={selectCls}
                value={values['s25_01_waiver_length'] ?? ''}
                onChange={e => handleSelect('s25_01_waiver_length', e.target.value)}
              >
                <option value="">Select…</option>
                {EXTENDED_AFFORD_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Live points badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Estimated points:</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                affordPts > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {affordPts > 0 ? `+${affordPts} pts` : '0 pts'}
              </span>
              {affordPts > 0 && (
                <span className="text-xs text-muted-foreground">
                  (35yr = 3 pts, 40yr = 4 pts, 45yr = 5 pts)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 25.02 Additional Financial Support */}
      <div className="space-y-3">
        <p className={subHeaderCls}>25.02 Additional Financial Support</p>
        <YesNoToggle
          fk="s25_02_additional_financial"
          label="Do you intend to claim QAP points in Selection Criterion III.D Additional Financial Support?"
        />

        {values['s25_02_additional_financial'] === 'Yes' && (
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <label className={labelCls}>Amount of Additional Financial Support ($)</label>
              <input
                type="number"
                className={inputCls}
                value={values['s25_03_additional_financial_amount'] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, s25_03_additional_financial_amount: e.target.value }))}
                onBlur={e => handleBlur('s25_03_additional_financial_amount', e.target.value)}
                min={0}
              />
            </div>
            <p className={noteCls}>
              This amount will be compared to Total Development Cost to compute the ratio for scoring.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
