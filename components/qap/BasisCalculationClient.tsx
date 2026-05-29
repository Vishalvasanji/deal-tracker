'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapBasisConfig, replaceQapBasisConfigs } from '@/lib/qap-actions'
import { computeBasis, type BasisConfigInput, type BasisDeps, type BasisConfigResult } from '@/lib/qap-basis-calc'
import { Plus, Trash2, AlertTriangle, CheckCircle2, Info, X, ChevronRight, ChevronDown } from 'lucide-react'

interface Props {
  dealId: string
  initialConfigs: BasisConfigInput[]
  deps: BasisDeps
}

const money = (v: number | null | undefined) => (v == null ? '—' : `$${Math.round(v).toLocaleString()}`)
const pctStr = (v: number) => `${(v * 100).toFixed(1)}%`

const inputCls =
  'w-full text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const subHdr = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const cardCls = 'rounded-xl border border-border bg-card px-4 py-3 space-y-2'

// metric rows (configurations run across the columns, matching the Excel layout)
const ROWS: { key: keyof BasisConfigInput; label: string }[] = [
  { key: 'num_buildings', label: 'Number of Buildings with Configuration' },
  { key: 'resid_staff_sqft', label: 'Floor Area: Residential + Staff Units (per building)' },
  { key: 'common_sqft', label: 'Floor Area: Other / Common Areas (per building)' },
  { key: 'lihtc_units', label: 'Number of LIHTC Units (per building)' },
  { key: 'resid_units', label: 'Number of Residential Units (per building)' },
  { key: 'lihtc_sqft', label: 'Sqft of LIHTC Units (per building)' },
  { key: 'resid_sqft', label: 'Total Sqft of Residential Units (per building)' },
  { key: 'homeless_constr_adj', label: 'Homeless Basis Adjustment — Construction' },
  { key: 'homeless_acq_adj', label: 'Homeless Basis Adjustment — Acquisition' },
]

function emptyConfig(idx: number): BasisConfigInput {
  return {
    config_index: idx, label: '', num_buildings: 0, resid_staff_sqft: 0, common_sqft: 0,
    lihtc_units: 0, resid_units: 0, lihtc_sqft: 0, resid_sqft: 0,
    homeless_constr_adj: 0, homeless_acq_adj: 0,
  }
}

export function BasisCalculationClient({ dealId, initialConfigs, deps }: Props) {
  const [configs, setConfigs] = useState<BasisConfigInput[]>(
    initialConfigs.length > 0 ? initialConfigs : [emptyConfig(0)]
  )
  const [detail, setDetail] = useState<BasisConfigResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const result = useMemo(() => computeBasis(configs, deps), [configs, deps])

  function setField(idx: number, key: keyof BasisConfigInput, raw: string) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== idx) return c
      const val = key === 'label' ? raw : (raw === '' ? 0 : parseInt(raw.replace(/[$,\s]/g, ''), 10) || 0)
      return { ...c, [key]: val }
    }))
  }
  function saveConfig(idx: number) {
    const c = configs[idx]
    if (!c) return
    startTransition(async () => {
      await upsertQapBasisConfig(dealId, c.config_index, c)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function addConfig() {
    const nextIdx = configs.length > 0 ? Math.max(...configs.map(c => c.config_index)) + 1 : 0
    setConfigs(prev => [...prev, emptyConfig(nextIdx)])
  }
  function deleteConfig(idx: number) {
    const next = configs.filter((_, i) => i !== idx).map((c, i) => ({ ...c, config_index: i }))
    setConfigs(next.length > 0 ? next : [emptyConfig(0)])
    startTransition(async () => {
      await replaceQapBasisConfigs(dealId, next)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const dealLabel = deps.dealType === '9%' ? '9% (70% PV)' : deps.dealType === '4%' ? '4% (30% PV)' : 'not set'
  const basisReady = deps.adjustedConstructionBasis > 0 || deps.adjustedAcquisitionBasis > 0
  const ratesReady = deps.constructionCreditRate > 0 || deps.acquisitionCreditRate > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Basis Calculation</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}
        </span>
      </div>

      {/* Headline — the answer */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs text-muted-foreground">Maximum Permitted Annual Credit</p>
        <p className="text-3xl font-bold tabular-nums">{money(result.totals.maximumPermittedCredit)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Construction {money(result.totals.permittedConstructionCredit)} + Acquisition {money(result.totals.permittedAcquisitionCredit)}
          {' · '}{deps.dealType === 'none' ? '' : `${dealLabel} deal`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/60 pt-2">
          Maximum permitted by eligible basis — before the §14 pool cap and the equity-gap test. Not necessarily the awardable credit.
        </p>
      </div>

      {/* Missing-input guidance — explains a $0 result (signal, always shown) */}
      {(!basisReady || !ratesReady) && (
        <p className="text-xs text-amber-600 flex items-start gap-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {!basisReady && 'Adjusted basis is $0 — complete §36/§38 Development Costs. '}
            {!ratesReady && 'Credit rate is 0% — set the 9%/4% deal type in §10 (and acquisition rate in §14).'}
          </span>
        </p>
      )}

      {/* Reconciliation issues — always shown when present */}
      {result.errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Reconciliation Issues ({result.errors.length})</p>
          <ul className="space-y-1">
            {result.errors.map(e => (
              <li key={e.note} className="text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">Note {e.note} — {e.label}:</span>{' '}
                  configurations sum to {e.perConfig.toLocaleString()} but the project total is {e.projectTotal.toLocaleString()}.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Configuration input — configurations across the columns (matches the Excel) */}
      <div className="space-y-2">
        <p className={subHdr}>Building Configurations</p>
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">
                  Configuration
                </th>
                {configs.map((cfg, idx) => (
                  <th key={cfg.config_index} className="px-2 py-2 w-40 align-top">
                    <div className="flex items-center gap-1">
                      <input
                        className="w-full bg-transparent text-sm font-medium px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring rounded"
                        placeholder={`Config ${idx + 1}`}
                        value={cfg.label ?? ''}
                        onChange={e => setField(idx, 'label', e.target.value)}
                        onBlur={() => saveConfig(idx)}
                      />
                      <button onClick={() => deleteConfig(idx)} className="text-muted-foreground hover:text-rose-500 p-0.5 shrink-0" title="Delete configuration">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.key} className="border-b border-border/40 hover:bg-muted/10">
                  <td className="text-left text-sm px-3 py-1.5 text-muted-foreground">
                    {row.label}
                  </td>
                  {configs.map((cfg, idx) => (
                    <td key={cfg.config_index} className="px-2 py-1.5 w-40">
                      <input
                        type="number"
                        className={inputCls}
                        value={(cfg[row.key] as number) || ''}
                        onChange={e => setField(idx, row.key, e.target.value)}
                        onBlur={() => saveConfig(idx)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addConfig} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" /> Add configuration
        </button>
        <p className="text-xs text-muted-foreground">
          Each column is one building configuration (a unique building or set of identical buildings). Values are per building; the model multiplies by the number of buildings.
        </p>
      </div>

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(s => !s)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {showDetails ? 'Hide calculation details' : 'Show calculation details'}
      </button>

      {showDetails && (
        <div className="space-y-6">
          {/* Inputs context (read-only, from other sections) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className={cardCls}><p className={subHdr}>Adj. Constr. Basis</p><p className="text-sm font-semibold tabular-nums">{money(deps.adjustedConstructionBasis)}</p><p className="text-[11px] text-muted-foreground">§38</p></div>
            <div className={cardCls}><p className={subHdr}>Adj. Acq. Basis</p><p className="text-sm font-semibold tabular-nums">{money(deps.adjustedAcquisitionBasis)}</p><p className="text-[11px] text-muted-foreground">§38</p></div>
            <div className={cardCls}><p className={subHdr}>Constr. Boost</p><p className="text-sm font-semibold tabular-nums">{pctStr(deps.constructionBoost)}</p><p className="text-[11px] text-muted-foreground">§15.01</p></div>
            <div className={cardCls}><p className={subHdr}>Acq. Boost</p><p className="text-sm font-semibold tabular-nums">{pctStr(deps.acquisitionBoost)}</p><p className="text-[11px] text-muted-foreground">§15.01</p></div>
            <div className={cardCls}><p className={subHdr}>Constr. Credit %</p><p className="text-sm font-semibold tabular-nums">{pctStr(deps.constructionCreditRate)}</p><p className="text-[11px] text-muted-foreground">{deps.dealType==='9%'?'fixed 9%':deps.dealType==='4%'?'§10.02':'—'}</p></div>
            <div className={cardCls}><p className={subHdr}>Acq. Credit %</p><p className="text-sm font-semibold tabular-nums">{pctStr(deps.acquisitionCreditRate)}</p><p className="text-[11px] text-muted-foreground">{deps.dealType==='9%'?'§14.02':deps.dealType==='4%'?'§10.02':'—'}</p></div>
          </div>

          {result.errors.length === 0 && configs.length > 0 && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Configurations reconcile to the project totals.
            </p>
          )}

          {/* Per-configuration results */}
          <div className="space-y-2">
            <p className={subHdr}>Qualified Basis &amp; Credit by Configuration</p>
            <p className="text-xs text-muted-foreground">Click a configuration to see its full derivation.</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                    <th className="text-left px-3 py-2">Configuration</th>
                    <th className="text-right px-3 py-2">Applic. Fraction</th>
                    <th className="text-right px-3 py-2">Qual. Constr. Basis</th>
                    <th className="text-right px-3 py-2">Qual. Acq. Basis</th>
                    <th className="text-right px-3 py-2">Constr. Credit</th>
                    <th className="text-right px-3 py-2">Acq. Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.configs.map(r => (
                    <tr key={r.config_index} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => setDetail(r)}>
                      <td className="px-3 py-2">
                        <span className="text-primary hover:underline inline-flex items-center gap-1">{r.label} <Info className="h-3 w-3" /></span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{pctStr(r.applicableFraction)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.qualConstr)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.qualAcq)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.permittedConstrCredit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.permittedAcqCredit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-3 py-2">Project Total (× buildings)</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right tabular-nums">{money(result.totals.qualifiedConstructionBasis)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(result.totals.qualifiedAcquisitionBasis)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(result.totals.permittedConstructionCredit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(result.totals.permittedAcquisitionCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Per-config detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-sm">{detail.label} — Credit Derivation</h3>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-3">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Building floor area (resid+staff + common)', money(detail.totalSqft)],
                    ['Allocated Adjusted Construction Basis', money(detail.constructionBasis)],
                    ['Allocated Adjusted Acquisition Basis', money(detail.acquisitionBasis)],
                    [`Construction Basis after boost (×${(1 + deps.constructionBoost).toFixed(2)})`, money(detail.constrAfterBoost)],
                    [`Acquisition Basis after boost (×${(1 + deps.acquisitionBoost).toFixed(2)})`, money(detail.acqAfterBoost)],
                    [`Applicable fraction = MIN(units ${pctStr(detail.fracByUnits)}, sqft ${pctStr(detail.fracBySqft)})`, pctStr(detail.applicableFraction)],
                    ['Qualified Construction Basis', money(detail.qualConstr)],
                    ['Qualified Acquisition Basis', money(detail.qualAcq)],
                    [`Permitted Construction Credit (×${pctStr(deps.constructionCreditRate)})`, money(detail.permittedConstrCredit)],
                    [`Permitted Acquisition Credit (×${pctStr(deps.acquisitionCreditRate)})`, money(detail.permittedAcqCredit)],
                  ].map(([l, v], i) => (
                    <tr key={i} className={`border-b border-border/30 ${i >= 8 ? 'font-semibold' : ''}`}>
                      <td className="py-1.5 pr-3">{l}</td>
                      <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground/60 mt-3">Per-building figures; the project total multiplies each configuration by its number of buildings.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
