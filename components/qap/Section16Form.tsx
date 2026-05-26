'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-4 pb-1'
const labelCls = 'block text-sm font-medium text-foreground mb-1'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function parseDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function parseDays(s: string): number | null {
  if (!s?.trim()) return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function fmt(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function compute(base: Date | null, days: string): Date | null {
  const d = parseDays(days)
  return base !== null && d !== null ? addDays(base, d) : null
}

// ─── Milestone row ────────────────────────────────────────────────────────────

function MilestoneInput({
  label,
  fieldKey,
  computedDate,
  fromLabel,
  placeholder,
  values,
  setValues,
  onBlur,
}: {
  label: string
  fieldKey: string
  computedDate: Date | null
  fromLabel: string
  placeholder?: string
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (key: string, val: string) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground leading-tight block">{label}</span>
        <span className="text-xs text-muted-foreground">from {fromLabel}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
          value={values[fieldKey] ?? ''}
          placeholder={placeholder ?? ''}
          onChange={e => setValues(v => ({ ...v, [fieldKey]: e.target.value }))}
          onBlur={e => onBlur(fieldKey, e.target.value)}
        />
        <span className="text-xs text-muted-foreground">days</span>
      </div>
      <span className="text-xs font-medium text-foreground w-28 text-right tabular-nums">
        {fmt(computedDate)}
      </span>
    </div>
  )
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 pb-1 border-b-2 border-border">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Milestone</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[90px] text-right">Days offset</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28 text-right">Est. Date</span>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function Section16Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_16', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  // ── Compute all dates ────────────────────────────────────────────────────────

  const anchor        = parseDate(values.s16_anchor_date)

  const siteAcq       = compute(anchor,       values.s16_site_acq_days)
  const zoning        = compute(siteAcq,      values.s16_zoning_days)
  const siteAnalysis  = compute(zoning,       values.s16_site_analysis_days)
  const envClearance  = compute(siteAnalysis, values.s16_env_clearance_days)

  // Construction loan: App → Conditional → Firm (all user-input)
  const clApp         = compute(envClearance,  values.s16_cl_app_days)
  const clConditional = compute(clApp,         values.s16_cl_conditional_days)
  const clFirm        = compute(clConditional, values.s16_cl_firm_days)

  // Permanent loan: App → Conditional → Firm (sequential from CL Firm)
  const plApp         = compute(clFirm,        values.s16_pl_app_days)
  const plConditional = compute(plApp,         values.s16_pl_conditional_days)
  const plFirm        = compute(plConditional, values.s16_pl_firm_days)

  // Main milestones: Plans/Specs → Initial Closing → Construction Start
  const plansSpecs    = compute(plFirm,        values.s16_plans_specs_days)
  const initialClose  = compute(plansSpecs,    values.s16_initial_closing_days)
  const constrStart   = compute(initialClose,  values.s16_constr_start_days)

  // Construction phases: all offset from Construction Start
  const complete10    = compute(constrStart,   values.s16_complete_10_days)
  const complete50    = compute(constrStart,   values.s16_complete_50_days)
  const complete90    = compute(constrStart,   values.s16_complete_90_days)
  const completion    = compute(constrStart,   values.s16_completion_days)

  // Post-completion: offset from Completion
  const certOcc       = compute(completion,    values.s16_cert_occ_days)
  const pisFinal      = compute(completion,    values.s16_pis_final_days)
  const finalClosing  = compute(completion,    values.s16_final_closing_days)

  // PIS First: offset from Construction Start (same anchor as % complete milestones)
  const pisFirst      = compute(constrStart,   values.s16_pis_first_days)

  // 10% Occupancy: offset from PIS First
  const occ10pct      = compute(pisFirst,      values.s16_occ_10pct_days)

  const shared = { values, setValues, onBlur: handleBlur }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Project Schedule</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Enter the Option/Contract date as your starting point, then enter the number of days
        between each milestone. Estimated dates update automatically as you type.
      </p>

      {/* ── A. SITE ──────────────────────────────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>A. Site</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30"><TableHeader /></div>
          <div className="px-4">
            {/* Anchor date picker */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5 border-b border-border/40">
              <label className="text-sm font-medium text-foreground">
                Option / Contract <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  className="rounded-lg border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={values.s16_anchor_date ?? ''}
                  onChange={e => setValues(v => ({ ...v, s16_anchor_date: e.target.value }))}
                  onBlur={e => handleBlur('s16_anchor_date', e.target.value)}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-28 text-right tabular-nums">
                {fmt(anchor)}
              </span>
            </div>

            <MilestoneInput label="Site Acquisition"        fieldKey="s16_site_acq_days"       computedDate={siteAcq}      fromLabel="Option/Contract"       {...shared} />
            <MilestoneInput label="Zoning Approval"         fieldKey="s16_zoning_days"          computedDate={zoning}       fromLabel="Site Acquisition"      {...shared} />
            <MilestoneInput label="Site Analysis"           fieldKey="s16_site_analysis_days"   computedDate={siteAnalysis} fromLabel="Zoning Approval"       {...shared} />
            <MilestoneInput label="Environmental Clearance" fieldKey="s16_env_clearance_days"   computedDate={envClearance} fromLabel="Site Analysis"         {...shared} />
          </div>
        </div>
      </div>

      {/* ── B. FINANCING — Construction Loan ─────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>B. Financing — Construction Loan</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30"><TableHeader /></div>
          <div className="px-4">
            <MilestoneInput label="Loan Application"       fieldKey="s16_cl_app_days"          computedDate={clApp}         fromLabel="Env. Clearance"        placeholder="0"  {...shared} />
            <MilestoneInput label="Conditional Commitment" fieldKey="s16_cl_conditional_days"  computedDate={clConditional} fromLabel="Loan Application"      placeholder="30" {...shared} />
            <MilestoneInput label="Firm Commitment"        fieldKey="s16_cl_firm_days"         computedDate={clFirm}        fromLabel="Conditional Commitment" placeholder="21" {...shared} />
          </div>
        </div>
      </div>

      {/* ── B. FINANCING — Permanent Loan ────────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>B. Financing — Permanent Loan</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30"><TableHeader /></div>
          <div className="px-4">
            <MilestoneInput label="Loan Application"       fieldKey="s16_pl_app_days"          computedDate={plApp}         fromLabel="CL Firm Commitment"    {...shared} />
            <MilestoneInput label="Conditional Commitment" fieldKey="s16_pl_conditional_days"  computedDate={plConditional} fromLabel="PL Loan Application"   placeholder="60" {...shared} />
            <MilestoneInput label="Firm Commitment"        fieldKey="s16_pl_firm_days"         computedDate={plFirm}        fromLabel="PL Conditional Commit." placeholder="60" {...shared} />
          </div>
        </div>
      </div>

      {/* ── Other Loans / Grants (optional, date pickers) ─────────────────────── */}
      {[1, 2, 3].map(n => (
        <div key={n}>
          <p className={sectionHeaderCls}>
            B. Financing — Other Loans / Grants #{n}{' '}
            <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </p>
          <div className="space-y-3 rounded-xl border border-border px-4 py-4">
            <div>
              <label className={labelCls}>Type and Source</label>
              <input
                className={inputCls}
                value={values[`s16_other${n}_type`] ?? ''}
                placeholder="e.g. HOME loan from LHC"
                onChange={e => setValues(v => ({ ...v, [`s16_other${n}_type`]: e.target.value }))}
                onBlur={e => handleBlur(`s16_other${n}_type`, e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Application Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={values[`s16_other${n}_app_date`] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [`s16_other${n}_app_date`]: e.target.value }))}
                  onBlur={e => handleBlur(`s16_other${n}_app_date`, e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Award Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={values[`s16_other${n}_award_date`] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [`s16_other${n}_award_date`]: e.target.value }))}
                  onBlur={e => handleBlur(`s16_other${n}_award_date`, e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── C–E. Plans, Closing & Construction ───────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>C – E. Plans, Closing &amp; Construction</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30"><TableHeader /></div>
          <div className="px-4">
            <MilestoneInput label="C. Plans and Specs / Working Drawings"  fieldKey="s16_plans_specs_days"    computedDate={plansSpecs}   fromLabel="PL Firm Commitment"  {...shared} />
            <MilestoneInput label="D. Initial Closing / Transfer of Property" fieldKey="s16_initial_closing_days" computedDate={initialClose} fromLabel="Plans and Specs"     {...shared} />
            <MilestoneInput label="E. Construction Start"                   fieldKey="s16_constr_start_days"  computedDate={constrStart}  fromLabel="Initial Closing"     {...shared} />
          </div>
        </div>
      </div>

      {/* ── F–K. Construction & Completion ────────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>F – K. Construction &amp; Completion</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30"><TableHeader /></div>
          <div className="px-4">
            <MilestoneInput label="10% Construction Complete"             fieldKey="s16_complete_10_days"  computedDate={complete10}  fromLabel="Construction Start" placeholder="90"  {...shared} />
            <MilestoneInput label="50% Construction Complete"             fieldKey="s16_complete_50_days"  computedDate={complete50}  fromLabel="Construction Start" placeholder="240" {...shared} />
            <MilestoneInput label="90% Construction Complete"             fieldKey="s16_complete_90_days"  computedDate={complete90}  fromLabel="Construction Start" placeholder="420" {...shared} />
            <MilestoneInput label="F. Completion Date"                    fieldKey="s16_completion_days"   computedDate={completion}  fromLabel="Construction Start" placeholder="540" {...shared} />
            <MilestoneInput label="G. Certificate of Occupancy"           fieldKey="s16_cert_occ_days"     computedDate={certOcc}     fromLabel="Completion Date"    placeholder="14"  {...shared} />
            <MilestoneInput label="H. Placed in Service (First Building)" fieldKey="s16_pis_first_days"    computedDate={pisFirst}    fromLabel="Construction Start" placeholder="240" {...shared} />
            <MilestoneInput label="I. Placed in Service (Final Building)" fieldKey="s16_pis_final_days"    computedDate={pisFinal}    fromLabel="Completion Date"    placeholder="0"   {...shared} />
            <MilestoneInput label="J. 10% of Unit Occupancy Achieved"     fieldKey="s16_occ_10pct_days"    computedDate={occ10pct}    fromLabel="PIS First Building" placeholder="30"  {...shared} />
            <MilestoneInput label="K. Final Closing (All Permanent Fin.)" fieldKey="s16_final_closing_days" computedDate={finalClosing} fromLabel="Completion Date"   placeholder="720" {...shared} />
          </div>
        </div>
      </div>

      {/* ── Comment ──────────────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Applicant comment regarding Project Schedule</label>
        <textarea
          className={inputCls + ' min-h-[80px] resize-y'}
          value={values.s16_comment ?? ''}
          onChange={e => setValues(v => ({ ...v, s16_comment: e.target.value }))}
          onBlur={e => handleBlur('s16_comment', e.target.value)}
        />
      </div>
    </div>
  )
}
