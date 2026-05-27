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

const LHC_RATES: { label: string; value: string }[] = [
  { label: 'Vacancy Rate Years 1–3',         value: '7.0%' },
  { label: 'Vacancy Rate Years 4+',          value: '7.0%' },
  { label: 'Rent Inflation Rate Years 1–3',  value: '2.0%' },
  { label: 'Rent Inflation Rate Years 4–15', value: '2.0%  (3% thereafter)' },
  { label: 'Expenses Inflation Rate',        value: '3.0%' },
]

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

  const softMarketAnswered = values['s28_soft_market'] && values['s28_soft_market'] !== ''

  // L-7: Vacancy rate validation
  const proposedVacancy = parseFloat(values['s28_proposed_vacancy'] ?? '')
  const softMarket = values['s28_soft_market'] === 'Yes'
  const normalMarket = values['s28_soft_market'] === 'No'
  let vacancyError = ''
  let vacancyInfo = ''

  if (!isNaN(proposedVacancy) && values['s28_soft_market']) {
    if (softMarket && proposedVacancy <= 7.0) {
      vacancyError = 'Soft market vacancy rate must exceed 7.0%.'
    } else if (normalMarket && proposedVacancy !== 7.0) {
      vacancyInfo = 'Standard market vacancy rate must be exactly 7.0%. Adjust to match LHC standard.'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 28 — Trending Rates for Cash Flow Pro Forma</h2>
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
        {softMarketAnswered && (
          <p className={noteCls}>
            Vacancy rate must match the LHC Standard for soft or standard markets.
          </p>
        )}
      </div>

      {/* L-7: Proposed Vacancy Rate input */}
      <div className="space-y-2">
        <div>
          <label className={labelCls}>Proposed Vacancy Rate (%)</label>
          <input
            type="text"
            className={`${inputCls} ${vacancyError ? 'border-red-400 bg-red-50' : ''}`}
            value={values['s28_proposed_vacancy'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s28_proposed_vacancy: e.target.value }))}
            onBlur={e => handleBlur('s28_proposed_vacancy', e.target.value)}
            placeholder="e.g. 7.0"
          />
        </div>
        {vacancyError && (
          <p className="text-xs text-red-600 font-medium px-1">{vacancyError}</p>
        )}
        {vacancyInfo && (
          <p className="text-xs text-muted-foreground px-1">{vacancyInfo}</p>
        )}
      </div>

      {/* LHC Standard Rates — read-only table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>LHC Standard Rates</p>
        <p className={noteCls}>
          These rates are set by LHC and are auto-populated in the QAP model based on market type. They are not user-editable here.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Rate</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {LHC_RATES.map(({ label, value }, i) => (
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
