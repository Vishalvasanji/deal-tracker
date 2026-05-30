'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
  /** bond_financing from section_10 — determines 4% vs 9% title */
  bondFinancing?: boolean
  /** lihtc_9pct from section_10 — determines section applicability */
  lihtc9pct?: boolean
  /** existing_acquired from section_12 — shows acquisition credit rate when true */
  existingAcquired?: boolean
  /** funding_pool from section_13 — for cap lookup */
  fundingPool?: string
  /** is_rural from section_12 — affects QNP/CHDO cap */
  isRural?: boolean
}

// Per-project LIHTC caps by pool (mirrors Controls!A32:C36)
const POOL_LIHTC_CAP: Record<string, number> = {
  'Qualified Non-Profit/CHDO Set-Aside': 1_500_000,
  'Urban Area Pool': 1_500_000,
  'Rural Area Rehabilitation Pool': 1_000_000,
  'Rural Area New Construction Pool': 1_000_000,
  'Choice Neighborhood Initiative CNI Set-Aside': 1_500_000,
}

const SET_ASIDE_OPTIONS = ['20/50', '40/60', 'Average Income', 'Missing']

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

function parseDollar(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : n
}

export function Section14Form({
  dealId,
  initial,
  bondFinancing = false,
  lihtc9pct = false,
  existingAcquired = false,
  fundingPool = '',
  isRural = false,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_14', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleSelect(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const sectionTitle = bondFinancing
    ? 'Requests for 4% LIHTCs'
    : lihtc9pct
    ? 'Requests for 9% LIHTCs'
    : 'Requests for LIHTCs'

  // Per-project LIHTC cap; QNP/CHDO rural = $1M
  let lihtcCap: number | null = POOL_LIHTC_CAP[fundingPool] ?? null
  if (fundingPool === 'Qualified Non-Profit/CHDO Set-Aside' && isRural) {
    lihtcCap = 1_000_000
  }

  const creditsAmount = parseDollar(values.credits_requested ?? '0')
  const creditsExceedCap =
    lihtcCap !== null && lihtcCap > 0 && creditsAmount > 0 && creditsAmount > lihtcCap

  // Acquisition credit rate (§14.02) is shown for ANY 9% deal — Excel shows H209 whenever the
  // project is a 9% transaction (the applicant fills it if the deal includes acquisition credits).
  // Previously gated on §12 existing_acquired, which silently zeroed the acquisition credit.
  const showAcqRate = lihtc9pct

  // Income Averaging note
  const showIncomeAvgNote = values.lihtc_set_aside_election === 'Average Income'

  const isApplicable = bondFinancing || lihtc9pct

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">{sectionTitle}</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {!isApplicable && (
        <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
          Your transaction does not include 9% LIHTCs or bond financing. You may skip this section.
        </p>
      )}

      {/* 14.01 — LIHTC Per-Project Cap (read-only, derived from Section 13) */}
      {lihtcCap !== null && (
        <div className="space-y-1">
          <p className={sectionHeaderCls}>14.01 — Per-Project LIHTC Cap</p>
          <p className="text-sm text-muted-foreground">
            Per-project LIHTC cap for the{' '}
            <span className="font-medium text-foreground">{fundingPool || 'selected pool'}</span>:{' '}
            <span className="font-semibold text-foreground">{fmt(lihtcCap)}</span>
          </p>
        </div>
      )}

      {/* 14.02 — Credits Requested */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>14.02 — Credits Requested</p>
        <div>
          <label className={labelCls}>
            Credits requested ($) <span className="text-rose-500">*</span>
          </label>
          <input
            className={inputCls}
            value={values.credits_requested ?? ''}
            placeholder="e.g. 1000000"
            onChange={e => setValues(v => ({ ...v, credits_requested: e.target.value }))}
            onBlur={e => handleBlur('credits_requested', e.target.value)}
          />
          {creditsExceedCap && lihtcCap !== null && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
              LIHTCs cannot exceed the cap for the {fundingPool} pool ({fmt(lihtcCap)}).
            </p>
          )}
        </div>
      </div>

      {/* 14.01 — Housing Credit Rates */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>14.01 — Housing Credit Rates</p>

        {showAcqRate && (
          <div className="pl-4 border-l-2 border-border space-y-3 mt-2">
            <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              Your transaction includes acquisition credits. The acquisition housing credit rate is
              typically more than 3.0% and less than 4.0%. This rate is published monthly by the IRS.
            </p>
            <div>
              <label className={labelCls}>Acquisition housing credit rate</label>
              <input
                className={inputCls}
                value={values.acq_credit_rate ?? ''}
                placeholder="e.g. 0.04"
                onChange={e => setValues(v => ({ ...v, acq_credit_rate: e.target.value }))}
                onBlur={e => handleBlur('acq_credit_rate', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Comment</label>
              <textarea
                className={inputCls + ' min-h-[80px] resize-y'}
                value={values.credit_rate_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, credit_rate_comment: e.target.value }))}
                onBlur={e => handleBlur('credit_rate_comment', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 14.03 — LIHTC Set-Aside Election */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>14.03 — LIHTC Set-Aside Election</p>
        <div>
          <label className={labelCls}>
            LIHTC Set-Aside Election <span className="text-rose-500">*</span>
          </label>
          <select
            className={selectCls}
            value={values.lihtc_set_aside_election ?? ''}
            onChange={e => handleSelect('lihtc_set_aside_election', e.target.value)}
          >
            <option value="">Select…</option>
            {SET_ASIDE_OPTIONS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {showIncomeAvgNote && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              When you complete the Unit Mix and Rents worksheet, remember to specify LIHTC units
              with income restrictions at 70% AMI and/or 80% AMI.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
