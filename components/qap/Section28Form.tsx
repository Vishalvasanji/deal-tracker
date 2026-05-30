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
    if (normalMarket && pct < LHC_VACANCY_STANDARD) {
      return (
        <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 mt-1">
          Vacancy rate is below the LHC Standard — use at least {LHC_VACANCY_STANDARD}%.
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

      {/* Inflation Rates — editable; default to the LHC standard (feeds the Proforma) */}
      <div className="space-y-3">
        <p className={subHeaderCls}>Inflation Rates</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Rent Inflation Years 1–3 (%)</label>
            <input type="text" className={inputCls} placeholder="2.0"
              value={values['s28_rent_infl_y1_3'] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, s28_rent_infl_y1_3: e.target.value }))}
              onBlur={e => handleBlur('s28_rent_infl_y1_3', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Rent Inflation Years 4–15 (%)</label>
            <input type="text" className={inputCls} placeholder="2.0"
              value={values['s28_rent_infl_y4_15'] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, s28_rent_infl_y4_15: e.target.value }))}
              onBlur={e => handleBlur('s28_rent_infl_y4_15', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Expense Inflation (%)</label>
            <input type="text" className={inputCls} placeholder="3.0"
              value={values['s28_expense_infl'] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, s28_expense_infl: e.target.value }))}
              onBlur={e => handleBlur('s28_expense_infl', e.target.value)} />
          </div>
        </div>
        <p className={noteCls}>LHC standard: rent inflation 2.0% (3% after Year 15); expense inflation 3.0%. Enter different rates only with an explanation.</p>
        {(() => {
          const ri13 = parseFloat((values['s28_rent_infl_y1_3'] ?? '').replace('%', ''))
          const ri415 = parseFloat((values['s28_rent_infl_y4_15'] ?? '').replace('%', ''))
          const ei = parseFloat((values['s28_expense_infl'] ?? '').replace('%', ''))
          const warns: string[] = []
          if (!isNaN(ri13) && ri13 > 2.0) warns.push('Rent Inflation (years 1–3) must be no higher than the LHC Standard 2.0%.')
          if (!isNaN(ri415) && ri415 > 2.0) warns.push('Rent Inflation (years 4+) must be no higher than the LHC Standard 2.0%.')
          if (!isNaN(ei) && ei < 2.8) warns.push('Expense Inflation must be at or above the LHC Standard 2.8%.')
          return warns.length ? (
            <div className="space-y-1 mt-1">
              {warns.map((w, i) => <p key={i} className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">{w}</p>)}
            </div>
          ) : null
        })()}
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
