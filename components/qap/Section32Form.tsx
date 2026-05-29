'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { calcApplicationFee, calcAssetMgmtFee, MARKET_STUDY_FEE, COMPLIANCE_FEE_PER_UNIT } from '@/lib/qap-lhc-fees'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}
function num(s: string): number | null {
  const v = parseFloat(String(s ?? '').replace(/[$,\s]/g, ''))
  return isNaN(v) ? null : v
}

interface Props {
  dealId: string
  initial: Record<string, string>
  totalUnits: number
  lihtcUnits: number
  /** L-8: Whether HUD/RD housing assistance is provided (from §12.28) */
  hudRdAssistance?: boolean
}

export function Section32Form({ dealId, initial, totalUnits, lihtcUnits, hudRdAssistance }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_32', fk, val)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function handleBlur(fk: string, val: string) {
    save(fk, val)
  }

  const hasUnits = totalUnits > 0

  // Calculated fees per the QAP Controls tier schedules.
  const calcFees: Record<string, number | null> = {
    application: hasUnits ? calcApplicationFee(totalUnits) : null,
    analysis: hasUnits ? calcApplicationFee(totalUnits) : null, // Analysis uses the same tier as the Application Fee
    market: MARKET_STUDY_FEE,
    compliance: hasUnits ? COMPLIANCE_FEE_PER_UNIT * totalUnits : null,
    asset_mgmt: hasUnits ? calcAssetMgmtFee(lihtcUnits) : null,
    subsidy_layering: hudRdAssistance && hasUnits ? Math.round(calcApplicationFee(totalUnits) / 4) : null,
  }

  const FEES: { key: string; label: string; detail?: string }[] = [
    { key: 'application', label: 'LHC Application Fee' },
    { key: 'analysis', label: 'LHC Analysis Fee' },
    { key: 'market', label: 'LHC Market Study Fee' },
    {
      key: 'compliance', label: 'LHC Annual Compliance / Monitoring Fee',
      detail: calcFees.compliance !== null ? `${fmt(COMPLIANCE_FEE_PER_UNIT)} × ${totalUnits} units` : undefined,
    },
    { key: 'asset_mgmt', label: 'LHC Asset Management Fee' },
    { key: 'subsidy_layering', label: 'LHC Subsidy Layering Review Fee' },
  ]

  // Effective fee = applicant override (if entered) else the calculated amount.
  const effective = (key: string) => {
    const o = num(values[`s32_${key}_fee`] ?? '')
    return o !== null ? o : calcFees[key]
  }
  const calcTotal = FEES.reduce((s, f) => s + (calcFees[f.key] ?? 0), 0)
  const proposedTotal = FEES.reduce((s, f) => s + (effective(f.key) ?? 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 32 — LHC Fees</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* Fee table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>Fee Schedule</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Fee</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Calculated</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {FEES.map(({ key, label, detail }) => {
                const calc = calcFees[key]
                const override = num(values[`s32_${key}_fee`] ?? '')
                const differs = override !== null && calc !== null && Math.round(override) !== Math.round(calc)
                return (
                  <tr key={key} className="border-b border-border/30 align-top">
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {label}
                      {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
                      {differs && (
                        <span className="block text-xs text-amber-600">
                          Differs from calculated {calc !== null ? fmt(calc) : ''} — explain below.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-right text-muted-foreground">
                      {calc !== null ? fmt(calc) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        className="w-28 rounded-lg border border-input bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                        inputMode="decimal"
                        value={values[`s32_${key}_fee`] ?? ''}
                        placeholder={calc !== null ? String(Math.round(calc)) : ''}
                        onChange={e => setValues(prev => ({ ...prev, [`s32_${key}_fee`]: e.target.value }))}
                        onBlur={e => handleBlur(`s32_${key}_fee`, e.target.value)}
                      />
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-muted/20">
                <td className="px-4 py-2.5 text-sm font-semibold text-foreground">Total LHC Fees</td>
                <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-right text-foreground">{fmt(calcTotal)}</td>
                <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-right text-foreground">{fmt(proposedTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className={noteCls}>
          Fees are calculated from the QAP Controls tier schedules (Application &amp; Analysis by total units; Asset Management by LIHTC units; Compliance at $40/unit). Enter a Proposed amount only to override the calculated fee; explain any difference in the comment below. The Subsidy Layering Review Fee (= Analysis ÷ 4) applies only when HUD/RD housing assistance is provided (§12.28).
        </p>
      </div>

      {/* Comment */}
      <div>
        <label className={labelCls}>Comment</label>
        <textarea
          className={inputCls}
          rows={3}
          value={values['s32_comment'] ?? ''}
          onChange={e => setValues(prev => ({ ...prev, s32_comment: e.target.value }))}
          onBlur={e => handleBlur('s32_comment', e.target.value)}
        />
      </div>
    </div>
  )
}
