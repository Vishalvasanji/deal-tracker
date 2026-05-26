'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

// ─── Dropdown options ─────────────────────────────────────────────────────────
const LENDER_IS_OPTS    = ['Third Party', 'Identity of Interest', 'Missing']
const FIXED_FLOAT_OPTS  = ['Fixed Rate', 'Floating Rate', 'Missing']
const PAYMENT_TYPE_OPTS = ['Interest Only', 'P+I', 'P+I+MIP', 'Missing']
const PAYMENT_REQ_OPTS  = ['Must Pay', 'All Pmts Deferred', 'Pay if Cash Available', 'Other (Explain)']
const LOAN_TYPE_OPTS    = ['Amortizing', 'Deferred; due at maturity', 'Forgiven at maturity', 'Missing']
const FUNDING_TYPE_OPTS = ['Permanent Hard Debt', 'Permanent Soft Debt', 'Grant', 'Permanent Equity', 'Other (Explain)']
const DONATION_TYPE_OPTS = ['Donated / Volunteer Labor', 'Donated Materials', 'Donated Land Value', 'NPV of Reduced RE Taxes', 'Other (Explain)']

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputCls    = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls   = inputCls
const labelCls    = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn   = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'

// ─── Shared field helpers ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ fk, values, setValues, onBlur, placeholder = '' }: {
  fk: string; values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (k: string, v: string) => void; placeholder?: string
}) {
  return (
    <input className={inputCls} value={values[fk] ?? ''} placeholder={placeholder}
      onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
      onBlur={e => onBlur(fk, e.target.value)} />
  )
}

function NumberInput({ fk, values, setValues, onBlur, placeholder = '', suffix = '' }: {
  fk: string; values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (k: string, v: string) => void; placeholder?: string; suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" className={inputCls} value={values[fk] ?? ''} placeholder={placeholder}
        onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
        onBlur={e => onBlur(fk, e.target.value)} />
      {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
    </div>
  )
}

function SelectInput({ fk, opts, values, setValues, onSave }: {
  fk: string; opts: string[]; values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSave: (k: string, v: string) => void
}) {
  return (
    <select className={selectCls} value={values[fk] ?? ''}
      onChange={e => { setValues(v => ({ ...v, [fk]: e.target.value })); onSave(fk, e.target.value) }}>
      <option value="">Select…</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TextArea({ fk, values, setValues, onBlur, placeholder = '' }: {
  fk: string; values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (k: string, v: string) => void; placeholder?: string
}) {
  return (
    <textarea className={inputCls + ' min-h-[80px] resize-y'} value={values[fk] ?? ''}
      placeholder={placeholder}
      onChange={e => setValues(v => ({ ...v, [fk]: e.target.value }))}
      onBlur={e => onBlur(fk, e.target.value)} />
  )
}

// ─── Shared loan field blocks ─────────────────────────────────────────────────

/**
 * Standard loan fields for 18.01, 18.04, 18.05, 18.06.
 * - showLoanAmount: false for 18.04/05/06 (amount is formula-driven from LHC commitment)
 * - Annual Payment is a formula cell (=+M###) — not shown
 */
function StandardLoanFields({ prefix, showLoanType = false, showLoanAmount = true, loanAmountNote, values, setValues, onBlur, handleSave }: {
  prefix: string
  showLoanType?: boolean
  showLoanAmount?: boolean
  loanAmountNote?: string
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (k: string, v: string) => void
  handleSave: (k: string, v: string) => void
}) {
  const p = prefix
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {showLoanType && (
        <Field label="Loan Type">
          <SelectInput fk={`${p}_loan_type`} opts={LOAN_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
        </Field>
      )}
      <Field label="Description">
        <TextInput fk={`${p}_description`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      {showLoanAmount ? (
        <Field label="Loan Amount ($)">
          <TextInput fk={`${p}_loan_amount`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 5000000" />
        </Field>
      ) : loanAmountNote ? (
        <div className="sm:col-span-1">
          <p className="text-xs text-muted-foreground mt-1 rounded-lg px-3 py-2 bg-muted/50">{loanAmountNote}</p>
        </div>
      ) : null}
      <Field label="Lender">
        <TextInput fk={`${p}_lender`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Lender is">
        <SelectInput fk={`${p}_lender_is`} opts={LENDER_IS_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Interest Rate (%)">
        <TextInput fk={`${p}_interest_rate`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 5.25" />
      </Field>
      <Field label="Fixed or Floating Rate">
        <SelectInput fk={`${p}_fixed_floating`} opts={FIXED_FLOAT_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Amortization Term">
        <NumberInput fk={`${p}_amort_term`} values={values} setValues={setValues} onBlur={onBlur} suffix="months" />
      </Field>
      <Field label="Maturity Term">
        <NumberInput fk={`${p}_maturity_term`} values={values} setValues={setValues} onBlur={onBlur} suffix="months" />
      </Field>
      <Field label="Mortgage Insurance Premium (%)">
        <TextInput fk={`${p}_mtg_ins_premium`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 0.65" />
      </Field>
      <Field label="Type of Payment">
        <SelectInput fk={`${p}_payment_type`} opts={PAYMENT_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Payment Requirement">
        <SelectInput fk={`${p}_payment_req`} opts={PAYMENT_REQ_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <div className="col-span-full">
        <Field label="Comment">
          <TextArea fk={`${p}_comment`} values={values} setValues={setValues} onBlur={onBlur} />
        </Field>
      </div>
    </div>
  )
}

/**
 * Extended fields for existing/new mortgage loans (18.02, 18.03).
 * Removed formula cells: Annual Payment (=+M###),
 * Amortization Remaining (=IFERROR(+G*12,"")), Maturity Remaining (=IFERROR(+E-O*12,"")).
 */
function ExistingLoanFields({ prefix, values, setValues, onBlur, handleSave }: {
  prefix: string
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (k: string, v: string) => void
  handleSave: (k: string, v: string) => void
}) {
  const p = prefix
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Description">
        <TextInput fk={`${p}_description`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Original Loan Amount ($)">
        <TextInput fk={`${p}_original_amount`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Origination Date">
        <input type="date" className={inputCls} value={values[`${p}_origination_date`] ?? ''}
          onChange={e => setValues(v => ({ ...v, [`${p}_origination_date`]: e.target.value }))}
          onBlur={e => onBlur(`${p}_origination_date`, e.target.value)} />
      </Field>
      <Field label="Estimated Balance ($)">
        <TextInput fk={`${p}_est_balance`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Lender">
        <TextInput fk={`${p}_lender`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Loan Type">
        <SelectInput fk={`${p}_loan_type`} opts={LOAN_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Loan Servicer">
        <TextInput fk={`${p}_loan_servicer`} values={values} setValues={setValues} onBlur={onBlur} />
      </Field>
      <Field label="Prepayment Penalty?">
        <SelectInput fk={`${p}_prepayment_penalty`} opts={['Yes', 'No', 'Missing']} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Lock Out Date?">
        <input type="date" className={inputCls} value={values[`${p}_lockout_date`] ?? ''}
          onChange={e => setValues(v => ({ ...v, [`${p}_lockout_date`]: e.target.value }))}
          onBlur={e => onBlur(`${p}_lockout_date`, e.target.value)} />
      </Field>
      <Field label="Lender is">
        <SelectInput fk={`${p}_lender_is`} opts={LENDER_IS_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Interest Rate (%)">
        <TextInput fk={`${p}_interest_rate`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 5.25" />
      </Field>
      <Field label="Fixed or Floating Rate">
        <SelectInput fk={`${p}_fixed_floating`} opts={FIXED_FLOAT_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Amortization End Date">
        <input type="date" className={inputCls} value={values[`${p}_amort_end_date`] ?? ''}
          onChange={e => setValues(v => ({ ...v, [`${p}_amort_end_date`]: e.target.value }))}
          onBlur={e => onBlur(`${p}_amort_end_date`, e.target.value)} />
      </Field>
      <Field label="Amortization Term">
        <NumberInput fk={`${p}_amort_term`} values={values} setValues={setValues} onBlur={onBlur} suffix="months" />
      </Field>
      <Field label="Maturity Date">
        <input type="date" className={inputCls} value={values[`${p}_maturity_date`] ?? ''}
          onChange={e => setValues(v => ({ ...v, [`${p}_maturity_date`]: e.target.value }))}
          onBlur={e => onBlur(`${p}_maturity_date`, e.target.value)} />
      </Field>
      <Field label="Mortgage Insurance Premium (%)">
        <TextInput fk={`${p}_mtg_ins_premium`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 0.65" />
      </Field>
      <Field label="Type of Payment">
        <SelectInput fk={`${p}_payment_type`} opts={PAYMENT_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <Field label="Payment Requirement">
        <SelectInput fk={`${p}_payment_req`} opts={PAYMENT_REQ_OPTS} values={values} setValues={setValues} onSave={handleSave} />
      </Field>
      <div className="col-span-full">
        <Field label="Comment">
          <TextArea fk={`${p}_comment`} values={values} setValues={setValues} onBlur={onBlur} />
        </Field>
      </div>
    </div>
  )
}

// ─── Funding source card wrapper ──────────────────────────────────────────────

function FundingSourceCard({ id, title, subtitle, values, setValues, onToggle, children }: {
  id: string; title: string; subtitle?: string
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onToggle: (k: string, v: string) => void
  children: React.ReactNode
}) {
  const activeKey = `${id}_active`
  const isYes = values[activeKey] === 'Yes'
  const isNo  = values[activeKey] === 'No'

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-card">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button"
              onClick={() => onToggle(activeKey, opt)}
              className={values[activeKey] === opt ? activeBtn : inactiveBtn}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {isYes && (
        <div className="px-4 py-4 border-t border-border/50 space-y-3 bg-card">
          {children}
        </div>
      )}
      {!isYes && !isNo && <div />}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function Section18Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_18', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const onBlur = (k: string, v: string) => save(k, v)
  const handleSave = (k: string, v: string) => save(k, v)
  function handleToggle(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }))
    save(k, v)
  }

  const shared = { values, setValues, onBlur, handleSave }

  // Alert helpers
  const ddfAmount    = parseFloat(values.s18_07_amount ?? '0') || 0
  const stateEquity  = parseFloat(values.s18_09_equity_amount ?? '0') || 0
  const stateCredits = parseFloat(values.s18_09_credits_amount ?? '0') || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Permanent Sources of Funds</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50">
        For each funding source, indicate whether it applies to this project. Select <strong>Yes</strong> to
        expand and enter details, or <strong>No</strong> to mark it as not applicable.
      </p>

      {/* ── 18.01 New LHC Risk Sharing First Mortgage ───────────────────────── */}
      <FundingSourceCard id="s18_01" title="18.01 — New LHC Risk Sharing First Mortgage Loan"
        subtitle="LHC first mortgage with government risk sharing"
        {...{ values, setValues, onToggle: handleToggle }}>
        <StandardLoanFields prefix="s18_01" {...shared} />
      </FundingSourceCard>

      {/* ── 18.02 Existing or New First Mortgage ────────────────────────────── */}
      <FundingSourceCard id="s18_02" title="18.02 — Existing or New First Mortgage Loan"
        subtitle="Non-LHC first mortgage (conventional, FHA, USDA, etc.)"
        {...{ values, setValues, onToggle: handleToggle }}>
        <ExistingLoanFields prefix="s18_02" {...shared} />
      </FundingSourceCard>

      {/* ── 18.03 Existing or New Second Mortgage ───────────────────────────── */}
      <FundingSourceCard id="s18_03" title="18.03 — Existing or New Second Mortgage Loan"
        subtitle="Non-LHC second mortgage"
        {...{ values, setValues, onToggle: handleToggle }}>
        <ExistingLoanFields prefix="s18_03" {...shared} />
      </FundingSourceCard>

      {/* ── 18.04 HOME Loan from LHC ─────────────────────────────────────────── */}
      <FundingSourceCard id="s18_04" title="18.04 — HOME Loan from LHC"
        subtitle="HOME Investment Partnership Program funds"
        {...{ values, setValues, onToggle: handleToggle }}>
        <StandardLoanFields prefix="s18_04" showLoanType showLoanAmount={false}
          loanAmountNote="Loan amount is auto-calculated from the LHC HOME funding commitment."
          {...shared} />
      </FundingSourceCard>

      {/* ── 18.05 NHTF Loan from LHC ─────────────────────────────────────────── */}
      <FundingSourceCard id="s18_05" title="18.05 — NHTF Loan from LHC"
        subtitle="National Housing Trust Fund"
        {...{ values, setValues, onToggle: handleToggle }}>
        <StandardLoanFields prefix="s18_05" showLoanType showLoanAmount={false}
          loanAmountNote="Loan amount is auto-calculated from the LHC NHTF funding commitment."
          {...shared} />
      </FundingSourceCard>

      {/* ── 18.06 CDBG-DR Loan ───────────────────────────────────────────────── */}
      <FundingSourceCard id="s18_06" title="18.06 — CDBG-DR Loan from LHC or OCD"
        subtitle="CDBG Disaster Recovery gap financing"
        {...{ values, setValues, onToggle: handleToggle }}>
        <StandardLoanFields prefix="s18_06" showLoanType showLoanAmount={false}
          loanAmountNote="Loan amount is auto-calculated from the LHC CDBG-DR funding commitment."
          {...shared} />
      </FundingSourceCard>

      {/* ── 18.07 Deferred Developer Fee ─────────────────────────────────────── */}
      <FundingSourceCard id="s18_07" title="18.07 — Deferred Developer Fee"
        subtitle="Portion of developer fee deferred as soft equity"
        {...{ values, setValues, onToggle: handleToggle }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount ($)">
            <TextInput fk="s18_07_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 1000000" />
          </Field>
          <div className="col-span-full">
            <Field label="Comment">
              <TextArea fk="s18_07_comment" values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
          </div>
        </div>
        {ddfAmount > 0 && (
          <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
            The Checklist will include an information request regarding the Deferred Developer Fee.
          </p>
        )}
      </FundingSourceCard>

      {/* ── 18.08 Federal Historic Tax Credits ───────────────────────────────── */}
      <FundingSourceCard id="s18_08" title="18.08 — Federal Historic Tax Credits and Equity"
        subtitle="Federal HTC equity proceeds"
        {...{ values, setValues, onToggle: handleToggle }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount of Equity ($)">
            <TextInput fk="s18_08_equity_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 2000000" />
          </Field>
          <Field label="Amount of Credits ($)">
            <TextInput fk="s18_08_credits_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 2500000" />
          </Field>
          <div className="col-span-full">
            <Field label="Comment">
              <TextArea fk="s18_08_comment" values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
          </div>
        </div>
      </FundingSourceCard>

      {/* ── 18.09 State Historic Tax Credits ─────────────────────────────────── */}
      <FundingSourceCard id="s18_09" title="18.09 — State Historic Tax Credits and Equity"
        subtitle="Louisiana state HTC equity proceeds"
        {...{ values, setValues, onToggle: handleToggle }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount of Equity ($)">
            <TextInput fk="s18_09_equity_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 500000" />
          </Field>
          <Field label="Amount of Credits ($)">
            <TextInput fk="s18_09_credits_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 625000" />
          </Field>
          <div className="col-span-full">
            <Field label="Comment">
              <TextArea fk="s18_09_comment" values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
          </div>
        </div>
        {(stateEquity > 0 || stateCredits > 0) && (
          <p className="text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
            Explain who will receive the state credits in the comment field above.
          </p>
        )}
      </FundingSourceCard>

      {/* ── 18.10 Estimated LIHTC Equity Proceeds ────────────────────────────── */}
      <FundingSourceCard id="s18_10" title="18.10 — Estimated LIHTC Equity Proceeds"
        subtitle="4% or 9% LIHTC equity from investor"
        {...{ values, setValues, onToggle: handleToggle }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount ($)">
            <TextInput fk="s18_10_amount" values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 8000000" />
          </Field>
        </div>
      </FundingSourceCard>

      {/* ── 18.11–18.13 Donated Amounts ──────────────────────────────────────── */}
      {([11, 12, 13] as const).map(n => (
        <FundingSourceCard key={n} id={`s18_${n}`}
          title={`18.${n} — Donated Amount #${n - 10}`}
          subtitle="In-kind donation, land value, reduced taxes, etc."
          {...{ values, setValues, onToggle: handleToggle }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Donation Type">
              <SelectInput fk={`s18_${n}_donation_type`} opts={DONATION_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Description">
              <TextInput fk={`s18_${n}_description`} values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
            <Field label="Amount ($)">
              <TextInput fk={`s18_${n}_amount`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 500000" />
            </Field>
            <div className="col-span-full">
              <Field label="Comment">
                <TextArea fk={`s18_${n}_comment`} values={values} setValues={setValues} onBlur={onBlur} />
              </Field>
            </div>
          </div>
        </FundingSourceCard>
      ))}

      {/* ── 18.14–18.16 Other Permanent Sources ──────────────────────────────── */}
      {([14, 15, 16] as const).map(n => (
        <FundingSourceCard key={n} id={`s18_${n}`}
          title={`18.${n} — Other Permanent Source #${n - 13}`}
          subtitle="Other debt, grant, equity, or soft financing"
          {...{ values, setValues, onToggle: handleToggle }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Description">
              <TextInput fk={`s18_${n}_description`} values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
            <Field label="Type of Funding">
              <SelectInput fk={`s18_${n}_funding_type`} opts={FUNDING_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Federal Grant?">
              <SelectInput fk={`s18_${n}_federal_grant`} opts={['Yes', 'No', 'Missing']} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Funding Amount ($)">
              <TextInput fk={`s18_${n}_funding_amount`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 1000000" />
            </Field>
            <Field label="Lender">
              <TextInput fk={`s18_${n}_lender`} values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
            <Field label="Lender is">
              <SelectInput fk={`s18_${n}_lender_is`} opts={LENDER_IS_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Interest Rate (%)">
              <TextInput fk={`s18_${n}_interest_rate`} values={values} setValues={setValues} onBlur={onBlur} placeholder="e.g. 0.00" />
            </Field>
            <Field label="Fixed or Floating Rate">
              <SelectInput fk={`s18_${n}_fixed_floating`} opts={FIXED_FLOAT_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Amortization Term">
              <NumberInput fk={`s18_${n}_amort_term`} values={values} setValues={setValues} onBlur={onBlur} suffix="months" />
            </Field>
            <Field label="Maturity Term">
              <NumberInput fk={`s18_${n}_maturity_term`} values={values} setValues={setValues} onBlur={onBlur} suffix="months" />
            </Field>
            <Field label="Mortgage Insurance Premium (%)">
              <TextInput fk={`s18_${n}_mtg_ins_premium`} values={values} setValues={setValues} onBlur={onBlur} />
            </Field>
            <Field label="Type of Payment">
              <SelectInput fk={`s18_${n}_payment_type`} opts={PAYMENT_TYPE_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <Field label="Payment Requirement">
              <SelectInput fk={`s18_${n}_payment_req`} opts={PAYMENT_REQ_OPTS} values={values} setValues={setValues} onSave={handleSave} />
            </Field>
            <div className="col-span-full">
              <Field label="Comment">
                <TextArea fk={`s18_${n}_comment`} values={values} setValues={setValues} onBlur={onBlur} />
              </Field>
            </div>
          </div>
        </FundingSourceCard>
      ))}
    </div>
  )
}
