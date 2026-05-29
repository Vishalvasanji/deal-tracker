'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  FINANCING_CERT_SECTION, SOURCE_ROWS, SUBSIDY_TABLES, SUBSIDY_COLS,
  USE_ROWS, CASH_SOURCE_ROWS, FEES_GRANTS_ROWS, VARIANCE_ROWS, type FinCertPulled,
} from '@/lib/qap-financing-cert'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const cellCls = 'w-full min-w-[80px] rounded-lg border border-input bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground'
const sectionCls = 'text-sm font-semibold pt-1'
const roCls = 'rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm'

const num = (s: string | undefined) => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const money = (n: number) => '$' + Math.round(n).toLocaleString()

interface Props {
  dealId: string
  pulled: FinCertPulled
  initialVals: Record<string, string>
}

export function FinancingCertClient({ dealId, pulled, initialVals }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(initialVals)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }))
  const save = (k: string, v: string) => startTransition(async () => {
    await upsertQapField(dealId, FINANCING_CERT_SECTION, k, v)
    setSavedAt(new Date().toLocaleTimeString())
  })
  const sumOf = (keys: string[]) => keys.reduce((s, k) => s + num(vals[k]), 0)

  const cell = (k: string) => (
    <input className={cellCls} inputMode="decimal" value={vals[k] ?? ''}
      onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
  )
  const text = (k: string, label: string, opts?: { area?: boolean; rows?: number; type?: string }) => (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {opts?.area ? (
        <textarea className={inputCls} rows={opts.rows ?? 3} value={vals[k] ?? ''}
          onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
      ) : (
        <input className={inputCls} type={opts?.type === 'date' ? 'date' : 'text'}
          inputMode={opts?.type === 'number' ? 'decimal' : undefined} value={vals[k] ?? ''}
          onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
      )}
    </div>
  )
  const ro = (label: string, value: string, note?: string) => (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      <div className={roCls}>{value || '—'}</div>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )

  const totalAmt = sumOf(SOURCE_ROWS.map(r => `${r.key}_amt`))
  const totalDs = sumOf(SOURCE_ROWS.map(r => `${r.key}_ds`))
  const useTotal = sumOf(USE_ROWS.map(r => r.key))
  const cashSub = sumOf(CASH_SOURCE_ROWS.map(r => r.key))
  const feesSub = sumOf(FEES_GRANTS_ROWS.map(r => r.key))
  const installTotal = sumOf(Array.from({ length: 10 }, (_, i) => `fin_install_${i + 1}`))
  const histTotal = sumOf(['fin_hist_1', 'fin_hist_2', 'fin_hist_3'])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Pulled key figures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ro('Gross Equity', money(pulled.grossEquity), 'from Syndication')}
        {ro('Net Equity', money(pulled.netEquity), 'from Syndication')}
      </div>

      {/* A. Source of Funds */}
      <div className="space-y-2">
        <p className={sectionCls}>A. Source of Funds</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-1 pr-2">Source</th>
                <th className="text-right font-medium py-1 px-1">Amount</th>
                <th className="text-right font-medium py-1 px-1">Annual Debt Service</th>
                <th className="text-right font-medium py-1 px-1">Interest Rate</th>
                <th className="text-right font-medium py-1 px-1">Amort. (Yrs)</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_ROWS.map(r => (
                <tr key={r.key} className="border-b border-border/40">
                  <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground">{r.label}</td>
                  <td className="py-1 px-1">{cell(`${r.key}_amt`)}</td>
                  <td className="py-1 px-1">{r.terms ? cell(`${r.key}_ds`) : <span className="block text-center text-muted-foreground">—</span>}</td>
                  <td className="py-1 px-1">{r.terms ? cell(`${r.key}_rate`) : <span className="block text-center text-muted-foreground">—</span>}</td>
                  <td className="py-1 px-1">{r.terms ? cell(`${r.key}_amort`) : <span className="block text-center text-muted-foreground">—</span>}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1 pr-2">Total</td>
                <td className="py-1 px-1 text-right tabular-nums">{money(totalAmt)}</td>
                <td className="py-1 px-1 text-right tabular-nums">{money(totalDs)}</td>
                <td /><td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items which vary (Application/Reservation vs Placed-in-Service) */}
      <div className="space-y-2">
        <p className={sectionCls}>Items Which Vary from Application/Reservation to Placed-in-Service</p>
        {text('fin_pis_date', 'Estimated Placed-in-Service Date', { type: 'date' })}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-1 pr-2">Item</th>
              <th className="text-right font-medium py-1 px-1">Application / Reservation</th>
              <th className="text-right font-medium py-1 px-1">Placed-in-Service</th>
            </tr></thead>
            <tbody>
              {VARIANCE_ROWS.map(r => (
                <tr key={r.key} className="border-b border-border/40">
                  <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground">{r.label}</td>
                  <td className="py-1 px-1">{cell(`var_${r.key}_app`)}</td>
                  <td className="py-1 px-1">{cell(`var_${r.key}_pis`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* B. Syndication Information */}
      <div className="space-y-3">
        <p className={sectionCls}>B. Syndication Information</p>
        <p className="text-xs text-muted-foreground">I. Syndication proceeds to be received during the credit period (10 installments):</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{i + 1}</label>
              {cell(`fin_install_${i + 1}`)}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">Total installments</span>
          <span className="text-sm font-bold tabular-nums">{money(installTotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Total LIHTC Proceeds (Source of Funds, Line A): {money(num(vals['src_lihtc_proceeds_amt']))} — the installments should reconcile to this.</p>

        <p className="text-xs text-muted-foreground">II. Historic Rehabilitation Credit proceeds (Years 1–3):</p>
        <div className="grid grid-cols-3 gap-2">
          {['fin_hist_1', 'fin_hist_2', 'fin_hist_3'].map((k, i) => (
            <div key={k} className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Year {i + 1}</label>
              {cell(k)}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">Total historic proceeds</span>
          <span className="text-sm font-bold tabular-nums">{money(histTotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Total Historic Credit Proceeds (Source of Funds, Line A): {money(num(vals['src_historic_proceeds_amt']))}.</p>

        <p className="text-xs text-muted-foreground pt-1">III. Information concerning the Syndicator:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ro('Name', pulled.syndName, 'from Syndication')}
          {ro('Address', pulled.syndAddress, 'from Syndication')}
          {ro('Telephone', pulled.syndPhone, 'from Syndication')}
        </div>
        {text('fin_guarantees', 'IV. Operating and/or credit guarantees required by the Syndicator', { area: true })}
        <p className="text-[11px] text-muted-foreground">V. Attach evidence of syndication from the Syndicator.</p>
      </div>

      {/* C. Subsidies */}
      <div className="space-y-4">
        <p className={sectionCls}>C. Subsidies</p>
        {SUBSIDY_TABLES.map(t => {
          const dataRows = t.rows.filter((r): r is { key: string; label: string } => 'key' in r)
          return (
            <div key={t.key} className="space-y-1">
              <p className="text-xs font-medium">{t.title}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left font-medium py-1 pr-2" />
                      {SUBSIDY_COLS.map(c => <th key={c.key} className="text-right font-medium py-1 px-1">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, i) => 'subhead' in r ? (
                      <tr key={`sh-${i}`}><td colSpan={4} className="py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{r.subhead}</td></tr>
                    ) : (
                      <tr key={r.key} className="border-b border-border/40">
                        <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground">{r.label}</td>
                        {SUBSIDY_COLS.map(c => <td key={c.key} className="py-1 px-1">{cell(`${t.key}_${r.key}_${c.key}`)}</td>)}
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-1 pr-2">TOTAL</td>
                      {SUBSIDY_COLS.map(c => (
                        <td key={c.key} className="py-1 px-1 text-right tabular-nums">
                          {money(sumOf(dataRows.map(r => `${t.key}_${r.key}_${c.key}`)))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* D. Uses */}
      <div className="space-y-2">
        <p className={sectionCls}>D. Uses</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-1 pr-2">Use</th>
              <th className="text-right font-medium py-1 pl-2">Amount</th>
            </tr></thead>
            <tbody>
              {USE_ROWS.map(r => (
                <tr key={r.key} className="border-b border-border/40">
                  <td className="py-1 pr-2 text-muted-foreground">{r.label}</td>
                  <td className="py-1 pl-2 w-40">{cell(r.key)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-1 pr-2 text-muted-foreground">Total Development Costs</td>
                <td className="py-1 pl-2 text-right tabular-nums">
                  {money(USE_ROWS.filter(r => !['use_temp_loan_payoff', 'use_initial_op_reserve', 'use_initial_replacement_reserve'].includes(r.key)).reduce((acc, r) => acc + num(vals[r.key]), 0))}
                </td>
              </tr>
              <tr className="font-semibold">
                <td className="py-1 pr-2">Total Use of Funds</td>
                <td className="py-1 pl-2 text-right tabular-nums">{money(useTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* E. Funds Available for Cash Requirements */}
      <div className="space-y-2">
        <p className={sectionCls}>E. Funds Available for Cash Requirements</p>
        {(() => {
          const COLS: { k: string; l: string }[] = [{ k: 'res', l: 'Reservation' }, { k: 'alloc', l: 'Allocation' }, { k: 'pis', l: 'Placed-in-Service' }]
          const colTotal = (rows: readonly { key: string }[], col: string) => rows.reduce((acc, r) => acc + num(vals[`${r.key}_${col}`]), 0)
          const grand = (col: string) => colTotal(CASH_SOURCE_ROWS, col) + colTotal(FEES_GRANTS_ROWS, col)
          const rowGroup = (title: string, rows: readonly { key: string; label: string }[]) => (
            <>
              <tr><td colSpan={4} className="py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</td></tr>
              {rows.map(r => (
                <tr key={r.key} className="border-b border-border/40">
                  <td className="py-1 pr-2 text-muted-foreground">{r.label}</td>
                  {COLS.map(c => <td key={c.k} className="py-1 px-1">{cell(`${r.key}_${c.k}`)}</td>)}
                </tr>
              ))}
            </>
          )
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-1 pr-2" />
                  {COLS.map(c => <th key={c.k} className="text-right font-medium py-1 px-1">{c.l}</th>)}
                </tr></thead>
                <tbody>
                  {rowGroup('15. Sources of Cash', CASH_SOURCE_ROWS)}
                  {rowGroup('16. Source of Fees and Grants', FEES_GRANTS_ROWS)}
                  <tr className="font-semibold">
                    <td className="py-1 pr-2">17. Total Cash, Fees &amp; Grants</td>
                    {COLS.map(c => <td key={c.k} className="py-1 px-1 text-right tabular-nums">{money(grand(c.k))}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Certification */}
      <div className="rounded-2xl border border-black/[0.06] p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Certification</p>
        {ro('By:', pulled.controllingPrincipalName, 'Controlling Principal (auto)')}
        {text('fin_title', 'Title')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {text('fin_cert_date', 'Certification Date', { type: 'date' })}
          {text('fin_witness_date', 'Witness Date', { type: 'date' })}
        </div>
      </div>
    </div>
  )
}
