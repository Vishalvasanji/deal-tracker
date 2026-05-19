'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

function YesNoToggle({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const base = 'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors'
  const active = 'bg-primary text-primary-foreground'
  const inactive = 'bg-muted text-muted-foreground hover:bg-muted/80'
  return (
    <div className="flex gap-2 mt-1">
      <button type="button" className={`${base} ${value === 'Yes' ? active : inactive}`} onClick={() => onChange('Yes')}>
        Yes
      </button>
      <button type="button" className={`${base} ${value === 'No' ? active : inactive}`} onClick={() => onChange('No')}>
        No
      </button>
    </div>
  )
}

export function Section10Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_10', fieldKey, value)
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

  const bondYes = values.bond_financing === 'Yes'
  const lihtc4Yes = values.lihtc_4pct === 'Yes'
  const lihtc9Yes = values.lihtc_9pct === 'Yes'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Project Funding Characteristics</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 10.01 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>10.01 — Tax-Exempt Bond Financing</p>
        <div>
          <label className={labelCls}>
            Does the financing plan include tax-exempt bond financing? <span className="text-rose-500">*</span>
          </label>
          <YesNoToggle
            value={values.bond_financing ?? ''}
            onChange={v => handleToggle('bond_financing', v)}
          />
        </div>

      </div>

      {/* 10.02 */}
      {bondYes && (
        <div className="space-y-3">
          <p className={sectionHeaderCls}>10.02 — 4% ("30% PV") LIHTCs</p>
          <div>
            <label className={labelCls}>Does your transaction include 4% ("30% PV") LIHTCs?</label>
            <YesNoToggle
              value={values.lihtc_4pct ?? ''}
              onChange={v => handleToggle('lihtc_4pct', v)}
            />
          </div>

          {lihtc4Yes && (
            <div className="space-y-4 pl-4 border-l-2 border-border">
              <div>
                <label className={labelCls}>The housing credit rate is estimated to be (%)</label>
                <input
                  className={inputCls}
                  value={values.housing_credit_rate ?? ''}
                  onChange={e => setValues(v => ({ ...v, housing_credit_rate: e.target.value }))}
                  onBlur={e => handleBlur('housing_credit_rate', e.target.value)}
                  placeholder="e.g. 4.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Per the IRS monthly published rate (typically more than 3.0% and less than 4.0%)
                </p>
              </div>
              <div>
                <label className={labelCls}>Comment</label>
                <textarea
                  className={inputCls + ' min-h-[80px] resize-y'}
                  value={values.housing_credit_rate_comment ?? ''}
                  onChange={e => setValues(v => ({ ...v, housing_credit_rate_comment: e.target.value }))}
                  onBlur={e => handleBlur('housing_credit_rate_comment', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10.03 */}
      {bondYes && (
        <div className="space-y-3">
          <p className={sectionHeaderCls}>10.03 — Costs of Issuance</p>
          <div>
            <label className={labelCls}>What are the estimated costs of issuance? ($)</label>
            <input
              className={inputCls}
              value={values.costs_of_issuance ?? ''}
              onChange={e => setValues(v => ({ ...v, costs_of_issuance: e.target.value }))}
              onBlur={e => handleBlur('costs_of_issuance', e.target.value)}
              placeholder="e.g. 100000"
            />
          </div>
        </div>
      )}

      {/* 10.04 */}
      {bondYes && (
        <div className="space-y-3">
          <p className={sectionHeaderCls}>10.04 — Role of Bond Financing</p>
          <div>
            <label className={labelCls}>
              Explain the role of tax-exempt bond financing in the financing plan, the planned governmental
              issuer, and the current state of your discussions with the issuer
            </label>
            <textarea
              className={inputCls + ' min-h-[120px] resize-y'}
              value={values.bond_role_explanation ?? ''}
              onChange={e => setValues(v => ({ ...v, bond_role_explanation: e.target.value }))}
              onBlur={e => handleBlur('bond_role_explanation', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 10.05 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>10.05 — 9% ("70% PV") LIHTCs</p>
        <div>
          <label className={labelCls}>
            Does your transaction include 9% ("70% PV") LIHTCs? <span className="text-rose-500">*</span>
          </label>
          <YesNoToggle
            value={values.lihtc_9pct ?? ''}
            onChange={v => handleToggle('lihtc_9pct', v)}
          />
        </div>

        {lihtc9Yes && (
          <div className="pl-4 border-l-2 border-border">
            <label className={labelCls}>Comment</label>
            <textarea
              className={inputCls + ' min-h-[80px] resize-y'}
              value={values.lihtc_9pct_note ?? ''}
              onChange={e => setValues(v => ({ ...v, lihtc_9pct_note: e.target.value }))}
              onBlur={e => handleBlur('lihtc_9pct_note', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 10.06 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>10.06 — Other LHC Funding</p>
        <div>
          <label className={labelCls}>
            Does your transaction include Other LHC Funding (HOME, NHTF, or CDBG from LHC or another State Agency)?{' '}
            <span className="text-rose-500">*</span>
          </label>
          <YesNoToggle
            value={values.other_lhc_funding ?? ''}
            onChange={v => handleToggle('other_lhc_funding', v)}
          />
        </div>
      </div>
    </div>
  )
}
