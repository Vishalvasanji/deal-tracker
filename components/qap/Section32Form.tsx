'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

function calcApplicationFee(units: number): number {
  if (units <= 4) return 100
  if (units <= 32) return 1000
  if (units <= 60) return 1500
  if (units <= 100) return 2500
  return 5000
}

function calcAssetMgmtFee(lihtcUnits: number): number {
  if (lihtcUnits <= 4) return 250
  if (lihtcUnits <= 10) return 500
  if (lihtcUnits <= 20) return 1000
  if (lihtcUnits <= 50) return 2000
  if (lihtcUnits <= 100) return 2500
  return 3000
}

const ANALYSIS_FEE = 3000
const MARKET_STUDY_FEE = 4800
const COMPLIANCE_FEE_PER_UNIT = 40

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

interface Props {
  dealId: string
  initial: Record<string, string>
  totalUnits: number
  lihtcUnits: number
}

export function Section32Form({ dealId, initial, totalUnits, lihtcUnits }: Props) {
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

  const appFee = hasUnits ? calcApplicationFee(totalUnits) : null
  const analysisFee = hasUnits ? ANALYSIS_FEE : null
  const marketFee = MARKET_STUDY_FEE
  const complianceFee = hasUnits ? COMPLIANCE_FEE_PER_UNIT * totalUnits : null
  const assetMgmtFee = hasUnits ? calcAssetMgmtFee(lihtcUnits) : null

  const totalFees =
    appFee !== null && analysisFee !== null && complianceFee !== null && assetMgmtFee !== null
      ? appFee + analysisFee + marketFee + complianceFee + assetMgmtFee
      : null

  const feeRows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'LHC Application Fee',
      value: appFee !== null ? fmt(appFee) : '—',
    },
    {
      label: 'LHC Analysis Fee',
      value: analysisFee !== null ? fmt(analysisFee) : '—',
    },
    {
      label: 'LHC Market Study Fee',
      value: fmt(marketFee),
    },
    {
      label: `LHC Annual Compliance / Monitoring Fee`,
      value: complianceFee !== null
        ? <span>{fmt(COMPLIANCE_FEE_PER_UNIT)} × {totalUnits} units = {fmt(complianceFee)}</span>
        : '—',
    },
    {
      label: 'LHC Asset Management Fee',
      value: assetMgmtFee !== null ? fmt(assetMgmtFee) : '—',
    },
  ]

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
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {feeRows.map(({ label, value }, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-4 py-2.5 text-sm text-foreground">{label}</td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-right text-foreground">{value}</td>
                </tr>
              ))}
              <tr className="bg-muted/20">
                <td className="px-4 py-2.5 text-sm font-semibold text-foreground">Total LHC Fees</td>
                <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-right text-foreground">
                  {totalFees !== null ? fmt(totalFees) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className={noteCls}>
          Subsidy Layering Review Fee (= Analysis Fee ÷ 4) applies only if bond financing is included.
        </p>
        <p className={noteCls}>
          Application Fee, Analysis Fee, and Asset Management Fee are tiered based on total/LIHTC unit count per QAP §III.D.
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
