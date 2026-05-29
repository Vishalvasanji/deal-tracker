'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  DEMAND_CERT_SECTION, UNIT_ROWS, MARKET_STUDY_COLS, VACANCY_COLS, INCOME_COLS,
  OCCUPANCY_ROWS, SPECIAL_NEEDS_COLS, ELDERLY_NA_ROWS,
} from '@/lib/qap-demand-cert'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const cellCls = 'w-full min-w-[64px] rounded-lg border border-input bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground'
const sectionCls = 'text-sm font-semibold'
const num = (s: string | undefined) => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}

interface Props {
  dealId: string
  initialVals: Record<string, string>
}

export function DemandCertClient({ dealId, initialVals }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(initialVals)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }))
  const save = (k: string, v: string) => startTransition(async () => {
    await upsertQapField(dealId, DEMAND_CERT_SECTION, k, v)
    setSavedAt(new Date().toLocaleTimeString())
  })

  const cell = (k: string) => (
    <input className={cellCls} inputMode="decimal" value={vals[k] ?? ''}
      onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
  )
  const text = (k: string, label: string, opts?: { area?: boolean; rows?: number; type?: string; suffix?: string }) => (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {opts?.area ? (
        <textarea className={inputCls} rows={opts.rows ?? 3} value={vals[k] ?? ''}
          onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
      ) : (
        <div className="flex items-center gap-2">
          <input className={inputCls} type={opts?.type === 'date' ? 'date' : 'text'}
            inputMode={opts?.type === 'number' ? 'decimal' : undefined} value={vals[k] ?? ''}
            onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
          {opts?.suffix && <span className="text-xs text-muted-foreground shrink-0">{opts.suffix}</span>}
        </div>
      )}
    </div>
  )

  const unitGrid = (
    prefix: string,
    cols: readonly { key: string; label: string }[],
    opts?: { naCol?: string; naRows?: readonly string[]; totals?: boolean },
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left font-medium py-1 pr-2">Unit Size</th>
            {cols.map(c => <th key={c.key} className="text-right font-medium py-1 px-1 align-bottom">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {UNIT_ROWS.map(u => (
            <tr key={u.key} className="border-b border-border/40">
              <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">{u.label}</td>
              {cols.map(c => {
                const na = opts?.naCol === c.key && opts?.naRows?.includes(u.key)
                return (
                  <td key={c.key} className="py-1 px-1">
                    {na ? <span className="block text-center text-muted-foreground">N/A</span> : cell(`${prefix}_${u.key}_${c.key}`)}
                  </td>
                )
              })}
            </tr>
          ))}
          {opts?.totals && (
            <tr className="font-semibold">
              <td className="py-1 pr-2">Total</td>
              {cols.map(c => (
                <td key={c.key} className="py-1 px-1 text-right tabular-nums">
                  {UNIT_ROWS.reduce((s, u) => s + num(vals[`${prefix}_${u.key}_${c.key}`]), 0).toLocaleString()}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  const sec = (n: string, title: string) => <p className={sectionCls}>({n}) {title}</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
        Completed by the qualified housing consultant from the market study attached to the application.
      </p>

      <div className="space-y-2">
        {sec('1', 'Market Area — detailed description (as described in the attached market analysis)')}
        {text('d_market_area', '', { area: true, rows: 5 })}
      </div>

      <div className="space-y-2">
        {sec('2', 'Market Area — brief description (e.g. Bunkie City Limits)')}
        {text('d_market_brief', '', { area: true, rows: 2 })}
      </div>

      <div className="space-y-2">
        {sec('3', 'Market study data, by unit size')}
        {unitGrid('d3', MARKET_STUDY_COLS)}
      </div>

      <div className="space-y-2">
        {sec('4', 'Vacancy rates and market rents, by unit size')}
        {unitGrid('d4', VACANCY_COLS)}
      </div>

      <div className="space-y-2">
        {sec('5', 'Income-eligible households that can afford tax-credit rents, by unit size')}
        {unitGrid('d5', INCOME_COLS, { totals: true })}
      </div>

      <div className="space-y-2">
        {sec('6', 'Expected occupancy after completion')}
        {text('d_completion_date', 'Expected Completion Date', { type: 'date' })}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-1 pr-2">Percentage Occupancy</th>
              <th className="text-right font-medium py-1 pl-2">Months After Completion</th>
            </tr></thead>
            <tbody>
              {OCCUPANCY_ROWS.map(o => (
                <tr key={o.key} className="border-b border-border/40">
                  <td className="py-1 pr-2 text-muted-foreground">{o.label}</td>
                  <td className="py-1 pl-2">{cell(`d6_${o.key}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        {sec('7', 'Special-needs households expected at or below 50% AMI')}
        {unitGrid('d7', SPECIAL_NEEDS_COLS, { naCol: 'elderly', naRows: ELDERLY_NA_ROWS })}
      </div>

      <div className="space-y-2">
        {sec('8', 'Special-needs households expected at or below 60% AMI')}
        {unitGrid('d8', SPECIAL_NEEDS_COLS, { naCol: 'elderly', naRows: ELDERLY_NA_ROWS })}
      </div>

      <div className="space-y-2">
        {sec('9', 'Total households on the PHA waiting list for the market area')}
        {text('d_pha_waitlist', '', { type: 'number' })}
      </div>

      <div className="space-y-2">
        {sec('10', 'Governmental unit responsible for permitting construction in the market area')}
        {text('d_permit_govt', '')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          {sec('11', 'Units permitted for construction in the market area')}
          {text('d_units_permitted', '', { type: 'number' })}
        </div>
        <div className="space-y-2">
          {sec('12', 'The Line 11 information is as of what date?')}
          {text('d_permit_date', '', { type: 'date' })}
        </div>
      </div>

      <div className="space-y-2">
        {sec('13', 'Average operating expenses per unit per year')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {text('d_opex_subsidized', 'Subsidized', { type: 'number', suffix: '/unit/yr' })}
          {text('d_opex_nonsubsidized', 'Non-Subsidized', { type: 'number', suffix: '/unit/yr' })}
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.06] p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Certification</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {text('d_by', 'By: (qualified housing consultant)')}
          {text('d_signature_date', 'Date', { type: 'date' })}
        </div>
      </div>
    </div>
  )
}
