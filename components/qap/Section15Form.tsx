'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
  /** lihtc_4pct from section_10 (H12) — 4% project cannot get construction basis boost */
  lihtc4pct?: boolean
  /** lihtc_9pct from section_10 (H23) — section applicability */
  lihtc9pct?: boolean
  /** is_single_site from section_12 (H92) — multi-site warning */
  isSingleSite?: boolean
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'

function parseDecimal(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function Section15Form({
  dealId,
  initial,
  lihtc4pct = false,
  lihtc9pct = false,
  isSingleSite = true,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_15', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleToggle(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const isApplicable = lihtc4pct || lihtc9pct
  const isApplying = values.basis_boost_applying === 'Yes'
  const isMultiSite = !isSingleSite

  const constructionBoost = parseDecimal(values.construction_basis_boost ?? '0')
  const acquisitionBoost = parseDecimal(values.acquisition_basis_boost ?? '0')
  const anyBoost = constructionBoost > 0 || acquisitionBoost > 0

  // Error: 4% project (not competitive) + construction boost > 0
  const constructionBoostError =
    lihtc4pct && !lihtc9pct && constructionBoost > 0
      ? 'Only projects with competitive LIHTCs (9%) may qualify for a 30% construction basis boost.'
      : null

  // Info: checklist reminder when boost is being applied
  const showChecklistNote = isApplying && anyBoost

  // Warning: multi-site + boost
  const showMultiSiteWarning = isApplying && isMultiSite

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Basis Boost</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {!isApplicable && (
        <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
          Your transaction does not include 4% or 9% LIHTCs. You may skip this section.
        </p>
      )}

      {/* 15.01 — Basis Boost */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>15.01 — Basis Boost</p>

        <div>
          <label className={labelCls}>
            Are you proposing any Basis Boost? <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleToggle('basis_boost_applying', opt)}
                className={values.basis_boost_applying === opt ? activeBtn : inactiveBtn}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {isApplying && (
          <div className="pl-4 border-l-2 border-border space-y-4 mt-2">
            <div>
              <label className={labelCls}>Boost for Construction Basis</label>
              <input
                className={inputCls}
                value={values.construction_basis_boost ?? ''}
                placeholder="e.g. 0.30 (for 30%)"
                onChange={e => setValues(v => ({ ...v, construction_basis_boost: e.target.value }))}
                onBlur={e => handleBlur('construction_basis_boost', e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter as decimal (e.g. 0.30 for 30%). Enter 0 if not requesting a construction boost.
              </p>
              {constructionBoostError && (
                <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
                  {constructionBoostError}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Boost for Acquisition Basis</label>
              <input
                className={inputCls}
                value={values.acquisition_basis_boost ?? ''}
                placeholder="e.g. 0.30 (for 30%)"
                onChange={e => setValues(v => ({ ...v, acquisition_basis_boost: e.target.value }))}
                onBlur={e => handleBlur('acquisition_basis_boost', e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter as decimal (e.g. 0.30 for 30%). Enter 0 if not requesting an acquisition boost.
              </p>
            </div>

            {showChecklistNote && (
              <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
                The Checklist worksheet will include an information request regarding Basis Boost.
              </p>
            )}

            {showMultiSiteWarning && (
              <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
                You indicated that this is a multi-site project and that you are applying for a Basis
                Boost. Note that 100% of the project sites must qualify for the Basis Boost.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
