'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapCostItem, upsertQapField } from '@/lib/qap-actions'
import { DEV_COST_CATEGORIES } from '@/lib/qap-dev-costs'
import { computeDevCosts, type DevCostDeps, type BasisAdjustment } from '@/lib/qap-dev-costs-calc'
import { ModelUpload } from './ModelUpload'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, X, Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  dealId: string
  initialAmounts: Record<string, number | null>
  model: { tdc: number | null; sources: number | null; filename: string; sourceRef: string; uploadedAt: string }
  initialAdjustments: BasisAdjustment[]
  initialComments: Record<string, string>
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

type AdjForm = { editingId: string | null; type: 'acq' | 'constr'; explanation: string; amount: string }

export function DevelopmentCostsClient({
  dealId, initialAmounts, model, initialAdjustments, initialComments, deps,
}: Props) {
  const [amounts, setAmounts] = useState<Record<string, number | null>>(initialAmounts)
  const [modelTdc, setModelTdc] = useState<number | null>(model.tdc)
  const [modelSources, setModelSources] = useState<number | null>(model.sources)
  const [adjustments, setAdjustments] = useState<BasisAdjustment[]>(initialAdjustments)
  const [adjForm, setAdjForm] = useState<AdjForm | null>(null)
  const [comments, setComments] = useState<Record<string, string>>(initialComments)
  const [basisModal, setBasisModal] = useState<null | 'acq' | 'constr'>(null)
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
      basisAdjustments: adjustments,
    }
    return computeDevCosts(numericAmounts, d)
  }, [amounts, modelSources, adjustments, deps])

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
  function persistAdjustments(next: BasisAdjustment[]) {
    setAdjustments(next)
    startTransition(async () => {
      await upsertQapField(dealId, 'development_costs', 's38_adjustments_json', JSON.stringify(next))
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function openAddAdj() {
    setAdjForm({ editingId: null, type: 'acq', explanation: '', amount: '' })
  }
  function openEditAdj(a: BasisAdjustment) {
    setAdjForm({ editingId: a.id, type: a.basis_type, explanation: a.explanation, amount: String(a.amount) })
  }
  function saveAdjustment() {
    if (!adjForm) return
    const amount = parseInt(adjForm.amount.replace(/[$,\s]/g, ''), 10)
    if (isNaN(amount) || amount === 0) return // require a non-zero amount
    const id = adjForm.editingId ??
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
    const adj: BasisAdjustment = { id, basis_type: adjForm.type, explanation: adjForm.explanation.trim(), amount }
    const next = adjForm.editingId
      ? adjustments.map(a => (a.id === adjForm.editingId ? adj : a))
      : [...adjustments, adj]
    persistAdjustments(next)
    setAdjForm(null)
  }
  function deleteAdjustment(id: string) {
    persistAdjustments(adjustments.filter(a => a.id !== id))
  }
  function saveComment(fieldKey: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'development_costs', fieldKey, comments[fieldKey] ?? '')
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  // render-helper (NOT a nested component) so the textarea keeps focus across renders
  function commentBox(fieldKey: string, label: string) {
    return (
      <div>
        <label className="block text-xs text-muted-foreground mb-1">{label}</label>
        <textarea
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          value={comments[fieldKey] ?? ''}
          onChange={e => setComments(p => ({ ...p, [fieldKey]: e.target.value }))}
          onBlur={() => saveComment(fieldKey)}
        />
      </div>
    )
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

      {/* Allocation tracker (sticky — 8px gap below the 48px-tall Nav) */}
      <div className="sticky top-14 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur px-5 py-4 shadow-sm">
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

        {commentBox('s36_comment', 'Comment on Development Costs')}
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
            <div className="flex items-center justify-between">
              <p className={subHdr}>§38 — Acquisition &amp; Construction Basis</p>
              <button type="button" onClick={openAddAdj}
                className="text-xs rounded-lg border border-border px-2.5 py-1 hover:bg-muted transition-colors inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Adjustment
              </button>
            </div>

            {adjustments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No adjustments yet. Click <span className="font-medium">+ Adjustment</span> to add one.
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Adjustments ({adjustments.length})</p>
                <div className="rounded-lg border border-border divide-y divide-border/40">
                  {adjustments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${a.basis_type === 'acq' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {a.basis_type === 'acq' ? 'Acq' : 'Constr'}
                      </span>
                      <span className="flex-1 text-sm truncate" title={a.explanation}>
                        {a.explanation || <span className="text-muted-foreground italic">(no explanation)</span>}
                      </span>
                      <span className={`text-sm tabular-nums font-medium ${a.amount < 0 ? 'text-rose-600' : ''}`}>
                        {a.amount < 0 ? `(${money(Math.abs(a.amount))})` : money(a.amount)}
                      </span>
                      <button type="button" onClick={() => openEditAdj(a)} className="text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteAdjustment(a.id)} className="text-muted-foreground hover:text-rose-600" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div>
                <p className="text-xs text-muted-foreground">Adjusted Acquisition Basis</p>
                <button type="button" onClick={() => setBasisModal('acq')}
                  className="font-semibold tabular-nums text-primary hover:underline inline-flex items-center gap-1">
                  {money(result.basis.adjustedAcquisitionBasis)} <Info className="h-3 w-3" />
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adjusted Construction Basis</p>
                <button type="button" onClick={() => setBasisModal('constr')}
                  className="font-semibold tabular-nums text-primary hover:underline inline-flex items-center gap-1">
                  {money(result.basis.adjustedConstructionBasis)} <Info className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60">Click a basis amount to see how it was calculated.</p>
            <div className="space-y-3 pt-1">
              {commentBox('s38_acq_comment', 'Comment on Acquisition Basis')}
              {commentBox('s38_constr_comment', 'Comment on Construction Basis')}
            </div>
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
            {commentBox('s40_comment', 'Comment on TDC Limits')}
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
            {commentBox('s41_comment', 'Comment on Fee Limits')}
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

      {/* Basis calculation modal */}
      {basisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBasisModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-sm">
                {basisModal === 'acq' ? 'Adjusted Acquisition Basis' : 'Adjusted Construction Basis'}
              </h3>
              <button type="button" onClick={() => setBasisModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-3">
              <table className="w-full text-sm">
                <tbody>
                  {(basisModal === 'acq' ? result.basis.acqBreakdown : result.basis.constrBreakdown).map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className={`py-1.5 pr-3 ${row.pending ? 'text-muted-foreground/60' : ''}`}>
                        {row.label}{row.pending && <span className="ml-1 text-xs">(pending)</span>}
                      </td>
                      <td className={`py-1.5 text-right tabular-nums whitespace-nowrap ${row.value < 0 ? 'text-rose-600' : row.pending ? 'text-muted-foreground/60' : ''}`}>
                        {row.value < 0 ? `(${money(Math.abs(row.value))})` : money(row.value)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2">{basisModal === 'acq' ? 'Adjusted Acquisition Basis' : 'Adjusted Construction Basis'}</td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">
                      {money(basisModal === 'acq' ? result.basis.adjustedAcquisitionBasis : result.basis.adjustedConstructionBasis)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Lines marked (pending) need inputs not yet captured in the web app and are treated as $0 for now.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit basis adjustment modal */}
      {adjForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdjForm(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">{adjForm.editingId ? 'Edit basis adjustment' : 'Add basis adjustment'}</h3>
              <button type="button" onClick={() => setAdjForm(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAdjForm({ ...adjForm, type: 'acq' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${adjForm.type === 'acq' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                    Acquisition Basis
                  </button>
                  <button type="button" onClick={() => setAdjForm({ ...adjForm, type: 'constr' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${adjForm.type === 'constr' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                    Construction Basis
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Explanation</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={adjForm.explanation}
                  onChange={e => setAdjForm({ ...adjForm, explanation: e.target.value })}
                  placeholder="Why is this adjustment needed?"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                  value={adjForm.amount}
                  onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground/70 mt-1">Positive adds to the basis; negative subtracts.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
              <button type="button" onClick={() => setAdjForm(null)} className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="button" onClick={saveAdjustment} className="text-sm rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
