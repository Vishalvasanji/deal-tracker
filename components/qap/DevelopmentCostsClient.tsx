'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapCostItem, upsertQapField } from '@/lib/qap-actions'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts, type DevCostDeps } from '@/lib/qap-dev-costs-calc'
import { ModelUpload } from './ModelUpload'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  dealId: string
  initialAmounts: Record<string, number | null>
  model: { tdc: number | null; sources: number | null; filename: string; sourceRef: string; uploadedAt: string }
  initialAcqAdj: number | null
  initialConstrAdj: number | null
  deps: {
    parish?: string
    buildingType?: string
    unitsByBr?: number[]
    totalUnits?: number
    bondFinanced?: boolean
    is4pct?: boolean
  }
}

const money = (v: number | null | undefined) =>
  v == null ? '—' : `$${Math.round(v).toLocaleString()}`

const inputCls =
  'w-full text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const subHdr = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const cardCls = 'rounded-xl border border-border bg-card px-4 py-3 space-y-2'

export function DevelopmentCostsClient({
  dealId, initialAmounts, model, initialAcqAdj, initialConstrAdj, deps,
}: Props) {
  const [amounts, setAmounts] = useState<Record<string, number | null>>(initialAmounts)
  const [modelTdc, setModelTdc] = useState<number | null>(model.tdc)
  const [modelSources, setModelSources] = useState<number | null>(model.sources)
  const [acqAdj, setAcqAdj] = useState<number | null>(initialAcqAdj)
  const [constrAdj, setConstrAdj] = useState<number | null>(initialConstrAdj)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showCalcs, setShowCalcs] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // ── compute everything ──
  const result = useMemo(() => {
    const numericAmounts: Record<string, number> = {}
    for (const [k, v] of Object.entries(amounts)) numericAmounts[k] = v ?? 0
    const d: DevCostDeps = {
      ...deps,
      totalSources: modelSources,
      acqBasisAdjustments: acqAdj ?? 0,
      constrBasisAdjustments: constrAdj ?? 0,
    }
    return computeDevCosts(numericAmounts, d)
  }, [amounts, modelSources, acqAdj, constrAdj, deps])

  const allocated = result.total
  const remaining = modelTdc == null ? null : modelTdc - allocated
  const pctAllocated = modelTdc && modelTdc > 0 ? Math.min(100, Math.round((allocated / modelTdc) * 100)) : 0

  function setLine(key: string, raw: string) {
    const v = raw === '' ? null : parseInt(raw.replace(/[$,\s]/g, ''), 10)
    setAmounts(prev => ({ ...prev, [key]: isNaN(v as number) ? null : v }))
  }
  function saveLine(key: string) {
    startTransition(async () => {
      await upsertQapCostItem(dealId, key, amounts[key] ?? null)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function saveAdj(fieldKey: string, val: number | null) {
    startTransition(async () => {
      await upsertQapField(dealId, 'development_costs', fieldKey, val == null ? '' : String(val))
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const remainingColor =
    remaining == null ? 'text-muted-foreground'
    : Math.abs(remaining) < 1 ? 'text-emerald-600'
    : remaining < 0 ? 'text-rose-600'
    : 'text-amber-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Development Costs</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}
        </span>
      </div>

      {/* Allocation tracker (sticky) */}
      <div className="sticky top-0 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur px-5 py-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Target TDC (model)</p>
            <p className="text-xl font-bold tabular-nums">{money(modelTdc)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Allocated (QAP)</p>
            <p className="text-xl font-bold tabular-nums">{money(allocated)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining to allocate</p>
            <p className={`text-xl font-bold tabular-nums ${remainingColor}`}>
              {remaining == null ? '—' : money(remaining)}
            </p>
          </div>
        </div>
        {modelTdc != null && (
          <div className="mt-3 w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                remaining != null && remaining < 0 ? 'bg-rose-500'
                : remaining != null && Math.abs(remaining) < 1 ? 'bg-emerald-500'
                : 'bg-amber-400'
              }`}
              style={{ width: `${pctAllocated}%` }}
            />
          </div>
        )}
        {remaining != null && remaining < 0 && (
          <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Over-allocated by {money(Math.abs(remaining))} vs. the model TDC.
          </p>
        )}
        {remaining != null && Math.abs(remaining) < 1 && (
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Fully allocated — QAP total matches the model TDC.
          </p>
        )}
      </div>

      {/* Model upload */}
      <ModelUpload
        dealId={dealId}
        initialTdc={model.tdc}
        initialFilename={model.filename}
        initialSourceRef={model.sourceRef}
        initialSources={model.sources}
        initialUploadedAt={model.uploadedAt}
        onChange={(t, s) => { setModelTdc(t); setModelSources(s) }}
      />

      {/* Section 36 — categories */}
      <div className="space-y-3">
        <p className={subHdr}>Section 36 — Detail of Development Costs</p>
        {DEV_COST_CATEGORIES.map(cat => {
          const isCollapsed = collapsed[cat.key]
          const sub = result.subtotals[cat.key]
          return (
            <div key={cat.key} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setCollapsed(p => ({ ...p, [cat.key]: !p[cat.key] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {cat.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">{money(sub)}</span>
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-border/40">
                  {cat.lines.map(line => (
                    <div key={line.key} className="flex items-center gap-3 px-4 py-1.5">
                      <label className="flex-1 text-sm">
                        {line.label}
                        {line.autoPull && (
                          <span className="ml-2 text-xs text-sky-600" title={`Maps to ${line.autoPull} in the Excel`}>
                            ({line.autoPull})
                          </span>
                        )}
                        {line.feeLimit && (
                          <span className="ml-2 text-xs text-amber-600" title="Fee-limit checked in Section 41">†</span>
                        )}
                      </label>
                      <div className="w-40">
                        <input
                          type="number"
                          className={inputCls}
                          value={amounts[line.key] ?? ''}
                          onChange={e => setLine(line.key, e.target.value)}
                          onBlur={() => saveLine(line.key)}
                          placeholder="$0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* TOTAL */}
        <div className="flex items-center justify-between rounded-xl border-2 border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wide">Total Development Costs</span>
          <span className="text-lg font-bold tabular-nums">{money(result.total)}</span>
        </div>
      </div>

      {/* Calculated sections toggle */}
      <button
        onClick={() => setShowCalcs(s => !s)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showCalcs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Sections 37–42 (computed)
      </button>

      {showCalcs && (
        <div className="space-y-4">
          {/* §37 Sources & Uses Balance */}
          <div className={cardCls}>
            <p className={subHdr}>§37 — Do Sources and Uses Balance?</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Total Sources</p><p className="font-semibold tabular-nums">{money(result.sourcesUses.sources)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Dev Cost</p><p className="font-semibold tabular-nums">{money(result.sourcesUses.tdc)}</p></div>
              <div><p className="text-xs text-muted-foreground">Difference</p><p className="font-semibold tabular-nums">{result.sourcesUses.diff == null ? '—' : money(result.sourcesUses.diff)}</p></div>
            </div>
            <p className={`text-xs ${result.sourcesUses.balanced ? 'text-emerald-600' : 'text-amber-600'}`}>
              {result.sourcesUses.message}
            </p>
          </div>

          {/* §38 Basis */}
          <div className={cardCls}>
            <p className={subHdr}>§38 — Acquisition &amp; Construction Basis</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Acquisition basis adjustment</label>
                <input type="number" className={inputCls}
                  value={acqAdj ?? ''}
                  onChange={e => setAcqAdj(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  onBlur={() => saveAdj('s38_acq_adj', acqAdj)} placeholder="$0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Construction basis adjustment</label>
                <input type="number" className={inputCls}
                  value={constrAdj ?? ''}
                  onChange={e => setConstrAdj(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  onBlur={() => saveAdj('s38_constr_adj', constrAdj)} placeholder="$0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div><p className="text-xs text-muted-foreground">Adjusted Acquisition Basis</p><p className="font-semibold tabular-nums">{money(result.basis.adjustedAcquisitionBasis)}</p></div>
              <div><p className="text-xs text-muted-foreground">Adjusted Construction Basis</p><p className="font-semibold tabular-nums">{money(result.basis.adjustedConstructionBasis)}</p></div>
            </div>
            <p className="text-xs text-muted-foreground/70">Pending inputs (not yet captured): {result.basis.pending.join('; ')}.</p>
          </div>

          {/* §39 Per-unit summary */}
          <div className={cardCls}>
            <p className={subHdr}>§39 — TDC Summary (per unit)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-1.5">Category</th>
                    <th className="text-right py-1.5">Total</th>
                    <th className="text-right py-1.5">Per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perUnitSummary.filter(r => r.total !== 0).map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5">{r.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{money(r.total)}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(r.perUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* §40 HUD TDC limit */}
          <div className={cardCls}>
            <p className={subHdr}>§40 — HUD TDC Per-Unit Limit</p>
            {result.hudTdc.available ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Cost Area</p><p className="font-semibold">{result.hudTdc.costArea}</p></div>
                  <div><p className="text-xs text-muted-foreground">Max TDC Limit</p><p className="font-semibold tabular-nums">{money(result.hudTdc.maxTdcLimit)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Adjusted TDC</p><p className="font-semibold tabular-nums">{money(result.hudTdc.adjustedTdc)}</p></div>
                  <div><p className="text-xs text-muted-foreground">% of Limit</p><p className={`font-semibold tabular-nums ${result.hudTdc.exceeds ? 'text-rose-600' : 'text-emerald-600'}`}>{result.hudTdc.pctOfLimit == null ? '—' : `${Math.round(result.hudTdc.pctOfLimit * 100)}%`}</p></div>
                </div>
                {result.hudTdc.exceeds && (
                  <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Adjusted TDC exceeds the Maximum TDC Limit.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{result.hudTdc.note}</p>
            )}
          </div>

          {/* §41 Fee limits */}
          <div className={cardCls}>
            <p className={subHdr}>§41 — Fee Limit Computations</p>
            <p className="text-xs text-muted-foreground">Builder Profit Fee Base: <span className="font-semibold tabular-nums">{money(result.feeLimits.builderProfitFeeBase)}</span></p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-1.5">Fee</th>
                    <th className="text-right py-1.5">Allowable</th>
                    <th className="text-right py-1.5">Proposed</th>
                    <th className="text-right py-1.5">Over/(Under)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.feeLimits.items.map((it, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5">{it.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{money(it.allowable)}</td>
                      <td className="py-1.5 text-right tabular-nums">{money(it.proposed)}</td>
                      <td className={`py-1.5 text-right tabular-nums ${it.over > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>{money(it.over)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/30">
                    <td className="py-1.5">Developer Fee {result.feeLimits.developerFeeException ? '(bond 4% — limit n/a)' : '(15%)'}</td>
                    <td className="py-1.5 text-right tabular-nums">{result.feeLimits.developerFeeLimit == null ? 'n/a' : money(result.feeLimits.developerFeeLimit)}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(result.feeLimits.developerFeeProposed)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${result.feeLimits.developerFeeLimit != null && result.feeLimits.developerFeeProposed - result.feeLimits.developerFeeLimit > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                      {result.feeLimits.developerFeeLimit == null ? '—' : money(result.feeLimits.developerFeeProposed - result.feeLimits.developerFeeLimit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Developer Fee Base: <span className="font-semibold tabular-nums">{money(result.feeLimits.developerFeeBase)}</span> ·
              Contingency: <span className={result.feeLimits.contingency.over ? 'text-rose-600 font-semibold' : 'font-semibold'}>{Math.round(result.feeLimits.contingency.pct * 100)}%</span> of construction contract
            </p>
            <p className="text-xs text-muted-foreground/70">Pending: {result.feeLimits.pending.join('; ')}.</p>
          </div>

          {/* §42 Violations */}
          <div className={cardCls}>
            <p className={subHdr}>§42 — Fee Limit Violations</p>
            {result.violations.length === 0 ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> No fee-limit violations detected.</p>
            ) : (
              <ul className="space-y-1">
                {result.violations.map((v, i) => (
                  <li key={i} className="text-xs text-rose-600 flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{v}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
