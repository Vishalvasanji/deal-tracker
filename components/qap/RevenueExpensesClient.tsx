'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  REVENUE_GROUPS, EXPENSE_GROUPS, CONTINGENT_GROUPS, othersKey,
  type RevExpGroup,
} from '@/lib/qap-rev-exp'
import { computeRevExp, type OtherLine, type RevExpDeps } from '@/lib/qap-rev-exp-calc'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  dealId: string
  initialAmounts: Record<string, number>
  initialOthers: Record<string, OtherLine[]>
  initialComments: Record<string, string>
  deps: RevExpDeps
}

const money = (v: number | null | undefined) => (v == null ? '—' : `$${Math.round(v).toLocaleString()}`)
const money2 = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const inputCls =
  'w-36 text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring'
const subHdr = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'

const COMMENT_FIELDS = {
  revenue: 'rev_comment',
  mustpay: 'mustpay_comment',
  contingent: 'contingent_comment',
} as const

function parseAmt(raw: string): number {
  if (raw.trim() === '') return 0
  const v = parseFloat(raw.replace(/[$,\s]/g, ''))
  return isNaN(v) ? 0 : v
}

export function RevenueExpensesClient({ dealId, initialAmounts, initialOthers, initialComments, deps }: Props) {
  const [amounts, setAmounts] = useState<Record<string, number>>(initialAmounts)
  const [others, setOthers] = useState<Record<string, OtherLine[]>>(initialOthers)
  const [comments, setComments] = useState<Record<string, string>>(initialComments)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const result = useMemo(() => computeRevExp(amounts, others, deps), [amounts, others, deps])

  function markSaved() { setSavedAt(new Date().toLocaleTimeString()) }

  function saveField(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'rev_exp', fieldKey, value)
      markSaved()
    })
  }

  // ── fixed line amount ───────────────────────────────────────────────────────
  function setAmount(key: string, raw: string) {
    setAmounts(prev => ({ ...prev, [key]: parseAmt(raw) }))
  }
  function saveAmount(key: string) {
    saveField(key, String(amounts[key] ?? 0))
  }

  // ── add-as-needed "Other" rows (stored as a JSON array per group) ────────────
  function listFor(groupKey: string): OtherLine[] {
    return others[groupKey] ?? []
  }
  function commitOthers(groupKey: string, list: OtherLine[]) {
    setOthers(prev => ({ ...prev, [groupKey]: list }))
    saveField(othersKey(groupKey), JSON.stringify(list))
  }
  function addOther(groupKey: string) {
    const list = [...listFor(groupKey), { id: crypto.randomUUID(), label: '', amount: 0 }]
    setOthers(prev => ({ ...prev, [groupKey]: list }))
  }
  function updateOther(groupKey: string, id: string, patch: Partial<OtherLine>) {
    setOthers(prev => ({
      ...prev,
      [groupKey]: listFor(groupKey).map(o => (o.id === id ? { ...o, ...patch } : o)),
    }))
  }
  function removeOther(groupKey: string, id: string) {
    commitOthers(groupKey, listFor(groupKey).filter(o => o.id !== id))
  }

  function setComment(slot: keyof typeof COMMENT_FIELDS, v: string) {
    setComments(prev => ({ ...prev, [COMMENT_FIELDS[slot]]: v }))
  }

  // ── reusable row renderers ────────────────────────────────────────────────────
  function fixedLineRow(key: string, label: string, opts?: { readOnly?: boolean; readOnlyValue?: number; tag?: string }) {
    return (
      <div key={key} className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-foreground/90">
          {label}
          {opts?.tag && <span className="ml-2 text-[11px] text-muted-foreground">({opts.tag})</span>}
        </span>
        {opts?.readOnly ? (
          <span className="w-36 text-right text-sm font-medium tabular-nums text-muted-foreground">
            {money(opts.readOnlyValue ?? 0)}
          </span>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            className={inputCls}
            value={amounts[key] ? String(amounts[key]) : ''}
            placeholder="0"
            onChange={e => setAmount(key, e.target.value)}
            onBlur={() => saveAmount(key)}
          />
        )}
      </div>
    )
  }

  function othersBlock(groupKey: string, addLabel = 'Add other') {
    const list = listFor(groupKey)
    return (
      <div className="space-y-1.5">
        {list.map(o => (
          <div key={o.id} className="flex items-center gap-2 py-0.5">
            <input
              type="text"
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Identify…"
              value={o.label}
              onChange={e => updateOther(groupKey, o.id, { label: e.target.value })}
              onBlur={() => commitOthers(groupKey, list)}
            />
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              placeholder="0"
              value={o.amount ? String(o.amount) : ''}
              onChange={e => updateOther(groupKey, o.id, { amount: parseAmt(e.target.value) })}
              onBlur={() => commitOthers(groupKey, list)}
            />
            <button
              onClick={() => removeOther(groupKey, o.id)}
              className="text-muted-foreground hover:text-rose-500 p-1 shrink-0"
              title="Remove line"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => addOther(groupKey)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>
    )
  }

  // an expense category card (Administrative / Op-Maint / Utilities / Tax & Ins)
  function expenseCategory(group: RevExpGroup) {
    const cat = result.expenseCategories.find(c => c.key === group.key)
    const subtotal = result.groupSubtotals[group.key] ?? 0
    return (
      <div key={group.key} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{group.label}</h3>
          <div className="text-right">
            <span className="text-sm font-semibold tabular-nums">{money(subtotal)}</span>
            {cat && (
              <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
                {money(cat.pupa)} PUPA
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-border/40">
          {group.lines.map(line =>
            line.key === 'lhc_compliance_monitoring'
              ? fixedLineRow(line.key, line.label, { tag: 'from §44.06' })
              : fixedLineRow(line.key, line.label),
          )}
        </div>
        {group.allowsOthers && othersBlock(group.key)}
      </div>
    )
  }

  const revMain = REVENUE_GROUPS.find(g => g.key === 'rev_main')!
  const operatingSubsidies = REVENUE_GROUPS.find(g => g.key === 'operating_subsidies')!
  const otherRevenue = REVENUE_GROUPS.find(g => g.key === 'other_revenue')!
  const contingent = CONTINGENT_GROUPS[0]

  const am = result.assetMgmt

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Revenues &amp; Expenses</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}
        </span>
      </div>

      {/* ── HEADLINE: Total Operating Expenses vs the LHC $4,500 PUPA minimum (§44.49) ── */}
      <div
        className={`rounded-2xl border px-5 py-4 ${
          result.belowMinimum ? 'border-rose-300 bg-rose-50/60' : 'border-border bg-card'
        }`}
      >
        <p className="text-xs text-muted-foreground">Total Operating Expenses (first stabilized year)</p>
        <p className="text-3xl font-bold tabular-nums">{money(result.totalOperatingExpenses)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {money(result.opexPupa)} PUPA
          {' · '}LHC minimum {money(result.lhcMinPupa)} PUPA
          {deps.totalUnits > 0 && <> = {money(result.lhcMinTotal)} for {deps.totalUnits} units</>}
        </p>

        {deps.totalUnits === 0 ? (
          <p className="mt-3 text-xs text-amber-600 flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Enter the Unit Mix to evaluate the per-unit-per-annum minimum.
          </p>
        ) : result.belowMinimum ? (
          <p className="mt-3 text-sm text-rose-700 flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Below the LHC minimum by {money(result.shortfall)}.</span>{' '}
              Increase operating expenses to at least {money(result.lhcMinPupa)} PUPA, or your Checklist response
              must include a waiver request. (QAP IV.D.9)
            </span>
          </p>
        ) : result.totalOperatingExpenses > 0 ? (
          <p className="mt-3 text-xs text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> At or above the LHC minimum of {money(result.lhcMinPupa)} PUPA.
          </p>
        ) : null}
      </div>

      {/* ── Asset-management rules (always on when triggered) ── */}
      {(am.otherFlagged || am.overCap > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Asset Management Fee Rules (§45)</p>
          {am.otherFlagged && (
            <p className="text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Asset Management Fee (Other) is generally not permitted as a must-pay operating expense.
            </p>
          )}
          {am.overCap > 0 && (
            <p className="text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Combined asset management fees ({money(am.combined)}) exceed the {money(am.max)} cap — only{' '}
              {money(am.allowableAsOpEx)} is allowable as an operating expense.
            </p>
          )}
        </div>
      )}

      {/* ── §43 Revenues ── */}
      <div className="space-y-3">
        <p className={subHdr}>§43 · Revenues (first stabilized year)</p>
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
          <div className="divide-y divide-border/40">
            {revMain.lines.map(line =>
              line.key === 'gross_potential_rents'
                ? fixedLineRow(line.key, line.label, { readOnly: true, readOnlyValue: deps.annualGrossRent, tag: 'Unit Mix × 12' })
                : fixedLineRow(line.key, line.label),
            )}
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium mb-1">{operatingSubsidies.label}</p>
            {othersBlock(operatingSubsidies.key, 'Add operating subsidy')}
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium mb-1">{otherRevenue.label}</p>
            {othersBlock(otherRevenue.key, 'Add other revenue')}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
            <span className="text-sm font-semibold">Total Revenue Before Rent Loss</span>
            <span className="text-sm font-semibold tabular-nums">{money(result.revenueTotal)}</span>
          </div>
        </div>

        <textarea
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Comment regarding Revenues"
          value={comments[COMMENT_FIELDS.revenue] ?? ''}
          onChange={e => setComment('revenue', e.target.value)}
          onBlur={() => saveField(COMMENT_FIELDS.revenue, comments[COMMENT_FIELDS.revenue] ?? '')}
        />
      </div>

      {/* ── §44 Must-Pay Operating Expenses (drives the headline) ── */}
      <div className="space-y-3">
        <p className={subHdr}>§44 · Must-Pay Operating Expenses</p>
        {EXPENSE_GROUPS.map(expenseCategory)}

        <div className="rounded-xl border-2 border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">Total Operating Expenses (§44.49)</span>
          <div className="text-right">
            <span className="text-base font-bold tabular-nums">{money(result.totalOperatingExpenses)}</span>
            <span className="ml-2 text-xs text-muted-foreground tabular-nums">{money(result.opexPupa)} PUPA</span>
          </div>
        </div>

        <textarea
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Comment regarding Must-Pay Expenses"
          value={comments[COMMENT_FIELDS.mustpay] ?? ''}
          onChange={e => setComment('mustpay', e.target.value)}
          onBlur={() => saveField(COMMENT_FIELDS.mustpay, comments[COMMENT_FIELDS.mustpay] ?? '')}
        />
      </div>

      {/* ── §45 Contingent Operating Expenses ── */}
      <div className="space-y-3">
        <p className={subHdr}>§45 · Contingent Operating Expenses</p>
        <p className="text-xs text-muted-foreground">
          Operating expenses payable only if cash is available, and/or after certain other payments are made first
          from available cash flow.
        </p>
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
          <div className="divide-y divide-border/40">
            {contingent.lines.map(line => fixedLineRow(line.key, line.label))}
          </div>
          {othersBlock(contingent.key)}

          <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
            <span className="text-sm font-semibold">Total Contingent Expenses</span>
            <span className="text-sm font-semibold tabular-nums">{money(result.contingentSubtotal)}</span>
          </div>
        </div>

        {/* Asset-management cap derivation (§45.01 / J102–J105) */}
        {am.combined > 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
            <p className={subHdr + ' mb-1.5'}>Asset Management Fee Cap</p>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Asset Management Fee (Other) — must-pay (§44.09)', money(am.other)],
                  ['Asset Management Fee — contingent (§45.01)', money(am.contingent)],
                  ['Combined asset management fee', money(am.combined)],
                  [`Maximum allowable as operating expense`, money(am.max)],
                  ['Allowable as operating expense (lesser of the two)', money(am.allowableAsOpEx)],
                  ['Allowable as contingent expense', money(am.allowableAsContingent)],
                ].map(([l, v], i) => (
                  <tr key={i} className={`border-b border-border/30 ${i >= 4 ? 'font-semibold' : ''}`}>
                    <td className="py-1 pr-3 text-muted-foreground">{l}</td>
                    <td className="py-1 text-right tabular-nums whitespace-nowrap">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <textarea
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Comment regarding Contingent Expenses"
          value={comments[COMMENT_FIELDS.contingent] ?? ''}
          onChange={e => setComment('contingent', e.target.value)}
          onBlur={() => saveField(COMMENT_FIELDS.contingent, comments[COMMENT_FIELDS.contingent] ?? '')}
        />
      </div>

      <p className="text-xs text-muted-foreground/70">
        Total Operating Expenses feeds underwriting (QAP §44.49) and the §36 Operating Deficit Reserve minimum
        ({money(result.operatingDeficitReserveMin)} = ½ of operating expenses).
      </p>
    </div>
  )
}
