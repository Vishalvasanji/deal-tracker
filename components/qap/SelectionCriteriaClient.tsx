'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { computeSelection, type SelectionDeps } from '@/lib/qap-selection-calc'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type StaticDeps = Omit<SelectionDeps, 'selfScores'>

interface Props {
  dealId: string
  deps: StaticDeps
  initialSelfScores: Record<string, number>
}

const pts = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
const subHdr = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'

export function SelectionCriteriaClient({ dealId, deps, initialSelfScores }: Props) {
  const [selfScores, setSelfScores] = useState<Record<string, number>>(initialSelfScores)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const result = useMemo(() => computeSelection({ ...deps, selfScores }), [deps, selfScores])

  function setScore(key: string, raw: string) {
    const v = raw === '' ? 0 : parseFloat(raw.replace(/[^\d.]/g, '')) || 0
    setSelfScores(prev => ({ ...prev, [key]: v }))
  }
  function saveScore(key: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'selection', key, String(selfScores[key] ?? 0))
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const overMax = result.totalSelf > result.totalMax

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Selection Criteria</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Self-scores save on blur'}
        </span>
      </div>

      {/* ── HEADLINE: TOTAL POINTS (row 129) — Calculated vs Self-Score vs Max ── */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs text-muted-foreground mb-3">Total Points (to be confirmed by LHC)</p>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 gap-y-2 items-baseline">
          <span />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Calculated</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Self-Score</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Max</span>

          <span className="text-sm font-medium">Total Points</span>
          <span className="text-2xl font-bold tabular-nums text-right leading-none">{pts(result.totalCalc)}</span>
          <span className="text-2xl font-bold tabular-nums text-right leading-none">{pts(result.totalSelf)}</span>
          <span className="text-2xl font-bold tabular-nums text-right leading-none text-muted-foreground">{result.totalMax}</span>
        </div>
        {overMax && (
          <p className="mt-3 text-xs text-amber-600 flex items-start gap-1.5 border-t border-amber-200 pt-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Self-Score total ({pts(result.totalSelf)}) exceeds the {result.totalMax}-point maximum.
          </p>
        )}
      </div>

      {/* ── SECTIONS I–V ── */}
      {result.sections.map(sec => {
        const selfOver = sec.selfSubtotal > sec.max
        return (
          <div key={sec.roman} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={subHdr}>§{sec.roman} · {sec.title}</p>
              <span className="text-xs text-muted-foreground tabular-nums">
                Calc {pts(sec.calcSubtotal)} · Self {pts(sec.selfSubtotal)} · Max {sec.max}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
              {/* column header */}
              <div className="grid grid-cols-[1fr_5rem_6rem] gap-x-3 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>Criterion</span>
                <span className="text-right">Calc / Max</span>
                <span className="text-right">Self-Score</span>
              </div>
              {sec.criteria.map(c => c.level === 'group' ? (
                <div key={c.key} className="grid grid-cols-[1fr_5rem_6rem] gap-x-3 px-4 py-2 items-center bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{c.label}</p>
                    {c.detail && <p className="text-[11px] font-normal text-muted-foreground">{c.detail}</p>}
                  </div>
                  <span className="text-sm tabular-nums text-right font-semibold">{pts(c.calc)} / {c.max}</span>
                  <span />
                </div>
              ) : (
                <div key={c.key} className="grid grid-cols-[1fr_5rem_6rem] gap-x-3 px-4 py-2 items-center">
                  <div className="min-w-0 pl-3">
                    <p className="text-sm">{c.label}</p>
                    {c.detail && <p className="text-[11px] text-muted-foreground">{c.detail}</p>}
                  </div>
                  <span className={`text-sm tabular-nums text-right ${c.calc > 0 ? 'font-semibold text-emerald-600' : 'text-muted-foreground'}`}>
                    {pts(c.calc)} / {c.max}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0"
                    value={selfScores[c.key] ? String(selfScores[c.key]) : ''}
                    onChange={e => setScore(c.key, e.target.value)}
                    onBlur={() => saveScore(c.key)}
                  />
                </div>
              ))}
            </div>
            {selfOver && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Self-Score subtotal exceeds the {sec.max}-point section maximum.
              </p>
            )}
          </div>
        )
      })}

      {/* ── §VI THRESHOLD REQUIREMENTS (acknowledgements, not points) ── */}
      <div className="space-y-2">
        <p className={subHdr}>§VI · Threshold Requirements</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
          {result.thresholds.map(t => (
            <div key={t.key} className="flex items-start justify-between gap-3 px-4 py-2">
              <div className="flex items-start gap-2 min-w-0">
                {t.met
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />}
                <span className="text-sm">{t.label}</span>
              </div>
              <span className={`text-xs shrink-0 tabular-nums ${t.met ? 'text-emerald-600' : 'text-amber-600'}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Calculated points are derived automatically from Project Description, Unit Mix, and Development Costs.
        Self-Score is the applicant&apos;s claim. Final points are confirmed by LHC. Hidden Excel rows
        (De-Concentration, Increased Unit Affordability, DEI, Green Building, Universal Design) are excluded.
      </p>
    </div>
  )
}
