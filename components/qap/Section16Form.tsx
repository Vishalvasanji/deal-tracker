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

// ─── Date helpers ────────────────────────────────────────────────────────────

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

function parseDays(s: string): number {
  const n = parseInt(s, 10)
  return isNaN(n) ? 0 : n
}

function fmt(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A milestone row where the user enters a number of days */
function MilestoneInput({
  label,
  fieldKey,
  computedDate,
  fromLabel,
  values,
  setValues,
  onBlur,
}: {
  label: string
  fieldKey: string
  computedDate: Date | null
  fromLabel: string
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBlur: (key: string, val: string) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={-9999}
          className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
          value={values[fieldKey] ?? ''}
          placeholder="0"
          title={`Days from ${fromLabel}`}
          onChange={e => setValues(v => ({ ...v, [fieldKey]: e.target.value }))}
          onBlur={e => onBlur(fieldKey, e.target.value)}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
      </div>
      <span className="text-xs font-medium text-foreground w-28 text-right tabular-nums">
        {fmt(computedDate)}
      </span>
    </div>
  )
}

/** A read-only formula-derived row */
function MilestoneAuto({
  label,
  computedDate,
  formula,
}: {
  label: string
  computedDate: Date | null
  formula: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground leading-tight">{label}</span>
      <span className="text-xs text-muted-foreground italic whitespace-nowrap">{formula}</span>
      <span className="text-xs font-medium text-foreground w-28 text-right tabular-nums">
        {fmt(computedDate)}
      </span>
    </div>
  )
}

/** Column header for the schedule table */
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

  function handleSelect(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  // ── Compute all dates from the stored day offsets ─────────────────────────

  const anchor           = parseDate(values.s16_anchor_date)          // Option/Contract

  const siteAcq          = anchor        ? addDays(anchor,       parseDays(values.s16_site_acq_days))         : null
  const zoning           = siteAcq       ? addDays(siteAcq,      parseDays(values.s16_zoning_days))           : null
  const siteAnalysis     = zoning        ? addDays(zoning,       parseDays(values.s16_site_analysis_days))    : null
  const envClearance     = siteAnalysis  ? addDays(siteAnalysis, parseDays(values.s16_env_clearance_days))   : null

  const clApp            = envClearance  ? addDays(envClearance, parseDays(values.s16_cl_app_days))           : null
  const clConditional    = clApp         ? addDays(clApp,        30)                                          : null  // auto: +30
  const clFirm           = clConditional ? addDays(clConditional, parseDays(values.s16_cl_firm_days))         : null

  const plApp            = clFirm        ? addDays(clFirm,       -120)                                        : null  // auto: -120
  const plConditional    = clFirm        ? addDays(clFirm,       -60)                                         : null  // auto: -60
  const plFirm           = clFirm        ? addDays(clFirm,       parseDays(values.s16_pl_firm_days))          : null

  const plansSpecs       = plFirm        ? addDays(plFirm,       parseDays(values.s16_plans_specs_days))      : null
  const initialClosing   = plansSpecs    ? addDays(plansSpecs,   parseDays(values.s16_initial_closing_days))  : null
  const constrStart      = initialClosing? addDays(initialClosing, parseDays(values.s16_constr_start_days))  : null

  // All remaining: formula-derived from constrStart / completion
  const complete10       = constrStart   ? addDays(constrStart,  90)                                          : null
  const complete50       = constrStart   ? addDays(constrStart,  240)                                         : null
  const complete90       = constrStart   ? addDays(constrStart,  420)                                         : null
  const completion       = constrStart   ? addDays(constrStart,  540)                                         : null
  const certOcc          = completion    ? addDays(completion,   14)                                          : null
  const pisFirst         = constrStart   ? addDays(constrStart,  240)                                         : null  // same as 50%
  const pisFinal         = completion                                                                          // same as completion
  const occ10pct         = pisFirst      ? addDays(pisFirst,     30)                                          : null
  const finalClosing     = completion    ? addDays(completion,   720)                                         : null  // 24 * 30

  const sharedProps = { values, setValues, onBlur: handleBlur }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Project Schedule</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Enter each milestone as a number of days from the previous milestone. The estimated date
        is calculated automatically. Milestones shaded in grey are formula-derived and update
        automatically when their anchor changes.
      </p>

      {/* ── A. SITE ─────────────────────────────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>A. Site</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30">
            <TableHeader />
          </div>
          <div className="px-4">
            {/* Anchor: date picker */}
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

            <MilestoneInput label="Site Acquisition"       fieldKey="s16_site_acq_days"       computedDate={siteAcq}      fromLabel="Option/Contract"         {...sharedProps} />
            <MilestoneInput label="Zoning Approval"        fieldKey="s16_zoning_days"          computedDate={zoning}       fromLabel="Site Acquisition"        {...sharedProps} />
            <MilestoneInput label="Site Analysis"          fieldKey="s16_site_analysis_days"   computedDate={siteAnalysis} fromLabel="Zoning Approval"         {...sharedProps} />
            <MilestoneInput label="Environmental Clearance" fieldKey="s16_env_clearance_days"  computedDate={envClearance} fromLabel="Site Analysis"           {...sharedProps} />
          </div>
        </div>
      </div>

      {/* ── B. FINANCING ────────────────────────────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>B. Financing — Construction Loan</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30">
            <TableHeader />
          </div>
          <div className="px-4">
            <MilestoneInput  label="Loan Application"          fieldKey="s16_cl_app_days"   computedDate={clApp}         fromLabel="Environmental Clearance" {...sharedProps} />
            <MilestoneAuto   label="Conditional Commitment"    computedDate={clConditional}  formula="App. + 30 days" />
            <MilestoneInput  label="Firm Commitment"           fieldKey="s16_cl_firm_days"  computedDate={clFirm}        fromLabel="Conditional Commitment"  {...sharedProps} />
          </div>
        </div>
      </div>

      <div>
        <p className={sectionHeaderCls}>B. Financing — Permanent Loan</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30">
            <TableHeader />
          </div>
          <div className="px-4">
            <MilestoneAuto   label="Loan Application"          computedDate={plApp}          formula="Firm − 120 days" />
            <MilestoneAuto   label="Conditional Commitment"    computedDate={plConditional}  formula="Firm − 60 days" />
            <MilestoneInput  label="Firm Commitment"           fieldKey="s16_pl_firm_days"  computedDate={plFirm}        fromLabel="Construction Loan Firm"  {...sharedProps} />
          </div>
        </div>
      </div>

      {/* ── Other Loans / Grants (optional, date pickers) ────────────────── */}
      {[1, 2, 3].map(n => (
        <div key={n}>
          <p className={sectionHeaderCls}>B. Financing — Other Loans / Grants #{n} <span className="normal-case font-normal text-muted-foreground">(optional)</span></p>
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

      {/* ── C–E (main construction milestones) ──────────────────────────────── */}
      <div>
        <p className={sectionHeaderCls}>C – E. Plans, Closing &amp; Construction</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30">
            <TableHeader />
          </div>
          <div className="px-4">
            <MilestoneInput label="C. Plans and Specs / Working Drawings" fieldKey="s16_plans_specs_days"    computedDate={plansSpecs}     fromLabel="Perm. Loan Firm Commitment" {...sharedProps} />
            <MilestoneInput label="D. Initial Closing / Transfer of Property" fieldKey="s16_initial_closing_days" computedDate={initialClosing} fromLabel="Plans and Specs"        {...sharedProps} />
            <MilestoneInput label="E. Construction Start"                  fieldKey="s16_constr_start_days"  computedDate={constrStart}    fromLabel="Initial Closing"            {...sharedProps} />
          </div>
        </div>
      </div>

      {/* ── F–K (all auto-calculated from Construction Start / Completion) ── */}
      <div>
        <p className={sectionHeaderCls}>F – K. Construction &amp; Completion (auto-calculated)</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30">
            <TableHeader />
          </div>
          <div className="px-4 bg-muted/10">
            <MilestoneAuto label="10% Construction Complete"              computedDate={complete10}   formula="Start + 90 days"    />
            <MilestoneAuto label="50% Construction Complete"              computedDate={complete50}   formula="Start + 240 days"   />
            <MilestoneAuto label="90% Construction Complete"              computedDate={complete90}   formula="Start + 420 days"   />
            <MilestoneAuto label="F. Completion Date"                     computedDate={completion}   formula="Start + 540 days"   />
            <MilestoneAuto label="G. Certificate of Occupancy"            computedDate={certOcc}      formula="Completion + 14 days" />
            <MilestoneAuto label="H. Placed in Service (First Building)"  computedDate={pisFirst}     formula="Start + 240 days"   />
            <MilestoneAuto label="I. Placed in Service (Final Building)"  computedDate={pisFinal}     formula="= Completion"       />
            <MilestoneAuto label="J. 10% of Unit Occupancy Achieved"      computedDate={occ10pct}     formula="First PIS + 30 days" />
            <MilestoneAuto label="K. Final Closing (All Permanent Fin.)"  computedDate={finalClosing} formula="Completion + 720 days" />
          </div>
        </div>
      </div>

      {/* ── Comment ─────────────────────────────────────────────────────────── */}
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
