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
const LHC_VACANCY_STANDARD = 7.0

// LHC standard rates (non-vacancy) — read-only reference
const LHC_RATES_READONLY: { label: string; value: string }[] = [
  { label: 'Rent Inflation Rate Years 1–3',  value: '2.0%' },
  { label: 'Rent Inflation Rate Years 4–15', value: '2.0%  (3% thereafter)' },
  { label: 'Expenses Inflation Rate',             value: '3.0%' },
]

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section28Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_28', fk, val)
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

  const softMarket = values['s28_soft_market'] === 'Yes'
  const normalMarket = values['s28_soft_market'] === 'No'

  function vacancyAlert(fk: string): React.ReactNode {
    const raw = values[fk]
    if (!raw?.trim()) return null
    const pct = parseFloat(raw)
    if (isNaN(pct)) return null
    if (softMarket && pct <= LHC_VACANCY_STANDARD) {
      return (
        <p className="text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 mt-1">
          Soft market vacancy rate must exceed the LHC Standard of {LHC_VACANCY_STANDARD}%.
        </p>
      )
    }
    if (normalMarket && pct > LHC_VACANCY_STANDARD) {
      return (
        <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 mt-1">
          Vacancy rate exceeds the LHC Standard of {LHC_VACANCY_STANDARD}%. Confirm this is intentional.
        </p>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 28 &mdash; Trending Rates for Cash Flow Pro Forma</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Soft Market Toggle */}
      <div className="space-y-3">
        <YesNoToggle
          fk="s28_soft_market"
          label="Is the project in a soft market as determined by the commissioned market analyst?"
        />
      </div>

      {/* Vacancy Rate Overrides */}
      <div className="space-y-4">
        <p className={subHeaderCls}>Vacancy Rates</p>
        <p className={noteCls}>
          LHC Standard vacancy is {LHC_VACANCY_STANDARD}% for both periods.
          {softMarket && ' Soft market projects must use a vacancy rate exceeding the standard.'}
          {normalMarket && ' Standard market projects must not exceed the LHC Standard.'}
        </p>

        <div>
          <label className={labelCls}>Vacancy Rate Years 1&ndash;3 (%)</label>
          <input
            type="number"
            step="0.1"
            className={inputCls}
            placeholder={String(LHC_VACANCY_STANDARD)}
            value={values['s28_vacancy_y1_3'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s28_vacancy_y1_3: e.target.value }))}
            onBlur={e => handleBlur('s28_vacancy_y1_3', e.target.value)}
          />
          {vacancyAlert('s28_vacancy_y1_3')}
        </div>

        <div>
          <label className={labelCls}>Vacancy Rate Years 4+ (%)</label>
          <input
            type="number"
            step="0.1"
            className={inputCls}
            placeholder={String(LHC_VACANCY_STANDARD)}
            value={values['s28_vacancy_y4_plus'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s28_vacancy_y4_plus: e.target.value }))}
            onBlur={e => handleBlur('s28_vacancy_y4_plus', e.target.value)}
          />
          {vacancyAlert('s28_vacancy_y4_plus')}
        </div>
      </div>

      {/* LHC Standard Rates — read-only reference (non-vacancy) */}
      <div className="space-y-3">
        <p className={subHeaderCls}>LHC Standard Rates (Reference)</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Rate</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">LHC Standard</th>
              </tr>
            </thead>
            <tbody>
              {LHC_RATES_READONLY.map(({ label, value }, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className="px-4 py-2.5 text-sm text-foreground">{label}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADRR Escalation Rate */}
      <div className="space-y-3">
        <p className={subHeaderCls}>ADRR Escalation Rate</p>
        <div>
          <label className={labelCls}>Annual Deposit to Replacement Reserve (ADRR) Escalation Rate (%)</label>
          <input
            type="text"
            className={inputCls}
            value={values['s28_adrr_escalation'] ?? '0'}
            onChange={e => setValues(prev => ({ ...prev, s28_adrr_escalation: e.target.value }))}
            onBlur={e => handleBlur('s28_adrr_escalation', e.target.value)}
            placeholder="0"
          />
        </div>
        <p className={noteCls}>
          The QAP does not require that the ADRR match an LHC-set rate. Enter the rate as a decimal (e.g., 0.03 for 3%).
        </p>
      </div>

      {/* Comment */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Comment on Trending Rates</label>
          <textarea
            className={inputCls}
            rows={3}
            value={values['s28_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s28_comment: e.target.value }))}
            onBlur={e => handleBlur('s28_comment', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
