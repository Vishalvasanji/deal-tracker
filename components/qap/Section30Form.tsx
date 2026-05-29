'use client'

const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const DSCR_ROWS: { line: string; source: string; bold?: boolean }[] = [
  { line: 'Gross Potential Rental Income', source: 'Unit Mix × 12' },
  { line: 'Rent Loss (Years 1–3)', source: 'GPI × the §28 vacancy rate' },
  { line: 'Other Income', source: 'Revenues & Expenses' },
  { line: 'Effective Gross Income', source: 'Calculated' },
  { line: 'Total Operating Expenses', source: 'Revenues & Expenses' },
  { line: 'Replacement Reserve Deposit', source: '§29 PUPA × total units' },
  { line: 'Net Operating Income', source: 'Calculated' },
  { line: 'Must-Pay Debt Service', source: 'Financing section' },
  { line: 'Operating Cash Flow', source: 'Calculated' },
  { line: 'DSCR Year 1', source: 'NOI ÷ Debt Service', bold: true },
]

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section30Form({ dealId: _dealId, initial: _initial }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 30 — DSCR for First Stabilized Year</h2>
      </div>

      {/* Informational note */}
      <p className={noteCls}>
        DSCR for the first stabilized year is calculated automatically in the exported Excel from the Unit Mix,
        Revenues &amp; Expenses, and Financing data. The required range is 1.15–1.40.
      </p>

      {/* DSCR formula table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>DSCR Calculation Structure</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Line Item</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {DSCR_ROWS.map(({ line, source, bold }, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className={`px-4 py-2.5 text-sm ${bold ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                    {line}
                  </td>
                  <td className={`px-4 py-2.5 text-sm ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QAP constraint */}
      <p className={noteCls}>
        Year 1 DSCR must be ≥ 1.15 and ≤ 1.40
      </p>
    </div>
  )
}
