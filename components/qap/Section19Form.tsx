'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  section18: Record<string, string>
  initial: Record<string, string>
}

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

function fmtDollars(val: string | undefined): string {
  const n = parseFloat(val ?? '')
  if (isNaN(n) || n === 0) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

// Each permanent source: id prefix, default label, how to get amount, optional dynamic label
const SOURCES: Array<{
  id: string
  label: string
  amountKey?: string
  dynamicLabel?: (s18: Record<string, string>) => string
}> = [
  {
    id: 's18_01',
    label: 'New LHC Risk Sharing First Mortgage Loan',
    amountKey: 's18_01_loan_amount',
  },
  {
    id: 's18_02',
    label: 'Other Loan With Must-Pay Debt Service',
    amountKey: 's18_02_original_amount',
  },
  {
    id: 's18_03',
    label: 'Non-LHC Loan #2',
    amountKey: 's18_03_original_amount',
  },
  {
    id: 's18_04',
    label: 'LHC HOME Loan',
    // Amount is formula-driven from Section 13 — display note only
  },
  {
    id: 's18_05',
    label: 'LHC NHTF Loan',
    // Amount is formula-driven from Section 13 — display note only
  },
  {
    id: 's18_06',
    label: 'CDBG-DR Gap Financing Loan',
    // No user-entered amount field
  },
  {
    id: 's18_07',
    label: 'Deferred Developer Fee',
    amountKey: 's18_07_amount',
  },
  {
    id: 's18_08',
    label: 'Federal Historic Tax Credits and Equity',
    amountKey: 's18_08_equity_amount',
  },
  {
    id: 's18_09',
    label: 'State Historic Tax Credits and Equity',
    amountKey: 's18_09_equity_amount',
  },
  {
    id: 's18_10',
    label: 'Estimated LIHTC Equity Proceeds',
    amountKey: 's18_10_amount',
  },
  {
    id: 's18_11',
    label: 'Donated Amount #1',
    amountKey: 's18_11_amount',
    dynamicLabel: (s18) => s18.s18_11_donation_type || 'Donated Amount #1',
  },
  {
    id: 's18_12',
    label: 'Donated Amount #2',
    amountKey: 's18_12_amount',
    dynamicLabel: (s18) => s18.s18_12_donation_type || 'Donated Amount #2',
  },
  {
    id: 's18_13',
    label: 'Donated Amount #3',
    amountKey: 's18_13_amount',
    dynamicLabel: (s18) => s18.s18_13_donation_type || 'Donated Amount #3',
  },
  {
    id: 's18_14',
    label: 'Other Permanent Source #1',
    amountKey: 's18_14_funding_amount',
    dynamicLabel: (s18) => s18.s18_14_description || 'Other Permanent Source #1',
  },
  {
    id: 's18_15',
    label: 'Other Permanent Source #2',
    amountKey: 's18_15_funding_amount',
    dynamicLabel: (s18) => s18.s18_15_description || 'Other Permanent Source #2',
  },
  {
    id: 's18_16',
    label: 'Other Permanent Source #3',
    amountKey: 's18_16_funding_amount',
    dynamicLabel: (s18) => s18.s18_16_description || 'Other Permanent Source #3',
  },
]

export function Section19Form({ dealId, section18, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_19', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  // Only show active sources
  const activeSources = SOURCES.filter(
    (src) => section18[`${src.id}_active`] === 'Yes'
  )

  // Build display rows and running total
  let total = 0
  const rows = activeSources.map((src) => {
    const label = src.dynamicLabel ? src.dynamicLabel(section18) : src.label
    const rawAmt = src.amountKey ? section18[src.amountKey] : undefined
    const num = parseFloat(rawAmt ?? '')
    if (!isNaN(num) && num > 0) total += num
    return { label, rawAmt }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Summary — Permanent Sources of Funds</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50">
        This summary is auto-generated from the active sources in Section 18. Only sources
        marked <strong>Yes</strong> appear here. Amounts for LHC HOME, NHTF, and CDBG-DR
        loans are formula-calculated in the QAP model and are not shown here.
      </p>

      {activeSources.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8 rounded-xl border border-dashed border-border">
          No active funding sources. Return to Section 18 and mark sources as <strong>Yes</strong>.
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Funding Source
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-b-0">
                  <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {fmtDollars(row.rawAmt)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border">
                <td className="px-4 py-2.5 font-semibold text-foreground">
                  Total Permanent Sources
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                  {total > 0
                    ? '$' + Math.round(total).toLocaleString('en-US')
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 19.01 Comment — only blue input in Section 19 */}
      <div>
        <label className={labelCls}>19.01 Comment</label>
        <textarea
          className={inputCls + ' min-h-[100px] resize-y'}
          value={values.s19_comment ?? ''}
          placeholder="Add any comments or explanations regarding the permanent sources of funds…"
          onChange={(e) => setValues((v) => ({ ...v, s19_comment: e.target.value }))}
          onBlur={(e) => save('s19_comment', e.target.value)}
        />
      </div>
    </div>
  )
}
