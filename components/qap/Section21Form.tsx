'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const STATUS_OPTS = ['Not Started', 'In Process', 'Completed']

// Checklist items for 21.01–21.10 (excluding 21.03 which is formula-driven set-aside info
// and 21.04 which is the sqft section handled separately below)
const CHECKLIST_ITEMS: Array<{ fk: string; section: string; label: string }> = [
  { fk: 's21_01_status', section: '21.01', label: 'Complete Section 23 below (information for rent limits)' },
  { fk: 's21_02_status', section: '21.02', label: 'Complete the Unit Mix and Rents worksheet' },
  { fk: 's21_05_status', section: '21.05', label: 'Complete the Development Costs worksheet' },
  { fk: 's21_06_status', section: '21.06', label: 'Adjust any profit / fee amounts that exceed LHC limits' },
  { fk: 's21_07_status', section: '21.07', label: 'Complete the Syndication Certification worksheet' },
  { fk: 's21_08_status', section: '21.08', label: 'Complete the Basis Calculation worksheet' },
  { fk: 's21_09_status', section: '21.09', label: 'Complete the Revenues and Expenses worksheet' },
  { fk: 's21_10_status', section: '21.10', label: 'Complete the Developer Experience and Management Experience worksheets' },
]

function StatusIcon({ status }: { status: string }) {
  if (status === 'Completed')
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  if (status === 'In Process')
    return <Clock className="h-4 w-4 text-amber-500 shrink-0" />
  return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
}

export function Section21Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_21', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleSelect(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }))
    save(k, v)
  }

  function handleBlur(k: string, v: string) { save(k, v) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Complete Remaining Key Worksheets for Underwriting</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      <p className={noteCls}>
        Track completion status for each required worksheet. Mark each item as the work progresses.
        Until all items are marked <strong>Complete</strong>, the underwriting model cannot be finalized.
      </p>

      {/* ── Checklist items 21.01–21.10 ──────────────────────────────────────── */}
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(item => (
          <div key={item.fk} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-card">
            <StatusIcon status={values[item.fk] ?? ''} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground mr-2">{item.section}</span>
              <span className="text-sm text-foreground">{item.label}</span>
            </div>
            <select
              className="rounded-lg border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
              value={values[item.fk] ?? ''}
              onChange={e => handleSelect(item.fk, e.target.value)}>
              <option value="">Select…</option>
              {STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* ── 21.04 Total Project Square Footage ───────────────────────────────── */}
      <div className="space-y-3">
        <p className={subHeaderCls}>21.04 Total Project Square Footage</p>
        <p className={noteCls}>
          Residential and staff unit square footage are pulled from the Unit Mix worksheet.
          Enter the remaining square footage components below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Community Facilities / Common Areas (sqft)</label>
            <input type="number" className={inputCls} value={values.s21_04_community_fac_sqft ?? ''}
              placeholder="e.g. 2000"
              onChange={e => setValues(v => ({ ...v, s21_04_community_fac_sqft: e.target.value }))}
              onBlur={e => handleBlur('s21_04_community_fac_sqft', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Community Service Facility (sqft)</label>
            <input type="number" className={inputCls} value={values.s21_04_community_svc_sqft ?? ''}
              placeholder="e.g. 0"
              onChange={e => setValues(v => ({ ...v, s21_04_community_svc_sqft: e.target.value }))}
              onBlur={e => handleBlur('s21_04_community_svc_sqft', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Other sqft (e.g. common hallways)</label>
            <input type="number" className={inputCls} value={values.s21_04_other_sqft ?? ''}
              placeholder="e.g. 500"
              onChange={e => setValues(v => ({ ...v, s21_04_other_sqft: e.target.value }))}
              onBlur={e => handleBlur('s21_04_other_sqft', e.target.value)} />
            {(parseFloat(values.s21_04_other_sqft ?? '') || 0) > 0 && (
              <p className="text-[11px] text-amber-600 mt-1">Explain the &ldquo;Other&rdquo; square footage in the comment below.</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Comment</label>
          <textarea className={inputCls + ' min-h-[80px] resize-y'}
            value={values.s21_04_comment ?? ''}
            placeholder="Any notes on square footage calculations…"
            onChange={e => setValues(v => ({ ...v, s21_04_comment: e.target.value }))}
            onBlur={e => handleBlur('s21_04_comment', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
