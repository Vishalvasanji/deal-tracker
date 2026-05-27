'use client'

const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const PROFORMA_YEARS = [5, 10, 15, 20, 25, 30, 35]

interface Props {
  dealId: string
  initial: Record<string, string>
}

export function Section31Form({ dealId: _dealId, initial: _initial }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 31 — Future Year DSCRs</h2>
      </div>

      {/* Informational note */}
      <p className={noteCls}>
        Future year DSCRs are calculated from the Proforma worksheet in the exported Excel.
      </p>

      {/* Years table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>Tracked Years</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Year</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {PROFORMA_YEARS.map((yr, i) => (
                <tr key={yr} className="border-b border-border/30 last:border-b-0">
                  <td className="px-4 py-2.5 text-sm text-foreground">Year {yr}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">Proforma</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
