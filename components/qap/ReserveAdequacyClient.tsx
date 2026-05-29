'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { computeReserveAdequacy } from '@/lib/qap-reserve-adequacy-calc'
import { RESERVE_YEARS, INTEREST_RATE_DEFAULT, INFLATION_RATE_DEFAULT } from '@/lib/qap-reserve-adequacy'

const num = (s: string) => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const money = (n: number) => '$' + Math.round(n).toLocaleString()
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const roCls = 'rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-semibold tabular-nums'

interface Props {
  dealId: string
  initialDeposit: number    // Development Costs · Replacement Reserve Deposit
  annualDepositY1: number   // PD §29 reserve PUPA × total units
  reservePupa: number       // PD §29 reserve PUPA (for the "× units" note)
  escalation: number        // PD §28 ADRR escalation, decimal
  totalUnits: number        // Unit Mix total
  initialInterestPct: string
  initialInflationPct: string
  initialCapitalNeeds: number[]
}

export function ReserveAdequacyClient({
  dealId, initialDeposit, annualDepositY1, reservePupa, escalation, totalUnits,
  initialInterestPct, initialInflationPct, initialCapitalNeeds,
}: Props) {
  const [interestPct, setInterestPct] = useState(initialInterestPct || String(INTEREST_RATE_DEFAULT))
  const [inflationPct, setInflationPct] = useState(initialInflationPct || String(INFLATION_RATE_DEFAULT))
  const [needs, setNeeds] = useState<string[]>(() =>
    Array.from({ length: RESERVE_YEARS }, (_, i) => {
      const v = initialCapitalNeeds[i]
      return v ? String(v) : ''
    })
  )
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'reserve_adequacy', fk, val)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function saveNeeds(arr: string[]) {
    save('capital_needs__json', JSON.stringify(arr.map(num)))
  }

  const result = useMemo(() => computeReserveAdequacy({
    initialDeposit, annualDepositY1, escalation, totalUnits,
    interestRate: num(interestPct) / 100,
    inflationRate: num(inflationPct) / 100,
    capitalNeeds: needs.map(num),
  }), [initialDeposit, annualDepositY1, escalation, totalUnits, interestPct, inflationPct, needs])

  const adequate = result.shortfallYears.length === 0

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-md">
          Required only when a Capital Needs Assessment (CNA) is required for the transaction.
        </p>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Headline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Minimum Balance / Unit</p>
          <p className="text-2xl font-bold tabular-nums">{money(result.minBalancePerUnit)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">per QAP definition</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Lowest Per-Unit Balance</p>
          <p className="text-2xl font-bold tabular-nums">{money(result.lowestPerUnit)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Year {result.lowestPerUnitYear}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${adequate ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className="text-xs text-muted-foreground">Adequacy</p>
          <p className={`text-base font-bold ${adequate ? 'text-emerald-600' : 'text-rose-600'}`}>
            {adequate ? 'Adequate' : `Shortfall — ${result.shortfallYears.length} yr${result.shortfallYears.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {adequate ? 'No year falls below the minimum' : `Years ${result.shortfallYears.join(', ')}`}
          </p>
        </div>
      </div>

      {/* Assumptions */}
      <div className="rounded-2xl border border-black/[0.06] p-5 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assumptions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Initial Deposit</label>
            <div className={roCls}>{money(initialDeposit)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Development Costs</p>
          </div>
          <div>
            <label className={labelCls}>Annual Deposit (Year 1)</label>
            <div className={roCls}>{money(annualDepositY1)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              §29 · {reservePupa ? `$${reservePupa.toLocaleString()} PUPA × ${totalUnits} units` : 'reserve PUPA × units'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Deposit Escalation</label>
            <div className={roCls}>{(escalation * 100).toFixed(2)}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">§28 · ADRR rate</p>
          </div>
          <div>
            <label className={labelCls}>Total Units</label>
            <div className={roCls}>{totalUnits.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Unit Mix</p>
          </div>
          <div>
            <label className={labelCls}>Interest Rate (%)</label>
            <input
              className={inputCls}
              value={interestPct}
              inputMode="decimal"
              onChange={e => setInterestPct(e.target.value)}
              onBlur={e => save('interest_rate', e.target.value)}
              placeholder={String(INTEREST_RATE_DEFAULT)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">LHC standard {INTEREST_RATE_DEFAULT}%</p>
          </div>
          <div>
            <label className={labelCls}>Inflation Rate (%)</label>
            <input
              className={inputCls}
              value={inflationPct}
              inputMode="decimal"
              onChange={e => setInflationPct(e.target.value)}
              onBlur={e => save('inflation_rate', e.target.value)}
              placeholder={String(INFLATION_RATE_DEFAULT)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">LHC standard {INFLATION_RATE_DEFAULT}%</p>
          </div>
        </div>
      </div>

      {/* Capital Needs input */}
      <div className="rounded-2xl border border-black/[0.06] p-5 space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capital Needs</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Uninflated anticipated needs by year, from the project&apos;s CNA. Inflated at the rate above.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2 pr-3">Year</th>
                <th className="text-right font-medium py-2 px-3">Uninflated</th>
                <th className="text-right font-medium py-2 pl-3">Inflated</th>
              </tr>
            </thead>
            <tbody>
              {needs.map((v, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="py-1.5 px-3">
                    <input
                      className="w-28 ml-auto block rounded-lg border border-input bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      value={v}
                      inputMode="numeric"
                      onChange={e => {
                        const next = [...needs]; next[i] = e.target.value; setNeeds(next)
                      }}
                      onBlur={() => saveNeeds(needs)}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-muted-foreground">
                    {result.inflatedNeeds[i] ? money(result.inflatedNeeds[i]) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 15-year projection */}
      <div className="rounded-2xl border border-black/[0.06] p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">15-Year Reserve Projection</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums whitespace-nowrap">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2 pr-3">Year</th>
                <th className="text-right font-medium py-2 px-2">Beginning</th>
                <th className="text-right font-medium py-2 px-2">+ Deposit</th>
                <th className="text-right font-medium py-2 px-2">− Needs</th>
                <th className="text-right font-medium py-2 px-2">+ Interest</th>
                <th className="text-right font-medium py-2 px-2">Ending</th>
                <th className="text-right font-medium py-2 px-2">Per Unit</th>
                <th className="text-center font-medium py-2 pl-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.years.map(y => (
                <tr key={y.year} className={`border-b border-border/50 ${y.problem ? 'bg-rose-50' : ''}`}>
                  <td className="py-1.5 pr-3 text-muted-foreground">{y.year}</td>
                  <td className="py-1.5 px-2 text-right">{money(y.beginning)}</td>
                  <td className="py-1.5 px-2 text-right text-emerald-600">{money(y.deposit)}</td>
                  <td className="py-1.5 px-2 text-right text-rose-500">{y.needs ? `(${money(y.needs)})` : money(0)}</td>
                  <td className="py-1.5 px-2 text-right">{money(y.interest)}</td>
                  <td className="py-1.5 px-2 text-right font-semibold">{money(y.ending)}</td>
                  <td className="py-1.5 px-2 text-right">{money(y.perUnit)}</td>
                  <td className="py-1.5 pl-2 text-center">
                    {y.problem
                      ? <span className="text-rose-600 font-semibold">Problem</span>
                      : <span className="text-emerald-600">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          &ldquo;Problem&rdquo; flags any year whose per-unit ending balance falls below the minimum of {money(result.minBalancePerUnit)}.
        </p>
      </div>
    </div>
  )
}
