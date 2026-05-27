'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subBlockCls = 'space-y-4 pl-4 border-l-2 border-border mt-3'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const YES_NO_OPTS = ['Yes', 'No', 'Missing']
const PAYMENT_LABELS = ['Payment 1', 'Payment 2', 'Payment 3', 'Payment 4', 'Payment 5', 'Payment 6']

export function Section20Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_20', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleBlur(k: string, v: string) { save(k, v) }

  function handleSelect(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }))
    save(k, v)
  }

  function handleToggle(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }))
    save(k, v)
  }

  function YesNoToggle({ fk, label }: { fk: string; label: string }) {
    return (
      <div className="space-y-2">
        <label className={labelCls}>{label}</label>
        <div className="flex gap-2 flex-wrap">
          {YES_NO_OPTS.map(opt => (
            <button key={opt} type="button"
              onClick={() => handleToggle(fk, opt)}
              className={values[fk] === opt ? activeBtn : inactiveBtn}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function DollarInput({ fk, label, placeholder = 'e.g. 100000' }: { fk: string; label: string; placeholder?: string }) {
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <input className={inputCls} value={values[fk] ?? ''} placeholder={placeholder}
          onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
          onBlur={e => handleBlur(fk, e.target.value)} />
      </div>
    )
  }

  function NumberInput({ fk, label, placeholder = '' }: { fk: string; label: string; placeholder?: string }) {
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <input type="number" className={inputCls} value={values[fk] ?? ''} placeholder={placeholder}
          onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
          onBlur={e => handleBlur(fk, e.target.value)} />
      </div>
    )
  }

  function CommentArea({ fk }: { fk: string }) {
    return (
      <div>
        <label className={labelCls}>Comment</label>
        <textarea className={inputCls + ' min-h-[80px] resize-y'} value={values[fk] ?? ''}
          onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
          onBlur={e => handleBlur(fk, e.target.value)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Construction / Development of the Project</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* ── 20.01 Equipment Costs ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.01 Equipment Costs</p>
        <YesNoToggle fk="s20_01_equipment"
          label="Do the estimated development costs include costs for equipment (e.g., washers/dryers) that would normally be treated as personal property?" />
        {values.s20_01_equipment === 'Yes' && (
          <div className={subBlockCls}>
            <p className={noteCls}>
              See QAP Section IV.D for restrictions on costs related to personal property / equipment.
            </p>
            <DollarInput fk="s20_01_lease_cost" label="Estimated cost to the project to lease this equipment ($)" />
            <DollarInput fk="s20_01_operate_cost" label="Estimated cost to the project to operate this equipment ($)" />
            <CommentArea fk="s20_01_comment" />
          </div>
        )}
      </div>

      {/* ── 20.02 (Info only — no user inputs) ──────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.02 Cost Limitations</p>
        <p className={noteCls}>
          See the QAP for limits on developer fees, general contractor fees, and related soft costs. No additional
          input required here.
        </p>
      </div>

      {/* ── 20.03 Construction Manager's Fee ────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.03 Construction Manager's Fee</p>
        <p className={noteCls}>
          If a non-LHC funder requires a third-party construction manager, LHC includes this fee in the budget.
          Enter $0 if not applicable.
        </p>
        <DollarInput fk="s20_03_constr_mgr_fee" label="Construction Manager's Fee ($)" placeholder="e.g. 0" />
      </div>

      {/* ── 20.04 Related Party Payments ─────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.04 Payments to Related Parties</p>
        <YesNoToggle fk="s20_04_related_party_payments"
          label="Other than the developer fee and hard costs under the general contract, does the budget include payments to related parties?" />
        {values.s20_04_related_party_payments === 'Yes' && (
          <div className={subBlockCls}>
            <p className={noteCls}>
              Enter a description and dollar amount for each related-party payment (up to 6).
            </p>
            <div className="space-y-3">
              {PAYMENT_LABELS.map((defaultLabel, i) => {
                const n = i + 1
                const labelKey = `s20_04_payment_${n}_label`
                const amountKey = `s20_04_payment_${n}_amount`
                return (
                  <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Payment {n} — Description</label>
                      <input className={inputCls} value={values[labelKey] ?? ''}
                        placeholder={defaultLabel}
                        onChange={e => setValues(v => ({ ...v, [labelKey]: e.target.value }))}
                        onBlur={e => handleBlur(labelKey, e.target.value)} />
                    </div>
                    <DollarInput fk={amountKey} label={`Payment ${n} — Amount ($)`} />
                  </div>
                )
              })}
            </div>
            <CommentArea fk="s20_04_comment" />
          </div>
        )}
      </div>

      {/* ── 20.05 Extraordinary Site Costs ───────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.05 Extraordinary Site Costs</p>
        <p className={noteCls}>
          QAP Section IV.D allows extraordinary site costs to be excluded from per-unit cost limits.
          Enter $0 if not applicable.
        </p>
        <DollarInput fk="s20_05_extraordinary_site_cost" label="Estimated Extraordinary Site Costs ($)" placeholder="e.g. 0" />
      </div>

      {/* ── 20.06 Community Facilities ───────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.06 Community Facilities</p>
        <p className={noteCls}>
          Provide the estimated cost of Community Facilities (e.g., management office, laundry, community room).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DollarInput fk="s20_06_community_fac_cost" label="Estimated Cost for Community Facilities ($)" />
          <DollarInput fk="s20_06_in_basis" label="Amount Includable in LIHTC Basis ($)" />
        </div>
      </div>

      {/* ── 20.07 Community Service Facility ─────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.07 Community Service Facility</p>
        <YesNoToggle fk="s20_07_community_svc"
          label="Does the proposed project include a Community Service Facility (e.g., child care, job training, health services for the general public)?" />
        {values.s20_07_community_svc === 'Yes' && (
          <div className={subBlockCls}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DollarInput fk="s20_07_cost" label="Estimated Cost for Community Service Facility ($)" />
              <DollarInput fk="s20_07_in_basis" label="Amount Includable in LIHTC Basis ($)" />
            </div>
            <p className={noteCls}>
              An information request will appear on the Checklist worksheet for Community Service Facilities.
            </p>
            <CommentArea fk="s20_07_comment" />
          </div>
        )}
      </div>

      {/* ── 20.08 Excess Costs Above Maximum ─────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.08 Increases in Unit Costs Above the Maximum</p>
        <p className={noteCls}>
          The QAP provides that Extraordinary Site costs, Community Facilities costs, and Community Service Facility
          costs can be excluded from per-unit cost maximums. Does this transaction include a request that LHC staff
          grant this type of exception?
        </p>
        <YesNoToggle fk="s20_08_excess_costs_request"
          label="Does this transaction include a request that LHC staff grant an exception to per-unit cost limits?" />
        {values.s20_08_excess_costs_request === 'Yes' && (
          <div className={subBlockCls}>
            <DollarInput fk="s20_08_excess_costs" label="Estimated Excess Costs ($)" />
          </div>
        )}
      </div>

      {/* ── 20.09 Building Configuration ─────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.09 Building Configuration</p>
        <p className={noteCls}>
          A "configuration" is a unique building or a set of identical buildings in the project.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberInput fk="s20_09_total_buildings" label="Total number of residential buildings" placeholder="e.g. 4" />
          <NumberInput fk="s20_09_total_configurations" label="Total number of building configurations" placeholder="e.g. 2" />
        </div>
      </div>

      {/* ── 20.10 Cash Flow Note ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.10 Cash Flow Note for Acquisition</p>
        <YesNoToggle fk="s20_10_cash_flow_note"
          label="Does the financing plan include a cash flow note associated with the acquisition of an existing project?" />
      </div>

      {/* ── 20.11 Return on Taxpayer Capital ─────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.11 Return on Taxpayer Capital</p>
        <YesNoToggle fk="s20_11_return_on_capital"
          label="Are you claiming a Return on Taxpayer Capital as provided for in the QAP?" />
      </div>

      {/* ── 20.12 Staff Units ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.12 Staff Units</p>
        <YesNoToggle fk="s20_12_has_staff_units"
          label="Does the project include one or more staff units?" />
      </div>

      {/* ── 20.14 Commercial Portion ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={subHeaderCls}>20.14 Commercial Portion of the Project</p>
        <YesNoToggle fk="s20_14_has_commercial"
          label="Does the project include any commercial square footage and/or commercial income?" />
        {values.s20_14_has_commercial === 'Yes' && (
          <div className={subBlockCls}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput fk="s20_14_commercial_sqft" label="Commercial square footage" placeholder="e.g. 1200" />
              <DollarInput fk="s20_14_commercial_cost" label="Commercial development cost ($)" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
