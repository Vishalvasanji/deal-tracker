'use client'

import { useState, useMemo, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  computeProforma, PROFORMA_DISPLAY_YEARS,
  Y1_DSCR_MIN, Y1_DSCR_MAX, DSCR15_MIN, DSCR15_MAX,
  type ProformaInputs,
} from '@/lib/qap-proforma-calc'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  dealId: string
  base: Omit<ProformaInputs, 'mustPayDebtService' | 'otherDebtService'>
  initialDebtService: string
  initialOtherDebt: string
}

const num = (s: string | undefined) => {
  const v = parseFloat(String(s ?? '').replace(/[$,\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const money = (n: number) => (n < 0 ? '-$' + Math.abs(Math.round(n)).toLocaleString() : '$' + Math.round(n).toLocaleString())
const dscrStr = (n: number) => (n > 0 ? n.toFixed(2) : '—')

const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'

export function ProformaClient({ dealId, base, initialDebtService, initialOtherDebt }: Props) {
  const [debt, setDebt] = useState(initialDebtService)
  const [otherDebt, setOtherDebt] = useState(initialOtherDebt)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(key: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'proforma', key, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const r = useMemo(() => computeProforma({
    ...base,
    mustPayDebtService: num(debt),
    otherDebtService: num(otherDebt),
  }), [base, debt, otherDebt])

  const display = r.years.slice(0, PROFORMA_DISPLAY_YEARS)
  const dscrCell = (d: number) => {
    if (!r.hasDebtService) return 'text-muted-foreground'
    if (d > DSCR15_MAX || d < DSCR15_MIN) return 'text-rose-600 font-semibold'
    return 'text-foreground'
  }

  return (
    <div className="space-y-6">
      {/* Debt service inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Must-Pay Annual Debt Service (§30)</label>
          <input
            className={inputCls} inputMode="numeric" placeholder="$ / year"
            value={debt}
            onChange={e => setDebt(e.target.value)}
            onBlur={e => save('must_pay_debt_service', e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Total annual payment on all must-pay (hard) loans. Drives the DSCR.
          </p>
        </div>
        <div>
          <label className={labelCls}>Other Must-Pay (optional)</label>
          <input
            className={inputCls} inputMode="numeric" placeholder="$ / year"
            value={otherDebt}
            onChange={e => setOtherDebt(e.target.value)}
            onBlur={e => save('other_debt_service', e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Any additional must-pay obligation (Proforma row 41). Usually $0.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically. Revenue, expenses, reserve and trend rates pull from Revenues & Expenses and Project Description §28/§29.'}
      </p>

      {/* DSCR guardrail alerts (mirror Excel C1015 / B1025) */}
      {r.hasDebtService ? (
        <div className="space-y-2">
          {r.y1Above && (
            <Alert tone="error">Year-1 DSCR ({r.year1Dscr.toFixed(2)}) cannot exceed {Y1_DSCR_MAX.toFixed(2)}.</Alert>
          )}
          {r.y1Below && (
            <Alert tone="error">Year-1 DSCR ({r.year1Dscr.toFixed(2)}) must be at least {Y1_DSCR_MIN.toFixed(2)}.</Alert>
          )}
          {r.dscr15Above && (
            <Alert tone="error">Projected DSCR must not exceed {DSCR15_MAX.toFixed(2)} through year 15 (peak {r.maxDscr15.toFixed(2)}).</Alert>
          )}
          {r.dscr15Below && (
            <Alert tone="error">Projected DSCR must be at least {DSCR15_MIN.toFixed(2)} through year 15 (low {r.minDscr15.toFixed(2)}).</Alert>
          )}
          {!r.y1Above && !r.y1Below && !r.dscr15Above && !r.dscr15Below && (
            <Alert tone="ok">DSCR is within the QAP guardrails (Year 1 {r.year1Dscr.toFixed(2)}; years 5–15 {r.minDscr15.toFixed(2)}–{r.maxDscr15.toFixed(2)}).</Alert>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          Enter the must-pay annual debt service above to compute the DSCR and surplus-cash projection.
        </p>
      )}

      {/* Milestones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Year 1 DSCR" value={dscrStr(r.year1Dscr)} />
        <Stat label="Cumulative Surplus · Yr 15" value={money(r.cumSurplus15)} />
        <Stat label="Cumulative Surplus · Yr 35" value={money(r.cumSurplus35)} />
        <Stat label="Cumulative Surplus · Yr 40" value={money(r.cumSurplus40)} />
      </div>

      {/* Future-year DSCRs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Future-Year DSCRs</p>
        <div className="flex flex-wrap gap-2">
          {r.futureDscr.map(f => (
            <div key={f.year} className="rounded-xl border border-border px-3 py-2 text-center min-w-[72px]">
              <p className="text-[11px] text-muted-foreground">Year {f.year}</p>
              <p className={`text-sm font-semibold tabular-nums ${dscrCell(f.dscr)}`}>{dscrStr(f.dscr)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 15-year cash-flow table */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          15-Year Cash-Flow Pro Forma
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Year</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">EGI</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Op. Exp.</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Reserve</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">NOI</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Debt Svc.</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Cash Flow</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">DSCR</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Surplus</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Cum. Surplus</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {display.map(y => (
                <tr key={y.year} className="border-b border-border/30 last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">Year {y.year}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.egi)}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.totalOpEx)}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.reserve)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{money(y.noi)}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.debtService)}</td>
                  <td className={`px-3 py-1.5 text-right ${y.cashFlow < 0 ? 'text-rose-600' : ''}`}>{money(y.cashFlow)}</td>
                  <td className={`px-3 py-1.5 text-right ${dscrCell(y.dscr)}`}>{dscrStr(y.dscr)}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.surplus)}</td>
                  <td className="px-3 py-1.5 text-right">{money(y.cumSurplus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Revenue trends by the §28 rent-inflation rate, operating expenses by the §28 expense-inflation rate, the
          replacement reserve by the §28 ADRR escalation; vacancy switches from the §28 year 1–3 rate to the year 4+
          rate. The full 40-year term is projected; the first 15 years are shown.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'ok'; children: React.ReactNode }) {
  const cls = tone === 'error'
    ? 'text-rose-700 border-rose-200 bg-rose-50'
    : 'text-emerald-700 border-emerald-200 bg-emerald-50'
  const Icon = tone === 'error' ? AlertTriangle : CheckCircle2
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2 ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
