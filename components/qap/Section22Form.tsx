'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  section14: Record<string, string>
  section18: Record<string, string>
  initial: Record<string, string>
}

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

function fmt(val: string | number | undefined): string {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '')
  if (isNaN(n)) return '—'
  const abs = Math.round(Math.abs(n))
  const formatted = '$' + abs.toLocaleString('en-US')
  return n < 0 ? `(${formatted})` : formatted
}

interface WaterfallRow {
  label: string
  value: string | number | undefined
  isSubtotal?: boolean
  isTotal?: boolean
  isNote?: boolean
  indent?: boolean
  negate?: boolean  // display as negative (subtraction)
}

export function Section22Form({ dealId, section14, section18, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_22', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  // ── Pull amounts from Section 18 ───────────────────────────────────────────
  const s18_01 = parseFloat(section18.s18_01_loan_amount ?? '') || 0
  const s18_02 = parseFloat(section18.s18_02_original_amount ?? '') || 0
  const s18_03 = parseFloat(section18.s18_03_original_amount ?? '') || 0
  const s18_07 = parseFloat(section18.s18_07_amount ?? '') || 0
  const s18_08 = parseFloat(section18.s18_08_credits_amount ?? '') || 0  // Federal HTC — subtract the credit amount (Excel E419), not equity
  const s18_11 = parseFloat(section18.s18_11_amount ?? '') || 0
  const s18_12 = parseFloat(section18.s18_12_amount ?? '') || 0
  const s18_13 = parseFloat(section18.s18_13_amount ?? '') || 0
  const s18_14 = parseFloat(section18.s18_14_funding_amount ?? '') || 0
  const s18_15 = parseFloat(section18.s18_15_funding_amount ?? '') || 0
  const s18_16 = parseFloat(section18.s18_16_funding_amount ?? '') || 0

  // Donation type labels (dynamic)
  const don11Label = section18.s18_11_donation_type || 'Donated Amount #1'
  const don12Label = section18.s18_12_donation_type || 'Donated Amount #2'
  const don13Label = section18.s18_13_donation_type || 'Donated Amount #3'

  // Other source descriptions
  const oth14Label = section18.s18_14_description || 'Other Permanent Source #1'
  const oth15Label = section18.s18_15_description || 'Other Permanent Source #2'
  const oth16Label = section18.s18_16_description || 'Other Permanent Source #3'

  // Credits requested (from Section 14)
  const creditsRequested = section14.credits_requested ?? ''

  // ── Waterfall rows ─────────────────────────────────────────────────────────
  const deductions = [
    { label: 'New LHC Risk Sharing First Mortgage Loan',   amt: s18_01, active: section18.s18_01_active === 'Yes' },
    { label: 'Other Loan With Must-Pay Debt Service',       amt: s18_02, active: section18.s18_02_active === 'Yes' },
    { label: 'Non-LHC Loan #2',                            amt: s18_03, active: section18.s18_03_active === 'Yes' },
    { label: 'Deferred Developer Fee',                      amt: s18_07, active: section18.s18_07_active === 'Yes' },
    { label: 'Federal Historic Tax Credits and Equity',     amt: s18_08, active: section18.s18_08_active === 'Yes' },
    { label: don11Label,                                    amt: s18_11, active: section18.s18_11_active === 'Yes' },
    { label: don12Label,                                    amt: s18_12, active: section18.s18_12_active === 'Yes' },
    { label: don13Label,                                    amt: s18_13, active: section18.s18_13_active === 'Yes' },
    { label: oth14Label,                                    amt: s18_14, active: section18.s18_14_active === 'Yes' },
    { label: oth15Label,                                    amt: s18_15, active: section18.s18_15_active === 'Yes' },
    { label: oth16Label,                                    amt: s18_16, active: section18.s18_16_active === 'Yes' },
  ].filter(d => d.active)

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amt, 0)

  // Equity gap requires Total Dev Cost (not yet available — from Dev Costs worksheet)
  const hasDevCost = false  // will be true once Dev Costs worksheet is built

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Allowable LIHTCs</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* ── 22.01 Equity Gap Approach ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">22.01 Allowable LIHTCs — Equity Gap Approach</p>
        <p className={noteCls}>
          This waterfall is auto-calculated from Section 18 (permanent sources) and the Development Costs
          worksheet. The equity gap and credit need will populate once the Development Costs worksheet is complete.
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Item</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Total Dev Cost — requires Dev Costs worksheet */}
              <tr className="border-b border-border/50">
                <td className="px-4 py-2 font-medium text-foreground">Total Development Cost</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground italic text-xs">
                  Requires Dev Costs worksheet
                </td>
              </tr>

              {/* Deductions from Section 18 */}
              {deductions.length === 0 ? (
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 text-muted-foreground italic text-xs" colSpan={2}>
                    No active deductions — return to Section 18 to mark permanent sources.
                  </td>
                </tr>
              ) : (
                deductions.map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-2 text-muted-foreground pl-8">
                      <span className="text-xs text-rose-500 mr-1">−</span>{d.label}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-rose-600">
                      {d.amt > 0 ? `(${fmt(d.amt)})` : '—'}
                    </td>
                  </tr>
                ))
              )}

              {/* LHC Funds — formula-driven from Section 13 */}
              <tr className="border-b border-border/50">
                <td className="px-4 py-2 text-muted-foreground pl-8">
                  <span className="text-xs text-rose-500 mr-1">−</span>LHC HOME / NHTF Loans
                </td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground italic text-xs">
                  Calculated from Section 13
                </td>
              </tr>

              {/* Equity Gap subtotal */}
              <tr className="border-b border-border bg-muted/20">
                <td className="px-4 py-2.5 font-semibold text-foreground">Equity Gap before LIHTC Equity and LHC Funds</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-muted-foreground italic text-xs">
                  Requires Dev Costs worksheet
                </td>
              </tr>

              {/* Credit need calc */}
              <tr className="border-b border-border/50">
                <td className="px-4 py-2 text-foreground">Anticipated Credit Pricing (per dollar)</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground italic text-xs">Syndication worksheet</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-2 text-foreground">% of Credits to Investors</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground italic text-xs">Syndication worksheet</td>
              </tr>
              <tr className="border-b border-border/50 bg-muted/20">
                <td className="px-4 py-2.5 font-semibold text-foreground">Credit Need by Equity Gap Approach</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-muted-foreground italic text-xs">Calculated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 22.02–22.04 Summary ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">22.02 – 22.04 Credit Limits Summary</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-4 py-2.5 text-foreground">22.02 Allowable LIHTCs (Basis Calculation Worksheet)</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted-foreground italic text-xs">Basis Calc worksheet</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-4 py-2.5 font-semibold text-foreground">22.03 Lower of the Two Methods</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-muted-foreground italic text-xs">MIN(22.01, 22.02)</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-2.5 font-semibold text-foreground">22.04 Total Credits Requested (from §14)</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                  {creditsRequested ? fmt(creditsRequested) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {totalDeductions > 0 && (
          <p className={noteCls}>
            Total confirmed deductions from Section 18:{' '}
            <strong className="text-rose-600">{fmt(totalDeductions)}</strong>.
            Equity gap will be computed once the Development Costs worksheet is complete.
          </p>
        )}
      </div>

      {/* ── Comment — only blue input in Section 22 ───────────────────────────── */}
      <div>
        <label className={labelCls}>22.05 Comment Regarding Allowable LIHTCs</label>
        <textarea
          className={inputCls + ' min-h-[100px] resize-y'}
          value={values.s22_comment ?? ''}
          placeholder="Add any comments or explanations regarding the allowable LIHTC calculation…"
          onChange={e => setValues(v => ({ ...v, s22_comment: e.target.value }))}
          onBlur={e => save('s22_comment', e.target.value)}
        />
      </div>
    </div>
  )
}
